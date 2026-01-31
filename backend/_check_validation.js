const fs = require('fs');
const initSqlJs = require('sql.js');

async function run() {
  // Collect ALL exam text: JSON data + actual exam paper files
  const examText = [];

  const answeredData = JSON.parse(fs.readFileSync('../data/answered_questions.json', 'utf8'));
  const answered = answeredData.questions || answeredData;
  const rawData = JSON.parse(fs.readFileSync('../data/raw_exam_questions.json', 'utf8'));
  const raw = rawData.questions || rawData;

  for (const q of answered) {
    examText.push((q.originalText || '').toLowerCase());
    examText.push((q.answer || '').toLowerCase());
    if (q.entities) examText.push(q.entities.join(' ').toLowerCase());
    if (q.relevantPassages) {
      for (const p of q.relevantPassages) examText.push((typeof p === 'string' ? p : (p.text || '')).toLowerCase());
    }
  }
  for (const q of raw) examText.push((q.text || '').toLowerCase());

  // Include actual exam paper files
  const dirs = ['../exam-papers/pravesh-1-eng', '../exam-papers/pravesh-2-eng'];
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        examText.push(fs.readFileSync(dir + '/' + f, 'utf8').toLowerCase());
      }
    }
  }

  const allExamText = examText.join(' ');

  // Also include the book for the "in book" check
  const bookText = fs.readFileSync('../SatsangReaderPart1.txt', 'utf8').toLowerCase();

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('data/knowledge.db'));
  const res = db.exec('SELECT id, name, category FROM entities ORDER BY category, name');

  const validated = [];
  const notInExams = [];
  const notInBook = [];

  // Known alternate names/spellings
  const aliases = {
    'shukamuni': ['shuk muni', 'shuk'],
    'nilkanth varni': ['nilkanth', 'neelkanth'],
    'akshar deri': ['aksharderi', 'akshar-deri'],
    'akshar purushottam': ['akshar-purushottam'],
    'tilak chandlo': ['tilak-chandlo'],
    'satsangijivanam': ['satsangijivan'],
    'vasant panchmi': ['vasant panchami'],
    'mandir pratishtha': ['murti-pratishtha', 'pratishtha'],
  };

  for (const [id, name, category] of res[0].values) {
    const nameLower = name.toLowerCase();

    // Check if in book
    let inBook = bookText.includes(nameLower);
    if (!inBook) {
      const alts = aliases[nameLower] || [];
      for (const alt of alts) {
        if (bookText.includes(alt)) { inBook = true; break; }
      }
    }
    if (!inBook) {
      const parts = nameLower.split(' ').filter(p => !['swami','maharaj','bhai','ba','ben','das','of'].includes(p));
      for (const part of parts) {
        if (part.length > 3 && bookText.includes(part)) { inBook = true; break; }
      }
    }

    // Check if in exam questions/papers
    let inExams = allExamText.includes(nameLower);
    if (!inExams) {
      const alts = aliases[nameLower] || [];
      for (const alt of alts) {
        if (allExamText.includes(alt)) { inExams = true; break; }
      }
    }
    if (!inExams) {
      const parts = nameLower.split(' ').filter(p => !['swami','maharaj','bhai','ba','ben','das','of'].includes(p));
      for (const part of parts) {
        if (part.length > 3 && allExamText.includes(part)) { inExams = true; break; }
      }
    }

    if (!inBook) {
      notInBook.push({ id, name, category, inExams });
    } else if (!inExams) {
      notInExams.push({ id, name, category });
    } else {
      validated.push({ id, name, category });
    }
  }

  console.log('=== FULLY VALIDATED (in book + in exams): ' + validated.length + ' ===\n');

  console.log('=== NOT IN BOOK (should remove): ' + notInBook.length + ' ===');
  for (const e of notInBook) {
    console.log(e.id + ' | ' + e.name + ' | ' + e.category + (e.inExams ? ' | (but in exams)' : ''));
  }

  console.log('\n=== IN BOOK BUT NOT IN EXAMS: ' + notInExams.length + ' ===');
  for (const e of notInExams) {
    console.log(e.id + ' | ' + e.name + ' | ' + e.category);
  }

  db.close();
}
run();
