import { getDatabase, saveDatabase, run, queryAll, queryOne } from '../db/database';
import { Entity, Question, AnswerType, CandidateScore } from '../types';

export class GameEngine {
  private initialized = false;

  async init(): Promise<void> {
    if (!this.initialized) {
      await getDatabase();
      this.initialized = true;
    }
  }

  // Start a new game session
  async startGame(): Promise<{ sessionId: number; totalEntities: number }> {
    await this.init();

    const result = run(
      "INSERT INTO game_sessions (started_at) VALUES (datetime('now'))",
      []
    );

    const sessionId = result.lastInsertRowid;
    const totalEntities = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM entities')?.count || 0;

    saveDatabase();

    return { sessionId, totalEntities };
  }

  // Get all candidate entities (initially all entities)
  async getAllEntities(): Promise<Entity[]> {
    await this.init();
    return queryAll<Entity>('SELECT * FROM entities');
  }

  // Get candidate scores based on answers given so far
  async getCandidateScores(answers: Map<number, AnswerType>): Promise<CandidateScore[]> {
    await this.init();
    const entities = await this.getAllEntities();
    const scores: CandidateScore[] = [];

    for (const entity of entities) {
      let score = 1.0;

      for (const [questionId, userAnswer] of answers) {
        const eqa = queryOne<{ answer: string; confidence: number }>(
          'SELECT answer, confidence FROM entity_question_answers WHERE entity_id = ? AND question_id = ?',
          [entity.id, questionId]
        );

        if (eqa) {
          if (eqa.answer === userAnswer) {
            // Answer matches - boost score
            score *= (0.5 + 0.5 * eqa.confidence);
          } else if (eqa.answer === 'sometimes' || userAnswer === 'sometimes') {
            // Partial match
            score *= 0.7;
          } else if (eqa.answer === 'unknown' || userAnswer === 'unknown') {
            // Unknown - slight penalty
            score *= 0.9;
          } else {
            // Answer doesn't match - significant penalty
            score *= (0.1 * (1 - eqa.confidence) + 0.01);
          }
        } else {
          // No data for this entity-question pair - slight penalty
          score *= 0.8;
        }
      }

      scores.push({ entityId: entity.id, score });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    return scores;
  }

  // Get remaining viable candidates (score above threshold)
  async getViableCandidates(answers: Map<number, AnswerType>, threshold: number = 0.01): Promise<CandidateScore[]> {
    const scores = await this.getCandidateScores(answers);
    return scores.filter(c => c.score >= threshold);
  }

  // Calculate information gain for a question
  private calculateInformationGain(
    questionId: number,
    candidates: CandidateScore[]
  ): number {
    if (candidates.length <= 1) return 0;

    // Count expected yes/no split
    let yesCount = 0;
    let noCount = 0;
    let sometimesCount = 0;
    let unknownCount = 0;

    for (const candidate of candidates) {
      const eqa = queryOne<{ answer: string }>(
        'SELECT answer FROM entity_question_answers WHERE entity_id = ? AND question_id = ?',
        [candidate.entityId, questionId]
      );

      if (!eqa) {
        unknownCount++;
      } else if (eqa.answer === 'yes') {
        yesCount++;
      } else if (eqa.answer === 'no') {
        noCount++;
      } else if (eqa.answer === 'sometimes') {
        sometimesCount++;
      } else {
        unknownCount++;
      }
    }

    const total = candidates.length;

    // Calculate entropy of the split
    const entropy = (count: number): number => {
      if (count === 0) return 0;
      const p = count / total;
      return -p * Math.log2(p);
    };

    // We want questions that split candidates evenly
    // Best case: 50/50 split
    const yesEntropy = entropy(yesCount);
    const noEntropy = entropy(noCount);
    const sometimesEntropy = entropy(sometimesCount);
    const unknownEntropy = entropy(unknownCount);

    const totalEntropy = yesEntropy + noEntropy + sometimesEntropy + unknownEntropy;

    // Penalize questions with too many unknowns
    const unknownPenalty = unknownCount / total;

    return totalEntropy * (1 - unknownPenalty * 0.5);
  }

  // Get the best next question to ask
  async getBestQuestion(
    answers: Map<number, AnswerType>,
    askedQuestions: number[]
  ): Promise<Question | null> {
    await this.init();
    const candidates = await this.getViableCandidates(answers);

    if (candidates.length === 0) return null;

    // Get all questions not yet asked
    const placeholders = askedQuestions.length > 0
      ? askedQuestions.map(() => '?').join(',')
      : '0';
    const questions = queryAll<Question>(
      `SELECT * FROM questions WHERE id NOT IN (${placeholders})`,
      askedQuestions.length > 0 ? askedQuestions : []
    );

    if (questions.length === 0) return null;

    // Calculate information gain for each question
    let bestQuestion: Question | null = null;
    let bestGain = -1;

    for (const question of questions) {
      const gain = this.calculateInformationGain(question.id, candidates);
      if (gain > bestGain) {
        bestGain = gain;
        bestQuestion = question;
      }
    }

    return bestQuestion;
  }

  // Record a question being asked in a session
  async recordQuestion(
    sessionId: number,
    questionId: number,
    questionOrder: number,
    userAnswer: AnswerType
  ): Promise<void> {
    await this.init();

    run(
      'INSERT OR REPLACE INTO session_questions (session_id, question_id, question_order, user_answer) VALUES (?, ?, ?, ?)',
      [sessionId, questionId, questionOrder, userAnswer]
    );

    run(
      'UPDATE game_sessions SET questions_asked = ? WHERE id = ?',
      [questionOrder, sessionId]
    );

    saveDatabase();
  }

  // Make a guess
  async makeGuess(answers: Map<number, AnswerType>): Promise<Entity | null> {
    const candidates = await this.getCandidateScores(answers);
    if (candidates.length === 0) return null;

    const bestCandidate = candidates[0];
    return this.getEntityById(bestCandidate.entityId);
  }

  // Should we make a guess now?
  async shouldGuess(
    answers: Map<number, AnswerType>,
    questionCount: number,
    maxQuestions: number = 21
  ): Promise<boolean> {
    const candidates = await this.getViableCandidates(answers);

    // Guess if only one candidate left
    if (candidates.length === 1) return true;

    // Guess if we're at max questions
    if (questionCount >= maxQuestions) return true;

    // Guess if top candidate has very high confidence
    if (candidates.length > 0 && candidates[0].score > 0.9) {
      const secondScore = candidates.length > 1 ? candidates[1].score : 0;
      if (candidates[0].score / (secondScore + 0.001) > 10) return true;
    }

    return false;
  }

  // End game with result
  async endGame(
    sessionId: number,
    wasCorrect: boolean,
    guessedEntityId: number | null,
    actualEntityId: number | null
  ): Promise<void> {
    await this.init();

    run(
      "UPDATE game_sessions SET ended_at = datetime('now'), was_correct = ?, guessed_entity_id = ?, actual_entity_id = ? WHERE id = ?",
      [wasCorrect ? 1 : 0, guessedEntityId, actualEntityId, sessionId]
    );

    saveDatabase();
  }

  // Get entity by name (for user reveal)
  async getEntityByName(name: string): Promise<Entity | null> {
    await this.init();
    return queryOne<Entity>(
      'SELECT * FROM entities WHERE LOWER(name) = LOWER(?)',
      [name]
    ) || null;
  }

  // Get entity by ID
  async getEntityById(id: number): Promise<Entity | null> {
    await this.init();
    return queryOne<Entity>('SELECT * FROM entities WHERE id = ?', [id]) || null;
  }

  // Get all entity names for autocomplete
  async getAllEntityNames(): Promise<string[]> {
    await this.init();
    const entities = queryAll<{ name: string }>('SELECT name FROM entities ORDER BY name');
    return entities.map(e => e.name);
  }

  // Get top N guesses
  async getTopGuesses(answers: Map<number, AnswerType>, n: number = 5): Promise<Array<{ entity: Entity; score: number }>> {
    const candidates = (await this.getCandidateScores(answers)).slice(0, n);
    const results: Array<{ entity: Entity; score: number }> = [];

    for (const c of candidates) {
      const entity = await this.getEntityById(c.entityId);
      if (entity) {
        results.push({ entity, score: c.score });
      }
    }

    return results;
  }
}
