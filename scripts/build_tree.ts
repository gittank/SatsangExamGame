/**
 * Phase 4: ID3 Binary Tree Construction
 *
 * Builds an optimal decision tree using the ID3 algorithm
 * with information gain.
 *
 * Input: ../data/answer_matrix.json
 * Output: ../data/decision_tree.json
 */

import { readJson, writeJson, PATHS } from './utils.js';

interface MatrixData {
  entities: string[];
  questions: string[];
  matrix: number[][];
}

interface TreeNode {
  type: 'question' | 'entity' | 'empty';
  questionId?: number;
  questionText?: string;
  entityId?: string;
  entityName?: string;
  yesChild?: TreeNode;
  noChild?: TreeNode;
  depth?: number;
}

interface TreeOutput {
  tree: TreeNode;
  metadata: {
    builtAt: string;
    totalEntities: number;
    totalQuestions: number;
    maxDepth: number;
    avgDepth: number;
  };
  questionMap: Record<number, string>;
  entityMap: Record<string, string>;
}

// Calculate entropy of a set of entities
function entropy(entityIndices: number[], matrix: number[][], questionIdx: number): number {
  if (entityIndices.length === 0) return 0;

  let yesCount = 0;
  let noCount = 0;

  for (const idx of entityIndices) {
    const val = matrix[idx][questionIdx];
    if (val >= 0.5) yesCount++;
    else noCount++;
  }

  const total = entityIndices.length;
  if (yesCount === 0 || noCount === 0) return 0;

  const pYes = yesCount / total;
  const pNo = noCount / total;

  return -pYes * Math.log2(pYes) - pNo * Math.log2(pNo);
}

// Calculate set entropy (how mixed the entities are)
function setEntropy(entityIndices: number[]): number {
  // For a set of entities, max entropy is log2(n)
  if (entityIndices.length <= 1) return 0;
  return Math.log2(entityIndices.length);
}

// Calculate information gain for a question
function informationGain(
  entityIndices: number[],
  questionIdx: number,
  matrix: number[][]
): { gain: number; yesSplit: number[]; noSplit: number[] } {
  if (entityIndices.length === 0) {
    return { gain: 0, yesSplit: [], noSplit: [] };
  }

  // Split entities based on answer
  const yesSplit: number[] = [];
  const noSplit: number[] = [];

  for (const idx of entityIndices) {
    const val = matrix[idx][questionIdx];
    if (val >= 0.5) {
      yesSplit.push(idx);
    } else {
      noSplit.push(idx);
    }
  }

  // If no split occurs, gain is 0
  if (yesSplit.length === 0 || noSplit.length === 0) {
    return { gain: 0, yesSplit, noSplit };
  }

  // Calculate weighted entropy after split
  const total = entityIndices.length;
  const yesEntropy = setEntropy(yesSplit);
  const noEntropy = setEntropy(noSplit);
  const weightedEntropy =
    (yesSplit.length / total) * yesEntropy + (noSplit.length / total) * noEntropy;

  // Information gain
  const parentEntropy = setEntropy(entityIndices);
  const gain = parentEntropy - weightedEntropy;

  return { gain, yesSplit, noSplit };
}

// Find best question to split on
function findBestQuestion(
  entityIndices: number[],
  availableQuestions: Set<number>,
  matrix: number[][]
): { questionIdx: number; gain: number; yesSplit: number[]; noSplit: number[] } | null {
  let bestQuestion = -1;
  let bestGain = -1;
  let bestYesSplit: number[] = [];
  let bestNoSplit: number[] = [];

  for (const qIdx of availableQuestions) {
    const { gain, yesSplit, noSplit } = informationGain(entityIndices, qIdx, matrix);

    // Prefer more balanced splits when gains are similar
    const balance = Math.min(yesSplit.length, noSplit.length) / Math.max(yesSplit.length, noSplit.length);
    const adjustedGain = gain * (0.8 + 0.2 * balance);

    if (adjustedGain > bestGain && yesSplit.length > 0 && noSplit.length > 0) {
      bestGain = adjustedGain;
      bestQuestion = qIdx;
      bestYesSplit = yesSplit;
      bestNoSplit = noSplit;
    }
  }

  if (bestQuestion === -1) {
    return null;
  }

  return {
    questionIdx: bestQuestion,
    gain: bestGain,
    yesSplit: bestYesSplit,
    noSplit: bestNoSplit,
  };
}

// Build tree recursively using ID3
function buildTree(
  entityIndices: number[],
  availableQuestions: Set<number>,
  matrix: number[][],
  entities: string[],
  questions: string[],
  depth: number,
  maxDepth: number
): TreeNode {
  // Base case: no entities
  if (entityIndices.length === 0) {
    return { type: 'empty', depth };
  }

  // Base case: single entity
  if (entityIndices.length === 1) {
    return {
      type: 'entity',
      entityId: entities[entityIndices[0]],
      entityName: entities[entityIndices[0]], // Will be replaced with actual name
      depth,
    };
  }

  // Base case: max depth reached
  if (depth >= maxDepth || availableQuestions.size === 0) {
    // Return most common entity or first one
    return {
      type: 'entity',
      entityId: entities[entityIndices[0]],
      entityName: entities[entityIndices[0]],
      depth,
    };
  }

  // Find best question
  const best = findBestQuestion(entityIndices, availableQuestions, matrix);

  if (!best) {
    // No question can split - return first entity
    return {
      type: 'entity',
      entityId: entities[entityIndices[0]],
      entityName: entities[entityIndices[0]],
      depth,
    };
  }

  // Remove used question
  const remainingQuestions = new Set(availableQuestions);
  remainingQuestions.delete(best.questionIdx);

  // Build subtrees
  const yesChild = buildTree(
    best.yesSplit,
    remainingQuestions,
    matrix,
    entities,
    questions,
    depth + 1,
    maxDepth
  );

  const noChild = buildTree(
    best.noSplit,
    remainingQuestions,
    matrix,
    entities,
    questions,
    depth + 1,
    maxDepth
  );

  return {
    type: 'question',
    questionId: best.questionIdx + 1, // 1-indexed
    questionText: questions[best.questionIdx],
    yesChild,
    noChild,
    depth,
  };
}

// Calculate tree statistics
function analyzeTree(tree: TreeNode): { maxDepth: number; avgDepth: number; entityCount: number } {
  const depths: number[] = [];

  function traverse(node: TreeNode, depth: number) {
    if (node.type === 'entity') {
      depths.push(depth);
    } else if (node.type === 'question') {
      if (node.yesChild) traverse(node.yesChild, depth + 1);
      if (node.noChild) traverse(node.noChild, depth + 1);
    }
  }

  traverse(tree, 0);

  return {
    maxDepth: Math.max(...depths, 0),
    avgDepth: depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0,
    entityCount: depths.length,
  };
}

// Get all entities reachable in tree
function getReachableEntities(tree: TreeNode): Set<string> {
  const entities = new Set<string>();

  function traverse(node: TreeNode) {
    if (node.type === 'entity' && node.entityId) {
      entities.add(node.entityId);
    } else if (node.type === 'question') {
      if (node.yesChild) traverse(node.yesChild);
      if (node.noChild) traverse(node.noChild);
    }
  }

  traverse(tree);
  return entities;
}

async function main() {
  console.log('=== Phase 4: Build Decision Tree ===\n');

  // Load matrix
  console.log('Loading answer matrix...');
  const matrixData = readJson<MatrixData>(PATHS.answerMatrix);
  const { entities, questions, matrix } = matrixData;

  console.log(`Entities: ${entities.length}`);
  console.log(`Questions: ${questions.length}`);
  console.log(`Matrix size: ${matrix.length} × ${matrix[0]?.length || 0}\n`);

  // Build tree
  console.log('Building tree using ID3 algorithm...');
  const allEntityIndices = entities.map((_, i) => i);
  const allQuestionIndices = new Set(questions.map((_, i) => i));

  const tree = buildTree(
    allEntityIndices,
    allQuestionIndices,
    matrix,
    entities,
    questions,
    0,
    25 // Max depth
  );

  // Analyze tree
  const stats = analyzeTree(tree);
  console.log(`\nTree statistics:`);
  console.log(`  Max depth: ${stats.maxDepth}`);
  console.log(`  Avg depth: ${stats.avgDepth.toFixed(2)}`);
  console.log(`  Entities in tree: ${stats.entityCount}`);

  // Check coverage
  const reachable = getReachableEntities(tree);
  const unreachable = entities.filter((e) => !reachable.has(e));
  console.log(`\nCoverage: ${reachable.size}/${entities.length} entities reachable`);
  if (unreachable.length > 0) {
    console.log(`Unreachable entities: ${unreachable.slice(0, 10).join(', ')}${unreachable.length > 10 ? '...' : ''}`);
  }

  // Create question and entity maps
  const questionMap: Record<number, string> = {};
  questions.forEach((q, i) => {
    questionMap[i + 1] = q;
  });

  const entityMap: Record<string, string> = {};
  entities.forEach((e) => {
    entityMap[e] = e; // Placeholder - would map ID to display name
  });

  // Create output
  const output: TreeOutput = {
    tree,
    metadata: {
      builtAt: new Date().toISOString(),
      totalEntities: entities.length,
      totalQuestions: questions.length,
      maxDepth: stats.maxDepth,
      avgDepth: stats.avgDepth,
    },
    questionMap,
    entityMap,
  };

  // Write output
  writeJson(PATHS.decisionTree, output);

  // Also copy to backend
  writeJson(PATHS.backendTree, output);

  console.log('\n=== Tree Build Complete ===');
  console.log(`Decision tree saved to: ${PATHS.decisionTree}`);
  console.log(`Backend tree saved to: ${PATHS.backendTree}`);
}

main().catch(console.error);
