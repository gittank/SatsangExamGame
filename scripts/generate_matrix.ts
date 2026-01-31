/**
 * Phase 3b: RAG-Powered Answer Matrix Generation
 *
 * For each entity-question pair, uses RAG to retrieve relevant passages
 * and LLM to determine yes/no/unknown answer.
 *
 * Input:
 *   - ../data/entities.json
 *   - ../data/binary_questions.json
 *   - ../data/chunks.json
 *   - ../data/embeddings.json
 *
 * Output: ../data/answer_matrix.json
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

interface Entity {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  chapter?: number;
  description: string;
}

interface Question {
  id: number;
  text: string;
  type: string;
}

interface Chunk {
  id: number;
  text: string;
  chapter?: number;
  section?: string;
}

interface AnswerEvidence {
  answer: 'yes' | 'no' | 'unknown';
  confidence: number;
  passages: string[];
}

interface MatrixOutput {
  entities: string[];
  questions: string[];
  matrix: number[][];
  evidence: Record<string, Record<string, AnswerEvidence>>;
  metadata: {
    generatedAt: string;
    totalEntities: number;
    totalQuestions: number;
    totalPairs: number;
  };
}

// RAG retrieval
async function retrieveRelevantChunks(
  query: string,
  chunks: Chunk[],
  embeddings: number[][],
  topK: number = 5
): Promise<Chunk[]> {
  const queryEmbedding = await getEmbedding(query);

  // Calculate similarities
  const similarities = embeddings.map((emb, idx) => ({
    idx,
    similarity: emb.length > 0 ? cosineSimilarity(queryEmbedding, emb) : 0,
  }));

  // Sort by similarity and get top K
  similarities.sort((a, b) => b.similarity - a.similarity);
  const topIndices = similarities.slice(0, topK).map((s) => s.idx);

  return topIndices.map((idx) => chunks[idx]);
}

const ANSWER_PROMPT = `You are determining if a yes/no question applies to a specific entity from the Satsang Reader.

IMPORTANT: When a question says "this person", "this entity", or similar - it ALWAYS refers to the ENTITY specified below.

Based on the provided passages and entity description, answer the question AS IT APPLIES TO THE SPECIFIED ENTITY.

IMPORTANT - Use contextual reasoning:
1. If a list of works/items appears under a person's section, those ARE their works
2. If an event is described in a person's chapter, that person was involved
3. If a quote appears in someone's story, assume they said it unless stated otherwise
4. Use the entity description to help answer - it contains key facts
5. "This person" or "this entity" in the question = the ENTITY we're asking about

Answer Guidelines:
- Answer "yes" if the passages support it directly OR through clear contextual implication
- Answer "no" if the passages contradict it OR if the entity type clearly doesn't match (e.g., a place can't "say" something)
- Answer "unknown" ONLY if there is genuinely no relevant information
- Prefer "yes" or "no" over "unknown" when reasonable inference is possible

For category questions (Is this a person?, Is this a place?, etc.):
- Use the entity description to answer these directly
- A sadhu IS a person
- A mandir IS a place
- Religious terms ARE concepts

Return JSON: { "answer": "yes"|"no"|"unknown", "confidence": 0.0-1.0, "reasoning": "brief explanation" }
`;

async function answerQuestion(
  entity: Entity,
  question: Question,
  relevantChunks: Chunk[]
): Promise<{ answer: 'yes' | 'no' | 'unknown'; confidence: number; passages: string[] }> {
  // For category questions, we can often answer without passages
  const questionLower = question.text.toLowerCase();
  const categoryAnswers: Record<string, { yes: string[]; no: string[] }> = {
    'is this a person': {
      yes: ['person'],
      no: ['place', 'object', 'concept', 'event'],
    },
    'is this a place': {
      yes: ['place'],
      no: ['person', 'object', 'concept', 'event'],
    },
    'is this an object': {
      yes: ['object'],
      no: ['person', 'place', 'concept', 'event'],
    },
    'is this a concept': {
      yes: ['concept'],
      no: ['person', 'place', 'object', 'event'],
    },
    'is this an event': {
      yes: ['event'],
      no: ['person', 'place', 'object', 'concept'],
    },
    'is this a sadhu': {
      yes: ['sadhu'],
      no: ['devotee', 'place', 'object', 'concept'],
    },
    'is this a devotee': {
      yes: ['devotee'],
      no: ['sadhu', 'place', 'object', 'concept'],
    },
    'is this a mandir': {
      yes: ['mandir', 'temple'],
      no: ['person', 'object', 'concept'],
    },
    'is this female': {
      yes: ['female'],
      no: ['male', 'mandir', 'object', 'concept'],
    },
  };

  // Check for direct category matches
  for (const [questionPattern, categories] of Object.entries(categoryAnswers)) {
    if (questionLower.includes(questionPattern)) {
      const entityCat = `${entity.category} ${entity.subcategory || ''}`.toLowerCase();

      if (categories.yes.some((c) => entityCat.includes(c))) {
        return { answer: 'yes', confidence: 0.95, passages: [] };
      }
      if (categories.no.some((c) => entityCat.includes(c))) {
        return { answer: 'no', confidence: 0.95, passages: [] };
      }
    }
  }

  // Chapter questions
  if (questionLower.includes('from the chapter about')) {
    const chapterMatch = questionLower.match(/chapter about (.+?)\??$/);
    if (chapterMatch && entity.chapter) {
      const chapterKeywords: Record<number, string[]> = {
        1: ['brahmanand'],
        2: ['devanand'],
        3: ['shukanand'],
        4: ['jhinabhai'],
        5: ['joban pagi'],
        6: ['jivuba'],
        7: ['nirgundasji'],
        8: ['shastriji'],
      };

      const keywords = chapterKeywords[entity.chapter] || [];
      if (keywords.some((kw) => chapterMatch[1].toLowerCase().includes(kw))) {
        return { answer: 'yes', confidence: 0.9, passages: [] };
      }
      return { answer: 'no', confidence: 0.85, passages: [] };
    }
  }

  // Glossary question
  if (questionLower.includes('from the glossary')) {
    if (entity.category === 'concept') {
      return { answer: 'yes', confidence: 0.8, passages: [] };
    }
    return { answer: 'no', confidence: 0.7, passages: [] };
  }

  // For other questions, use LLM with RAG
  const passages = relevantChunks.map((c) => c.text.slice(0, 500)).join('\n\n---\n\n');

  // Replace "this person" or "this entity" with the actual entity name for clarity
  const clarifiedQuestion = question.text
    .replace(/\bthis person\b/gi, entity.name)
    .replace(/\bthis person's\b/gi, `${entity.name}'s`)
    .replace(/\bthis entity\b/gi, entity.name);

  const prompt = `${ANSWER_PROMPT}

ENTITY WE ARE ASKING ABOUT: ${entity.name}
CATEGORY: ${entity.category}${entity.subcategory ? ` (${entity.subcategory})` : ''}
DESCRIPTION: ${entity.description}

ORIGINAL QUESTION: ${question.text}
INTERPRETED AS: ${clarifiedQuestion}

RELEVANT PASSAGES:
${passages || 'No relevant passages found.'}

Answer:`;

  try {
    const response = await callClaude(prompt, {
      maxTokens: 500,
      model: 'claude-sonnet-4-20250514',
    });

    const parsed = extractJson<{
      answer: 'yes' | 'no' | 'unknown';
      confidence: number;
      reasoning?: string;
    }>(response);

    return {
      answer: parsed.answer,
      confidence: parsed.confidence,
      passages: relevantChunks.slice(0, 2).map((c) => c.text.slice(0, 200)),
    };
  } catch (error) {
    console.error(`Error for ${entity.name} - ${question.text.slice(0, 40)}:`, error instanceof Error ? error.message : error);
    return { answer: 'unknown', confidence: 0.5, passages: [] };
  }
}

// Reorder entities so important ones come first
function reorderEntities(entities: Entity[]): Entity[] {
  const getPriority = (e: Entity): number => {
    // Priority 1: Main chapter characters (sadhus and devotees with chapter assignment)
    if (e.category === 'person' && (e.subcategory === 'sadhu' || e.subcategory === 'devotee') && e.chapter != null) {
      return 1;
    }
    // Priority 2: Other persons with chapters
    if (e.category === 'person' && e.chapter != null) {
      return 2;
    }
    // Priority 3: All other sadhus and devotees
    if (e.category === 'person' && (e.subcategory === 'sadhu' || e.subcategory === 'devotee')) {
      return 3;
    }
    // Priority 4: Historical figures and deities
    if (e.category === 'person') {
      return 4;
    }
    // Priority 5: Events with chapters (miracles, historical)
    if (e.category === 'event' && e.chapter != null) {
      return 5;
    }
    // Priority 6: Places with chapters
    if (e.category === 'place' && e.chapter != null) {
      return 6;
    }
    // Priority 7: Mandirs/temples
    if (e.category === 'place' && e.subcategory === 'mandir') {
      return 7;
    }
    // Priority 8: Other events
    if (e.category === 'event') {
      return 8;
    }
    // Priority 9: Objects (scriptures first)
    if (e.category === 'object' && e.subcategory === 'scripture') {
      return 9;
    }
    if (e.category === 'object') {
      return 10;
    }
    // Priority 10: Places
    if (e.category === 'place') {
      return 11;
    }
    // Priority 11: Concepts (least important for game)
    return 12;
  };

  return [...entities].sort((a, b) => {
    const priorityDiff = getPriority(a) - getPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    // Secondary sort by chapter (lower chapters first)
    if (a.chapter != null && b.chapter != null) return a.chapter - b.chapter;
    if (a.chapter != null) return -1;
    if (b.chapter != null) return 1;
    return a.name.localeCompare(b.name);
  });
}

async function main() {
  console.log('=== Phase 3b: Generate Answer Matrix ===\n');

  // Check for entity limit (for testing)
  const entityLimit = process.env.ENTITY_LIMIT ? parseInt(process.env.ENTITY_LIMIT) : null;
  if (entityLimit) {
    console.log(`*** TEST MODE: Processing only ${entityLimit} entities ***\n`);
  }

  // Check Ollama is running (needed for RAG retrieval)
  console.log('Checking Ollama connection...');
  const ollamaOk = await checkOllama();
  if (!ollamaOk) {
    console.error('❌ Ollama is not running. Please start Ollama first:');
    console.error('   ollama serve');
    process.exit(1);
  }
  console.log(`✓ Ollama is running, using model: ${getEmbeddingModelName()}\n`);

  // Load data
  console.log('Loading data...');
  const entitiesData = readJson<{ entities: Entity[] }>(PATHS.entities);
  const questionsData = readJson<{ questions: Question[] }>(PATHS.binaryQuestions);
  const chunksData = readJson<{ chunks: Chunk[] }>(PATHS.chunks);
  const embeddingsData = readJson<{ embeddings: number[][] }>(PATHS.embeddings);

  // Reorder entities so important ones come first
  const allEntities = reorderEntities(entitiesData.entities);
  const entities = entityLimit ? allEntities.slice(0, entityLimit) : allEntities;
  console.log(`Total entities: ${allEntities.length}, processing: ${entities.length}`);
  console.log(`First 10 entities: ${entities.slice(0, 10).map(e => e.name).join(', ')}\n`);

  const questions = questionsData.questions;
  const chunks = chunksData.chunks;
  const embeddings = embeddingsData.embeddings;

  console.log(`Entities: ${entities.length}`);
  console.log(`Questions: ${questions.length}`);
  console.log(`Chunks: ${chunks.length}`);
  console.log(`Total pairs to process: ${entities.length * questions.length}\n`);

  // Initialize matrix
  const matrix: number[][] = [];
  const evidence: Record<string, Record<string, AnswerEvidence>> = {};

  // Process each entity
  const totalPairs = entities.length * questions.length;
  const progress = createProgressLogger(totalPairs, 'Processing');

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    console.log(`\nEntity ${i + 1}/${entities.length}: ${entity.name}`);

    const row: number[] = [];
    evidence[entity.id] = {};

    // Process questions in batches to manage API calls
    for (let j = 0; j < questions.length; j++) {
      const question = questions[j];

      // Retrieve relevant chunks for this entity-question pair
      const query = `${entity.name}: ${question.text}`;
      const relevantChunks = await retrieveRelevantChunks(
        query,
        chunks,
        embeddings,
        5
      );

      // Get answer
      const result = await answerQuestion(entity, question, relevantChunks);

      // Convert to numeric
      const numericAnswer =
        result.answer === 'yes' ? 1 : result.answer === 'no' ? 0 : 0.5;
      row.push(numericAnswer);

      // Store evidence
      evidence[entity.id][question.text] = {
        answer: result.answer,
        confidence: result.confidence,
        passages: result.passages,
      };

      progress.increment();

      // Rate limiting - be gentle with API
      if (j % 5 === 4) {
        await sleep(200);
      }
    }

    matrix.push(row);

    // Save intermediate progress every 10 entities
    if (i % 10 === 9) {
      console.log('\nSaving intermediate progress...');
      const intermediateOutput: MatrixOutput = {
        entities: entities.slice(0, i + 1).map((e) => e.id),
        questions: questions.map((q) => q.text),
        matrix: matrix,
        evidence,
        metadata: {
          generatedAt: new Date().toISOString(),
          totalEntities: i + 1,
          totalQuestions: questions.length,
          totalPairs: (i + 1) * questions.length,
        },
      };
      writeJson(PATHS.answerMatrix, intermediateOutput);
    }
  }

  // Save final output
  const output: MatrixOutput = {
    entities: entities.map((e) => e.id),
    questions: questions.map((q) => q.text),
    matrix,
    evidence,
    metadata: {
      generatedAt: new Date().toISOString(),
      totalEntities: entities.length,
      totalQuestions: questions.length,
      totalPairs: entities.length * questions.length,
    },
  };

  writeJson(PATHS.answerMatrix, output);

  console.log('\n=== Matrix Generation Complete ===');
  console.log(`Matrix dimensions: ${entities.length} entities × ${questions.length} questions`);
  console.log(`Total pairs processed: ${entities.length * questions.length}`);

  // Stats on answers
  let yesCount = 0,
    noCount = 0,
    unknownCount = 0;
  for (const row of matrix) {
    for (const val of row) {
      if (val === 1) yesCount++;
      else if (val === 0) noCount++;
      else unknownCount++;
    }
  }
  console.log(`\nAnswer distribution:`);
  console.log(`  Yes: ${yesCount} (${((yesCount / totalPairs) * 100).toFixed(1)}%)`);
  console.log(`  No: ${noCount} (${((noCount / totalPairs) * 100).toFixed(1)}%)`);
  console.log(`  Unknown: ${unknownCount} (${((unknownCount / totalPairs) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
