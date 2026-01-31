-- Entities from the Satsang Reader book
CREATE TABLE IF NOT EXISTS entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('person', 'place', 'object', 'event', 'concept')),
  description TEXT,
  chapter INTEGER
);

-- Questions that can be asked
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL UNIQUE,
  category TEXT
);

-- Mapping of entities to question answers with learning data
CREATE TABLE IF NOT EXISTS entity_question_answers (
  entity_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  answer TEXT NOT NULL CHECK (answer IN ('yes', 'no', 'sometimes', 'unknown')),
  confidence REAL DEFAULT 0.8,
  play_count INTEGER DEFAULT 0,
  PRIMARY KEY (entity_id, question_id),
  FOREIGN KEY (entity_id) REFERENCES entities(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Game session history for analytics
CREATE TABLE IF NOT EXISTS game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  questions_asked INTEGER DEFAULT 0,
  was_correct BOOLEAN,
  guessed_entity_id INTEGER,
  actual_entity_id INTEGER,
  FOREIGN KEY (guessed_entity_id) REFERENCES entities(id),
  FOREIGN KEY (actual_entity_id) REFERENCES entities(id)
);

-- Track questions asked in each session for learning
CREATE TABLE IF NOT EXISTS session_questions (
  session_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  question_order INTEGER NOT NULL,
  user_answer TEXT NOT NULL CHECK (user_answer IN ('yes', 'no', 'sometimes', 'unknown')),
  PRIMARY KEY (session_id, question_id),
  FOREIGN KEY (session_id) REFERENCES game_sessions(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_entity_category ON entities(category);
CREATE INDEX IF NOT EXISTS idx_eqa_entity ON entity_question_answers(entity_id);
CREATE INDEX IF NOT EXISTS idx_eqa_question ON entity_question_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_sessions_correct ON game_sessions(was_correct);
