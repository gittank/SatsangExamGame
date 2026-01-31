const fs = require('fs');

async function run() {
  // Load exam questions
  const answeredData = JSON.parse(fs.readFileSync('../data/answered_questions.json', 'utf8'));
  const rawData = JSON.parse(fs.readFileSync('../data/raw_exam_questions.json', 'utf8'));
  const answered = answeredData.questions || answeredData;
  const raw = rawData.questions || rawData;
  
  // Collect all entity mentions from exam questions
  const examEntities = new Set();
  const examText = [];
  
  for (const q of answered) {
    if (q.entities) {
      for (const e of q.entities) examEntities.add(e.toLowerCase().trim());
    }
    if (q.answer) examEntities.add(q.answer.toLowerCase().trim());
    examText.push((q.originalText || '').toLowerCase());
    examText.push((q.answer || '').toLowerCase());
    if (q.relevantPassages) {
      for (const p of q.relevantPassages) examText.push((p.text || p || '').toLowerCase());
    }
  }
  
  for (const q of raw) {
    examText.push((q.text || '').toLowerCase());
  }
  
  const allExamText = examText.join(' ');
  
  // Load DB entities
  const SQL = await require('sql.js')();
  const db = new SQL.Database(fs.readFileSync('data/knowledge.db'));
  const res = db.exec('SELECT id, name, category FROM entities ORDER BY category, name');
  
  const validated = [];
  const notValidated = [];
  
  for (const [id, name, category] of res[0].values) {
    const nameLower = name.toLowerCase();
    let found = examEntities.has(nameLower);
    
    if (!found) {
      const parts = nameLower.split(' ');
      for (const part of parts) {
        if (part.length > 3 && examEntities.has(part)) { found = true; break; }
      }
    }
    
    if (!found) {
      found = allExamText.includes(nameLower);
    }
    
    if (!found) {
      const parts = nameLower.split(' ').filter(p => !['swami','maharaj','bhai','ba','ben','das'].includes(p));
      for (const part of parts) {
        if (part.length > 3 && allExamText.includes(part)) { found = true; break; }
      }
    }
    
    if (found) {
      validated.push({ id, name, category });
    } else {
      notValidated.push({ id, name, category });
    }
  }
  
  console.log('=== VALIDATED BY EXAM QUESTIONS (' + validated.length + ') ===');
  for (const e of validated) {
    console.log(e.id + ' | ' + e.name + ' | ' + e.category);
  }
  
  console.log('');
  console.log('=== NOT VALIDATED BY EXAM QUESTIONS (' + notValidated.length + ') ===');
  for (const e of notValidated) {
    console.log(e.id + ' | ' + e.name + ' | ' + e.category);
  }
}
run();
