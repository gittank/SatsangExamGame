/**
 * Step 1: Extract ALL Satsang Reader Questions from Exam Papers
 *
 * Parses pravesh-1-eng exam papers and extracts questions from
 * Section 2: Satsang Reader Part I only.
 *
 * Input: ../pravesh/exam-papers/pravesh-1-eng/*.txt
 * Output: ../data/raw_exam_questions.json
 */

import { readdirSync } from 'fs';
import { join } from 'path';
import { readFile, writeJson, PATHS } from './utils.js';

interface RawQuestion {
  id: number;
  text: string;
  type: 'who_said' | 'true_false' | 'fill_blank' | 'short_answer' | 'give_reasons' | 'write_about' | 'other';
  questionNumber: string;
  sourceFile: string;
  section: string;
}

interface QuestionsOutput {
  questions: RawQuestion[];
  metadata: {
    extractedAt: string;
    totalQuestions: number;
    sourceFiles: string[];
    byType: Record<string, number>;
  };
}

function detectQuestionType(line: string, context: string): RawQuestion['type'] {
  const lowerContext = context.toLowerCase();

  if (lowerContext.includes('who says to whom') || lowerContext.includes('who is speaking')) {
    return 'who_said';
  }
  if (lowerContext.includes('true or false') || lowerContext.includes('state whether')) {
    return 'true_false';
  }
  if (lowerContext.includes('fill in the blank')) {
    return 'fill_blank';
  }
  if (lowerContext.includes('answer') && lowerContext.includes('one sentence')) {
    return 'short_answer';
  }
  if (lowerContext.includes('give reasons') || lowerContext.includes('give reason')) {
    return 'give_reasons';
  }
  if (lowerContext.includes('write') && (lowerContext.includes('short note') || lowerContext.includes('briefly'))) {
    return 'write_about';
  }

  return 'other';
}

function extractQuestionsFromExam(content: string, filename: string): RawQuestion[] {
  const questions: RawQuestion[] = [];
  const lines = content.split('\n');

  let inSatsangSection = false;
  let currentType: RawQuestion['type'] = 'other';
  let currentQuestionContext = '';
  let questionNumber = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();

    // Detect section boundaries - only extract Section 2: Satsang Reader Part I
    if (lowerLine.includes('section-1') || lowerLine.includes('neelkanth charitra')) {
      inSatsangSection = false;
      continue;
    }
    if (lowerLine.includes('section-2') || lowerLine.includes('satsang reader')) {
      inSatsangSection = true;
      continue;
    }
    if (lowerLine.includes('section-3') || lowerLine.includes('section-4')) {
      inSatsangSection = false;
      continue;
    }

    if (!inSatsangSection) continue;

    // Detect question headers (Q.7, Q.8, etc.)
    const qMatch = line.match(/^Q\.?\s*(\d+)/i);
    if (qMatch) {
      questionNumber = `Q.${qMatch[1]}`;
      // Look ahead to get question context
      const contextLines: string[] = [line];
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].trim().match(/^\d+\./)) break;
        contextLines.push(lines[j]);
      }
      currentQuestionContext = contextLines.join(' ');
      currentType = detectQuestionType(line, currentQuestionContext);
      continue;
    }

    // Extract individual questions (numbered items like "1.", "2.", etc.)
    const itemMatch = line.match(/^(\d+)\.\s*(.+)/);
    if (itemMatch && currentType !== 'other') {
      let questionText = itemMatch[2].trim();

      // For who_said questions, extract the quote
      if (currentType === 'who_said') {
        const quoteMatch = questionText.match(/"([^"]+)"/);
        if (quoteMatch) {
          questionText = quoteMatch[1];
        }
      }

      // Skip if too short or looks like a header
      if (questionText.length < 10) continue;
      if (questionText.match(/^(total|marks|note)/i)) continue;

      questions.push({
        id: 0, // Will be assigned later
        text: questionText,
        type: currentType,
        questionNumber: `${questionNumber}.${itemMatch[1]}`,
        sourceFile: filename,
        section: 'satsang_reader',
      });
    }
  }

  return questions;
}

function deduplicateQuestions(questions: RawQuestion[]): RawQuestion[] {
  const seen = new Map<string, RawQuestion>();

  for (const q of questions) {
    // Normalize for comparison
    const normalized = q.text
      .toLowerCase()
      .replace(/['".,?!]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Keep the first occurrence or merge sources
    if (!seen.has(normalized)) {
      seen.set(normalized, q);
    }
  }

  return Array.from(seen.values());
}

async function main() {
  console.log('=== Extract Exam Questions (Satsang Reader Part I) ===\n');

  // Find all exam papers in pravesh-1-eng
  const examDir = PATHS.examPapers;
  const files = readdirSync(examDir).filter(
    (f) => f.endsWith('.txt') && f.startsWith('pravesh-1') && !f.includes('answers')
  );
  console.log(`Found ${files.length} exam papers in pravesh-1-eng\n`);

  // Extract questions from all papers
  const allQuestions: RawQuestion[] = [];
  const processedFiles: string[] = [];

  for (const file of files) {
    const content = readFile(join(examDir, file));
    const questions = extractQuestionsFromExam(content, file);

    if (questions.length > 0) {
      console.log(`${file}: ${questions.length} questions`);
      allQuestions.push(...questions);
      processedFiles.push(file);
    } else {
      console.log(`${file}: 0 questions (no Satsang Reader section found)`);
    }
  }

  console.log(`\nTotal raw questions: ${allQuestions.length}`);

  // Deduplicate
  const uniqueQuestions = deduplicateQuestions(allQuestions);
  console.log(`After deduplication: ${uniqueQuestions.length}`);

  // Assign IDs
  const finalQuestions = uniqueQuestions.map((q, idx) => ({
    ...q,
    id: idx + 1,
  }));

  // Count by type
  const byType = finalQuestions.reduce((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Create output
  const output: QuestionsOutput = {
    questions: finalQuestions,
    metadata: {
      extractedAt: new Date().toISOString(),
      totalQuestions: finalQuestions.length,
      sourceFiles: processedFiles,
      byType,
    },
  };

  // Write output
  writeJson('../data/raw_exam_questions.json', output);

  console.log('\n=== Extraction Complete ===');
  console.log(`Total unique questions: ${finalQuestions.length}`);
  console.log(`From ${processedFiles.length} exam papers`);
  console.log('\nBy type:');
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
}

main().catch(console.error);
