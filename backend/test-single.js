const http = require('http');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost', port: 3001,
      path: `/api/game${reqPath}`, method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testEntity(entityName) {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/knowledge.db');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  const result = db.exec(`
    SELECT q.id, q.text, a.answer
    FROM entities e
    JOIN entity_question_answers a ON e.id = a.entity_id
    JOIN questions q ON q.id = a.question_id
    WHERE LOWER(e.name) = LOWER('${entityName}')
  `);

  const answers = new Map();
  if (result.length > 0) {
    for (const row of result[0].values) {
      answers.set(row[0], row[2]);
    }
  }
  console.log(`Entity "${entityName}" has ${answers.size} known answers\n`);
  db.close();

  const startRes = await request('POST', '/start');
  const sessionId = startRes.sessionId;
  let questionCount = 0;

  while (questionCount < 25) {
    const qRes = await request('GET', `/question/${sessionId}`);

    if (qRes.type === 'guess') {
      const guessName = qRes.guess ? qRes.guess.name : 'none';
      const isCorrect = guessName.toLowerCase() === entityName.toLowerCase();
      console.log(`\n--- RESULT ---`);
      console.log(`Target: ${entityName}`);
      console.log(`Guessed: ${guessName}`);
      console.log(`Correct: ${isCorrect ? 'YES' : 'NO'}`);
      console.log(`Questions asked: ${questionCount}`);
      return isCorrect;
    }

    const answer = answers.get(qRes.question.id) || 'unknown';
    console.log(`Q${questionCount + 1}: ${qRes.question.text} -> ${answer}`);
    await request('POST', `/answer/${sessionId}`, { questionId: qRes.question.id, answer });
    questionCount++;
  }
  return false;
}

const target = process.argv[2] || 'Prasad';
testEntity(target).catch(console.error);
