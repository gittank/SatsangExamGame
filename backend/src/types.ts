export type EntityCategory = 'person' | 'place' | 'object' | 'event' | 'concept';
export type AnswerType = 'yes' | 'no' | 'sometimes' | 'unknown';

export interface Entity {
  id: number;
  name: string;
  category: EntityCategory;
  description: string | null;
  chapter: number | null;
}

export interface Question {
  id: number;
  text: string;
  category: string | null;
}

export interface EntityQuestionAnswer {
  entity_id: number;
  question_id: number;
  answer: AnswerType;
  confidence: number;
  play_count: number;
}

export interface GameSession {
  id: number;
  started_at: string;
  ended_at: string | null;
  questions_asked: number;
  was_correct: boolean | null;
  guessed_entity_id: number | null;
  actual_entity_id: number | null;
}

export interface GameState {
  sessionId: number;
  questionCount: number;
  candidates: number[];
  askedQuestions: number[];
  answers: Map<number, AnswerType>;
}

export interface CandidateScore {
  entityId: number;
  score: number;
}
