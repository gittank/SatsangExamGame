/**
 * Phase 3a: Build Embeddings / Vector Store
 *
 * Chunks the book into segments, embeds them using OpenAI,
 * and stores for RAG retrieval.
 *
 * Input: ../SatsangReaderPart1.txt
 * Output: ../data/chunks.json, ../data/embeddings.json
 */

import { readFile, writeJson, getEmbeddings, chunkText, PATHS, sleep, createProgressLogger, checkOllama, getEmbeddingModelName } from './utils.js';

interface Chunk {
  id: number;
  text: string;
  startLine: number;
  endLine: number;
  chapter?: number;
  section?: string;
}

interface ChunksOutput {
  chunks: Chunk[];
  metadata: {
    createdAt: string;
    sourceFile: string;
    totalChunks: number;
    avgChunkSize: number;
  };
}

interface EmbeddingsOutput {
  embeddings: number[][];
  metadata: {
    createdAt: string;
    model: string;
    dimensions: number;
    totalEmbeddings: number;
  };
}

function detectChapterAndSection(
  text: string,
  lineNum: number
): { chapter?: number; section?: string } {
  const lowerText = text.toLowerCase();

  // Chapter detection based on content
  const chapters = [
    { num: 1, markers: ['brahmanand swami', 'ladudanji', 'poet-saint'] },
    { num: 2, markers: ['devanand swami', 'khushal bhatt', 'swaminarayan raag'] },
    { num: 3, markers: ['shukanand swami', 'vachanamrut'] },
    { num: 4, markers: ['jhinabhai', 'darbar', 'vaso'] },
    { num: 5, markers: ['joban pagi', 'bandit', 'dacoit'] },
    { num: 6, markers: ['jivuba', 'dada khachar', 'female devotee'] },
    { num: 7, markers: ['nirgundasji', 'swami nirgundasji'] },
    { num: 8, markers: ['shastriji maharaj', 'yagnapriyadasji', 'baps'] },
  ];

  for (const chapter of chapters) {
    if (chapter.markers.some((m) => lowerText.includes(m))) {
      return { chapter: chapter.num };
    }
  }

  // Glossary section detection
  if (lowerText.includes('glossary') || lowerText.includes('shabad') || lowerText.includes('terminology')) {
    return { section: 'glossary' };
  }

  return {};
}

async function main() {
  console.log('=== Phase 3a: Build Embeddings ===\n');

  // Check Ollama is running
  console.log('Checking Ollama connection...');
  const ollamaOk = await checkOllama();
  if (!ollamaOk) {
    console.error('❌ Ollama is not running. Please start Ollama first:');
    console.error('   1. Install Ollama: https://ollama.ai');
    console.error('   2. Start Ollama: ollama serve');
    console.error('   3. Pull embedding model: ollama pull nomic-embed-text');
    process.exit(1);
  }
  console.log(`✓ Ollama is running, using model: ${getEmbeddingModelName()}\n`);

  // Read the book
  console.log('Reading SatsangReaderPart1.txt...');
  const bookText = readFile(PATHS.book);
  console.log(`Book length: ${bookText.length} characters\n`);

  // Chunk the text
  console.log('Chunking text (500 tokens, 50 overlap)...');
  const rawChunks = chunkText(bookText, 500, 50);
  console.log(`Created ${rawChunks.length} chunks\n`);

  // Process chunks with metadata
  const chunks: Chunk[] = rawChunks.map((chunk, idx) => {
    const { chapter, section } = detectChapterAndSection(chunk.text, chunk.startLine);
    return {
      id: idx + 1,
      text: chunk.text,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      chapter,
      section,
    };
  });

  // Calculate stats
  const avgChunkSize = Math.round(
    chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length
  );

  // Save chunks
  const chunksOutput: ChunksOutput = {
    chunks,
    metadata: {
      createdAt: new Date().toISOString(),
      sourceFile: 'SatsangReaderPart1.txt',
      totalChunks: chunks.length,
      avgChunkSize,
    },
  };
  writeJson(PATHS.chunks, chunksOutput);

  // Generate embeddings
  console.log('\nGenerating embeddings...');
  const batchSize = 20; // OpenAI allows up to 2048 inputs, but we batch for progress
  const allEmbeddings: number[][] = [];
  const progress = createProgressLogger(chunks.length, 'Embedding');

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.text);

    try {
      const embeddings = await getEmbeddings(texts);
      allEmbeddings.push(...embeddings);

      for (let j = 0; j < batch.length; j++) {
        progress.increment();
      }
    } catch (error) {
      console.error(`Error embedding batch starting at ${i}:`, error);
      // Add empty embeddings for failed batch
      for (let j = 0; j < batch.length; j++) {
        allEmbeddings.push([]);
        progress.increment();
      }
    }

    // Rate limiting
    if (i + batchSize < chunks.length) {
      await sleep(200);
    }
  }

  // Save embeddings
  const embeddingsOutput: EmbeddingsOutput = {
    embeddings: allEmbeddings,
    metadata: {
      createdAt: new Date().toISOString(),
      model: getEmbeddingModelName(),
      dimensions: allEmbeddings[0]?.length || 0,
      totalEmbeddings: allEmbeddings.length,
    },
  };
  writeJson(PATHS.embeddings, embeddingsOutput);

  console.log('\n=== Embeddings Complete ===');
  console.log(`Total chunks: ${chunks.length}`);
  console.log(`Total embeddings: ${allEmbeddings.length}`);
  console.log(`Embedding dimensions: ${allEmbeddings[0]?.length || 0}`);

  // Chapter breakdown
  const byChapter = chunks.reduce(
    (acc, c) => {
      const key = c.chapter ? `Chapter ${c.chapter}` : c.section || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log('\nChunks by chapter/section:');
  for (const [key, count] of Object.entries(byChapter).sort()) {
    console.log(`  ${key}: ${count}`);
  }
}

main().catch(console.error);
