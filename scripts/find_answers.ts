/**
 * Step 2: Find Answers to Exam Questions using RAG
 *
 * Uses the book text + embeddings to find answers for each
 * extracted exam question. Stores structured answers.
 *
 * Input:
 *   - ../data/raw_exam_questions.json
 *   - ../data/chunks.json
 *   - ../data/embeddings.json
 *   - ../SatsangReaderPart1.txt
 *
 * Output: ../data/answered_questions.json
 */

import {
  readJson,
  writeJson,
  callClaude,
  getEmbedding,
  cosineSimilarity,
  PATHS,
  sleep,
  createProgressLogger,
  extractJson,
  checkOllama,
  getEmbeddingModelName,
} from './utils.js';

interface RawQuestion {
  id: number;
  text: string;
  type: string;
  questionNumber: string;
  sourceFile: string;
}

interface Chunk {
  id: number;
  text: string;
  chapter?: number;
}

interface AnsweredQuestion {
  id: number;
  originalText: string;
  type: string;
  answer: string;
  entities: string[];
  confidence: number;
  relevantPassages: string[];
  sourceFile: string;
}

interface AnsweredOutput {
  questions: AnsweredQuestion[];
  metadata: {
    answeredAt: string;
    totalQuestions: number;
    answeredCount: number;
    unansweredCount: number;
  };
}

async function retrieveRelevantChunks(
  query: string,
  chunks: Chunk[],
  embeddings: number[][],
  topK: number = 5
): Promise<Chunk[]> {
  const queryEmbedding = await getEmbedding(query);

  const similarities = embeddings.map((emb, idx) => ({
    idx,
    similarity: emb.length > 0 ? cosineSimilarity(queryEmbedding, emb) : 0,
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);
  const topIndices = similarities.slice(0, topK).map((s) => s.idx);

  return topIndices.map((idx) => chunks[idx]);
}

const ANSWER_PROMPT = `You are finding the answer to an exam question about the Satsang Reader Part 1.

Based on the provided passages from the book, answer the question.

For each answer, provide:
1. **answer**: The actual answer to the question (be specific)
2. **entities**: List of people, places, or things mentioned in the answer
3. **confidence**: How confident you are (0.0 to 1.0) based on the passages

Question types:
- "who_said": Identify who said the quote, to whom, and when/why
- "true_false": Determine if the statement is true or false
- "fill_blank": Provide what goes in the blank
- "short_answer": Give a brief factual answer
- "give_reasons": Explain why something happened

If the passages don't contain enough information, set confidence low and answer "UNKNOWN".

Return JSON:
{
  "answer": "the answer text",
  "entities": ["entity1", "entity2"],
  "confidence": 0.0-1.0
}

QUESTION TYPE: {type}
QUESTION: {question}

RELEVANT PASSAGES:
{passages}
`;

async function findAnswerForQuestion(
  question: RawQuestion,
  chunks: Chunk[],
  embeddings: number[][]
): Promise<AnsweredQuestion> {
  // Retrieve relevant passages
  const relevantChunks = await retrieveRelevantChunks(
    question.text,
    chunks,
    embeddings,
    5
  );

  const passages = relevantChunks
    .map((c) => c.text.slice(0, 800))
    .join('\n\n---\n\n');

  const prompt = ANSWER_PROMPT
    .replace('{type}', question.type)
    .replace('{question}', question.text)
    .replace('{passages}', passages);

  try {
    const response = await callClaude(prompt, {
      system: 'You are answering exam questions based on book passages. Return valid JSON.',
      maxTokens: 1000,
    });

    const parsed = extractJson<{
      answer: string;
      entities: string[];
      confidence: number;
    }>(response);

    return {
      id: question.id,
      originalText: question.text,
      type: question.type,
      answer: parsed.answer,
      entities: parsed.entities || [],
      confidence: parsed.confidence || 0.5,
      relevantPassages: relevantChunks.slice(0, 2).map((c) => c.text.slice(0, 300)),
      sourceFile: question.sourceFile,
    };
  } catch (error) {
    return {
      id: question.id,
      originalText: question.text,
      type: question.type,
      answer: 'UNKNOWN',
      entities: [],
      confidence: 0,
      relevantPassages: [],
      sourceFile: question.sourceFile,
    };
  }
}

async function main() {
  console.log('=== Find Answers to Exam Questions ===\n');

  // Check Ollama
  console.log('Checking Ollama connection...');
  const ollamaOk = await checkOllama();
  if (!ollamaOk) {
    console.error('❌ Ollama is not running. Please start Ollama first.');
    process.exit(1);
  }
  console.log(`✓ Ollama is running (${getEmbeddingModelName()})\n`);

  // Load data
  console.log('Loading data...');
  const questionsData = readJson<{ questions: RawQuestion[] }>('../data/raw_exam_questions.json');
  const chunksData = readJson<{ chunks: Chunk[] }>(PATHS.chunks);
  const embeddingsData = readJson<{ embeddings: number[][] }>(PATHS.embeddings);

  const questions = questionsData.questions;
  const chunks = chunksData.chunks;
  const embeddings = embeddingsData.embeddings;

  console.log(`Questions to answer: ${questions.length}`);
  console.log(`Book chunks: ${chunks.length}\n`);

  // Find answers for each question
  console.log('Finding answers using RAG...\n');
  const answeredQuestions: AnsweredQuestion[] = [];
  const progress = createProgressLogger(questions.length, 'Answering');

  for (const question of questions) {
    const answered = await findAnswerForQuestion(question, chunks, embeddings);
    answeredQuestions.push(answered);
    progress.increment();

    // Rate limiting
    await sleep(300);
  }

  // Count stats
  const answeredCount = answeredQuestions.filter((q) => q.answer !== 'UNKNOWN').length;
  const unansweredCount = answeredQuestions.filter((q) => q.answer === 'UNKNOWN').length;

  // Create output
  const output: AnsweredOutput = {
    questions: answeredQuestions,
    metadata: {
      answeredAt: new Date().toISOString(),
      totalQuestions: answeredQuestions.length,
      answeredCount,
      unansweredCount,
    },
  };

  // Write output
  writeJson('../data/answered_questions.json', output);

  console.log('\n=== Answering Complete ===');
  console.log(`Total questions: ${answeredQuestions.length}`);
  console.log(`Answered: ${answeredCount}`);
  console.log(`Unknown: ${unansweredCount}`);

  // Show confidence distribution
  const byConfidence = {
    high: answeredQuestions.filter((q) => q.confidence >= 0.8).length,
    medium: answeredQuestions.filter((q) => q.confidence >= 0.5 && q.confidence < 0.8).length,
    low: answeredQuestions.filter((q) => q.confidence > 0 && q.confidence < 0.5).length,
    none: answeredQuestions.filter((q) => q.confidence === 0).length,
  };
  console.log('\nConfidence distribution:');
  console.log(`  High (≥0.8): ${byConfidence.high}`);
  console.log(`  Medium (0.5-0.8): ${byConfidence.medium}`);
  console.log(`  Low (<0.5): ${byConfidence.low}`);
  console.log(`  None (0): ${byConfidence.none}`);
}

main().catch(console.error);
