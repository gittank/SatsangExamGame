const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function validateAllPaths() {
  const treePath = path.join(__dirname, 'data/decision_tree.json');
  const tree = JSON.parse(fs.readFileSync(treePath, 'utf-8'));

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(path.join(__dirname, 'data/knowledge.db')));

  // Load questions
  const questions = new Map();
  for (const row of db.exec('SELECT id, text FROM questions')[0].values) {
    questions.set(row[0], row[1]);
  }

  // Load entities
  const entities = new Map();
  for (const row of db.exec('SELECT id, name, category FROM entities')[0].values) {
    entities.set(row[0], { id: row[0], name: row[1], category: row[2] });
  }

  // Load all entity-question answers from DB
  const dbAnswers = new Map(); // entityId -> Map(questionId -> answer)
  const ansRes = db.exec('SELECT entity_id, question_id, answer FROM entity_question_answers');
  if (ansRes.length > 0) {
    for (const row of ansRes[0].values) {
      if (!dbAnswers.has(row[0])) dbAnswers.set(row[0], new Map());
      dbAnswers.get(row[0]).set(row[1], row[2]);
    }
  }

  // Load answer matrix
  const matrixPath = path.join(__dirname, '..', 'data', 'answer_matrix.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
  const matrixEntityIds = new Map(); // matrix entity name -> db entity id
  for (let i = 0; i < matrix.entities.length; i++) {
    const eid = matrix.entities[i];
    const displayName = eid.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    for (const [id, ent] of entities) {
      if (ent.name.toLowerCase() === displayName.toLowerCase()) {
        matrixEntityIds.set(eid, id);
        break;
      }
    }
  }

  // Build combined answers: merge DB + matrix
  const allAnswers = new Map(); // entityId -> Map(questionId -> answer)
  // Start with DB answers
  for (const [eid, qmap] of dbAnswers) {
    allAnswers.set(eid, new Map(qmap));
  }
  // Merge matrix answers
  for (let ei = 0; ei < matrix.entities.length; ei++) {
    const dbId = matrixEntityIds.get(matrix.entities[ei]);
    if (!dbId) continue;
    if (!allAnswers.has(dbId)) allAnswers.set(dbId, new Map());
    const answers = allAnswers.get(dbId);
    for (let qi = 0; qi < matrix.questions.length; qi++) {
      const qText = matrix.questions[qi];
      // Find question ID by text
      let qId = null;
      for (const [id, text] of questions) {
        if (text === qText) { qId = id; break; }
      }
      if (!qId) continue;
      if (answers.has(qId)) continue; // DB takes priority
      const val = matrix.matrix[ei][qi];
      if (val === 1) answers.set(qId, 'yes');
      else if (val === 0) answers.set(qId, 'no');
    }
  }

  // Define semantic contradiction rules
  // If an entity answers YES to question A, it should also answer YES/NO to question B
  const contradictionRules = [
    // Category contradictions: if "Is this a person?" = NO, then person-specific questions should not be YES
    { if: { qText: 'Is this a person?', answer: 'no' }, then: { qTexts: [
      'Is this person a sadhu (renunciant sant)?',
      'Is this a devotee (householder/layperson)?',
      'Is this a female?',
      'Is this a deity or divine figure?',
      'Is this person a householder devotee?',
      'Is this person male?',
      'Did this person meet Bhagwan Swaminarayan directly?',
    ], expectedAnswer: 'no', desc: 'Non-person answered YES to person-specific question' }},

    // If "Is this a person?" = YES, then non-person categories should be NO
    { if: { qText: 'Is this a person?', answer: 'yes' }, then: { qTexts: [
      'Is this a mandir (temple)?',
      'Is this a city or town?',
      'Is this an object or item?',
      'Is this a concept or religious term?',
      'Is this an event or incident?',
    ], expectedAnswer: 'no', desc: 'Person answered YES to non-person category' }},

    // If sadhu = YES, then householder should be NO
    { if: { qText: 'Is this person a sadhu (renunciant sant)?', answer: 'yes' }, then: { qTexts: [
      'Is this a devotee (householder/layperson)?',
      'Is this person a householder devotee?',
    ], expectedAnswer: 'no', desc: 'Sadhu also marked as householder' }},

    // If female = YES, then male should be NO
    { if: { qText: 'Is this a female?', answer: 'yes' }, then: { qTexts: [
      'Is this person male?',
    ], expectedAnswer: 'no', desc: 'Marked as both male and female' }},

    // If place = YES, then person-specific should be NO
    { if: { qText: 'Is this a place?', answer: 'yes' }, then: { qTexts: [
      'Is this a person?',
      'Is this an object or item?',
      'Is this a concept or religious term?',
      'Is this an event or incident?',
    ], expectedAnswer: 'no', desc: 'Place also marked as different category' }},
  ];

  // Now traverse tree and validate every path
  const allIssues = [];
  const entityPaths = new Map(); // entityId -> path

  function traverse(node, pathSoFar) {
    if (!node) return;

    if (node.type === 'entity' && node.entityId) {
      entityPaths.set(node.entityId, [...pathSoFar]);
      return;
    }

    if (node.type === 'question' && node.questionId) {
      traverse(node.yesChild, [...pathSoFar, { questionId: node.questionId, answer: 'yes' }]);
      traverse(node.noChild, [...pathSoFar, { questionId: node.questionId, answer: 'no' }]);
    }
  }

  traverse(tree, []);

  // Validate each entity's path
  for (const [entityId, treePath] of entityPaths) {
    const ent = entities.get(entityId);
    if (!ent) continue;
    const entAnswers = allAnswers.get(entityId) || new Map();
    const pathIssues = [];

    // Check 1: Path answers contradict known entity answers
    for (const step of treePath) {
      const qText = questions.get(step.questionId);
      if (!qText) continue;
      const knownAnswer = entAnswers.get(step.questionId);
      if (knownAnswer && knownAnswer !== 'unknown' && knownAnswer !== 'sometimes') {
        if (knownAnswer !== step.answer) {
          pathIssues.push({
            type: 'ANSWER_MISMATCH',
            question: qText,
            treeAnswer: step.answer,
            knownAnswer: knownAnswer,
          });
        }
      }
    }

    // Check 2: Semantic contradictions along the path
    const pathAnswerMap = new Map(); // qText -> answer
    for (const step of treePath) {
      const qText = questions.get(step.questionId);
      if (qText) pathAnswerMap.set(qText, step.answer);
    }

    for (const rule of contradictionRules) {
      const ifAnswer = pathAnswerMap.get(rule.if.qText);
      if (ifAnswer !== rule.if.answer) continue;

      for (const thenQText of rule.then.qTexts) {
        const thenAnswer = pathAnswerMap.get(thenQText);
        if (thenAnswer && thenAnswer !== rule.then.expectedAnswer) {
          pathIssues.push({
            type: 'CONTRADICTION',
            desc: rule.then.desc,
            question1: rule.if.qText + ' = ' + rule.if.answer.toUpperCase(),
            question2: thenQText + ' = ' + thenAnswer.toUpperCase(),
          });
        }
      }
    }

    // Check 3: Duplicate/near-duplicate questions in path
    const pathQTexts = treePath.map(s => questions.get(s.questionId)).filter(Boolean);
    for (let i = 0; i < pathQTexts.length; i++) {
      for (let j = i + 1; j < pathQTexts.length; j++) {
        const a = pathQTexts[i].toLowerCase().replace(/[^a-z0-9 ]/g, '');
        const b = pathQTexts[j].toLowerCase().replace(/[^a-z0-9 ]/g, '');
        // Check for very similar questions
        if (a === b || similarity(a, b) > 0.85) {
          const ansA = treePath[i].answer;
          const ansB = treePath[j].answer;
          pathIssues.push({
            type: ansA !== ansB ? 'DUPLICATE_CONTRADICTS' : 'DUPLICATE_REDUNDANT',
            question1: pathQTexts[i] + ' = ' + ansA.toUpperCase(),
            question2: pathQTexts[j] + ' = ' + ansB.toUpperCase(),
          });
        }
      }
    }

    if (pathIssues.length > 0) {
      allIssues.push({ entity: ent, path: treePath, issues: pathIssues });
    }
  }

  // Print report
  console.log('=============================================');
  console.log('   FULL ENTITY PATH VALIDATION REPORT');
  console.log('=============================================\n');
  console.log('Total entities in tree: ' + entityPaths.size);
  console.log('Entities with issues:   ' + allIssues.length);
  console.log('');

  // Group by issue type
  const byType = {};
  for (const item of allIssues) {
    for (const issue of item.issues) {
      if (!byType[issue.type]) byType[issue.type] = [];
      byType[issue.type].push({ entity: item.entity, issue });
    }
  }

  for (const [type, items] of Object.entries(byType)) {
    console.log('─────────────────────────────────────────────');
    console.log(type + ' (' + items.length + ' issues)');
    console.log('─────────────────────────────────────────────');
    for (const item of items) {
      console.log('\n  Entity: ' + item.entity.name + ' (' + item.entity.category + ')');
      const issue = item.issue;
      if (issue.type === 'ANSWER_MISMATCH') {
        console.log('    Q: ' + issue.question);
        console.log('    Tree path says: ' + issue.treeAnswer.toUpperCase());
        console.log('    Known answer:   ' + issue.knownAnswer.toUpperCase());
      } else if (issue.type === 'CONTRADICTION') {
        console.log('    ' + issue.desc);
        console.log('    ' + issue.question1);
        console.log('    ' + issue.question2);
      } else {
        console.log('    ' + issue.question1);
        console.log('    ' + issue.question2);
      }
    }
    console.log('');
  }

  // Summary of clean entities
  const cleanCount = entityPaths.size - allIssues.length;
  console.log('─────────────────────────────────────────────');
  console.log('SUMMARY');
  console.log('─────────────────────────────────────────────');
  console.log('  Clean entities (no issues): ' + cleanCount + '/' + entityPaths.size);
  console.log('  Entities with issues:       ' + allIssues.length + '/' + entityPaths.size);

  let totalIssues = 0;
  for (const [type, items] of Object.entries(byType)) {
    console.log('    ' + type + ': ' + items.length);
    totalIssues += items.length;
  }
  console.log('  Total issues: ' + totalIssues);

  db.close();
}

// Simple word-overlap similarity
function similarity(a, b) {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  let overlap = 0;
  for (const w of wordsA) { if (wordsB.has(w)) overlap++; }
  return (2 * overlap) / (wordsA.size + wordsB.size);
}

validateAllPaths().catch(err => { console.error(err); process.exit(1); });
