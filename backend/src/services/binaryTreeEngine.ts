/**
 * Binary Decision Tree Game Engine for 21 Questions
 *
 * Each question is a branch node, answers determine which path to take.
 * Leaves are entities (guesses). The tree learns and grows as games are played.
 */

import { getDatabase, saveDatabase } from '../db/database';
import * as fs from 'fs';
import * as path from 'path';

const TREE_PATH = path.join(__dirname, '../../data/decision_tree.json');
const MATRIX_PATH = path.join(__dirname, '../../../data/answer_matrix.json');

interface Entity {
  id: number;
  name: string;
  category: string;
  description: string | null;
}

interface Question {
  id: number;
  text: string;
  category: string | null;
}

// Tree node: either a question (branch) or an entity (leaf)
interface TreeNode {
  type: 'question' | 'entity' | 'empty';
  questionId?: number;
  entityId?: number;
  yesChild?: TreeNode;
  noChild?: TreeNode;
}

interface GameSession {
  id: number;
  currentNode: TreeNode;
  path: Array<{ questionId: number; answer: 'yes' | 'no' }>;
  questionCount: number;
  pendingDistinguish?: {
    wrongEntityId: number;
    correctEntityId: number;
  };
}

// In-memory storage
const activeSessions: Map<number, GameSession> = new Map();
let decisionTree: TreeNode = { type: 'empty' };
let entities: Entity[] = [];
let questions: Question[] = [];
let entityAnswers: Map<number, Map<number, string>> = new Map(); // entityId -> (questionId -> answer)

/**
 * Initialize the binary tree engine
 */
export async function initBinaryTreeEngine(): Promise<void> {
  const db = await getDatabase();

  // Load entities
  const entitiesResult = db.exec('SELECT id, name, category, description FROM entities ORDER BY id');
  if (entitiesResult.length > 0) {
    entities = entitiesResult[0].values.map((row: any[]) => ({
      id: row[0] as number,
      name: row[1] as string,
      category: row[2] as string,
      description: row[3] as string | null,
    }));
  }

  // Load questions
  const questionsResult = db.exec('SELECT id, text, category FROM questions ORDER BY id');
  if (questionsResult.length > 0) {
    questions = questionsResult[0].values.map((row: any[]) => ({
      id: row[0] as number,
      text: row[1] as string,
      category: row[2] as string | null,
    }));
  }

  // Load entity-question answers into memory
  const answersResult = db.exec('SELECT entity_id, question_id, answer FROM entity_question_answers');
  if (answersResult.length > 0) {
    for (const row of answersResult[0].values) {
      const entityId = row[0] as number;
      const questionId = row[1] as number;
      const answer = row[2] as string;

      if (!entityAnswers.has(entityId)) {
        entityAnswers.set(entityId, new Map());
      }
      entityAnswers.get(entityId)!.set(questionId, answer);
    }
  }

  // Ensure all answer matrix entities exist in the database
  if (fs.existsSync(MATRIX_PATH)) {
    try {
      const matrixData = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf-8'));
      const matrixEntities: string[] = matrixData.entities || [];
      for (const eid of matrixEntities) {
        const displayName = eid.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const existing = entities.find(e => e.name.toLowerCase() === displayName.toLowerCase());
        if (!existing) {
          const escapedName = displayName.replace(/'/g, "''");
          db.run(`INSERT INTO entities (name, category, description) VALUES ('${escapedName}', 'person', NULL)`);
          const result = db.exec('SELECT last_insert_rowid()');
          const newId = result[0].values[0][0] as number;
          entities.push({ id: newId, name: displayName, category: 'person', description: null });
          console.log(`Added missing entity to DB: ${displayName} (id=${newId})`);
        }
      }

      // Also load matrix questions and answers
      const matrixQuestions: string[] = matrixData.questions || [];
      const matrixAnswers: number[][] = matrixData.matrix || [];
      const questionMap: Record<string, string> = matrixData.questionMap || {};

      // Ensure all matrix questions exist
      for (let qi = 0; qi < matrixQuestions.length; qi++) {
        const qText = matrixQuestions[qi];
        const existing = questions.find(q => q.text === qText);
        if (!existing) {
          const escapedText = qText.replace(/'/g, "''");
          db.run(`INSERT INTO questions (text, category) VALUES ('${escapedText}', NULL)`);
          const result = db.exec('SELECT last_insert_rowid()');
          const qId = result[0].values[0][0] as number;
          questions.push({ id: qId, text: qText, category: null });
        }
      }

      // Load matrix answers into entityAnswers for tree traversal
      for (let ei = 0; ei < matrixEntities.length; ei++) {
        const eid = matrixEntities[ei];
        const displayName = eid.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const entity = entities.find(e => e.name.toLowerCase() === displayName.toLowerCase());
        if (!entity) continue;

        if (!entityAnswers.has(entity.id)) {
          entityAnswers.set(entity.id, new Map());
        }
        const answers = entityAnswers.get(entity.id)!;

        for (let qi = 0; qi < matrixQuestions.length; qi++) {
          const qText = matrixQuestions[qi];
          const question = questions.find(q => q.text === qText);
          if (!question) continue;

          const val = matrixAnswers[ei][qi];
          if (val === 1) {
            answers.set(question.id, 'yes');
          } else if (val === 0) {
            answers.set(question.id, 'no');
          }
          // Skip 0.5 (unknown)
        }
      }
      console.log(`Loaded answer matrix: ${matrixEntities.length} entities, ${matrixQuestions.length} questions`);
      await saveDatabase();
    } catch (err) {
      console.error('Failed to load answer matrix:', err);
    }
  }

  // Try to load existing tree or build new one
  if (fs.existsSync(TREE_PATH)) {
    try {
      const treeData = JSON.parse(fs.readFileSync(TREE_PATH, 'utf-8'));

      // Handle wrapped format from optimize_tree.ts: { tree: ..., questionMap: ..., metadata: ... }
      if (treeData.tree && treeData.questionMap) {
        console.log('Loading optimized tree (wrapped format)');
        const questionMap: Record<string, string> = treeData.questionMap;

        // Register any questions from questionMap that aren't in the DB
        for (const [idStr, text] of Object.entries(questionMap)) {
          const qId = parseInt(idStr);
          if (!questions.find(q => q.id === qId)) {
            questions.push({ id: qId, text: text as string, category: null });
          }
        }

        // Resolve string entity IDs and question IDs to numeric DB IDs
        _questionTextToDbId = null; // Reset cache after loading matrix questions
        decisionTree = resolveTreeIds(treeData.tree, questionMap);
      } else {
        decisionTree = treeData;
      }
      console.log('Loaded existing decision tree');
    } catch (err) {
      console.error('Failed to load decision tree, building new one:', err);
      decisionTree = buildInitialTree();
      saveTree();
    }
  } else {
    decisionTree = buildInitialTree();
    saveTree();
  }

  console.log(`Binary tree engine initialized: ${entities.length} entities, ${questions.length} questions`);
}

/**
 * Resolve string entity IDs and questionMap-based question IDs to DB IDs
 */
let _questionTextToDbId: Map<string, number> | null = null;

function getQuestionTextToDbId(): Map<string, number> {
  if (!_questionTextToDbId) {
    _questionTextToDbId = new Map();
    for (const q of questions) {
      _questionTextToDbId.set(q.text, q.id);
    }
  }
  return _questionTextToDbId;
}

function resolveTreeIds(node: any, questionMap?: Record<string, string>): TreeNode {
  if (!node) return { type: 'empty' };

  if (node.type === 'entity') {
    const entityId = node.entityId;
    if (typeof entityId === 'string') {
      // Convert "premanand_swami" -> "Premanand Swami" and look up in DB
      const displayName = entityId.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const entity = entities.find(e => e.name.toLowerCase() === displayName.toLowerCase());
      if (entity) {
        return { type: 'entity', entityId: entity.id };
      }
      console.warn(`Entity not found in DB: "${displayName}" (from "${entityId}")`);
      return { type: 'empty' };
    }
    return { type: 'entity', entityId };
  }

  if (node.type === 'question') {
    let dbQuestionId = node.questionId;

    // If questionMap provided, resolve tree questionId -> text -> DB ID
    if (questionMap && node.questionId) {
      const qText = node.questionText || questionMap[String(node.questionId)];
      if (qText) {
        const textToId = getQuestionTextToDbId();
        const resolved = textToId.get(qText);
        if (resolved !== undefined) {
          dbQuestionId = resolved;
        } else {
          console.warn(`Question text not found in DB: "${qText?.slice(0, 50)}..."`);
        }
      }
    }

    return {
      type: 'question',
      questionId: dbQuestionId,
      yesChild: resolveTreeIds(node.yesChild, questionMap),
      noChild: resolveTreeIds(node.noChild, questionMap),
    };
  }

  return { type: 'empty' };
}

/**
 * Build initial decision tree from entity-question answer data
 * Uses information gain to select the best splitting questions
 */
function buildInitialTree(): TreeNode {
  const allEntityIds = entities.map(e => e.id);
  return buildTreeRecursive(allEntityIds, new Set(), 0);
}

/**
 * Recursively build tree by selecting best splitting question
 */
function buildTreeRecursive(
  candidateEntityIds: number[],
  usedQuestionIds: Set<number>,
  depth: number
): TreeNode {
  // Base case: no entities
  if (candidateEntityIds.length === 0) {
    return { type: 'empty' };
  }

  // Base case: single entity - make it a leaf
  if (candidateEntityIds.length === 1) {
    return { type: 'entity', entityId: candidateEntityIds[0] };
  }

  // Base case: max depth or no more questions
  if (depth >= 25 || usedQuestionIds.size >= questions.length) {
    // Pick the entity with most known answers as the guess
    return { type: 'entity', entityId: getBestGuessFromCandidates(candidateEntityIds) };
  }

  // Find the best question to split on (highest information gain)
  let bestQuestion = findBestSplittingQuestion(candidateEntityIds, usedQuestionIds);

  // If no good splitting question, try to find ANY question that at least separates some entities
  if (!bestQuestion) {
    bestQuestion = findAnyDistinguishingQuestion(candidateEntityIds, usedQuestionIds);
  }

  if (!bestQuestion) {
    // No distinguishing question at all - pick best guess
    return { type: 'entity', entityId: getBestGuessFromCandidates(candidateEntityIds) };
  }

  // Split entities based on their answers to this question
  const yesEntities: number[] = [];
  const noEntities: number[] = [];
  const unknownEntities: number[] = [];

  for (const entityId of candidateEntityIds) {
    const answer = getEntityAnswer(entityId, bestQuestion.id);
    if (answer === 'yes') {
      yesEntities.push(entityId);
    } else if (answer === 'no') {
      noEntities.push(entityId);
    } else {
      unknownEntities.push(entityId);
    }
  }

  // Distribute unknown entities to the smaller branch to keep tree balanced
  for (const entityId of unknownEntities) {
    if (yesEntities.length <= noEntities.length) {
      yesEntities.push(entityId);
    } else {
      noEntities.push(entityId);
    }
  }

  // If split doesn't help at all, pick best guess
  if (yesEntities.length === 0 && noEntities.length === 0) {
    return { type: 'entity', entityId: getBestGuessFromCandidates(candidateEntityIds) };
  }

  // If one branch is empty, just continue with the other
  if (yesEntities.length === 0) {
    const newUsedQuestions = new Set(usedQuestionIds);
    newUsedQuestions.add(bestQuestion.id);
    return {
      type: 'question',
      questionId: bestQuestion.id,
      yesChild: { type: 'empty' },
      noChild: buildTreeRecursive(noEntities, newUsedQuestions, depth + 1),
    };
  }
  if (noEntities.length === 0) {
    const newUsedQuestions = new Set(usedQuestionIds);
    newUsedQuestions.add(bestQuestion.id);
    return {
      type: 'question',
      questionId: bestQuestion.id,
      yesChild: buildTreeRecursive(yesEntities, newUsedQuestions, depth + 1),
      noChild: { type: 'empty' },
    };
  }

  const newUsedQuestions = new Set(usedQuestionIds);
  newUsedQuestions.add(bestQuestion.id);

  return {
    type: 'question',
    questionId: bestQuestion.id,
    yesChild: buildTreeRecursive(yesEntities, newUsedQuestions, depth + 1),
    noChild: buildTreeRecursive(noEntities, newUsedQuestions, depth + 1),
  };
}

/**
 * Find the question that best splits the candidate entities
 */
function findBestSplittingQuestion(
  candidateEntityIds: number[],
  usedQuestionIds: Set<number>
): Question | null {
  let bestQuestion: Question | null = null;
  let bestScore = -1;

  for (const question of questions) {
    if (usedQuestionIds.has(question.id)) continue;

    let yesCount = 0;
    let noCount = 0;
    let knownCount = 0;

    for (const entityId of candidateEntityIds) {
      const answer = getEntityAnswer(entityId, question.id);
      if (answer === 'yes') {
        yesCount++;
        knownCount++;
      } else if (answer === 'no') {
        noCount++;
        knownCount++;
      }
    }

    // Skip questions with no known answers
    if (knownCount === 0) continue;

    // Score: how evenly does this question split the entities?
    // Best score is when yes and no are equal (50/50 split)
    const total = candidateEntityIds.length;
    const balance = Math.min(yesCount, noCount) / Math.max(yesCount, noCount, 1);
    const coverage = knownCount / total;

    // Combined score favoring balanced splits with good coverage
    const score = balance * coverage;

    if (score > bestScore) {
      bestScore = score;
      bestQuestion = question;
    }
  }

  return bestQuestion;
}

/**
 * Find ANY question that distinguishes at least some entities
 * Used when no good balanced split is available
 */
function findAnyDistinguishingQuestion(
  candidateEntityIds: number[],
  usedQuestionIds: Set<number>
): Question | null {
  for (const question of questions) {
    if (usedQuestionIds.has(question.id)) continue;

    let hasYes = false;
    let hasNo = false;

    for (const entityId of candidateEntityIds) {
      const answer = getEntityAnswer(entityId, question.id);
      if (answer === 'yes') hasYes = true;
      if (answer === 'no') hasNo = true;

      // Found a distinguishing question
      if (hasYes && hasNo) return question;
    }
  }

  return null;
}

/**
 * Get the best guess from a list of candidates based on answer coverage
 */
function getBestGuessFromCandidates(candidateEntityIds: number[]): number {
  let bestId = candidateEntityIds[0];
  let bestAnswerCount = 0;

  for (const entityId of candidateEntityIds) {
    const answers = entityAnswers.get(entityId);
    const answerCount = answers ? answers.size : 0;

    if (answerCount > bestAnswerCount) {
      bestAnswerCount = answerCount;
      bestId = entityId;
    }
  }

  return bestId;
}

/**
 * Get an entity's answer to a question
 */
function getEntityAnswer(entityId: number, questionId: number): string | null {
  return entityAnswers.get(entityId)?.get(questionId) || null;
}

/**
 * Save decision tree to file
 */
function saveTree(): void {
  const dataDir = path.dirname(TREE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(TREE_PATH, JSON.stringify(decisionTree, null, 2));
}

/**
 * Start a new game session
 */
export async function startGame(): Promise<{ sessionId: number; totalEntities: number }> {
  const db = await getDatabase();

  db.run(`INSERT INTO game_sessions (started_at) VALUES (datetime('now'))`);
  const result = db.exec('SELECT last_insert_rowid()');
  const sessionId = result[0].values[0][0] as number;

  const session: GameSession = {
    id: sessionId,
    currentNode: decisionTree,
    path: [],
    questionCount: 0,
  };
  activeSessions.set(sessionId, session);

  return { sessionId, totalEntities: entities.length };
}

/**
 * Get next question or make a guess
 */
export async function getNextQuestion(sessionId: number): Promise<{
  type: 'question' | 'guess';
  question?: { id: number; text: string };
  questionNumber?: number;
  guess?: Entity;
  questionCount?: number;
  confidence?: number;
}> {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  const node = session.currentNode;

  // If current node is a question, ask it
  if (node.type === 'question' && node.questionId) {
    const question = questions.find(q => q.id === node.questionId);
    if (question) {
      return {
        type: 'question',
        question: { id: question.id, text: question.text },
        questionNumber: session.questionCount + 1,
      };
    }
  }

  // If current node is an entity or empty, make a guess
  if (node.type === 'entity' && node.entityId) {
    const entity = entities.find(e => e.id === node.entityId);
    if (entity) {
      return {
        type: 'guess',
        guess: entity,
        questionCount: session.questionCount,
        confidence: 1.0,
      };
    }
  }

  // Empty node or error - guess the first entity
  return {
    type: 'guess',
    guess: entities[0],
    questionCount: session.questionCount,
    confidence: 0.5,
  };
}

/**
 * Submit answer to a question - traverse the tree
 */
export async function submitAnswer(
  sessionId: number,
  questionId: number,
  answer: 'yes' | 'no' | 'sometimes' | 'unknown'
): Promise<{ remainingCandidates: number }> {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  const node = session.currentNode;

  if (node.type !== 'question' || node.questionId !== questionId) {
    throw new Error('Question mismatch');
  }

  // Record the path
  // Unknown/sometimes answers go to 'yes' branch to match tree construction
  // (optimize_tree.ts places unknown candidates in the yes branch)
  const normalizedAnswer = (answer === 'no') ? 'no' : 'yes';
  session.path.push({ questionId, answer: normalizedAnswer });
  session.questionCount++;

  // Traverse to the appropriate child
  if (normalizedAnswer === 'yes' && node.yesChild) {
    session.currentNode = node.yesChild;
  } else if (normalizedAnswer === 'no' && node.noChild) {
    session.currentNode = node.noChild;
  }

  // Count remaining candidates (rough estimate based on tree depth)
  const remainingCandidates = countLeaves(session.currentNode);

  return { remainingCandidates };
}

/**
 * Count leaf nodes (entities) under a node
 */
function countLeaves(node: TreeNode): number {
  if (node.type === 'entity') return 1;
  if (node.type === 'empty') return 0;

  let count = 0;
  if (node.yesChild) count += countLeaves(node.yesChild);
  if (node.noChild) count += countLeaves(node.noChild);
  return count;
}

/**
 * Handle guess response
 */
export async function handleGuessResponse(
  sessionId: number,
  guessedEntityId: number,
  isCorrect: boolean
): Promise<{ success: boolean }> {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  const db = await getDatabase();

  if (isCorrect) {
    db.run(`
      UPDATE game_sessions
      SET ended_at = datetime('now'),
          questions_asked = ${session.questionCount},
          was_correct = 1,
          guessed_entity_id = ${guessedEntityId},
          actual_entity_id = ${guessedEntityId}
      WHERE id = ${sessionId}
    `);

    // Update entity answers based on the path taken
    await updateEntityAnswers(guessedEntityId, session.path);
  }

  return { success: true };
}

/**
 * Update entity answers in database based on game path
 */
async function updateEntityAnswers(
  entityId: number,
  path: Array<{ questionId: number; answer: 'yes' | 'no' }>
): Promise<void> {
  const db = await getDatabase();

  for (const step of path) {
    // Update database
    db.run(`
      INSERT INTO entity_question_answers (entity_id, question_id, answer, confidence, play_count)
      VALUES (${entityId}, ${step.questionId}, '${step.answer}', 0.9, 1)
      ON CONFLICT(entity_id, question_id) DO UPDATE SET
        answer = '${step.answer}',
        confidence = MIN(1.0, confidence + 0.1),
        play_count = play_count + 1
    `);

    // Update in-memory cache
    if (!entityAnswers.has(entityId)) {
      entityAnswers.set(entityId, new Map());
    }
    entityAnswers.get(entityId)!.set(step.questionId, step.answer);
  }

  await saveDatabase();
}

/**
 * Reveal the correct answer when AI fails - this is where the tree learns!
 */
export async function revealAnswer(
  sessionId: number,
  correctName: string,
  correctCategory: string,
  guessedEntityId: number | null,
  correctDescription?: string | null
): Promise<{ entityId: number; isNew: boolean; needsDistinguishingQuestion: boolean; wrongEntityName?: string; divergenceInfo?: { questionText: string; userAnswer: string; expectedAnswer: string } }> {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  const db = await getDatabase();

  // Find or create the correct entity
  let entity = entities.find(e => e.name.toLowerCase() === correctName.toLowerCase());
  let isNew = false;

  if (!entity) {
    // Add new entity
    const escapedName = correctName.replace(/'/g, "''");
    const escapedCategory = correctCategory.replace(/'/g, "''");
    const escapedDesc = correctDescription ? correctDescription.replace(/'/g, "''") : null;

    db.run(`INSERT INTO entities (name, category, description) VALUES ('${escapedName}', '${escapedCategory}', ${escapedDesc ? `'${escapedDesc}'` : 'NULL'})`);
    const result = db.exec('SELECT last_insert_rowid()');
    const newId = result[0].values[0][0] as number;

    entity = {
      id: newId,
      name: correctName,
      category: correctCategory,
      description: correctDescription || null,
    };
    entities.push(entity);
    entityAnswers.set(newId, new Map());
    isNew = true;
  }

  // Find divergence info BEFORE updating answers (so we compare against original matrix data)
  let divergenceInfo: { questionText: string; userAnswer: string; expectedAnswer: string } | undefined;
  if (!isNew && guessedEntityId && guessedEntityId !== entity.id) {
    const divergence = findPathDivergence(session.path, entity.id);
    if (divergence) {
      divergenceInfo = {
        questionText: divergence.questionText,
        userAnswer: divergence.userAnswer,
        expectedAnswer: divergence.expectedAnswer,
      };
    }
  }

  // Update entity answers based on the path
  await updateEntityAnswers(entity.id, session.path);

  // Check if we can find a distinguishing question
  let needsDistinguishingQuestion = false;
  let wrongEntityName: string | undefined;

  if (guessedEntityId && guessedEntityId !== entity.id) {
    const distinguishingQuestion = findDistinguishingQuestion(guessedEntityId, entity.id, session.path);

    if (distinguishingQuestion) {
      // We found one - update the tree automatically
      await insertDistinguishingQuestionById(session, guessedEntityId, entity.id, distinguishingQuestion.id);
    } else {
      // No distinguishing question found - need user input
      needsDistinguishingQuestion = true;
      const wrongEntity = entities.find(e => e.id === guessedEntityId);
      wrongEntityName = wrongEntity?.name;

      // Store context in session for later use
      session.pendingDistinguish = {
        wrongEntityId: guessedEntityId,
        correctEntityId: entity.id,
      };
    }
  }

  // Update session in database
  db.run(`
    UPDATE game_sessions
    SET ended_at = datetime('now'),
        questions_asked = ${session.questionCount},
        was_correct = 0,
        guessed_entity_id = ${guessedEntityId},
        actual_entity_id = ${entity.id}
    WHERE id = ${sessionId}
  `);

  await saveDatabase();

  // Only delete session if we don't need a distinguishing question
  if (!needsDistinguishingQuestion) {
    activeSessions.delete(sessionId);
  }

  return { entityId: entity.id, isNew, needsDistinguishingQuestion, wrongEntityName, divergenceInfo };
}

/**
 * Add a user-provided distinguishing question and update the tree
 */
export async function addUserDistinguishingQuestion(
  sessionId: number,
  questionText: string,
  correctEntityAnswer: 'yes' | 'no'
): Promise<{ success: boolean; questionId: number }> {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error('Session not found');
  if (!session.pendingDistinguish) throw new Error('No pending distinguish request');

  const { wrongEntityId, correctEntityId } = session.pendingDistinguish;
  const db = await getDatabase();

  // Determine the category based on the correct entity
  const correctEntity = entities.find(e => e.id === correctEntityId);
  const category = correctEntity?.category || 'all';

  // Create the new question
  const escapedText = questionText.replace(/'/g, "''");
  db.run(`INSERT INTO questions (text, category) VALUES ('${escapedText}', '${category}')`);
  const result = db.exec('SELECT last_insert_rowid()');
  const questionId = result[0].values[0][0] as number;

  // Add to in-memory questions array
  const newQuestion: Question = { id: questionId, text: questionText, category };
  questions.push(newQuestion);

  // Set answers for both entities
  const wrongEntityAnswer = correctEntityAnswer === 'yes' ? 'no' : 'yes';

  // Update correct entity
  db.run(`INSERT OR REPLACE INTO entity_question_answers (entity_id, question_id, answer, confidence)
          VALUES (${correctEntityId}, ${questionId}, '${correctEntityAnswer}', 1.0)`);
  let correctAnswers = entityAnswers.get(correctEntityId);
  if (!correctAnswers) {
    correctAnswers = new Map();
    entityAnswers.set(correctEntityId, correctAnswers);
  }
  correctAnswers.set(questionId, correctEntityAnswer);

  // Update wrong entity
  db.run(`INSERT OR REPLACE INTO entity_question_answers (entity_id, question_id, answer, confidence)
          VALUES (${wrongEntityId}, ${questionId}, '${wrongEntityAnswer}', 1.0)`);
  let wrongAnswers = entityAnswers.get(wrongEntityId);
  if (!wrongAnswers) {
    wrongAnswers = new Map();
    entityAnswers.set(wrongEntityId, wrongAnswers);
  }
  wrongAnswers.set(questionId, wrongEntityAnswer);

  // Update the tree with the new question
  await insertDistinguishingQuestionById(session, wrongEntityId, correctEntityId, questionId);

  await saveDatabase();
  activeSessions.delete(sessionId);

  console.log(`User added distinguishing question: "${questionText}"`);
  return { success: true, questionId };
}

/**
 * Insert a distinguishing question into the tree by question ID
 */
async function insertDistinguishingQuestionById(
  session: GameSession,
  wrongEntityId: number,
  correctEntityId: number,
  questionId: number
): Promise<void> {
  const question = questions.find(q => q.id === questionId);
  if (!question) {
    console.log('Question not found:', questionId);
    return;
  }

  // Navigate to the leaf node that needs to be split
  let parentRef: { node: TreeNode; branch: 'yesChild' | 'noChild' } | null = null;
  let current = decisionTree;

  for (const step of session.path) {
    if (current.type === 'question') {
      const branch = step.answer === 'yes' ? 'yesChild' : 'noChild';
      const child = current[branch];
      if (child) {
        parentRef = { node: current, branch };
        current = child;
      }
    }
  }

  // Create new branch with the distinguishing question
  const correctAnswer = getEntityAnswer(correctEntityId, questionId);
  const wrongAnswer = getEntityAnswer(wrongEntityId, questionId);

  const newNode: TreeNode = {
    type: 'question',
    questionId: questionId,
    yesChild: correctAnswer === 'yes'
      ? { type: 'entity', entityId: correctEntityId }
      : { type: 'entity', entityId: wrongEntityId },
    noChild: correctAnswer === 'no'
      ? { type: 'entity', entityId: correctEntityId }
      : { type: 'entity', entityId: wrongEntityId },
  };

  // Replace the leaf with the new branch
  if (parentRef) {
    parentRef.node[parentRef.branch] = newNode;
  } else {
    // The root itself was a leaf
    decisionTree = newNode;
  }

  saveTree();
  console.log(`Tree updated: added question "${question.text}" to distinguish entities`);
}

/**
 * Find the first point where the user's answers diverge from the correct entity's expected answers.
 * Only meaningful when the correct entity already exists in the answer matrix.
 */
function findPathDivergence(
  path: Array<{ questionId: number; answer: 'yes' | 'no' }>,
  correctEntityId: number
): { questionId: number; questionText: string; userAnswer: string; expectedAnswer: string } | null {
  for (const step of path) {
    const expectedAnswer = getEntityAnswer(correctEntityId, step.questionId);
    // Only compare if the entity has a known answer for this question
    if (expectedAnswer && expectedAnswer !== step.answer) {
      const question = questions.find(q => q.id === step.questionId);
      return {
        questionId: step.questionId,
        questionText: question?.text || `Question #${step.questionId}`,
        userAnswer: step.answer,
        expectedAnswer,
      };
    }
  }
  return null;
}

/**
 * Find a question that can distinguish between two entities
 */
function findDistinguishingQuestion(
  entityId1: number,
  entityId2: number,
  usedPath: Array<{ questionId: number; answer: string }>
): Question | null {
  const usedQuestionIds = new Set(usedPath.map(p => p.questionId));

  for (const question of questions) {
    if (usedQuestionIds.has(question.id)) continue;

    const answer1 = getEntityAnswer(entityId1, question.id);
    const answer2 = getEntityAnswer(entityId2, question.id);

    // Found a distinguishing question if answers are different and known
    if (answer1 && answer2 && answer1 !== answer2) {
      return question;
    }
  }

  return null;
}

/**
 * Get game statistics
 */
export async function getStats(): Promise<{
  totalGames: number;
  correctGuesses: number;
  accuracy: number;
  averageQuestions: number;
}> {
  const db = await getDatabase();

  const totalResult = db.exec('SELECT COUNT(*) FROM game_sessions WHERE ended_at IS NOT NULL');
  const totalGames = totalResult.length > 0 ? (totalResult[0].values[0][0] as number) : 0;

  const correctResult = db.exec('SELECT COUNT(*) FROM game_sessions WHERE was_correct = 1');
  const correctGuesses = correctResult.length > 0 ? (correctResult[0].values[0][0] as number) : 0;

  const avgResult = db.exec('SELECT AVG(questions_asked) FROM game_sessions WHERE ended_at IS NOT NULL');
  const averageQuestions = avgResult.length > 0 ? (avgResult[0].values[0][0] as number) || 0 : 0;

  return {
    totalGames,
    correctGuesses,
    accuracy: totalGames > 0 ? (correctGuesses / totalGames) * 100 : 0,
    averageQuestions,
  };
}

/**
 * Get all entity names (for autocomplete)
 */
export function getEntityNames(): string[] {
  return entities.map(e => e.name);
}

/**
 * Cleanup session
 */
export function cleanupSession(sessionId: number): void {
  activeSessions.delete(sessionId);
}

/**
 * Debug: Get tree info
 */
export function getDebugInfo(entityName?: string): any {
  const treeDepth = getTreeDepth(decisionTree);
  const leafCount = countLeaves(decisionTree);

  return {
    treeDepth,
    leafCount,
    totalEntities: entities.length,
    totalQuestions: questions.length,
    tree: entityName ? decisionTree : 'Use ?entity=name to see full tree',
  };
}

function getTreeDepth(node: TreeNode): number {
  if (node.type !== 'question') return 0;
  return 1 + Math.max(
    node.yesChild ? getTreeDepth(node.yesChild) : 0,
    node.noChild ? getTreeDepth(node.noChild) : 0
  );
}

/**
 * Rebuild the tree from scratch
 */
export function rebuildTree(): void {
  decisionTree = buildInitialTree();
  saveTree();
  console.log('Decision tree rebuilt');
}
