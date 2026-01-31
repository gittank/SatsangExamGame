/**
 * Smart Game Engine with proper elimination logic
 *
 * Key principles:
 * 1. Maintain a set of candidate entities that match all answers so far
 * 2. After each answer, eliminate entities that contradict the answer
 * 3. Select questions that best split remaining candidates (closest to 50/50)
 * 4. Never ask logically inconsistent questions
 */

import { getDatabase, saveDatabase } from '../db/database';

const QUESTION_LIMIT = 21;
const GUESS_THRESHOLD = 1; // Make a guess when only this many candidates remain

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

interface EntityAnswer {
  entityId: number;
  questionId: number;
  answer: 'yes' | 'no' | 'sometimes' | 'unknown';
}

interface GameSession {
  id: number;
  candidateIds: Set<number>;      // Remaining viable entity IDs
  answeredQuestions: Map<number, string>; // questionId -> answer
  questionCount: number;
}

// In-memory storage
const activeSessions: Map<number, GameSession> = new Map();

// Cached data
let entities: Entity[] = [];
let questions: Question[] = [];
let entityAnswers: Map<string, string> = new Map(); // "entityId-questionId" -> answer

/**
 * Initialize the game engine by loading data from database
 */
export async function initGameEngine(): Promise<void> {
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

  // Load entity-question answers into a fast lookup map
  const answersResult = db.exec('SELECT entity_id, question_id, answer FROM entity_question_answers');
  if (answersResult.length > 0) {
    for (const row of answersResult[0].values) {
      const key = `${row[0]}-${row[1]}`;
      entityAnswers.set(key, row[2] as string);
    }
  }

  console.log(`Smart game engine initialized: ${entities.length} entities, ${questions.length} questions, ${entityAnswers.size} answer mappings`);
}

/**
 * Get the answer for an entity-question pair
 */
function getEntityAnswer(entityId: number, questionId: number): string | undefined {
  return entityAnswers.get(`${entityId}-${questionId}`);
}

/**
 * Check if an entity matches a given answer for a question
 */
function entityMatchesAnswer(entityId: number, questionId: number, userAnswer: string): boolean {
  const storedAnswer = getEntityAnswer(entityId, questionId);

  // If we don't have data for this entity-question pair, don't eliminate it
  if (!storedAnswer) return true;

  // Handle "sometimes" and "unknown" - they match both yes and no
  if (storedAnswer === 'sometimes' || storedAnswer === 'unknown') return true;
  if (userAnswer === 'sometimes' || userAnswer === 'unknown') return true;

  // Exact match required for yes/no
  return storedAnswer === userAnswer;
}

/**
 * Filter candidates based on an answer
 */
function filterCandidates(candidateIds: Set<number>, questionId: number, answer: string): Set<number> {
  const remaining = new Set<number>();

  for (const entityId of candidateIds) {
    if (entityMatchesAnswer(entityId, questionId, answer)) {
      remaining.add(entityId);
    }
  }

  // If we eliminated everyone, keep the candidates (question may not apply)
  if (remaining.size === 0) {
    return candidateIds;
  }

  return remaining;
}

/**
 * Calculate how well a question splits the remaining candidates
 * Returns a score where higher = better split, 0 = useless question
 */
function calculateQuestionScore(candidateIds: Set<number>, questionId: number): number {
  let yesCount = 0;
  let noCount = 0;
  let unknownCount = 0;

  for (const entityId of candidateIds) {
    const answer = getEntityAnswer(entityId, questionId);
    if (answer === 'yes') yesCount++;
    else if (answer === 'no') noCount++;
    else unknownCount++;
  }

  const total = candidateIds.size;
  if (total === 0) return 0;

  // If everyone has the same answer, this question is useless
  if (yesCount === total || noCount === total) return 0;

  // If most are unknown, this question isn't useful
  if (unknownCount > total * 0.7) return 0;

  // If there's no variation (only yes OR only no, ignoring unknowns), useless
  if (yesCount === 0 || noCount === 0) return 0;

  // Calculate how close to 50/50 the yes/no split is (excluding unknowns)
  const knownTotal = yesCount + noCount;
  if (knownTotal === 0) return 0;

  const yesRatio = yesCount / knownTotal;

  // Best score is when yes/no are equal (yesRatio = 0.5)
  // Score ranges from 0 (all same) to 1 (perfect 50/50)
  const balance = 1 - Math.abs(yesRatio - 0.5) * 2;

  // Also factor in how many entities we have data for
  const coverage = knownTotal / total;

  return balance * coverage;
}

// Mutually exclusive question groups
// If one is answered "yes", others in the group should be skipped
const MUTUALLY_EXCLUSIVE_GROUPS: number[][] = [
  [1, 2, 3, 4, 5],  // Category: person, place, object, concept, event
  [6, 7],           // sadhu vs householder
  [8, 9],           // male vs female
];

// Questions that only apply if a specific question was answered "yes"
const CONDITIONAL_QUESTIONS: Record<number, number[]> = {
  1: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], // Person questions (6-18)
  2: [19, 20, 21, 22], // Place questions
  3: [23, 24, 25],     // Object questions
  4: [26, 27, 28],     // Concept questions
  5: [29, 30],         // Event questions
};

/**
 * Check if a question is logically excluded based on previous answers
 */
function isQuestionExcluded(session: GameSession, questionId: number): boolean {
  // Check mutually exclusive groups
  for (const group of MUTUALLY_EXCLUSIVE_GROUPS) {
    if (group.includes(questionId)) {
      // Check if any other question in this group was answered "yes"
      for (const otherQId of group) {
        if (otherQId !== questionId && session.answeredQuestions.get(otherQId) === 'yes') {
          return true; // Exclude this question
        }
      }
    }
  }

  // Check conditional questions - skip if prerequisite not met
  for (const [prereqId, dependentIds] of Object.entries(CONDITIONAL_QUESTIONS)) {
    if (dependentIds.includes(questionId)) {
      const prereqAnswer = session.answeredQuestions.get(parseInt(prereqId));
      // If prerequisite was answered "no", skip this question
      if (prereqAnswer === 'no') {
        return true;
      }
      // If prerequisite wasn't asked yet and other categories were confirmed, skip
      if (!prereqAnswer) {
        for (const otherPrereq of [1, 2, 3, 4, 5]) {
          if (otherPrereq !== parseInt(prereqId) &&
              session.answeredQuestions.get(otherPrereq) === 'yes') {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Select the best question to ask
 * Chooses the question that best splits the remaining candidates
 */
function selectBestQuestion(session: GameSession): Question | null {
  let bestQuestion: Question | null = null;
  let bestScore = -1;

  console.log(`Selecting question for session ${session.id}, ${session.candidateIds.size} candidates, ${session.answeredQuestions.size} questions answered`);

  for (const question of questions) {
    // Skip already asked questions
    if (session.answeredQuestions.has(question.id)) continue;

    // Skip logically excluded questions
    if (isQuestionExcluded(session, question.id)) continue;

    // Skip questions that don't apply to any remaining candidates
    let hasRelevantAnswer = false;
    for (const entityId of session.candidateIds) {
      if (getEntityAnswer(entityId, question.id)) {
        hasRelevantAnswer = true;
        break;
      }
    }
    if (!hasRelevantAnswer) continue;

    // Calculate how well this question splits candidates
    const score = calculateQuestionScore(session.candidateIds, question.id);

    if (score > bestScore) {
      bestScore = score;
      bestQuestion = question;
    }
  }

  console.log(`Best question: ${bestQuestion?.id} (${bestQuestion?.text}) with score ${bestScore}`);
  return bestQuestion;
}

/**
 * Get the best guess from remaining candidates
 * Scores each entity based on how many answers we have for them
 */
function getBestGuess(candidateIds: Set<number>, answeredQuestions: Map<number, string>): Entity | null {
  if (candidateIds.size === 0) return null;

  let bestEntity: Entity | null = null;
  let bestScore = -1;

  for (const entityId of candidateIds) {
    const entity = entities.find(e => e.id === entityId);
    if (!entity) continue;

    // Score based on how many answered questions match this entity's stored answers
    let matchCount = 0;
    let totalAnswers = 0;

    for (const [questionId, userAnswer] of answeredQuestions) {
      const storedAnswer = getEntityAnswer(entityId, questionId);
      if (storedAnswer) {
        totalAnswers++;
        // Direct match or flexible match (sometimes/unknown)
        if (storedAnswer === userAnswer ||
            storedAnswer === 'sometimes' || storedAnswer === 'unknown' ||
            userAnswer === 'sometimes' || userAnswer === 'unknown') {
          matchCount++;
        }
      }
    }

    // Prefer entities with more data that matches
    const score = totalAnswers > 0 ? matchCount + (totalAnswers * 0.1) : 0;

    console.log(`Candidate ${entityId} (${entity.name}): ${matchCount} matches out of ${totalAnswers} answers, score: ${score.toFixed(2)}`);

    if (score > bestScore) {
      bestScore = score;
      bestEntity = entity;
    }
  }

  // If no entity has any data, just return the first one
  if (!bestEntity && candidateIds.size > 0) {
    const firstId = candidateIds.values().next().value;
    bestEntity = entities.find(e => e.id === firstId) || null;
  }

  console.log(`Best guess: ${bestEntity?.id} (${bestEntity?.name}) with score ${bestScore.toFixed(2)}`);
  return bestEntity;
}

/**
 * Start a new game session
 */
export async function startGame(): Promise<{ sessionId: number; totalEntities: number }> {
  const db = await getDatabase();

  // Create session in database
  db.run(`INSERT INTO game_sessions (started_at) VALUES (datetime('now'))`);
  const result = db.exec('SELECT last_insert_rowid()');
  const sessionId = result[0].values[0][0] as number;

  // Initialize session with all entities as candidates
  const session: GameSession = {
    id: sessionId,
    candidateIds: new Set(entities.map(e => e.id)),
    answeredQuestions: new Map(),
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
  remainingCandidates?: number;
}> {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  // Check if we should make a guess
  const shouldGuess =
    session.candidateIds.size <= GUESS_THRESHOLD ||
    session.questionCount >= QUESTION_LIMIT;

  if (shouldGuess) {
    const guess = getBestGuess(session.candidateIds, session.answeredQuestions);
    return {
      type: 'guess',
      guess: guess || undefined,
      questionCount: session.questionCount,
      confidence: session.candidateIds.size === 1 ? 1 : 1 / session.candidateIds.size,
      remainingCandidates: session.candidateIds.size,
    };
  }

  // Select best question
  const question = selectBestQuestion(session);

  if (!question) {
    // No more useful questions, make a guess
    console.log(`No useful question found, guessing from ${session.candidateIds.size} candidates`);
    const guess = getBestGuess(session.candidateIds, session.answeredQuestions);
    return {
      type: 'guess',
      guess: guess || undefined,
      questionCount: session.questionCount,
      confidence: 1 / session.candidateIds.size,
      remainingCandidates: session.candidateIds.size,
    };
  }

  session.questionCount++;

  return {
    type: 'question',
    question: { id: question.id, text: question.text },
    questionNumber: session.questionCount,
    remainingCandidates: session.candidateIds.size,
  };
}

/**
 * Submit answer to a question and filter candidates
 */
export async function submitAnswer(
  sessionId: number,
  questionId: number,
  answer: 'yes' | 'no' | 'sometimes' | 'unknown'
): Promise<{ remainingCandidates: number }> {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  // Record the answer
  session.answeredQuestions.set(questionId, answer);

  // Filter candidates based on this answer
  session.candidateIds = filterCandidates(session.candidateIds, questionId, answer);

  console.log(`After Q${questionId}=${answer}: ${session.candidateIds.size} candidates remain`);

  return { remainingCandidates: session.candidateIds.size };
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
    // Update session as successful
    db.run(`
      UPDATE game_sessions
      SET ended_at = datetime('now'),
          questions_asked = ${session.questionCount},
          was_correct = 1,
          guessed_entity_id = ${guessedEntityId},
          actual_entity_id = ${guessedEntityId}
      WHERE id = ${sessionId}
    `);
    saveDatabase();
  }

  return { success: true };
}

/**
 * Learn from a failed guess - add new entity or update answers
 */
export async function revealAnswer(
  sessionId: number,
  correctName: string,
  correctCategory: string,
  guessedEntityId: number | null,
  correctDescription?: string | null
): Promise<{ entityId: number; isNew: boolean }> {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  const db = await getDatabase();

  // Check if entity exists
  let entity = entities.find(e => e.name.toLowerCase() === correctName.toLowerCase());
  let isNew = false;

  if (!entity) {
    // Add new entity
    db.run(`INSERT INTO entities (name, category, description) VALUES (?, ?, ?)`, [correctName, correctCategory, correctDescription || null]);
    const result = db.exec('SELECT last_insert_rowid()');
    const newId = result[0].values[0][0] as number;

    entity = {
      id: newId,
      name: correctName,
      category: correctCategory,
      description: correctDescription || null,
    };
    entities.push(entity);
    isNew = true;
  } else if (correctDescription && !entity.description) {
    // Update description if entity exists but has no description
    db.run(`UPDATE entities SET description = ? WHERE id = ?`, [correctDescription, entity.id]);
    entity.description = correctDescription;
  }

  // Update entity-question answers based on this game session
  for (const [questionId, answer] of session.answeredQuestions) {
    const key = `${entity.id}-${questionId}`;

    // Update database
    db.run(`
      INSERT OR REPLACE INTO entity_question_answers (entity_id, question_id, answer, confidence, play_count)
      VALUES (?, ?, ?, 0.8, COALESCE((SELECT play_count FROM entity_question_answers WHERE entity_id = ? AND question_id = ?), 0) + 1)
    `, [entity.id, questionId, answer, entity.id, questionId]);

    // Update in-memory cache
    entityAnswers.set(key, answer);
  }

  // Update session
  db.run(`
    UPDATE game_sessions
    SET ended_at = datetime('now'),
        questions_asked = ${session.questionCount},
        was_correct = 0,
        guessed_entity_id = ${guessedEntityId},
        actual_entity_id = ${entity.id}
    WHERE id = ${sessionId}
  `);

  saveDatabase();

  // Cleanup session
  activeSessions.delete(sessionId);

  return { entityId: entity.id, isNew };
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
 * Debug: Get entity answer data
 */
export function getDebugInfo(entityName?: string): {
  entities: { id: number; name: string; category: string; answerCount: number; answers?: Record<number, string> }[];
  totalAnswers: number;
} {
  const entityData = entities.map(e => {
    let answerCount = 0;
    const answers: Record<number, string> = {};
    for (const q of questions) {
      const ans = getEntityAnswer(e.id, q.id);
      if (ans) {
        answerCount++;
        if (entityName && e.name.toLowerCase().includes(entityName.toLowerCase())) {
          answers[q.id] = ans;
        }
      }
    }
    return {
      id: e.id,
      name: e.name,
      category: e.category,
      answerCount,
      ...(entityName && e.name.toLowerCase().includes(entityName.toLowerCase()) ? { answers } : {})
    };
  });

  return {
    entities: entityData.sort((a, b) => b.answerCount - a.answerCount),
    totalAnswers: entityAnswers.size
  };
}
