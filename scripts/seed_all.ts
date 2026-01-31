/**
 * Seed All - Run all phases in sequence
 *
 * This script orchestrates the entire seeding pipeline:
 * 1. Extract entities from book
 * 2. Transform exam questions to binary format
 * 3. Build embeddings for RAG (using Ollama - FREE)
 * 4. Generate answer matrix using RAG
 * 5. Build decision tree using ID3
 * 6. Validate tree
 *
 * Usage: npm run seed-all
 *
 * Requirements:
 *   - ANTHROPIC_API_KEY: For Claude API (entity extraction, question transformation, answer generation)
 *   - Ollama running locally: For embeddings (FREE, no API key needed)
 *     Install: https://ollama.ai
 *     Start: ollama serve
 *     Pull model: ollama pull nomic-embed-text
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { PATHS } from './utils.js';

interface Phase {
  name: string;
  script: string;
  outputFile: string;
  description: string;
}

const phases: Phase[] = [
  {
    name: 'Phase 1: Entity Extraction',
    script: 'extract_entities.ts',
    outputFile: PATHS.entities,
    description: 'Extracting entities from SatsangReaderPart1.txt using Claude',
  },
  {
    name: 'Phase 2: Extract Exam Questions',
    script: 'extract_exam_questions.ts',
    outputFile: '../data/raw_exam_questions.json',
    description: 'Extracting Satsang Reader questions from all 34 exam papers',
  },
  {
    name: 'Phase 3: Build Embeddings',
    script: 'build_embeddings.ts',
    outputFile: PATHS.embeddings,
    description: 'Creating vector embeddings for RAG retrieval (Ollama)',
  },
  {
    name: 'Phase 4: Find Answers',
    script: 'find_answers.ts',
    outputFile: '../data/answered_questions.json',
    description: 'Using RAG to find answers to exam questions from book',
  },
  {
    name: 'Phase 5: Create Binary Questions',
    script: 'create_binary_questions.ts',
    outputFile: PATHS.binaryQuestions,
    description: 'Creating generic + exam-style binary questions',
  },
  {
    name: 'Phase 6: Generate Answer Matrix',
    script: 'generate_matrix.ts',
    outputFile: PATHS.answerMatrix,
    description: 'Generating entity-question answer matrix using RAG',
  },
  {
    name: 'Phase 7: Build Decision Tree',
    script: 'build_tree.ts',
    outputFile: PATHS.decisionTree,
    description: 'Building optimal binary tree using ID3 algorithm',
  },
  {
    name: 'Phase 8: Validation',
    script: 'validate_tree.ts',
    outputFile: '../data/validation_report.json',
    description: 'Validating tree coverage and accuracy',
  },
];

function runScript(scriptPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', scriptPath], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script ${scriptPath} exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function checkOllamaRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}

async function checkEnvironment(): Promise<boolean> {
  let valid = true;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY is not set');
    valid = false;
  } else {
    console.log('✓ ANTHROPIC_API_KEY is set');
  }

  // Check Ollama is running (for embeddings - FREE)
  const ollamaOk = await checkOllamaRunning();
  if (!ollamaOk) {
    console.error('❌ Ollama is not running');
    console.error('  Install: https://ollama.ai');
    console.error('  Start: ollama serve');
    console.error('  Pull model: ollama pull nomic-embed-text');
    valid = false;
  } else {
    console.log('✓ Ollama is running (FREE embeddings)');
  }

  // Check source files exist
  if (!existsSync(PATHS.book)) {
    console.error(`❌ Book file not found: ${PATHS.book}`);
    valid = false;
  } else {
    console.log(`✓ Book file found: ${PATHS.book}`);
  }

  if (!existsSync(PATHS.examPapers)) {
    console.error(`❌ Exam papers directory not found: ${PATHS.examPapers}`);
    valid = false;
  } else {
    console.log(`✓ Exam papers directory found: ${PATHS.examPapers}`);
  }

  return valid;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     SSE Master Mind - Full Seeding Pipeline            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Check environment
  console.log('Checking environment...\n');
  if (!(await checkEnvironment())) {
    console.error('\n❌ Environment check failed. Please fix the issues above.');
    process.exit(1);
  }
  console.log('\n✓ Environment check passed\n');

  // Run each phase
  const startTime = Date.now();

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const phaseStart = Date.now();

    console.log('═'.repeat(60));
    console.log(`\n${phase.name}`);
    console.log(`${phase.description}\n`);

    // Check if output already exists (for resuming)
    if (existsSync(phase.outputFile)) {
      console.log(`⚠ Output file already exists: ${phase.outputFile}`);
      console.log('  Skipping this phase. Delete the file to regenerate.\n');
      continue;
    }

    try {
      await runScript(phase.script);
      const phaseTime = ((Date.now() - phaseStart) / 1000 / 60).toFixed(1);
      console.log(`\n✓ ${phase.name} completed in ${phaseTime} minutes\n`);
    } catch (error) {
      console.error(`\n❌ ${phase.name} failed:`, error);
      process.exit(1);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('═'.repeat(60));
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           🎉 SEEDING COMPLETE! 🎉                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(`Total time: ${totalTime} minutes\n`);

  console.log('Generated files:');
  for (const phase of phases) {
    const status = existsSync(phase.outputFile) ? '✓' : '✗';
    console.log(`  ${status} ${phase.outputFile}`);
  }

  console.log('\nNext steps:');
  console.log('  1. Review the validation report: data/validation_report.json');
  console.log('  2. Test the game with the new tree');
  console.log('  3. Iterate on questions/entities if needed');
}

main().catch(console.error);
