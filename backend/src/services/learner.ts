import { getDatabase, saveDatabase, run, queryAll, queryOne } from '../db/database';
import { AnswerType } from '../types';

export class Learner {
  private learningRate: number = 0.1;
  private initialized = false;

  async init(): Promise<void> {
    if (!this.initialized) {
      await getDatabase();
      this.initialized = true;
    }
  }

  // Update confidence scores based on game result
  async updateFromGame(
    sessionId: number,
    actualEntityId: number,
    wasCorrect: boolean
  ): Promise<void> {
    await this.init();

    // Get all questions asked in this session
    const sessionQuestions = queryAll<{ question_id: number; user_answer: string }>(
      'SELECT question_id, user_answer FROM session_questions WHERE session_id = ?',
      [sessionId]
    );

    for (const sq of sessionQuestions) {
      // Get current answer data
      const current = queryOne<{ answer: string; confidence: number; play_count: number }>(
        'SELECT answer, confidence, play_count FROM entity_question_answers WHERE entity_id = ? AND question_id = ?',
        [actualEntityId, sq.question_id]
      );

      if (current) {
        // Update existing record
        const newPlayCount = current.play_count + 1;

        // Adaptive learning rate - decreases as we get more data
        const adaptiveLR = this.learningRate / Math.sqrt(newPlayCount);

        let newConfidence = current.confidence;
        if (current.answer === sq.user_answer) {
          // User answer matches stored answer - increase confidence
          newConfidence = Math.min(0.99, current.confidence + adaptiveLR);
        } else {
          // Mismatch - decrease confidence
          newConfidence = Math.max(0.01, current.confidence - adaptiveLR);
        }

        run(
          'UPDATE entity_question_answers SET confidence = ?, play_count = ? WHERE entity_id = ? AND question_id = ?',
          [newConfidence, newPlayCount, actualEntityId, sq.question_id]
        );
      } else {
        // Insert new record based on user answer
        run(
          'INSERT INTO entity_question_answers (entity_id, question_id, answer, confidence, play_count) VALUES (?, ?, ?, ?, 1)',
          [actualEntityId, sq.question_id, sq.user_answer, 0.7]
        );
      }
    }

    saveDatabase();
  }

  // Add a new entity to the database
  async addEntity(
    name: string,
    category: string,
    description: string | null = null
  ): Promise<number> {
    await this.init();

    const result = run(
      'INSERT INTO entities (name, category, description) VALUES (?, ?, ?)',
      [name, category, description]
    );

    saveDatabase();
    return result.lastInsertRowid;
  }

  // Check if entity exists
  async entityExists(name: string): Promise<boolean> {
    await this.init();
    const entity = queryOne<{ id: number }>(
      'SELECT id FROM entities WHERE LOWER(name) = LOWER(?)',
      [name]
    );
    return !!entity;
  }

  // Add a new question to the database
  async addQuestion(text: string, category: string | null = null): Promise<number> {
    await this.init();

    // Check if question already exists
    const existing = queryOne<{ id: number }>(
      'SELECT id FROM questions WHERE LOWER(text) = LOWER(?)',
      [text]
    );

    if (existing) return existing.id;

    const result = run(
      'INSERT INTO questions (text, category) VALUES (?, ?)',
      [text, category]
    );

    saveDatabase();
    return result.lastInsertRowid;
  }

  // Add entity-question answer
  async addEntityAnswer(
    entityId: number,
    questionId: number,
    answer: AnswerType,
    confidence: number = 0.8
  ): Promise<void> {
    await this.init();

    run(
      'INSERT OR REPLACE INTO entity_question_answers (entity_id, question_id, answer, confidence, play_count) VALUES (?, ?, ?, ?, 1)',
      [entityId, questionId, answer, confidence]
    );

    saveDatabase();
  }

  // Learn from a failed game - user provides correct answer and distinguishing questions
  async learnFromFailure(
    sessionId: number,
    correctEntityName: string,
    correctEntityCategory: string,
    newQuestions: Array<{ text: string; answer: AnswerType }>
  ): Promise<{ entityId: number; newQuestionIds: number[] }> {
    await this.init();

    // Add entity if it doesn't exist
    let entityId: number;
    const existingEntity = queryOne<{ id: number }>(
      'SELECT id FROM entities WHERE LOWER(name) = LOWER(?)',
      [correctEntityName]
    );

    if (existingEntity) {
      entityId = existingEntity.id;
    } else {
      entityId = await this.addEntity(correctEntityName, correctEntityCategory);
    }

    // Update game session with actual entity
    run(
      'UPDATE game_sessions SET actual_entity_id = ? WHERE id = ?',
      [entityId, sessionId]
    );

    // Update confidence from session questions
    await this.updateFromGame(sessionId, entityId, false);

    // Add new questions and answers
    const newQuestionIds: number[] = [];
    for (const q of newQuestions) {
      const questionId = await this.addQuestion(q.text);
      newQuestionIds.push(questionId);
      await this.addEntityAnswer(entityId, questionId, q.answer);
    }

    saveDatabase();
    return { entityId, newQuestionIds };
  }

  // Get game statistics
  async getStats(): Promise<{
    totalGames: number;
    correctGuesses: number;
    accuracy: number;
    averageQuestions: number;
  }> {
    await this.init();

    const stats = queryOne<{
      totalGames: number;
      correctGuesses: number;
      averageQuestions: number;
    }>(`
      SELECT
        COUNT(*) as totalGames,
        SUM(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) as correctGuesses,
        AVG(questions_asked) as averageQuestions
      FROM game_sessions
      WHERE ended_at IS NOT NULL
    `);

    return {
      totalGames: stats?.totalGames || 0,
      correctGuesses: stats?.correctGuesses || 0,
      accuracy: (stats?.totalGames || 0) > 0 ? ((stats?.correctGuesses || 0) / stats!.totalGames) * 100 : 0,
      averageQuestions: stats?.averageQuestions || 0
    };
  }
}
