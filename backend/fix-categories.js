const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function fixCategories() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/knowledge.db');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Load question IDs by text
  const qRes = db.exec('SELECT id, text FROM questions');
  const qByText = {};
  for (const row of qRes[0].values) qByText[row[1]] = row[0];

  // Key categorical question IDs
  const Q = {
    person:      qByText['Is this a person?'],
    place:       qByText['Is this a place?'],
    object:      qByText['Is this an object or item?'],
    concept:     qByText['Is this a concept or religious term?'],
    event:       qByText['Is this an event or incident?'],
    sadhu:       qByText['Is this person a sadhu (renunciant sant)?'],
    devotee:     qByText['Is this a devotee (householder/layperson)?'],
    householder: qByText['Is this person a householder devotee?'],
    female:      qByText['Is this a female?'],
    deity:       qByText['Is this a deity or divine figure?'],
    mandir:      qByText['Is this a mandir (temple)?'],
    city:        qByText['Is this a city or town?'],
    placeVillage: qByText['Is this place a village or town?'],
  };

  console.log('Category question IDs:', JSON.stringify(Q, null, 2));

  // Load all entities
  const entRes = db.exec('SELECT id, name, category FROM entities');
  const entities = entRes[0].values.map(r => ({ id: r[0], name: r[1], category: r[2] }));

  // Load existing answers
  const existingAnswers = new Map();
  const ansRes = db.exec('SELECT entity_id, question_id, answer FROM entity_question_answers');
  if (ansRes.length > 0) {
    for (const row of ansRes[0].values) {
      const key = row[0] + ':' + row[1];
      existingAnswers.set(key, row[2]);
    }
  }

  function getAnswer(entityId, questionId) {
    return existingAnswers.get(entityId + ':' + questionId) || null;
  }

  function setAnswer(entityId, questionId, answer) {
    if (!questionId) return;
    const existing = getAnswer(entityId, questionId);
    if (existing === answer) return; // Already correct

    const action = existing ? 'UPDATED' : 'SET';
    if (existing && existing !== answer) {
      console.log('  ' + action + ' Q' + questionId + ': ' + existing + ' -> ' + answer);
    }

    if (existing) {
      db.run("UPDATE entity_question_answers SET answer = '" + answer + "' WHERE entity_id = " + entityId + " AND question_id = " + questionId);
    } else {
      db.run("INSERT INTO entity_question_answers (entity_id, question_id, answer, confidence, play_count) VALUES (" + entityId + ", " + questionId + ", '" + answer + "', 0.9, 0)");
    }
    existingAnswers.set(entityId + ':' + questionId, answer);
  }

  let totalFixes = 0;

  // Known sadhus (names ending in Swami, Muni, Das, or known sadhus)
  const sadhuNames = [
    'swami', 'muni', 'anand swami', 'das swami', 'dasji',
  ];
  const knownDeities = ['bhagwan swaminarayan', 'lord shivji', 'lord krishna'];
  const knownFemales = ['laluba', 'jivuba', 'premvati', 'raibai', 'motiba', 'laduba', 'ichhaba', 'punamatiba', 'rajbai', 'antarbai', 'kushalbai'];

  for (const ent of entities) {
    const nameLower = ent.name.toLowerCase();
    const cat = ent.category;
    const fixes = [];

    // Category-based auto-fill
    if (cat === 'person') {
      if (!getAnswer(ent.id, Q.person)) fixes.push([Q.person, 'yes']);
      if (!getAnswer(ent.id, Q.place)) fixes.push([Q.place, 'no']);
      if (!getAnswer(ent.id, Q.object)) fixes.push([Q.object, 'no']);
      if (!getAnswer(ent.id, Q.concept)) fixes.push([Q.concept, 'no']);
      if (!getAnswer(ent.id, Q.event)) fixes.push([Q.event, 'no']);
      if (!getAnswer(ent.id, Q.mandir)) fixes.push([Q.mandir, 'no']);
      if (!getAnswer(ent.id, Q.city)) fixes.push([Q.city, 'no']);

      // Sadhu detection
      const isSadhu = sadhuNames.some(s => nameLower.includes(s)) || nameLower.includes('swamishri');
      const isDeity = knownDeities.some(d => nameLower.includes(d));
      const isFemale = knownFemales.some(f => nameLower.includes(f));

      if (isSadhu) {
        if (!getAnswer(ent.id, Q.sadhu)) fixes.push([Q.sadhu, 'yes']);
        // Sadhus are not householder devotees
        if (getAnswer(ent.id, Q.devotee) === 'yes') fixes.push([Q.devotee, 'no']);
        if (!getAnswer(ent.id, Q.devotee)) fixes.push([Q.devotee, 'no']);
        if (getAnswer(ent.id, Q.householder) === 'yes') fixes.push([Q.householder, 'no']);
        if (!getAnswer(ent.id, Q.householder)) fixes.push([Q.householder, 'no']);
        if (!getAnswer(ent.id, Q.female)) fixes.push([Q.female, 'no']);
      } else if (isDeity) {
        if (!getAnswer(ent.id, Q.deity)) fixes.push([Q.deity, 'yes']);
        if (getAnswer(ent.id, Q.sadhu) === 'yes') fixes.push([Q.sadhu, 'no']);
        if (!getAnswer(ent.id, Q.sadhu)) fixes.push([Q.sadhu, 'no']);
      } else if (isFemale) {
        if (!getAnswer(ent.id, Q.female)) fixes.push([Q.female, 'yes']);
        if (!getAnswer(ent.id, Q.sadhu)) fixes.push([Q.sadhu, 'no']);
      }

    } else if (cat === 'place') {
      if (!getAnswer(ent.id, Q.person)) fixes.push([Q.person, 'no']);
      if (!getAnswer(ent.id, Q.place)) fixes.push([Q.place, 'yes']);
      if (!getAnswer(ent.id, Q.object)) fixes.push([Q.object, 'no']);
      if (!getAnswer(ent.id, Q.concept)) fixes.push([Q.concept, 'no']);
      if (!getAnswer(ent.id, Q.event)) fixes.push([Q.event, 'no']);
      if (!getAnswer(ent.id, Q.sadhu)) fixes.push([Q.sadhu, 'no']);
      if (!getAnswer(ent.id, Q.devotee)) fixes.push([Q.devotee, 'no']);
      if (!getAnswer(ent.id, Q.householder)) fixes.push([Q.householder, 'no']);
      if (!getAnswer(ent.id, Q.female)) fixes.push([Q.female, 'no']);
      if (!getAnswer(ent.id, Q.deity)) fixes.push([Q.deity, 'no']);

    } else if (cat === 'object') {
      if (!getAnswer(ent.id, Q.person)) fixes.push([Q.person, 'no']);
      if (!getAnswer(ent.id, Q.place)) fixes.push([Q.place, 'no']);
      if (!getAnswer(ent.id, Q.object)) fixes.push([Q.object, 'yes']);
      if (!getAnswer(ent.id, Q.concept)) fixes.push([Q.concept, 'no']);
      if (!getAnswer(ent.id, Q.event)) fixes.push([Q.event, 'no']);
      if (!getAnswer(ent.id, Q.sadhu)) fixes.push([Q.sadhu, 'no']);
      if (!getAnswer(ent.id, Q.devotee)) fixes.push([Q.devotee, 'no']);
      if (!getAnswer(ent.id, Q.mandir)) fixes.push([Q.mandir, 'no']);

    } else if (cat === 'concept') {
      if (!getAnswer(ent.id, Q.person)) fixes.push([Q.person, 'no']);
      if (!getAnswer(ent.id, Q.place)) fixes.push([Q.place, 'no']);
      if (!getAnswer(ent.id, Q.object)) fixes.push([Q.object, 'no']);
      if (!getAnswer(ent.id, Q.concept)) fixes.push([Q.concept, 'yes']);
      if (!getAnswer(ent.id, Q.event)) fixes.push([Q.event, 'no']);
      if (!getAnswer(ent.id, Q.sadhu)) fixes.push([Q.sadhu, 'no']);
      if (!getAnswer(ent.id, Q.devotee)) fixes.push([Q.devotee, 'no']);

    } else if (cat === 'event') {
      if (!getAnswer(ent.id, Q.person)) fixes.push([Q.person, 'no']);
      if (!getAnswer(ent.id, Q.place)) fixes.push([Q.place, 'no']);
      if (!getAnswer(ent.id, Q.object)) fixes.push([Q.object, 'no']);
      if (!getAnswer(ent.id, Q.concept)) fixes.push([Q.concept, 'no']);
      if (!getAnswer(ent.id, Q.event)) fixes.push([Q.event, 'yes']);
      if (!getAnswer(ent.id, Q.sadhu)) fixes.push([Q.sadhu, 'no']);
      if (!getAnswer(ent.id, Q.devotee)) fixes.push([Q.devotee, 'no']);
    }

    if (fixes.length > 0) {
      const actualFixes = fixes.filter(([qId, ans]) => getAnswer(ent.id, qId) !== ans);
      if (actualFixes.length > 0) {
        console.log(ent.name + ' (' + cat + '):');
        for (const [qId, answer] of actualFixes) {
          setAnswer(ent.id, qId, answer);
          totalFixes++;
        }
      }
    }
  }

  // Also fix known matrix errors
  console.log('\n--- Fixing known matrix errors ---');

  // Brahmanand Swami: devotee should be no (he's a sadhu)
  const matrix = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'answer_matrix.json'), 'utf-8'));

  const sadhuEntitiesInMatrix = matrix.entities.filter(e =>
    e.includes('swami') || e.includes('muni') || e.includes('anand')
  );

  const devQIdx = matrix.questions.indexOf('Is this a devotee (householder/layperson)?');
  let matrixFixes = 0;
  if (devQIdx >= 0) {
    for (const sadhuName of sadhuEntitiesInMatrix) {
      const idx = matrix.entities.indexOf(sadhuName);
      if (idx >= 0 && matrix.matrix[idx][devQIdx] === 1) {
        console.log('Matrix fix: ' + sadhuName + ' devotee 1 -> 0 (is a sadhu)');
        matrix.matrix[idx][devQIdx] = 0;
        matrixFixes++;
      }
    }
  }

  // Yagnapriyadasji: devotee should be no
  const yagIdx = matrix.entities.indexOf('yagnapriyadasji');
  if (yagIdx >= 0 && devQIdx >= 0 && matrix.matrix[yagIdx][devQIdx] === 1) {
    console.log('Matrix fix: yagnapriyadasji devotee 1 -> 0');
    matrix.matrix[yagIdx][devQIdx] = 0;
    matrixFixes++;
  }

  // Save
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'answer_matrix.json'), JSON.stringify(matrix, null, 2));

  console.log('\n=== DONE ===');
  console.log('DB answers set/updated: ' + totalFixes);
  console.log('Matrix answers fixed: ' + matrixFixes);

  db.close();
}

fixCategories().catch(err => { console.error(err); process.exit(1); });
