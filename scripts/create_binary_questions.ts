/**
 * Step 3: Create Binary Questions (Generic + Exam-Style)
 *
 * Creates two types of questions:
 * 1. Generic questions - for top of tree (high info gain)
 * 2. Exam-style questions - for differentiating leaves (specific)
 *
 * Input:
 *   - ../data/answered_questions.json
 *   - ../data/entities.json
 *
 * Output: ../data/binary_questions.json
 */

import { readJson, writeJson, callClaude, extractJson, sleep } from './utils.js';

interface AnsweredQuestion {
  id: number;
  originalText: string;
  type: string;
  answer: string;
  entities: string[];
  confidence: number;
}

interface Entity {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  chapter?: number;
}

interface BinaryQuestion {
  id: number;
  text: string;
  type: 'generic' | 'exam_style';
  category: string;
  relatedEntities?: string[];
  source: string;
}

interface QuestionsOutput {
  questions: BinaryQuestion[];
  metadata: {
    createdAt: string;
    totalQuestions: number;
    genericCount: number;
    examStyleCount: number;
    byCategory: Record<string, number>;
  };
}

// Generic questions for top of tree (high information gain)
function createGenericQuestions(entities: Entity[]): BinaryQuestion[] {
  const questions: BinaryQuestion[] = [];
  let id = 1;

  // Category questions
  questions.push(
    { id: id++, text: 'Is this a person?', type: 'generic', category: 'category', source: 'generated' },
    { id: id++, text: 'Is this a place?', type: 'generic', category: 'category', source: 'generated' },
    { id: id++, text: 'Is this an object or item?', type: 'generic', category: 'category', source: 'generated' },
    { id: id++, text: 'Is this a concept or religious term?', type: 'generic', category: 'category', source: 'generated' },
    { id: id++, text: 'Is this an event or incident?', type: 'generic', category: 'category', source: 'generated' },
  );

  // Subcategory questions for people
  questions.push(
    { id: id++, text: 'Is this a sadhu (monk/saint)?', type: 'generic', category: 'subcategory', source: 'generated' },
    { id: id++, text: 'Is this a devotee (householder/layperson)?', type: 'generic', category: 'subcategory', source: 'generated' },
    { id: id++, text: 'Is this a female?', type: 'generic', category: 'subcategory', source: 'generated' },
    { id: id++, text: 'Is this a deity or divine figure?', type: 'generic', category: 'subcategory', source: 'generated' },
  );

  // Subcategory questions for places
  questions.push(
    { id: id++, text: 'Is this a mandir (temple)?', type: 'generic', category: 'subcategory', source: 'generated' },
    { id: id++, text: 'Is this a city or town?', type: 'generic', category: 'subcategory', source: 'generated' },
    { id: id++, text: 'Is this in Gujarat?', type: 'generic', category: 'subcategory', source: 'generated' },
  );

  // Chapter questions
  questions.push(
    { id: id++, text: 'Is this primarily from the chapter about Brahmanand Swami?', type: 'generic', category: 'chapter', source: 'generated' },
    { id: id++, text: 'Is this primarily from the chapter about Devanand Swami?', type: 'generic', category: 'chapter', source: 'generated' },
    { id: id++, text: 'Is this primarily from the chapter about Shukanand Swami?', type: 'generic', category: 'chapter', source: 'generated' },
    { id: id++, text: 'Is this primarily from the chapter about Jhinabhai?', type: 'generic', category: 'chapter', source: 'generated' },
    { id: id++, text: 'Is this primarily from the chapter about Joban Pagi?', type: 'generic', category: 'chapter', source: 'generated' },
    { id: id++, text: 'Is this primarily from the chapter about Jivuba?', type: 'generic', category: 'chapter', source: 'generated' },
    { id: id++, text: 'Is this primarily from the chapter about Nirgundasji?', type: 'generic', category: 'chapter', source: 'generated' },
    { id: id++, text: 'Is this primarily from the chapter about Shastriji Maharaj?', type: 'generic', category: 'chapter', source: 'generated' },
    { id: id++, text: 'Is this from the glossary section?', type: 'generic', category: 'chapter', source: 'generated' },
  );

  // Attribute questions
  questions.push(
    { id: id++, text: 'Is this associated with music, singing, or raag?', type: 'generic', category: 'attribute', source: 'generated' },
    { id: id++, text: 'Is this associated with poetry or writing?', type: 'generic', category: 'attribute', source: 'generated' },
    { id: id++, text: 'Is this associated with building or construction?', type: 'generic', category: 'attribute', source: 'generated' },
    { id: id++, text: 'Did this person meet Bhagwan Swaminarayan directly?', type: 'generic', category: 'attribute', source: 'generated' },
    { id: id++, text: 'Is this from the modern era (after 1900)?', type: 'generic', category: 'attribute', source: 'generated' },
    { id: id++, text: 'Is this related to BAPS Swaminarayan Sanstha?', type: 'generic', category: 'attribute', source: 'generated' },
    { id: id++, text: 'Was this person originally from a different faith or background before joining Satsang?', type: 'generic', category: 'attribute', source: 'generated' },
  );

  return questions;
}

const TRANSFORM_PROMPT = `Convert these answered exam questions into exam-style binary (yes/no) questions.

These questions will be used to differentiate between specific entities in a 20 questions game.
Keep the specific, exam-like flavor - these are NOT generic questions.

Rules:
1. Each question should be answerable with YES or NO
2. Preserve specific details: names, quotes, places, events
3. Questions should help identify WHICH specific entity is being guessed
4. Use the answer information to craft precise questions

Transform patterns:
- Who said "[quote]" → "Did this person say '[quote]'?"
- [Person] did [action] → "Did this person [action]?"
- [Event] happened at [place] → "Did this happen at [place]?"
- True/False statements → Keep as yes/no format
- Fill in blank answers → "Is this [the answer]?" or "Is [answer] associated with this?"

Return JSON array:
[
  {
    "text": "the binary question",
    "category": "who_said" | "action" | "attribute" | "relationship" | "event",
    "relatedEntities": ["entity1", "entity2"]
  }
]

ANSWERED QUESTIONS:
`;

async function transformToExamStyleQuestions(
  answeredQuestions: AnsweredQuestion[]
): Promise<BinaryQuestion[]> {
  console.log('Transforming to exam-style binary questions...\n');

  const validQuestions = answeredQuestions.filter(
    (q) => q.confidence >= 0.5 && q.answer !== 'UNKNOWN'
  );
  console.log(`Valid questions (confidence ≥ 0.5): ${validQuestions.length}`);

  const batchSize = 15;
  const allQuestions: BinaryQuestion[] = [];

  for (let i = 0; i < validQuestions.length; i += batchSize) {
    const batch = validQuestions.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validQuestions.length / batchSize)}...`);

    const batchData = batch.map((q) => ({
      type: q.type,
      question: q.originalText,
      answer: q.answer,
      entities: q.entities,
    }));

    const prompt = TRANSFORM_PROMPT + JSON.stringify(batchData, null, 2);

    try {
      const response = await callClaude(prompt, {
        system: 'Convert exam questions to binary format. Return valid JSON array.',
        maxTokens: 4000,
      });

      const questions = extractJson<Array<{
        text: string;
        category: string;
        relatedEntities?: string[];
      }>>(response);

      for (const q of questions) {
        allQuestions.push({
          id: 0, // Will be assigned later
          text: q.text,
          type: 'exam_style',
          category: q.category,
          relatedEntities: q.relatedEntities,
          source: 'exam_papers',
        });
      }

      console.log(`  Generated ${questions.length} questions`);
    } catch (error) {
      console.error(`  Error processing batch:`, error);
    }

    await sleep(500);
  }

  return allQuestions;
}

function deduplicateQuestions(questions: BinaryQuestion[]): BinaryQuestion[] {
  const seen = new Set<string>();
  const unique: BinaryQuestion[] = [];

  for (const q of questions) {
    const normalized = q.text
      .toLowerCase()
      .replace(/['".,?!]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!seen.has(normalized) && normalized.length > 15) {
      seen.add(normalized);
      unique.push(q);
    }
  }

  return unique;
}

async function main() {
  console.log('=== Create Binary Questions ===\n');

  // Load data
  console.log('Loading data...');
  const answeredData = readJson<{ questions: AnsweredQuestion[] }>('../data/answered_questions.json');
  const entitiesData = readJson<{ entities: Entity[] }>('../data/entities.json');

  const answeredQuestions = answeredData.questions;
  const entities = entitiesData.entities;

  console.log(`Answered questions: ${answeredQuestions.length}`);
  console.log(`Entities: ${entities.length}\n`);

  // Create generic questions
  console.log('Creating generic questions...');
  const genericQuestions = createGenericQuestions(entities);
  console.log(`Generic questions: ${genericQuestions.length}\n`);

  // Transform to exam-style questions
  const examStyleQuestions = await transformToExamStyleQuestions(answeredQuestions);
  console.log(`\nExam-style questions (raw): ${examStyleQuestions.length}`);

  // Combine and deduplicate
  const allQuestions = [...genericQuestions, ...examStyleQuestions];
  const uniqueQuestions = deduplicateQuestions(allQuestions);
  console.log(`After deduplication: ${uniqueQuestions.length}`);

  // Assign final IDs
  const finalQuestions = uniqueQuestions.map((q, idx) => ({
    ...q,
    id: idx + 1,
  }));

  // Count stats
  const genericCount = finalQuestions.filter((q) => q.type === 'generic').length;
  const examStyleCount = finalQuestions.filter((q) => q.type === 'exam_style').length;
  const byCategory = finalQuestions.reduce((acc, q) => {
    acc[q.category] = (acc[q.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Create output
  const output: QuestionsOutput = {
    questions: finalQuestions,
    metadata: {
      createdAt: new Date().toISOString(),
      totalQuestions: finalQuestions.length,
      genericCount,
      examStyleCount,
      byCategory,
    },
  };

  // Write output
  writeJson('../data/binary_questions.json', output);

  console.log('\n=== Question Creation Complete ===');
  console.log(`Total questions: ${finalQuestions.length}`);
  console.log(`  Generic (tree top): ${genericCount}`);
  console.log(`  Exam-style (leaves): ${examStyleCount}`);
  console.log('\nBy category:');
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
}

main().catch(console.error);
