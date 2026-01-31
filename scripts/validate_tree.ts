/**
 * Phase 5: Tree Validation
 *
 * Validates the decision tree by simulating games for all entities.
 * Reports coverage, depth statistics, and identifies conflicts.
 *
 * Input:
 *   - ../data/decision_tree.json
 *   - ../data/answer_matrix.json
 *   - ../data/entities.json
 *
 * Output: Console report + ../data/validation_report.json
 */

import { readJson, writeJson, PATHS } from './utils.js';

interface TreeNode {
  type: 'question' | 'entity' | 'empty';
  questionId?: number;
  questionText?: string;
  entityId?: string;
  yesChild?: TreeNode;
  noChild?: TreeNode;
}

interface TreeData {
  tree: TreeNode;
  questionMap: Record<number, string>;
}

interface MatrixData {
  entities: string[];
  questions: string[];
  matrix: number[][];
}

interface Entity {
  id: string;
  name: string;
  category: string;
}

interface SimulationResult {
  entityId: string;
  entityName: string;
  reached: boolean;
  correctGuess: boolean;
  questionsAsked: number;
  path: string[];
  guessedAs?: string;
}

interface ValidationReport {
  summary: {
    totalEntities: number;
    reachableEntities: number;
    correctGuesses: number;
    coverage: number;
    accuracy: number;
    avgQuestionsToGuess: number;
    maxQuestionsToGuess: number;
    minQuestionsToGuess: number;
  };
  depthDistribution: Record<number, number>;
  unreachableEntities: string[];
  incorrectGuesses: Array<{ entity: string; guessedAs: string; questionsAsked: number }>;
  conflicts: Array<{ entities: string[]; distinguishingQuestion?: string }>;
  recommendations: string[];
  results: SimulationResult[];
}

// Simulate a game for a specific entity
function simulateGame(
  tree: TreeNode,
  entityId: string,
  entityIdx: number,
  matrix: number[][],
  questions: string[]
): SimulationResult {
  const path: string[] = [];
  let current = tree;
  let questionsAsked = 0;

  while (current.type === 'question' && questionsAsked < 50) {
    const questionIdx = (current.questionId || 1) - 1; // Convert to 0-indexed
    const questionText = current.questionText || questions[questionIdx];
    const answer = matrix[entityIdx][questionIdx];

    // Determine branch based on answer
    const branch = answer >= 0.5 ? 'yes' : 'no';
    path.push(`Q${current.questionId}: ${questionText} → ${branch}`);

    // Follow branch
    current = branch === 'yes' ? current.yesChild! : current.noChild!;
    questionsAsked++;

    if (!current) {
      break;
    }
  }

  if (!current || current.type === 'empty') {
    return {
      entityId,
      entityName: entityId,
      reached: false,
      correctGuess: false,
      questionsAsked,
      path,
    };
  }

  if (current.type === 'entity') {
    return {
      entityId,
      entityName: entityId,
      reached: true,
      correctGuess: current.entityId === entityId,
      questionsAsked,
      path,
      guessedAs: current.entityId,
    };
  }

  return {
    entityId,
    entityName: entityId,
    reached: false,
    correctGuess: false,
    questionsAsked,
    path,
  };
}

// Find conflicts (entities that can't be distinguished)
function findConflicts(
  entities: string[],
  matrix: number[][]
): Array<{ entities: string[]; distinguishingQuestion?: string }> {
  const conflicts: Array<{ entities: string[]; distinguishingQuestion?: string }> = [];

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      // Check if any question distinguishes these two
      let identical = true;
      for (let q = 0; q < matrix[i].length; q++) {
        const val1 = matrix[i][q] >= 0.5 ? 1 : 0;
        const val2 = matrix[j][q] >= 0.5 ? 1 : 0;
        if (val1 !== val2) {
          identical = false;
          break;
        }
      }

      if (identical) {
        conflicts.push({
          entities: [entities[i], entities[j]],
        });
      }
    }
  }

  return conflicts;
}

// Generate recommendations
function generateRecommendations(
  results: SimulationResult[],
  conflicts: Array<{ entities: string[] }>,
  avgDepth: number
): string[] {
  const recommendations: string[] = [];

  // Coverage issues
  const unreachable = results.filter((r) => !r.reached);
  if (unreachable.length > 0) {
    recommendations.push(
      `${unreachable.length} entities are unreachable. Consider adding more distinguishing questions.`
    );
  }

  // Incorrect guesses
  const incorrect = results.filter((r) => r.reached && !r.correctGuess);
  if (incorrect.length > 0) {
    recommendations.push(
      `${incorrect.length} entities are guessed incorrectly. Review answer matrix for these entities.`
    );
  }

  // Conflicts
  if (conflicts.length > 0) {
    recommendations.push(
      `${conflicts.length} entity pairs are indistinguishable. Add questions that differentiate them.`
    );
  }

  // Depth issues
  if (avgDepth > 15) {
    recommendations.push(
      `Average depth is ${avgDepth.toFixed(1)}. Consider adding more discriminating top-level questions.`
    );
  }

  const deepPaths = results.filter((r) => r.questionsAsked > 20);
  if (deepPaths.length > 0) {
    recommendations.push(
      `${deepPaths.length} entities require >20 questions. Consider rebalancing the tree.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Tree validation passed! All entities are reachable and correctly identified.');
  }

  return recommendations;
}

async function main() {
  console.log('=== Phase 5: Tree Validation ===\n');

  // Load data
  console.log('Loading data...');
  const treeData = readJson<TreeData>(PATHS.decisionTree);
  const matrixData = readJson<MatrixData>(PATHS.answerMatrix);
  const entitiesData = readJson<{ entities: Entity[] }>(PATHS.entities);

  const { tree } = treeData;
  const { entities, questions, matrix } = matrixData;
  const entityList = entitiesData.entities;

  console.log(`Entities: ${entities.length}`);
  console.log(`Questions: ${questions.length}\n`);

  // Simulate game for each entity
  console.log('Simulating games for all entities...\n');
  const results: SimulationResult[] = [];

  for (let i = 0; i < entities.length; i++) {
    const result = simulateGame(tree, entities[i], i, matrix, questions);

    // Add actual name from entities data
    const entityInfo = entityList.find((e) => e.id === entities[i]);
    if (entityInfo) {
      result.entityName = entityInfo.name;
    }

    results.push(result);
  }

  // Calculate statistics
  const reachable = results.filter((r) => r.reached);
  const correct = results.filter((r) => r.correctGuess);
  const questionsAsked = correct.map((r) => r.questionsAsked);

  const summary = {
    totalEntities: entities.length,
    reachableEntities: reachable.length,
    correctGuesses: correct.length,
    coverage: (reachable.length / entities.length) * 100,
    accuracy: reachable.length > 0 ? (correct.length / reachable.length) * 100 : 0,
    avgQuestionsToGuess:
      questionsAsked.length > 0
        ? questionsAsked.reduce((a, b) => a + b, 0) / questionsAsked.length
        : 0,
    maxQuestionsToGuess: questionsAsked.length > 0 ? Math.max(...questionsAsked) : 0,
    minQuestionsToGuess: questionsAsked.length > 0 ? Math.min(...questionsAsked) : 0,
  };

  // Depth distribution
  const depthDistribution: Record<number, number> = {};
  for (const r of correct) {
    depthDistribution[r.questionsAsked] = (depthDistribution[r.questionsAsked] || 0) + 1;
  }

  // Find conflicts
  console.log('Checking for conflicts...');
  const conflicts = findConflicts(entities, matrix);

  // Unreachable and incorrect
  const unreachableEntities = results.filter((r) => !r.reached).map((r) => r.entityId);
  const incorrectGuesses = results
    .filter((r) => r.reached && !r.correctGuess)
    .map((r) => ({
      entity: r.entityId,
      guessedAs: r.guessedAs || 'unknown',
      questionsAsked: r.questionsAsked,
    }));

  // Generate recommendations
  const recommendations = generateRecommendations(results, conflicts, summary.avgQuestionsToGuess);

  // Create report
  const report: ValidationReport = {
    summary,
    depthDistribution,
    unreachableEntities,
    incorrectGuesses,
    conflicts,
    recommendations,
    results,
  };

  // Print report
  console.log('\n========== VALIDATION REPORT ==========\n');

  console.log('SUMMARY:');
  console.log(`  Total entities: ${summary.totalEntities}`);
  console.log(`  Reachable: ${summary.reachableEntities} (${summary.coverage.toFixed(1)}%)`);
  console.log(`  Correct guesses: ${summary.correctGuesses} (${summary.accuracy.toFixed(1)}% accuracy)`);
  console.log(`  Avg questions to guess: ${summary.avgQuestionsToGuess.toFixed(1)}`);
  console.log(`  Min/Max questions: ${summary.minQuestionsToGuess}/${summary.maxQuestionsToGuess}`);

  console.log('\nDEPTH DISTRIBUTION:');
  const sortedDepths = Object.entries(depthDistribution).sort(
    ([a], [b]) => parseInt(a) - parseInt(b)
  );
  for (const [depth, count] of sortedDepths) {
    const bar = '█'.repeat(Math.min(count, 30));
    console.log(`  ${depth.padStart(2)} questions: ${bar} ${count}`);
  }

  if (unreachableEntities.length > 0) {
    console.log(`\nUNREACHABLE ENTITIES (${unreachableEntities.length}):`);
    for (const e of unreachableEntities.slice(0, 10)) {
      console.log(`  - ${e}`);
    }
    if (unreachableEntities.length > 10) {
      console.log(`  ... and ${unreachableEntities.length - 10} more`);
    }
  }

  if (incorrectGuesses.length > 0) {
    console.log(`\nINCORRECT GUESSES (${incorrectGuesses.length}):`);
    for (const g of incorrectGuesses.slice(0, 10)) {
      console.log(`  - ${g.entity} → guessed as ${g.guessedAs}`);
    }
    if (incorrectGuesses.length > 10) {
      console.log(`  ... and ${incorrectGuesses.length - 10} more`);
    }
  }

  if (conflicts.length > 0) {
    console.log(`\nCONFLICTS (${conflicts.length} pairs):`);
    for (const c of conflicts.slice(0, 5)) {
      console.log(`  - ${c.entities.join(' ↔ ')}`);
    }
    if (conflicts.length > 5) {
      console.log(`  ... and ${conflicts.length - 5} more`);
    }
  }

  console.log('\nRECOMMENDATIONS:');
  for (const r of recommendations) {
    console.log(`  • ${r}`);
  }

  console.log('\n========================================\n');

  // Save report
  writeJson('../data/validation_report.json', report);
  console.log('Full report saved to: ../data/validation_report.json');
}

main().catch(console.error);
