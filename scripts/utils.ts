import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import Anthropic from '@anthropic-ai/sdk';

// Initialize clients (will fail gracefully if API keys not set)
let anthropic: Anthropic | null = null;

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

export function getAnthropic(): Anthropic {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    anthropic = new Anthropic();
  }
  return anthropic;
}

// Check if Ollama is running
export async function checkOllama(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

// File paths
export const PATHS = {
  book: '../SatsangReaderPart1.txt',
  examPapers: '../pravesh/exam-papers/pravesh-1-eng',
  entities: '../data/entities.json',
  binaryQuestions: '../data/binary_questions.json',
  chunks: '../data/chunks.json',
  embeddings: '../data/embeddings.json',
  answerMatrix: '../data/answer_matrix.json',
  decisionTree: '../data/decision_tree.json',
  backendTree: '../backend/data/decision_tree.json',
};

// Read file utility
export function readFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

// Write JSON utility
export function writeJson(path: string, data: unknown): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`Written: ${path}`);
}

// Read JSON utility
export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

// Call Claude API
export async function callClaude(
  prompt: string,
  options: {
    system?: string;
    maxTokens?: number;
    model?: string;
  } = {}
): Promise<string> {
  const client = getAnthropic();
  const response = await client.messages.create({
    model: options.model || 'claude-sonnet-4-20250514',
    max_tokens: options.maxTokens || 4096,
    system: options.system,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }
  return textBlock.text;
}

// Call Ollama for embeddings (single text)
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_EMBED_MODEL,
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding failed: ${response.statusText}`);
  }

  const data = await response.json() as { embedding: number[] };
  return data.embedding;
}

// Call Ollama for embeddings in batch (sequential, Ollama doesn't support batch)
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const text of texts) {
    const embedding = await getEmbedding(text);
    embeddings.push(embedding);
    // Small delay to avoid overwhelming Ollama
    await sleep(50);
  }

  return embeddings;
}

// Get embedding model info
export function getEmbeddingModelName(): string {
  return OLLAMA_EMBED_MODEL;
}

// Cosine similarity
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Chunk text into segments
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): { text: string; startLine: number; endLine: number }[] {
  const lines = text.split('\n');
  const chunks: { text: string; startLine: number; endLine: number }[] = [];

  let currentChunk: string[] = [];
  let currentTokens = 0;
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Rough token estimate: ~4 chars per token
    const lineTokens = Math.ceil(line.length / 4);

    if (currentTokens + lineTokens > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        text: currentChunk.join('\n'),
        startLine,
        endLine: i - 1,
      });

      // Start new chunk with overlap
      const overlapLines = Math.ceil(overlap / 4);
      const overlapStart = Math.max(0, currentChunk.length - overlapLines);
      currentChunk = currentChunk.slice(overlapStart);
      currentTokens = currentChunk.reduce(
        (sum, l) => sum + Math.ceil(l.length / 4),
        0
      );
      startLine = i - (currentChunk.length);
    }

    currentChunk.push(line);
    currentTokens += lineTokens;
  }

  // Save final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.join('\n'),
      startLine,
      endLine: lines.length - 1,
    });
  }

  return chunks;
}

// Progress logger
export function createProgressLogger(total: number, label: string) {
  let current = 0;
  return {
    increment() {
      current++;
      if (current % 10 === 0 || current === total) {
        console.log(`${label}: ${current}/${total} (${Math.round((current / total) * 100)}%)`);
      }
    },
  };
}

// Sleep utility for rate limiting
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Extract JSON from LLM response
export function extractJson<T>(text: string): T {
  // Try to find JSON in code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim()) as T;
  }

  // Try to find JSON array or object
  const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]) as T;
  }

  throw new Error('No JSON found in response');
}
