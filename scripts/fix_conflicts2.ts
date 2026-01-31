/**
 * Fix round 2 conflicts.
 *
 * Conflicts:
 * 1. ramanand_swami ↔ akhandanand_swami
 * 2. jaga_bhagat ↔ mahant_swami_maharaj
 * 3. somla_khachar ↔ naja_jogia
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
  // Conflict 1: ramanand_swami ↔ akhandanand_swami
  // Both have [0,4,10,15] with everything else 0. Need a split.
  {
    entityId: 'ramanand_swami',
    questionIndex: 103, // "Never doubt Maharaj?"
    newValue: 1,        // YES - he was the predecessor guru, firm in faith
    reason: 'Distinguish from akhandanand_swami (q103=0)',
  },

  // Conflict 2: jaga_bhagat ↔ mahant_swami_maharaj
  // Jaga: [0,4,10,17] q16=0.5. Mahant: [0,4,16,17] q10=0.5.
  // Both go YES on q10 and q16 due to 0.5.
  {
    entityId: 'jaga_bhagat',
    questionIndex: 16,  // "Modern era (after 1900)?"
    newValue: 0,        // NO - he was Gunatitanand Swami's disciple (pre-1900)
    reason: 'Distinguish from mahant_swami_maharaj (q16=1, definitely modern)',
  },
  {
    entityId: 'mahant_swami_maharaj',
    questionIndex: 10,  // "Is this in Gujarat?"
    newValue: 1,        // YES - serves primarily in Gujarat
    reason: 'Clear up ambiguity; serves in Gujarat even if born elsewhere',
  },

  // Conflict 3: somla_khachar ↔ naja_jogia
  // Both have [0,5,10,15] with everything else 0.
  {
    entityId: 'naja_jogia',
    questionIndex: 13,  // "Associated with poetry/writing?"
    newValue: 0.5,      // UNKNOWN (0.5 → YES branch) - he spoke poetic words of Jhinabhai
    reason: 'Distinguish from somla_khachar (q13=0, NO branch)',
  },
];

async function main() {
  console.log('=== Fixing Conflicts Round 2 ===\n');

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
