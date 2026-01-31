const http = require('http');

// Helper to make HTTP requests
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/game${path}`,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Load database to get entities and their answers
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function loadEntitiesAndAnswers() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/knowledge.db');
  const dbBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(dbBuffer);

  // Get all entities
  const entities = db.exec('SELECT id, name, category FROM entities ORDER BY id');
  const entitiesMap = new Map();
  if (entities.length > 0) {
    for (const row of entities[0].values) {
      entitiesMap.set(row[0], { id: row[0], name: row[1], category: row[2], answers: new Map() });
    }
  }

  // Get all questions
  const questions = db.exec('SELECT id, text FROM questions ORDER BY id');
  const questionsMap = new Map();
  if (questions.length > 0) {
    for (const row of questions[0].values) {
      questionsMap.set(row[0], row[1]);
    }
  }

  // Get all entity-question answers
  const answers = db.exec('SELECT entity_id, question_id, answer FROM entity_question_answers');
  if (answers.length > 0) {
    for (const row of answers[0].values) {
      const entity = entitiesMap.get(row[0]);
      if (entity) {
        entity.answers.set(row[1], row[2]);
      }
    }
  }

  db.close();
  return { entities: Array.from(entitiesMap.values()), questions: questionsMap };
}

async function playGameForEntity(entity, questionsMap) {
  // Start a new game
  const startRes = await request('POST', '/start');
  const sessionId = startRes.sessionId;

  let questionCount = 0;
  const maxQuestions = 25;

  while (questionCount < maxQuestions) {
    // Get next question or guess
    const questionRes = await request('GET', `/question/${sessionId}`);

    if (questionRes.type === 'guess') {
      // AI made a guess
      const guessedName = questionRes.guess?.name;
      const isCorrect = guessedName?.toLowerCase() === entity.name.toLowerCase();

      // Confirm the guess
      await request('POST', `/guess/${sessionId}`, {
        guessedEntityId: questionRes.guess?.id,
        isCorrect
      });

      return {
        entity: entity.name,
        guessed: guessedName,
        correct: isCorrect,
        questions: questionCount
      };
    }

    if (questionRes.type === 'question') {
      const questionId = questionRes.question.id;
      const questionText = questionRes.question.text;

      // Get the entity's answer for this question
      let answer = entity.answers.get(questionId);

      // Default to 'unknown' if no answer recorded
      if (!answer) {
        answer = 'unknown';
      }

      // Submit the answer
      await request('POST', `/answer/${sessionId}`, { questionId, answer });
      questionCount++;
    } else {
      break;
    }
  }

  return {
    entity: entity.name,
    guessed: null,
    correct: false,
    questions: questionCount,
    error: 'Max questions reached without guess'
  };
}

async function main() {
  console.log('Loading entities and answers from database...\n');
  const { entities, questions } = await loadEntitiesAndAnswers();

  // Filter to only persons
  const persons = entities.filter(e => e.category === 'person');
  console.log(`Found ${persons.length} person entities to test\n`);

  const results = {
    correct: [],
    incorrect: [],
    errors: []
  };

  for (let i = 0; i < persons.length; i++) {
    const entity = persons[i];
    process.stdout.write(`Testing ${i + 1}/${persons.length}: ${entity.name}... `);

    try {
      const result = await playGameForEntity(entity, questions);

      if (result.correct) {
        console.log(`✓ (${result.questions} questions)`);
        results.correct.push(result);
      } else {
        console.log(`✗ Guessed: ${result.guessed || 'none'} (${result.questions} questions)`);
        results.incorrect.push(result);
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.errors.push({ entity: entity.name, error: err.message });
    }

    // Small delay to not overwhelm the server
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total persons tested: ${persons.length}`);
  console.log(`Correct guesses: ${results.correct.length} (${(results.correct.length / persons.length * 100).toFixed(1)}%)`);
  console.log(`Incorrect guesses: ${results.incorrect.length}`);
  console.log(`Errors: ${results.errors.length}`);

  if (results.incorrect.length > 0) {
    console.log('\nIncorrect guesses:');
    for (const r of results.incorrect) {
      console.log(`  - ${r.entity} → guessed ${r.guessed || 'nothing'}`);
    }
  }

  if (results.correct.length > 0) {
    const avgQuestions = results.correct.reduce((sum, r) => sum + r.questions, 0) / results.correct.length;
    console.log(`\nAverage questions for correct guesses: ${avgQuestions.toFixed(1)}`);
  }
}

main().catch(console.error);
