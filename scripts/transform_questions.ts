/**
 * Transform entity-specific questions to entity-agnostic form
 *
 * Changes questions like:
 *   "Did Brahmanand Swami write the Shikshapatri?"
 * To:
 *   "Did this person write the Shikshapatri?"
 *
 * Also removes redundant chapter questions like:
 *   "Is this primarily from the chapter about Brahmanand Swami?"
 */

import { readJson, writeJson } from './utils.js';

interface BinaryQuestion {
  id: number;
  text: string;
  type: 'generic' | 'exam_style';
  category: string;
  relatedEntities?: string[];
  source: string;
}

interface QuestionsData {
  questions: BinaryQuestion[];
  metadata: any;
}

// Known entity names to replace
const ENTITY_NAMES = [
  'Brahmanand Swami',
  'Devanand Swami',
  'Shukanand Swami',
  'Jhinabhai',
  'Joban Pagi',
  'Jivuba',
  'Nirgundasji',
  'Shastriji Maharaj',
  'Ladudanji',
  'Ladudan Barot',
  'Dalpatram',
  'Premanand Swami',
  'Bhumanand Swami',
  'Dayanand Swami',
  'Gunatitanand Swami',
  'Bhagatji Maharaj',
  'Yagnapurushdasji',
  'Shuk Muni',
  'Shukmuni',
  'Akhandanand Swami',
  'Abhal Khachar',
  'Abhel Khachar',
  'Dada Khachar',
  'Kamalshi',
  'Kamalshibhai',
  'Jethabhai',
  'Ashabhai',
  'Hathisinh',
  'Gangaba',
  'Adiba',
  'Raibai',
  'Shriji Maharaj',
  'Maharaj',
  'Swaminarayan',
  'Nirgundas Swami',
  'Nirgun Swami',
  'Khaiyo Khatri',
  'Kashiyabhai',
  'General Gordon',
  'Motiba',
  'Punamatiba',
  'Manjukeshanand Swami',
];

// Sort by length descending to match longer names first
const SORTED_NAMES = [...ENTITY_NAMES].sort((a, b) => b.length - a.length);

function transformQuestion(text: string): { transformed: string; wasTransformed: boolean } {
  let transformed = text;
  let wasTransformed = false;

  for (const name of SORTED_NAMES) {
    // Pattern: "Did [Name] do something" -> "Did this person do something"
    const patterns = [
      // "Did Name verb..." at start
      new RegExp(`^Did ${name}\\b`, 'i'),
      // "Was Name ..." at start
      new RegExp(`^Was ${name}\\b`, 'i'),
      // "Are Name's ..." at start
      new RegExp(`^Are ${name}'s\\b`, 'i'),
      // "Have Name's ..." at start
      new RegExp(`^Have ${name}'s\\b`, 'i'),
      // "Were Name's ..." at start
      new RegExp(`^Were ${name}'s\\b`, 'i'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(transformed)) {
        transformed = transformed.replace(pattern, (match) => {
          const verb = match.split(' ')[0]; // Did, Was, Are, Have, Were
          wasTransformed = true;
          if (match.includes("'s")) {
            return `${verb} this person's`;
          }
          return `${verb} this person`;
        });
      }
    }
  }

  return { transformed, wasTransformed };
}

function isChapterQuestion(text: string): boolean {
  return text.toLowerCase().includes('primarily from the chapter about');
}

function isRedundantQuestion(text: string): boolean {
  // Questions that are essentially "Is this [Name]?"
  const lowerText = text.toLowerCase();

  // Check if question is about a specific named entity's action/attribute
  // that only applies to that one entity
  for (const name of SORTED_NAMES) {
    const nameLower = name.toLowerCase();
    // "Is this [Name]?" pattern
    if (lowerText === `is this ${nameLower}?`) return true;
  }

  return false;
}

async function main() {
  console.log('=== Transform Questions to Entity-Agnostic Form ===\n');

  // Load questions
  const data = readJson<QuestionsData>('../data/binary_questions.json');
  const questions = data.questions;

  console.log(`Total questions: ${questions.length}\n`);

  const transformedQuestions: BinaryQuestion[] = [];
  const removedQuestions: string[] = [];
  const transformedTexts: string[] = [];
  const seenTexts = new Set<string>();

  let nextId = 1;

  for (const q of questions) {
    // Skip chapter questions - we're replacing them with specific questions
    if (isChapterQuestion(q.text)) {
      removedQuestions.push(q.text);
      continue;
    }

    // Skip redundant questions
    if (isRedundantQuestion(q.text)) {
      removedQuestions.push(q.text);
      continue;
    }

    // Transform entity-specific questions
    const { transformed, wasTransformed } = transformQuestion(q.text);

    // Normalize for deduplication
    const normalized = transformed.toLowerCase().replace(/['".,?!]/g, '').replace(/\s+/g, ' ').trim();

    // Skip duplicates
    if (seenTexts.has(normalized)) {
      continue;
    }
    seenTexts.add(normalized);

    if (wasTransformed) {
      transformedTexts.push(`"${q.text}" -> "${transformed}"`);
    }

    transformedQuestions.push({
      ...q,
      id: nextId++,
      text: transformed,
    });
  }

  // Sort: generic questions first, then exam-style
  transformedQuestions.sort((a, b) => {
    if (a.type === 'generic' && b.type !== 'generic') return -1;
    if (a.type !== 'generic' && b.type === 'generic') return 1;
    return a.id - b.id;
  });

  // Reassign IDs after sorting
  transformedQuestions.forEach((q, idx) => {
    q.id = idx + 1;
  });

  // Update metadata
  const genericCount = transformedQuestions.filter(q => q.type === 'generic').length;
  const examStyleCount = transformedQuestions.filter(q => q.type === 'exam_style').length;

  const output: QuestionsData = {
    questions: transformedQuestions,
    metadata: {
      ...data.metadata,
      transformedAt: new Date().toISOString(),
      totalQuestions: transformedQuestions.length,
      genericCount,
      examStyleCount,
      removedCount: removedQuestions.length,
      transformedCount: transformedTexts.length,
    },
  };

  // Save
  writeJson('../data/binary_questions.json', output);

  console.log('=== Transformation Complete ===\n');
  console.log(`Questions before: ${questions.length}`);
  console.log(`Questions after: ${transformedQuestions.length}`);
  console.log(`  Generic: ${genericCount}`);
  console.log(`  Exam-style: ${examStyleCount}`);
  console.log(`\nRemoved ${removedQuestions.length} questions (chapter questions):`);
  removedQuestions.slice(0, 10).forEach(q => console.log(`  - ${q}`));
  if (removedQuestions.length > 10) console.log(`  ... and ${removedQuestions.length - 10} more`);

  console.log(`\nTransformed ${transformedTexts.length} questions:`);
  transformedTexts.slice(0, 15).forEach(t => console.log(`  ${t}`));
  if (transformedTexts.length > 15) console.log(`  ... and ${transformedTexts.length - 15} more`);
}

main().catch(console.error);
