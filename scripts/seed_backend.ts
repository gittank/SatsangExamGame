/**
 * Seed Backend Database with Generated Data
 *
 * Takes the generated entities, questions, and answer matrix
 * and seeds the backend SQLite database for the game.
 */

import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readJson, writeJson } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../backend/data/knowledge.db');
const TREE_PATH = path.join(__dirname, '../backend/data/decision_tree.json');

interface Entity {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  chapter?: number;
}

interface MatrixData {
  entities: string[];
  questions: string[];
  matrix: number[][];
}

interface TreeNode {
  type: 'question' | 'entity' | 'empty';
  questionId?: number;
  questionText?: string;
  entityId?: string | number;
  entityName?: string;
  yesChild?: TreeNode;
  noChild?: TreeNode;
  depth?: number;
}

async function main() {
  console.log('=== Seed Backend Database ===\n');

  // Load generated data
  console.log('Loading generated data...');
  const entitiesData = readJson<{ entities: Entity[] }>('../data/entities.json');
  const matrixData = readJson<MatrixData>('../data/answer_matrix.json');
  const treeData = readJson<{ tree: TreeNode }>('../data/decision_tree.json');

  // Get the entities that are in the matrix
  const matrixEntityIds = new Set(matrixData.entities);
  const entities = entitiesData.entities.filter(e => matrixEntityIds.has(e.id));
  const questions = matrixData.questions;
  const matrix = matrixData.matrix;

  console.log(`Entities in matrix: ${entities.length}`);
  console.log(`Questions: ${questions.length}`);

  // Initialize SQL.js
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Create schema
  console.log('\nCreating database schema...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL UNIQUE,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS entity_question_answers (
      entity_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      answer TEXT NOT NULL,
      confidence REAL DEFAULT 0.9,
      play_count INTEGER DEFAULT 0,
      PRIMARY KEY (entity_id, question_id),
      FOREIGN KEY (entity_id) REFERENCES entities(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT,
      ended_at TEXT,
      questions_asked INTEGER,
      was_correct INTEGER,
      guessed_entity_id INTEGER,
      actual_entity_id INTEGER
    );
  `);

  // Create mappings for string ID to numeric ID
  const entityIdMap = new Map<string, number>();
  const questionIdMap = new Map<string, number>();

  // Insert entities
  console.log('Inserting entities...');
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const matrixIndex = matrixData.entities.indexOf(entity.id);
    if (matrixIndex === -1) continue;

    const escapedName = entity.name.replace(/'/g, "''");
    const escapedDesc = entity.description ? entity.description.replace(/'/g, "''") : '';

    db.run(`INSERT INTO entities (name, category, description) VALUES ('${escapedName}', '${entity.category}', '${escapedDesc}')`);

    const result = db.exec('SELECT last_insert_rowid()');
    const numericId = result[0].values[0][0] as number;
    entityIdMap.set(entity.id, numericId);
  }
  console.log(`  Inserted ${entityIdMap.size} entities`);

  // Insert questions
  console.log('Inserting questions...');
  for (let i = 0; i < questions.length; i++) {
    const questionText = questions[i];
    const escapedText = questionText.replace(/'/g, "''");

    db.run(`INSERT INTO questions (text, category) VALUES ('${escapedText}', 'all')`);

    const result = db.exec('SELECT last_insert_rowid()');
    const numericId = result[0].values[0][0] as number;
    questionIdMap.set(questionText, numericId);
  }
  console.log(`  Inserted ${questionIdMap.size} questions`);

  // Insert entity-question answers from matrix
  console.log('Inserting entity-question answers...');
  let answerCount = 0;

  for (let entityIdx = 0; entityIdx < matrixData.entities.length; entityIdx++) {
    const entityStringId = matrixData.entities[entityIdx];
    const entityNumericId = entityIdMap.get(entityStringId);
    if (!entityNumericId) continue;

    for (let questionIdx = 0; questionIdx < questions.length; questionIdx++) {
      const questionText = questions[questionIdx];
      const questionNumericId = questionIdMap.get(questionText);
      if (!questionNumericId) continue;

      const value = matrix[entityIdx][questionIdx];
      let answer: string;

      if (value === 1) {
        answer = 'yes';
      } else if (value === 0) {
        answer = 'no';
      } else {
        // Skip unknown values (0.5)
        continue;
      }

      db.run(`INSERT INTO entity_question_answers (entity_id, question_id, answer, confidence)
              VALUES (${entityNumericId}, ${questionNumericId}, '${answer}', 0.9)`);
      answerCount++;
    }
  }
  console.log(`  Inserted ${answerCount} answers`);

  // Save database
  console.log('\nSaving database...');
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  console.log(`  Saved to: ${DB_PATH}`);

  // Convert tree to use numeric IDs
  console.log('\nConverting tree to numeric IDs...');
  const convertedTree = convertTreeIds(treeData.tree, entityIdMap, questionIdMap);

  // Save converted tree
  fs.writeFileSync(TREE_PATH, JSON.stringify(convertedTree, null, 2));
  console.log(`  Saved to: ${TREE_PATH}`);

  // Close database
  db.close();

  console.log('\n=== Backend Seeding Complete ===');
  console.log(`Entities: ${entityIdMap.size}`);
  console.log(`Questions: ${questionIdMap.size}`);
  console.log(`Answers: ${answerCount}`);
}

function convertTreeIds(
  node: TreeNode,
  entityIdMap: Map<string, number>,
  questionIdMap: Map<string, number>
): TreeNode {
  if (node.type === 'entity') {
    const stringId = node.entityId as string;
    const numericId = entityIdMap.get(stringId);
    return {
      type: 'entity',
      entityId: numericId || 1,
    };
  }

  if (node.type === 'question') {
    const questionText = node.questionText || '';
    const numericId = questionIdMap.get(questionText);

    return {
      type: 'question',
      questionId: numericId || 1,
      yesChild: node.yesChild ? convertTreeIds(node.yesChild, entityIdMap, questionIdMap) : undefined,
      noChild: node.noChild ? convertTreeIds(node.noChild, entityIdMap, questionIdMap) : undefined,
    };
  }

  return { type: 'empty' };
}

main().catch(console.error);
