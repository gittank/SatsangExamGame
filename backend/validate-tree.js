const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function validate() {
  // Load decision tree
  const treePath = path.join(__dirname, 'data/decision_tree.json');
  const tree = JSON.parse(fs.readFileSync(treePath, 'utf-8'));

  // Load database to get all entities
  const dbPath = path.join(__dirname, 'data', 'knowledge.db');
  const SQL = await initSqlJs();
  const dbBuf = fs.readFileSync(dbPath);
  const db = new SQL.Database(dbBuf);

  const entitiesResult = db.exec('SELECT id, name, category FROM entities ORDER BY id');
  const allEntities = new Map();
  if (entitiesResult.length > 0) {
    for (const row of entitiesResult[0].values) {
      allEntities.set(row[0], { id: row[0], name: row[1], category: row[2] });
    }
  }

  const questionsResult = db.exec('SELECT id, text FROM questions ORDER BY id');
  const allQuestions = new Map();
  if (questionsResult.length > 0) {
    for (const row of questionsResult[0].values) {
      allQuestions.set(row[0], { id: row[0], text: row[1] });
    }
  }

  // Traverse tree
  const reachableEntityIds = new Set();
  const duplicateEntities = [];
  const questionIdsUsed = new Set();
  let emptyLeaves = 0;
  let maxDepth = 0;
  const depthCounts = {};
  const issues = [];

  function traverse(node, depth, pathDesc) {
    if (!node) {
      issues.push('Null node at depth ' + depth + ' | path: ' + pathDesc);
      return;
    }
    if (depth > maxDepth) maxDepth = depth;

    if (node.type === 'entity') {
      if (node.entityId == null) {
        issues.push('Entity node missing entityId at depth ' + depth);
      } else {
        if (reachableEntityIds.has(node.entityId)) {
          const ent = allEntities.get(node.entityId);
          duplicateEntities.push(node.entityId);
          issues.push('DUPLICATE entity ' + node.entityId + ' (' + (ent ? ent.name : '?') + ') at depth ' + depth);
        }
        reachableEntityIds.add(node.entityId);
        if (!allEntities.has(node.entityId)) {
          issues.push('Entity ' + node.entityId + ' in tree but NOT in database');
        }
      }
      if (!depthCounts[depth]) depthCounts[depth] = 0;
      depthCounts[depth]++;
      return;
    }

    if (node.type === 'empty') {
      emptyLeaves++;
      return;
    }

    if (node.type === 'question') {
      if (!node.questionId) {
        issues.push('Question node missing questionId at depth ' + depth);
      } else if (!allQuestions.has(node.questionId)) {
        issues.push('Question ' + node.questionId + ' in tree but NOT in database');
      }
      questionIdsUsed.add(node.questionId);

      if (!node.yesChild) {
        issues.push('Question ' + node.questionId + ' missing yesChild at depth ' + depth);
      }
      if (!node.noChild) {
        issues.push('Question ' + node.questionId + ' missing noChild at depth ' + depth);
      }

      traverse(node.yesChild, depth + 1, pathDesc + ' > Q' + node.questionId + '=Y');
      traverse(node.noChild, depth + 1, pathDesc + ' > Q' + node.questionId + '=N');
      return;
    }

    issues.push('Unknown node type "' + node.type + '" at depth ' + depth);
  }

  traverse(tree, 0, 'root');

  // Find unreachable entities
  const unreachable = [];
  for (const [id, ent] of allEntities) {
    if (!reachableEntityIds.has(id)) {
      unreachable.push(ent);
    }
  }

  // Print report
  console.log('========================================');
  console.log('   DECISION TREE VALIDATION REPORT');
  console.log('========================================\n');

  console.log('SUMMARY');
  console.log('  Total entities in DB:      ' + allEntities.size);
  console.log('  Total questions in DB:     ' + allQuestions.size);
  console.log('  Entities reachable in tree:' + reachableEntityIds.size);
  console.log('  Questions used in tree:    ' + questionIdsUsed.size);
  console.log('  Empty leaves:              ' + emptyLeaves);
  console.log('  Max tree depth:            ' + maxDepth);
  console.log('  Duplicate entity refs:     ' + duplicateEntities.length);
  console.log('  Issues found:              ' + issues.length);

  console.log('\nLEAF DEPTH DISTRIBUTION');
  const sortedDepths = Object.keys(depthCounts).map(Number).sort((a, b) => a - b);
  for (const d of sortedDepths) {
    const bar = '#'.repeat(Math.min(depthCounts[d], 60));
    console.log('  Depth ' + String(d).padStart(2) + ': ' + String(depthCounts[d]).padStart(3) + ' ' + bar);
  }

  if (unreachable.length > 0) {
    console.log('\nUNREACHABLE ENTITIES (' + unreachable.length + ')');
    for (const ent of unreachable) {
      console.log('  [' + ent.id + '] ' + ent.name + ' (' + ent.category + ')');
    }
  } else {
    console.log('\nAll ' + allEntities.size + ' entities are reachable in the tree.');
  }

  if (issues.length > 0) {
    console.log('\nISSUES (' + issues.length + ')');
    for (const issue of issues) {
      console.log('  - ' + issue);
    }
  } else {
    console.log('\nNo issues found. Tree is valid.');
  }

  db.close();
}

validate().catch(err => { console.error(err); process.exit(1); });
