/**
 * Fix conflicts found by validate_tree.ts.
 * Changes UNKNOWN (0.5) to NO (0) where entities are indistinguishable.
 *
 * Conflicts to fix:
 * 1. muktanand_swami ↔ akhandanand_swami: akhandanand q13=0.5→0
 * 2. gunatitanand_swami ↔ ramanand_swami: ramanand q17=0.5→0
 * 3. pramukh_swami_maharaj ↔ mahant_swami_maharaj: mahant q14=0.5→0
 * 4. somla_khachar ↔ bhaguji: somla q103=0.5→0
 * 5. ardeshar_kotwal ↔ naja_jogia: naja q18=0.5→0
 */

import { readJson, writeJson, PATHS } from './utils.js';

interface MatrixData {
  entities: string[];
  questions: string[];
  matrix: number[][];
  evidence: Record<string, Record<string, any>>;
  metadata: any;
}

const FIXES: Array<{ entityId: string; questionIndex: number; newValue: number; reason: string }> = [
  {
    entityId: 'akhandanand_swami',
    questionIndex: 13,  // "Associated with poetry/writing?"
    newValue: 0,        // NO - not a poet
    reason: 'Distinguish from muktanand_swami (who IS a poet)',
  },
  {
    entityId: 'ramanand_swami',
    questionIndex: 17,  // "Related to BAPS?"
    newValue: 0,        // NO - predates BAPS
    reason: 'Distinguish from gunatitanand_swami (who IS related to BAPS)',
  },
  {
    entityId: 'mahant_swami_maharaj',
    questionIndex: 14,  // "Associated with building/construction?"
    newValue: 0,        // NO - not primarily known for building
    reason: 'Distinguish from pramukh_swami_maharaj (who built 1100+ mandirs)',
  },
  {
    entityId: 'somla_khachar',
    questionIndex: 103, // "Never doubt Maharaj?"
    newValue: 0,        // NO - insufficient evidence
    reason: 'Distinguish from bhaguji (who was always with Maharaj)',
  },
  {
    entityId: 'naja_jogia',
    questionIndex: 18,  // "Different faith/background?"
    newValue: 0,        // NO - not from a different faith
    reason: 'Distinguish from ardeshar_kotwal (who was a Parsi official)',
  },
];

async function main() {
  console.log('=== Fixing Conflicts in Answer Matrix ===\n');

  const matrix: MatrixData = readJson(PATHS.answerMatrix);

  for (const fix of FIXES) {
    const entityIndex = matrix.entities.indexOf(fix.entityId);
    if (entityIndex === -1) {
      console.log(`  ERROR: Entity "${fix.entityId}" not found`);
      continue;
    }

    const oldValue = matrix.matrix[entityIndex][fix.questionIndex];
    matrix.matrix[entityIndex][fix.questionIndex] = fix.newValue;
    console.log(`  FIX: ${fix.entityId} q${fix.questionIndex}: ${oldValue} → ${fix.newValue}`);
    console.log(`       ${fix.reason}`);
  }

  matrix.metadata.generatedAt = new Date().toISOString();
  writeJson(PATHS.answerMatrix, matrix);

  console.log('\n=== Fixes Applied ===');
}

main().catch(console.error);
