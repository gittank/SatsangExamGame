/**
 * Neural Network-based Game Engine for 21 Questions
 * Implements smart question selection using hypothetical answer testing
 * Based on https://github.com/earthtojake/20q
 */

import { NeuralNetwork, NeuralNetworkData } from './neuralNetwork';
import { getDatabase, saveDatabase } from '../db/database';
import * as fs from 'fs';
import * as path from 'path';

const NEURAL_NETWORK_PATH = path.join(__dirname, '../../data/neural_network.json');
const QUESTION_LIMIT = 21;

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

interface GameSession {
  id: number;
  inputVector: number[];      // Current state of answers (1=yes, -1=no, 0=not asked)
  questionsAsked: number[];   // Question IDs that have been asked
  questionCount: number;
}

// In-memory storage for active game sessions
const activeSessions: Map<number, GameSession> = new Map();

// Global neural network instance
let neuralNetwork: NeuralNetwork | null = null;

// Cached data
let entities: Entity[] = [];
let questions: Question[] = [];
let entityAnswerMatrix: number[][] = []; // [entityIndex][questionIndex] = answer (1 or -1)

/**
 * Initialize the neural game engine
 */
export async function initNeuralEngine(): Promise<void> {
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

  // Build entity-answer matrix from database
  entityAnswerMatrix = [];
  for (const entity of entities) {
    const answers: number[] = new Array(questions.length).fill(0);

    const answersResult = db.exec(
      `SELECT question_id, answer FROM entity_question_answers WHERE entity_id = ${entity.id}`
    );

    if (answersResult.length > 0) {
      for (const row of answersResult[0].values) {
        const questionId = row[0] as number;
        const answer = row[1] as string;
        const qIndex = questions.findIndex(q => q.id === questionId);
        if (qIndex !== -1) {
          // Convert answer to numeric: yes=1, no=-1, sometimes=0, unknown=0
          if (answer === 'yes') answers[qIndex] = 1;
          else if (answer === 'no') answers[qIndex] = -1;
          else answers[qIndex] = 0;
        }
      }
    }
    entityAnswerMatrix.push(answers);
  }

  // Try to load existing neural network or create new one
  if (fs.existsSync(NEURAL_NETWORK_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(NEURAL_NETWORK_PATH, 'utf-8'));
      neuralNetwork = NeuralNetwork.fromJSON(data);
      console.log('Loaded existing neural network');
    } catch (err) {
      console.error('Failed to load neural network, creating new one:', err);
      neuralNetwork = createNewNetwork();
    }
  } else {
    neuralNetwork = createNewNetwork();
    await trainNetwork(10000); // Initial training
  }

  console.log(`Neural engine initialized: ${entities.length} entities, ${questions.length} questions`);
}

/**
 * Create a new neural network with appropriate dimensions
 */
function createNewNetwork(): NeuralNetwork {
  const numInputs = questions.length;
  const numOutputs = entities.length;
  // Hidden layer size: heuristic based on input/output size
  const numHidden = Math.ceil((numInputs + numOutputs) / 2);

  return new NeuralNetwork({
    numInputs,
    numHidden,
    numOutputs,
    learningRate: 0.5,
    hiddenLayerBias: 1,
    outputLayerBias: 1,
  });
}

/**
 * Train the network with random question subsets
 */
async function trainNetwork(iterations: number): Promise<void> {
  if (!neuralNetwork) return;

  console.log(`Training network for ${iterations} iterations...`);

  for (let i = 0; i < iterations; i++) {
    // Pick a random entity
    const entityIndex = Math.floor(Math.random() * entities.length);

    // Create input vector with random subset of questions answered
    const inputVector = new Array(questions.length).fill(0);
    const numQuestionsToAnswer = Math.floor(Math.random() * Math.min(QUESTION_LIMIT, questions.length)) + 1;
    const questionsToAnswer = shuffleArray([...Array(questions.length).keys()]).slice(0, numQuestionsToAnswer);

    for (const qi of questionsToAnswer) {
      inputVector[qi] = entityAnswerMatrix[entityIndex][qi] || (Math.random() > 0.5 ? 1 : -1);
    }

    // Create target vector (one-hot encoded)
    const targetVector = new Array(entities.length).fill(0);
    targetVector[entityIndex] = 1;

    // Train
    neuralNetwork.backpropagate(inputVector, targetVector);
  }

  // Save the trained network
  saveNetwork();
  console.log('Training complete');
}

/**
 * Save neural network to file
 */
function saveNetwork(): void {
  if (!neuralNetwork) return;

  const dataDir = path.dirname(NEURAL_NETWORK_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(NEURAL_NETWORK_PATH, JSON.stringify(neuralNetwork.toJSON(), null, 2));
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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

  // Initialize session state
  const session: GameSession = {
    id: sessionId,
    inputVector: new Array(questions.length).fill(0),
    questionsAsked: [],
    questionCount: 0,
  };
  activeSessions.set(sessionId, session);

  return { sessionId, totalEntities: entities.length };
}

/**
 * Smart question selection algorithm
 * Tests hypothetical yes/no answers for each unasked question
 * Selects the question that causes the greatest change in output probabilities
 */
function selectBestQuestion(session: GameSession): number {
  if (!neuralNetwork) return -1;

  // Get current output probabilities
  const currentOutput = neuralNetwork.feedForward(session.inputVector);

  let bestQuestionIndex = -1;
  let bestDiff = -1;

  for (let qi = 0; qi < questions.length; qi++) {
    // Skip if question already asked
    if (session.questionsAsked.includes(questions[qi].id)) continue;

    // Test with hypothetical "yes" answer
    const testVectorYes = [...session.inputVector];
    testVectorYes[qi] = 1;
    const outputYes = neuralNetwork.feedForward(testVectorYes);

    // Test with hypothetical "no" answer
    const testVectorNo = [...session.inputVector];
    testVectorNo[qi] = -1;
    const outputNo = neuralNetwork.feedForward(testVectorNo);

    // Calculate absolute difference from current probabilities
    let diffYes = 0;
    let diffNo = 0;
    for (let e = 0; e < entities.length; e++) {
      diffYes += Math.abs(outputYes[e] - currentOutput[e]);
      diffNo += Math.abs(outputNo[e] - currentOutput[e]);
    }

    // Take the minimum (worst case) diff - we want the question that
    // provides information regardless of the answer
    const minDiff = Math.min(diffYes, diffNo);

    if (minDiff > bestDiff) {
      bestDiff = minDiff;
      bestQuestionIndex = qi;
    }
  }

  return bestQuestionIndex;
}

/**
 * Get the best guess based on current network output
 */
function getBestGuess(session: GameSession): { entityIndex: number; confidence: number } {
  if (!neuralNetwork) return { entityIndex: 0, confidence: 0 };

  const output = neuralNetwork.feedForward(session.inputVector);
  let bestIndex = 0;
  let bestProb = output[0];

  for (let i = 1; i < output.length; i++) {
    if (output[i] > bestProb) {
      bestProb = output[i];
      bestIndex = i;
    }
  }

  return { entityIndex: bestIndex, confidence: bestProb };
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

  // Check if we should make a guess
  const guess = getBestGuess(session);

  // Make a guess if:
  // 1. Reached question limit
  // 2. High confidence (> 0.8) AND at least some questions asked
  // 3. No more useful questions AND at least some questions asked
  const MIN_QUESTIONS_BEFORE_GUESS = 5;
  const questionIndex = selectBestQuestion(session);

  const shouldGuess =
    session.questionCount >= QUESTION_LIMIT ||
    (session.questionCount >= MIN_QUESTIONS_BEFORE_GUESS && guess.confidence > 0.8) ||
    (session.questionCount >= MIN_QUESTIONS_BEFORE_GUESS && questionIndex === -1);

  if (shouldGuess) {
    return {
      type: 'guess',
      guess: entities[guess.entityIndex],
      questionCount: session.questionCount,
      confidence: guess.confidence,
    };
  }

  // If no good question found but we haven't asked enough yet, pick a random unasked question
  let selectedQuestionIndex = questionIndex;
  if (selectedQuestionIndex === -1) {
    // Find any unasked question
    for (let qi = 0; qi < questions.length; qi++) {
      if (!session.questionsAsked.includes(questions[qi].id)) {
        selectedQuestionIndex = qi;
        break;
      }
    }
  }

  if (selectedQuestionIndex === -1) {
    // No more questions at all, must guess
    return {
      type: 'guess',
      guess: entities[guess.entityIndex],
      questionCount: session.questionCount,
      confidence: guess.confidence,
    };
  }

  const question = questions[selectedQuestionIndex];
  session.questionCount++;

  return {
    type: 'question',
    question: { id: question.id, text: question.text },
    questionNumber: session.questionCount,
  };
}

/**
 * Submit answer to a question
 */
export async function submitAnswer(
  sessionId: number,
  questionId: number,
  answer: 'yes' | 'no' | 'sometimes' | 'unknown'
): Promise<{ remainingCandidates: number }> {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  // Find question index
  const questionIndex = questions.findIndex(q => q.id === questionId);
  if (questionIndex === -1) throw new Error('Question not found');

  // Update input vector
  if (answer === 'yes') session.inputVector[questionIndex] = 1;
  else if (answer === 'no') session.inputVector[questionIndex] = -1;
  else session.inputVector[questionIndex] = 0; // sometimes/unknown treated as neutral

  // Mark question as asked
  if (!session.questionsAsked.includes(questionId)) {
    session.questionsAsked.push(questionId);
  }

  // Calculate remaining candidates (entities with probability > 0.1)
  if (!neuralNetwork) return { remainingCandidates: entities.length };

  const output = neuralNetwork.feedForward(session.inputVector);
  const threshold = 0.1 / entities.length; // Relative threshold
  const remainingCandidates = output.filter(p => p > threshold).length;

  return { remainingCandidates: Math.max(1, remainingCandidates) };
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

    // Reinforce learning with correct answer
    await reinforceLearning(session, guessedEntityId);
  }

  return { success: true };
}

/**
 * Reinforce learning when guess is correct
 */
async function reinforceLearning(session: GameSession, entityId: number): Promise<void> {
  if (!neuralNetwork) return;

  const entityIndex = entities.findIndex(e => e.id === entityId);
  if (entityIndex === -1) return;

  // Create target vector
  const targetVector = new Array(entities.length).fill(0);
  targetVector[entityIndex] = 1;

  // Train on this example multiple times to reinforce
  for (let i = 0; i < 10; i++) {
    neuralNetwork.backpropagate(session.inputVector, targetVector);
  }

  saveNetwork();
}

/**
 * Handle revealing the correct answer when AI fails
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

    // Add new row to answer matrix
    entityAnswerMatrix.push(new Array(questions.length).fill(0));

    isNew = true;

    // Need to rebuild neural network with new output dimension
    await rebuildNetwork();
  } else if (correctDescription && !entity.description) {
    // Update description if entity exists but has no description
    const escapedDesc = correctDescription.replace(/'/g, "''");
    db.run(`UPDATE entities SET description = '${escapedDesc}' WHERE id = ${entity.id}`);
    entity.description = correctDescription;
  }

  const entityIndex = entities.findIndex(e => e.id === entity!.id);

  // Update entity-question answers based on this game session
  for (let qi = 0; qi < questions.length; qi++) {
    if (session.inputVector[qi] !== 0) {
      const answer = session.inputVector[qi] === 1 ? 'yes' : 'no';

      // Update database
      db.run(`
        INSERT OR REPLACE INTO entity_question_answers (entity_id, question_id, answer, confidence, play_count)
        VALUES (${entity!.id}, ${questions[qi].id}, '${answer}', 0.8, 1)
      `);

      // Update matrix
      entityAnswerMatrix[entityIndex][qi] = session.inputVector[qi];
    }
  }

  // Update session
  db.run(`
    UPDATE game_sessions
    SET ended_at = datetime('now'),
        questions_asked = ${session.questionCount},
        was_correct = 0,
        guessed_entity_id = ${guessedEntityId},
        actual_entity_id = ${entity!.id}
    WHERE id = ${sessionId}
  `);

  // Train network on this new knowledge
  const targetVector = new Array(entities.length).fill(0);
  targetVector[entityIndex] = 1;

  if (neuralNetwork) {
    for (let i = 0; i < 50; i++) {
      neuralNetwork.backpropagate(session.inputVector, targetVector);
    }
    saveNetwork();
  }

  // Cleanup session
  activeSessions.delete(sessionId);

  return { entityId: entity!.id, isNew };
}

/**
 * Rebuild neural network when entities or questions change
 */
async function rebuildNetwork(): Promise<void> {
  const oldNetwork = neuralNetwork;
  neuralNetwork = createNewNetwork();

  // Re-train from scratch with current data
  await trainNetwork(5000);

  console.log('Neural network rebuilt');
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
  entities: { id: number; name: string; category: string; answerCount: number; answers?: Record<number, number> }[];
  totalAnswers: number;
  networkInfo: { inputs: number; hidden: number; outputs: number } | null;
} {
  const entityData = entities.map(e => {
    const entityIndex = entities.findIndex(ent => ent.id === e.id);
    let answerCount = 0;
    const answers: Record<number, number> = {};

    for (let qi = 0; qi < questions.length; qi++) {
      const ans = entityAnswerMatrix[entityIndex]?.[qi];
      if (ans !== 0) {
        answerCount++;
        if (entityName && e.name.toLowerCase().includes(entityName.toLowerCase())) {
          answers[questions[qi].id] = ans;
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

  // Count total non-zero answers in the matrix
  let totalAnswers = 0;
  for (const row of entityAnswerMatrix) {
    for (const val of row) {
      if (val !== 0) totalAnswers++;
    }
  }

  return {
    entities: entityData.sort((a, b) => b.answerCount - a.answerCount),
    totalAnswers,
    networkInfo: neuralNetwork ? {
      inputs: questions.length,
      hidden: Math.ceil((questions.length + entities.length) / 2),
      outputs: entities.length
    } : null
  };
}
