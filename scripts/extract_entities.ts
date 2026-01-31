/**
 * Phase 1: Entity Extraction
 *
 * Extracts all guessable entities from SatsangReaderPart1.txt using Claude API.
 * Entities include: people, places, objects, events, and concepts.
 *
 * Output: ../data/entities.json
 */

import { readFile, writeJson, callClaude, extractJson, PATHS, chunkText } from './utils.js';

interface Entity {
  id: string;
  name: string;
  category: 'person' | 'place' | 'object' | 'event' | 'concept';
  subcategory?: string;
  chapter?: number;
  description: string;
  aliases?: string[];
}

interface EntitiesOutput {
  entities: Entity[];
  metadata: {
    extractedAt: string;
    sourceFile: string;
    totalEntities: number;
  };
}

const EXTRACTION_PROMPT = `You are analyzing text from the Satsang Reader Part 1, a religious educational textbook about the Swaminarayan Sampradaya.

Extract ALL named entities that could be guessed in a 20 questions game. Be comprehensive - include even minor mentions.

Categories to extract:
1. **People** (subcategories: sadhu, devotee, historical_figure, deity)
   - Sadhus/saints (e.g., Brahmanand Swami, Devanand Swami)
   - Devotees/householders (e.g., Jhinabhai Darbar, Joban Pagi)
   - Historical figures mentioned
   - Deities and divine figures

2. **Places** (subcategories: mandir, city, region, building)
   - Mandirs/temples
   - Cities and towns
   - Regions and areas
   - Specific buildings or locations

3. **Objects** (subcategories: instrument, scripture, artifact, item)
   - Musical instruments
   - Scriptures and texts
   - Religious artifacts
   - Important items mentioned

4. **Events** (subcategories: miracle, historical, festival, occasion)
   - Miracles and divine events
   - Historical moments
   - Festivals and celebrations
   - Important occasions

5. **Concepts** (subcategories: religious_term, practice, teaching)
   - Religious terms and concepts
   - Practices and rituals
   - Teachings and principles

For each entity, provide:
- id: lowercase_snake_case identifier
- name: Display name
- category: person/place/object/event/concept
- subcategory: One of the subcategories listed above
- description: Brief 1-2 sentence description based on the text
- aliases: Array of alternative names (if any)

Return as JSON array. Be thorough - it's better to include too many entities than too few.

TEXT TO ANALYZE:
`;

async function extractEntitiesFromChunk(
  chunkText: string,
  chunkIndex: number,
  totalChunks: number
): Promise<Entity[]> {
  console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}...`);

  const prompt = EXTRACTION_PROMPT + chunkText;

  const response = await callClaude(prompt, {
    system:
      'You are an expert at extracting structured data from religious texts. Always return valid JSON arrays.',
    maxTokens: 8000,
  });

  try {
    const entities = extractJson<Entity[]>(response);
    console.log(`  Found ${entities.length} entities in chunk ${chunkIndex + 1}`);
    return entities;
  } catch (error) {
    console.error(`  Error parsing chunk ${chunkIndex + 1}:`, error);
    return [];
  }
}

function deduplicateEntities(allEntities: Entity[]): Entity[] {
  const entityMap = new Map<string, Entity>();

  for (const entity of allEntities) {
    const normalizedId = entity.id.toLowerCase().replace(/[^a-z0-9]/g, '_');

    if (entityMap.has(normalizedId)) {
      // Merge: keep longer description, combine aliases
      const existing = entityMap.get(normalizedId)!;
      if (entity.description.length > existing.description.length) {
        existing.description = entity.description;
      }
      if (entity.aliases) {
        existing.aliases = [
          ...new Set([...(existing.aliases || []), ...entity.aliases]),
        ];
      }
    } else {
      entityMap.set(normalizedId, { ...entity, id: normalizedId });
    }
  }

  return Array.from(entityMap.values());
}

function assignChapters(entities: Entity[], bookText: string): Entity[] {
  // Chapter markers in the book
  const chapters = [
    { num: 1, marker: 'Brahmanand Swami', keywords: ['brahmanand', 'ladudanji'] },
    { num: 2, marker: 'Devanand Swami', keywords: ['devanand', 'khushal bhatt'] },
    { num: 3, marker: 'Shukanand Swami', keywords: ['shukanand', 'vachanamrut'] },
    { num: 4, marker: 'Jhinabhai', keywords: ['jhinabhai', 'vaso'] },
    { num: 5, marker: 'Joban Pagi', keywords: ['joban pagi', 'bandit'] },
    { num: 6, marker: 'Jivuba', keywords: ['jivuba', 'dada khachar'] },
    { num: 7, marker: 'Nirgundasji', keywords: ['nirgundasji'] },
    { num: 8, marker: 'Shastriji Maharaj', keywords: ['shastriji', 'yagnapriyadasji'] },
  ];

  return entities.map((entity) => {
    // Try to determine chapter based on entity name or description
    const searchText = `${entity.name} ${entity.description}`.toLowerCase();

    for (const chapter of chapters) {
      if (chapter.keywords.some((kw) => searchText.includes(kw))) {
        return { ...entity, chapter: chapter.num };
      }
    }

    // Check if it's a glossary term (no specific chapter)
    if (entity.category === 'concept' || entity.category === 'object') {
      return entity; // No chapter assigned for glossary items
    }

    return entity;
  });
}

async function main() {
  console.log('=== Phase 1: Entity Extraction ===\n');

  // Read the book
  console.log('Reading SatsangReaderPart1.txt...');
  const bookText = readFile(PATHS.book);
  console.log(`Book length: ${bookText.length} characters, ${bookText.split('\n').length} lines\n`);

  // Chunk the text
  console.log('Chunking text...');
  const chunks = chunkText(bookText, 2000, 100); // Larger chunks for entity extraction
  console.log(`Created ${chunks.length} chunks\n`);

  // Extract entities from each chunk
  console.log('Extracting entities from each chunk...\n');
  const allEntities: Entity[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const entities = await extractEntitiesFromChunk(chunks[i].text, i, chunks.length);
    allEntities.push(...entities);

    // Rate limiting
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(`\nTotal entities before deduplication: ${allEntities.length}`);

  // Deduplicate
  const deduplicated = deduplicateEntities(allEntities);
  console.log(`After deduplication: ${deduplicated.length}`);

  // Assign chapters
  const withChapters = assignChapters(deduplicated, bookText);

  // Sort by category and name
  withChapters.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  // Create output
  const output: EntitiesOutput = {
    entities: withChapters,
    metadata: {
      extractedAt: new Date().toISOString(),
      sourceFile: 'SatsangReaderPart1.txt',
      totalEntities: withChapters.length,
    },
  };

  // Write output
  writeJson(PATHS.entities, output);

  // Summary
  console.log('\n=== Extraction Complete ===');
  console.log(`Total entities: ${withChapters.length}`);
  console.log('\nBreakdown by category:');
  const byCat = withChapters.reduce(
    (acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  for (const [cat, count] of Object.entries(byCat)) {
    console.log(`  ${cat}: ${count}`);
  }
}

main().catch(console.error);
