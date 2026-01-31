/**
 * Optimize Decision Tree
 *
 * Rebuilds the decision tree with question prioritization:
 * - Generic questions (category, subcategory) at top levels
 * - Specific questions (who_said, action) at lower levels
 *
 * Run: npx tsx optimize_tree.ts
 */

import { readJson, writeJson, PATHS } from './utils.js';

interface Question {
  id: number;
  text: string;
  type: string;
  category: string;
  source: string;
}

interface TreeNode {
  type: 'question' | 'entity' | 'empty';
  questionId?: number;
  questionText?: string;
  entityId?: string;
  yesChild?: TreeNode;
  noChild?: TreeNode;
}

interface MatrixData {
  entities: string[];
  questions: string[];
  matrix: number[][];
}

// Question specificity levels (lower = more generic, ask first)
const QUESTION_PRIORITY: Record<string, number> = {
  'category': 1,      // Is this a person? Is this an object?
  'subcategory': 2,   // Is this a sadhu? Is this a devotee? Is this female?
  'chapter': 3,       // Is this from chapter X?
  'attribute': 4,     // Is this associated with music?
  'relationship': 5,  // Was this person a disciple of X?
  'event': 6,         // Did this person attend X event?
  'action': 7,        // Did this person do X?
  'who_said': 8,      // Did this person say "X"?
};

// Get priority for a question (lower = prefer earlier in tree)
function getQuestionPriority(question: Question): number {
  return QUESTION_PRIORITY[question.category] || 5;
}

// Calculate entropy
function entropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  let ent = 0;
  for (const count of counts) {
    if (count > 0) {
      const p = count / total;
      ent -= p * Math.log2(p);
    }
  }
  return ent;
}

// Calculate information gain for a question
function informationGain(
  entityIndices: number[],
  questionIndex: number,
  matrix: number[][]
): { gain: number; yesCandidates: number[]; noCandidates: number[]; unknownCandidates: number[] } {
  const yesCandidates: number[] = [];
  const noCandidates: number[] = [];
  const unknownCandidates: number[] = [];

  for (const idx of entityIndices) {
    const answer = matrix[idx][questionIndex];
    if (answer === 1) {
      yesCandidates.push(idx);
    } else if (answer === 0) {
      noCandidates.push(idx);
    } else {
      unknownCandidates.push(idx);
    }
  }

  const total = entityIndices.length;
  const currentEntropy = Math.log2(total); // Uniform distribution entropy

  // Weighted entropy after split
  const yesEnt = yesCandidates.length > 0 ? Math.log2(yesCandidates.length) : 0;
  const noEnt = noCandidates.length > 0 ? Math.log2(noCandidates.length) : 0;
  const unkEnt = unknownCandidates.length > 0 ? Math.log2(unknownCandidates.length) : 0;

  const weightedEntropy =
    (yesCandidates.length / total) * yesEnt +
    (noCandidates.length / total) * noEnt +
    (unknownCandidates.length / total) * unkEnt;

  const gain = currentEntropy - weightedEntropy;

  return { gain, yesCandidates, noCandidates, unknownCandidates };
}

// Select best question with priority-aware scoring
function selectBestQuestion(
  entityIndices: number[],
  availableQuestions: number[],
  matrix: number[][],
  questions: Question[],
  depth: number
): { questionIndex: number; yesCandidates: number[]; noCandidates: number[]; unknownCandidates: number[] } | null {

  let bestScore = -Infinity;
  let bestQuestion: {
    questionIndex: number;
    yesCandidates: number[];
    noCandidates: number[];
    unknownCandidates: number[];
  } | null = null;

  // Small bonus for generic questions at shallow depths
  // Decays with depth so specific questions are preferred deeper in tree
  const depthFactor = Math.max(0, 3 - depth); // 3, 2, 1, 0, 0...
  const priorityWeight = 0.1 * depthFactor; // Small weight

  for (const qIdx of availableQuestions) {
    const result = informationGain(entityIndices, qIdx, matrix);

    // Skip questions that don't split at all
    if (result.gain <= 0) continue;

    // Skip questions where all candidates go to one branch
    const maxBranch = Math.max(
      result.yesCandidates.length,
      result.noCandidates.length,
      result.unknownCandidates.length
    );
    if (maxBranch === entityIndices.length) continue;

    // Get question priority (1-8, lower is more generic)
    const question = questions[qIdx];
    const priority = getQuestionPriority(question);

    // Small bonus for generic questions (priority 1-3) at shallow depths
    const priorityBonus = priority <= 3 ? priorityWeight : 0;

    // Combined score: information gain + small priority bonus
    const score = result.gain + priorityBonus;

    if (score > bestScore) {
      bestScore = score;
      bestQuestion = {
        questionIndex: qIdx,
        ...result
      };
    }
  }

  return bestQuestion;
}

// Build optimized tree recursively
function buildOptimizedTree(
  entityIndices: number[],
  availableQuestions: number[],
  entities: string[],
  questions: Question[],
  questionTexts: string[],
  matrix: number[][],
  depth: number = 0,
  maxDepth: number = 20
): TreeNode {
  // Base cases
  if (entityIndices.length === 0) {
    return { type: 'empty' };
  }

  if (entityIndices.length === 1) {
    return { type: 'entity', entityId: entities[entityIndices[0]] };
  }

  if (depth >= maxDepth || availableQuestions.length === 0) {
    // Return first entity if we can't split further
    return { type: 'entity', entityId: entities[entityIndices[0]] };
  }

  // Select best question with priority awareness
  const best = selectBestQuestion(entityIndices, availableQuestions, matrix, questions, depth);

  if (!best) {
    return { type: 'entity', entityId: entities[entityIndices[0]] };
  }

  // Remove used question
  const remainingQuestions = availableQuestions.filter(q => q !== best.questionIndex);

  // Combine yes and unknown candidates for yes branch (treat unknown as yes)
  const yesBranchCandidates = [...best.yesCandidates, ...best.unknownCandidates];

  // Build subtrees
  const node: TreeNode = {
    type: 'question',
    questionId: best.questionIndex + 1, // 1-indexed
    questionText: questionTexts[best.questionIndex],
    yesChild: buildOptimizedTree(
      yesBranchCandidates,
      remainingQuestions,
      entities,
      questions,
      questionTexts,
      matrix,
      depth + 1,
      maxDepth
    ),
    noChild: buildOptimizedTree(
      best.noCandidates,
      remainingQuestions,
      entities,
      questions,
      questionTexts,
      matrix,
      depth + 1,
      maxDepth
    ),
  };

  return node;
}

// Calculate tree statistics
function getTreeStats(node: TreeNode, depth: number = 0): { maxDepth: number; depths: number[]; entityCount: number } {
  if (node.type === 'entity') {
    return { maxDepth: depth, depths: [depth], entityCount: 1 };
  }
  if (node.type === 'empty') {
    return { maxDepth: depth, depths: [], entityCount: 0 };
  }

  const yesStats = node.yesChild ? getTreeStats(node.yesChild, depth + 1) : { maxDepth: depth, depths: [], entityCount: 0 };
  const noStats = node.noChild ? getTreeStats(node.noChild, depth + 1) : { maxDepth: depth, depths: [], entityCount: 0 };

  return {
    maxDepth: Math.max(yesStats.maxDepth, noStats.maxDepth),
    depths: [...yesStats.depths, ...noStats.depths],
    entityCount: yesStats.entityCount + noStats.entityCount
  };
}

// Get questions used at each depth level
function getQuestionsByDepth(node: TreeNode, questions: Question[], depth: number = 0): Map<number, Question[]> {
  const result = new Map<number, Question[]>();

  function traverse(n: TreeNode, d: number) {
    if (n.type === 'question' && n.questionId) {
      const q = questions[n.questionId - 1];
      if (!result.has(d)) result.set(d, []);
      result.get(d)!.push(q);

      if (n.yesChild) traverse(n.yesChild, d + 1);
      if (n.noChild) traverse(n.noChild, d + 1);
    }
  }

  traverse(node, 0);
  return result;
}

// Main optimization function
async function optimizeTree() {
  console.log('=== Optimize Decision Tree ===\n');

  // Load data
  console.log('Loading data...');
  const matrixData = readJson<MatrixData>(PATHS.answerMatrix);
  const questionsData = readJson<{ questions: Question[] }>(PATHS.binaryQuestions);

  const { entities, questions: questionTexts, matrix } = matrixData;
  const questions = questionsData.questions;

  console.log(`Entities: ${entities.length}`);
  console.log(`Questions: ${questions.length}`);

  // Show question category distribution
  console.log('\nQuestion categories:');
  const catCounts: Record<string, number> = {};
  for (const q of questions) {
    catCounts[q.category] = (catCounts[q.category] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(catCounts).sort((a, b) => (QUESTION_PRIORITY[a[0]] || 5) - (QUESTION_PRIORITY[b[0]] || 5))) {
    console.log(`  ${cat}: ${count} (priority ${QUESTION_PRIORITY[cat] || 5})`);
  }

  // Build optimized tree
  console.log('\nBuilding optimized tree...');
  const entityIndices = entities.map((_, i) => i);
  const questionIndices = questions.map((_, i) => i);

  const tree = buildOptimizedTree(
    entityIndices,
    questionIndices,
    entities,
    questions,
    questionTexts,
    matrix
  );

  // Calculate stats
  const stats = getTreeStats(tree);
  const avgDepth = stats.depths.reduce((a, b) => a + b, 0) / stats.depths.length;

  console.log('\nTree statistics:');
  console.log(`  Max depth: ${stats.maxDepth}`);
  console.log(`  Avg depth: ${avgDepth.toFixed(2)}`);
  console.log(`  Entities in tree: ${stats.entityCount}`);

  // Show questions by depth
  const qByDepth = getQuestionsByDepth(tree, questions);
  console.log('\nQuestions by depth level:');
  for (const [depth, qs] of Array.from(qByDepth.entries()).sort((a, b) => a[0] - b[0])) {
    const categories = qs.map(q => q.category);
    const uniqueCats = [...new Set(categories)];
    console.log(`  Depth ${depth}: ${qs.length} questions - categories: ${uniqueCats.join(', ')}`);
  }

  // Build question map
  const questionMap: Record<number, string> = {};
  for (let i = 0; i < questionTexts.length; i++) {
    questionMap[i + 1] = questionTexts[i]; // 1-indexed
  }

  // Save tree
  const treeOutput = {
    tree,
    questionMap,
    metadata: {
      builtAt: new Date().toISOString(),
      algorithm: 'ID3 with priority-weighted question selection',
      totalEntities: entities.length,
      totalQuestions: questions.length,
      maxDepth: stats.maxDepth,
      avgDepth: avgDepth
    }
  };

  writeJson(PATHS.decisionTree, treeOutput);
  writeJson(PATHS.backendTree, treeOutput);

  console.log('\n=== Optimization Complete ===');
  console.log(`Saved to: ${PATHS.decisionTree}`);
  console.log(`Backend copy: ${PATHS.backendTree}`);

  // Validate coverage
  console.log('\nValidating coverage...');
  const reachable = new Set<string>();
  function collectEntities(node: TreeNode) {
    if (node.type === 'entity' && node.entityId) {
      reachable.add(node.entityId);
    } else if (node.type === 'question') {
      if (node.yesChild) collectEntities(node.yesChild);
      if (node.noChild) collectEntities(node.noChild);
    }
  }
  collectEntities(tree);

  console.log(`Coverage: ${reachable.size}/${entities.length} entities reachable`);

  if (reachable.size < entities.length) {
    const missing = entities.filter(e => !reachable.has(e));
    console.log(`Missing: ${missing.join(', ')}`);
  }
}

optimizeTree().catch(console.error);
