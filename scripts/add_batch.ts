/**
 * Batch-add ~29 significant characters to the answer matrix.
 * Each entity has manually curated answers for all 166 questions.
 *
 * Usage: npx tsx add_batch.ts
 */

import { readJson, writeJson, PATHS } from './utils.js';

interface MatrixData {
  entities: string[];
  questions: string[];
  matrix: number[][];
  evidence: Record<string, Record<string, any>>;
  metadata: any;
}

interface EntityDefinition {
  id: string;
  name: string;
  // Indices where answer is YES (1). Everything else defaults to NO (0).
  yesIndices: number[];
  // Indices where answer is UNKNOWN (0.5). Overrides default NO.
  unknownIndices: number[];
}

// ====== ALL NEW ENTITIES ======
// Answer indices are 0-based (question 1 = index 0, question 166 = index 165)
// Matrix values: 1 = YES, 0 = NO, 0.5 = UNKNOWN

const ENTITIES: EntityDefinition[] = [

  // ===== CHAPTER 1: Brahmanand Swami =====

  {
    // Senior sadhu, one of 8 famous poets, served Maharaj, drew attention to Munibawa,
    // initiated Shukanand Swami, swung Maharaj on hindolo, persuaded Munibawa to stay
    id: 'muktanand_swami',
    name: 'Muktanand Swami',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES
      10,  // Is this in Gujarat? YES
      13,  // Associated with poetry/writing? YES - one of 8 famous poets
      15,  // Met Bhagwan Swaminarayan? YES
    ],
    unknownIndices: [],
  },

  {
    // Identified as Akshar (Aksharbrahman), mahant of Junagadh mandir,
    // Maharaj revealed his greatness to Shuk Muni, foundational to BAPS
    id: 'gunatitanand_swami',
    name: 'Gunatitanand Swami',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES
      10,  // Is this in Gujarat? YES
      15,  // Met Bhagwan Swaminarayan? YES
      17,  // Related to BAPS? YES - identified as Akshar
    ],
    unknownIndices: [],
  },

  {
    // Sadhu, craftsman, poet, built the 12-sided hindolo in Vartal,
    // called at Brahmanand's passing, one of 8 famous poets
    id: 'nishkulanand_swami',
    name: 'Nishkulanand Swami',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES
      10,  // Is this in Gujarat? YES
      13,  // Associated with poetry/writing? YES - one of 8 famous poets
      14,  // Associated with building/construction? YES - built hindolo
      15,  // Met Bhagwan Swaminarayan? YES
    ],
    unknownIndices: [],
  },

  {
    // Predecessor/guru of Bhagwan Swaminarayan, appointed Sahajanand as successor,
    // visited Panchala, Jhinabhai's father was his disciple
    id: 'ramanand_swami',
    name: 'Ramanand Swami',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES
      10,  // Is this in Gujarat? YES
      15,  // Met Bhagwan Swaminarayan? YES
    ],
    unknownIndices: [
      17,  // Related to BAPS? 0.5 - predecessor, foundational but predates BAPS
    ],
  },

  {
    // Sanskrit scholar from Surat, adherent of Vedanta philosophy,
    // impressed by Maharaj spinning cushion, initiated as sadhu,
    // returned to Surat bringing Ardeshar Kotwal and others
    id: 'munibawa',
    name: 'Munibawa',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES
      10,  // Is this in Gujarat? YES - Surat
      13,  // Associated with poetry/writing? YES - Sanskrit scholar
      15,  // Met Bhagwan Swaminarayan? YES
      18,  // Different faith/background? YES - Vedanta adherent before joining
    ],
    unknownIndices: [],
  },

  // ===== CHAPTER 3: Shukanand Swami =====

  {
    // Sadhu who asked Shuk Muni "Weren't you upset that Maharaj tore up
    // a whole night's work without even looking at it?"
    id: 'nityanand_swami',
    name: 'Nityanand Swami',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES
      10,  // Is this in Gujarat? YES
      15,  // Met Bhagwan Swaminarayan? YES
      103, // Never doubt Maharaj? YES - loyal sadhu
    ],
    unknownIndices: [],
  },

  // ===== CHAPTER 4: Jhinabhai Darbar =====

  {
    // Chieftain of Gadhada, father of Jivuba/Laduba/Dada Khachar,
    // barged in with sword, witnessed divine darshan, apologized
    id: 'abhal_khachar',
    name: 'Abhal Khachar',
    yesIndices: [
      0,   // Is this a person? YES
      5,   // Is this a devotee? YES
      10,  // Is this in Gujarat? YES - Gadhada
      15,  // Met Bhagwan Swaminarayan? YES
      77,  // Barge into room with sword, accuse hiding bawa? YES
      84,  // Apologize after witnessing divine darshan? YES
      108, // Say "I shall cut you to pieces with this sword" to Jivuba? YES
      136, // Say "My dear child, whom are you worshipping?" to Jivuba? YES
      151, // Say "You're hiding a bawa in the darbar!" to Jivuba? YES
      152, // Say "My dear child, who is this that you worship?" to Jivuba? YES
    ],
    unknownIndices: [],
  },

  // ===== CHAPTER 5: Joban Pagi =====

  {
    // Most-wanted bandit transformed by Maharaj, walked with tilak-chandlo,
    // went to Pune to rob, passed away when sacred ash ran out
    id: 'joban_pagi',
    name: 'Joban Pagi',
    yesIndices: [
      0,   // Is this a person? YES
      5,   // Is this a devotee? YES
      10,  // Is this in Gujarat? YES - Vartal
      15,  // Met Bhagwan Swaminarayan? YES
      18,  // Different background? YES - bandit before joining
      58,  // Say "Please have pity on me. Please free me from my sins"? YES
      69,  // Go to Pune to rob? YES
      81,  // Say "Do you still want to see a miracle?"? YES
      88,  // Spirit fade after told ash ran out? YES
      97,  // Transform from most-wanted bandit to devotee? YES
      113, // Walk with tilak-chandlo and mala after transformation? YES
      114, // Is Sundar Pagi one of this person's brothers? YES
      125, // Go to Khodiyar Mata? YES
      150, // Say "You still wish to see a miracle?" to Kashiyabhai? YES
      165, // Think "How nice if such a yogi were to stay with us"? YES
    ],
    unknownIndices: [],
  },

  {
    // Joban's brother who refused to steal Maharaj's horse,
    // said "He surely looks as if he could be God"
    id: 'sundar_pagi',
    name: 'Sundar Pagi',
    yesIndices: [
      0,   // Is this a person? YES
      5,   // Is this a devotee? YES
      10,  // Is this in Gujarat? YES - Vartal
      15,  // Met Bhagwan Swaminarayan? YES
    ],
    unknownIndices: [
      18,  // Different background? 0.5 - from bandit family
      103, // Never doubt Maharaj? 0.5
    ],
  },

  {
    // Man from Vaso opposed to Swaminarayan, amazed by Joban's transformation,
    // asked "Has he turned an ass into a cow?"
    id: 'kashiyabhai',
    name: 'Kashiyabhai',
    yesIndices: [
      0,   // Is this a person? YES
      5,   // Is this a devotee? YES (eventually)
      10,  // Is this in Gujarat? YES - Vaso
      28,  // Say "Has he not turned an ass into a cow?" about Joban? YES
      39,  // Envious/opposed to Swaminarayan in Vaso? YES
      52,  // Question Joban Pagi about tilak mark? YES
      112, // Amazed to see Joban transformed? YES
    ],
    unknownIndices: [
      15,  // Met Bhagwan Swaminarayan? 0.5 - unclear
    ],
  },

  // ===== CHAPTER 6: Jivuba =====

  {
    // Jivuba's mother-in-law who allowed her celibacy,
    // convinced her son to give Jivuba permission to worship God
    id: 'raibai',
    name: 'Raibai',
    yesIndices: [
      0,   // Is this a person? YES
      5,   // Is this a devotee? YES
      6,   // Is this a female? YES
      10,  // Is this in Gujarat? YES - Kundal
    ],
    unknownIndices: [
      15,  // Met Bhagwan Swaminarayan? 0.5 - unclear from text
    ],
  },

  {
    // Sick sadhu whom Jivuba gave her chariot,
    // stricken with diarrhoea on road from Kariyani to Gadhada
    id: 'akhandanand_swami',
    name: 'Akhandanand Swami',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES
      10,  // Is this in Gujarat? YES
      15,  // Met Bhagwan Swaminarayan? YES
    ],
    unknownIndices: [
      13,  // Associated with poetry/writing? 0.5 - uncertain
    ],
  },

  // ===== CHAPTER 7: Nirgundasji =====

  {
    // Shastriji Maharaj's right-hand sadhu, born Jethabhai of Pij,
    // served in Akshar Deri, strict demeanour, worked in Khandesh,
    // left Vadtal unable to part with Shastriji
    id: 'nirgundasji',
    name: 'Nirgundasji (Jethabhai)',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES
      10,  // Is this in Gujarat? YES - Pij, near Nadiad
      16,  // Modern era (after 1900)? YES - born 1876
      17,  // Related to BAPS? YES
      33,  // Take initiation unable to part with Shastriji? YES
      50,  // Often quote 'Re rang sahit Harine ratie'? YES
      59,  // Eyes opened listening to Yagnapurushdasji? YES
      62,  // Pray "Please forgive me..." to Shastriji? YES
      67,  // Offer dandvats outskirts of Mahuva? YES
      72,  // Ask forgiveness and to be taken to Akshardham? YES
      78,  // Pray to be taken to Akshardham in last moments? YES
      92,  // Leave Vadtal unable to part with Shastriji? YES
      95,  // Swamishri say "intellect shine in saffron" to this person? YES
      106, // Take bhagwati diksha Samvat 1953 at Bhagatji's behest? YES
      118, // Receive bhagwati diksha Vasant Panchmi Samvat 1962? YES
      119, // Acharya Kunjavihariprasadji of Vadhwan give diksha? YES
      141, // Always by Shastriji's side during activities? YES
      153, // Work in Khandesh? YES
      160, // Often sing 'Re rang sahit Harine ratie'? YES
    ],
    unknownIndices: [],
  },

  {
    // Guru of BAPS Sanstha, propagated Akshar-Purushottam upasana,
    // Shastri Yagnapurushdasji, born Dungarji in Mahelav,
    // enlightened Jethabhai, forced to leave Vartal
    id: 'shastriji_maharaj',
    name: 'Shastriji Maharaj',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES
      10,  // Is this in Gujarat? YES
      16,  // Modern era? YES - born 1865
      17,  // Related to BAPS? YES - founder
      37,  // Say "This loss has come in the way of our work" about fire? YES
      42,  // Ask for money for murtis for Sarangpur? YES
      46,  // Enlighten Jethabhai about Akshar-Purushottam? YES
      65,  // Explain Akshar Purushottam upasana to Jethabhai? YES
      66,  // Say "They are pleased by building Akshar-Purushottam mandirs"? YES
    ],
    unknownIndices: [
      14,  // Associated with building? 0.5 - built many mandirs
    ],
  },

  {
    // Pragji Bhagat, manifest form of Akshar-Purushottam (per BAPS),
    // embraced Jethabhai to make him well, cotton-carder devotee,
    // died ~1897 in Mahuva
    id: 'bhagatji_maharaj',
    name: 'Bhagatji Maharaj (Pragji Bhagat)',
    yesIndices: [
      0,   // Is this a person? YES
      5,   // Is this a devotee? YES - householder (Bhagat)
      10,  // Is this in Gujarat? YES - Mahuva
      17,  // Related to BAPS? YES - foundational guru
      51,  // Bhagatji say "I want to make you well" to Jethabhai? YES
      87,  // Bhagatji say "I want to make you well, come let me take"? YES
      122, // Embrace Jethabhai after reading his thoughts? YES
      123, // Say "I want to make you better today" before embracing? YES
    ],
    unknownIndices: [
      15,  // Met Bhagwan Swaminarayan? 0.5 - uncertain timeline
    ],
  },

  {
    // Established youth movement, spiritual successor in BAPS line,
    // Nirgundasji recognized his greatness
    id: 'yogiji_maharaj',
    name: 'Yogiji Maharaj',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES
      10,  // Is this in Gujarat? YES - Dhari
      16,  // Modern era? YES - 1892-1971
      17,  // Related to BAPS? YES
      103, // Never doubt Maharaj? YES
    ],
    unknownIndices: [
      14,  // Associated with building? 0.5 - built mandirs
    ],
  },

  {
    // Inspirer of the Satsang Reader book series,
    // Vasant Panchami 1972 blessings
    id: 'pramukh_swami_maharaj',
    name: 'Pramukh Swami Maharaj',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES
      10,  // Is this in Gujarat? YES - Chansad
      14,  // Associated with building/construction? YES - built 1100+ mandirs
      16,  // Modern era? YES - 1921-2016
      17,  // Related to BAPS? YES
    ],
    unknownIndices: [],
  },

  {
    // Great devotee of Gunatitanand Swami, insisted Yagnapurushdasji leave Vartal
    id: 'krishnaji_ada',
    name: 'Krishnaji Ada',
    yesIndices: [
      0,   // Is this a person? YES
      5,   // Is this a devotee? YES
      10,  // Is this in Gujarat? YES
      17,  // Related to BAPS? YES
    ],
    unknownIndices: [
      16,  // Modern era? 0.5 - unclear, Gunatitanand's era spans both
    ],
  },

  {
    // Foremost disciple of Gunatitanand Swami in Junagadh,
    // Yagnapurushdasji wanted Jethabhai to learn from him
    id: 'jaga_bhagat',
    name: 'Jaga Bhagat',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES - referred to as "Swami Jaga Bhagat"
      10,  // Is this in Gujarat? YES - Junagadh
      17,  // Related to BAPS? YES
    ],
    unknownIndices: [
      16,  // Modern era? 0.5 - late 1800s
    ],
  },

  // ===== CHAPTER 8: Yagnapriyadasji =====

  {
    // Wealthy farmer Ashabhai, gave everything to Shastriji Maharaj,
    // home destroyed by fire yet donated for Sarangpur murtis,
    // took diksha at age 70, named Mota Swami
    id: 'yagnapriyadasji',
    name: 'Ashabhai (Yagnapriyadasji)',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES - became sadhu later
      5,   // Is this a devotee? YES - was householder first
      10,  // Is this in Gujarat? YES - Sadhi, near Vadodara
      16,  // Modern era? YES
      17,  // Related to BAPS? YES
      44,  // Accept renunciation due to sentiment for Shastriji's Sanstha? YES
      49,  // Deeply pained because home destroyed by fire? YES
      61,  // Cotton, grams, wheat burnt in fire? YES
      74,  // Named Mota Swami after initiation? YES
      80,  // Accept renunciation despite wealthy with grandchildren? YES
      163, // Become closer to Shastriji after witnessing departure from Vartal? YES
    ],
    unknownIndices: [],
  },

  {
    // Leading devotee, fetched money for Sarangpur murtis from money lender
    // at Ashabhai's request after the fire
    id: 'motibhai',
    name: 'Motibhai',
    yesIndices: [
      0,   // Is this a person? YES
      5,   // Is this a devotee? YES
      10,  // Is this in Gujarat? YES
      16,  // Modern era? YES
      17,  // Related to BAPS? YES
      98,  // Arrange money for murtis for Sarangpur despite damage? YES
    ],
    unknownIndices: [],
  },

  {
    // Vedanta scholar from Mandvi in Kutch who debated and lost to Maharaj,
    // mistook Brahmanand Swami for Swaminarayan, became a devotee
    id: 'khaiyo_khatri',
    name: 'Khaiyo Khatri',
    yesIndices: [
      0,   // Is this a person? YES
      5,   // Is this a devotee? YES (eventually)
      10,  // Is this in Gujarat? YES - Mandvi, Kutch
      15,  // Met Bhagwan Swaminarayan? YES - debated with him
      18,  // Different faith/background? YES - Vedanta scholar
      139, // Mistake Brahmanand Swami for Swaminarayan? YES
    ],
    unknownIndices: [],
  },

  // ===== CROSS-CHAPTER / OTHER =====

  {
    // Supreme God, central figure of the Swaminarayan Sampradaya,
    // also known as Shriji Maharaj, Sahajanand Swami
    id: 'bhagwan_swaminarayan',
    name: 'Bhagwan Swaminarayan (Shriji Maharaj)',
    yesIndices: [
      0,   // Is this a person? YES
      7,   // Is this a deity/divine figure? YES
      10,  // Is this in Gujarat? YES
      14,  // Associated with building/construction? YES - built mandirs
      22,  // Celebrate Holi because of Joban Pagi's request? YES
      29,  // Say "To have served my sadhu was as good as having served me"? YES
      36,  // Say "His importance is not dependent on the seat"? YES
      40,  // Speak about dharma when asking for Vartal mandir help? YES
      43,  // Give Ladudanji the name Shrirangdas? YES
      54,  // Consecrate own murti at Vartal mandir? YES
      57,  // Say "Lose some weight. Fast a bit."? YES
      60,  // Call someone a true yati after calming horse in Junagadh? YES
      64,  // Personally lift bier to honor selfless devotion? YES
      71,  // Say "Gunatitanand Swami's greatness is not due to the seat"? YES
      76,  // Say "Take this sukhdi to freshen your mouth" to Shuk Muni? YES
      89,  // Say "Can't these rafters and bamboos be removed?" to Dada Khachar? YES
      91,  // Say "served my sadhu is as good as having" about Jivuba? YES
      105, // Decide to set up mandirs, sadhus, scriptures in Vartal? YES
      109, // Say "Can't these rafters..." when Shuk Muni shivered? YES
      121, // Transform bandit by putting kanthi around neck? YES
      135, // Celebrate Holi at Vartal pleased with Joban? YES
      137, // Offer sukhdi to Shukmuni to break ekadashi? YES
      146, // Say "His greatness not due to seat" to Shuk Muni about Gunatitanand? YES
      155, // Give Shukmuni sukhdi to break ekadashi? YES
    ],
    unknownIndices: [
      15,  // Met Bhagwan Swaminarayan? 0.5 - IS Bhagwan Swaminarayan
    ],
  },

  {
    // Helped Jagannath (Shukanand Swami) request to become a sadhu,
    // told Maharaj "The Brahmin from Dabhan wants to become a sadhu"
    id: 'somla_khachar',
    name: 'Somla Khachar',
    yesIndices: [
      0,   // Is this a person? YES
      5,   // Is this a devotee? YES
      10,  // Is this in Gujarat? YES - Gadhada area
      15,  // Met Bhagwan Swaminarayan? YES
    ],
    unknownIndices: [
      103, // Never doubt Maharaj? 0.5 - limited info
    ],
  },

  {
    // State official in Surat, invited Maharaj to Surat,
    // organized grand reception, received Maharaj's pagh as gift
    id: 'ardeshar_kotwal',
    name: 'Ardeshar Kotwal',
    yesIndices: [
      0,   // Is this a person? YES
      5,   // Is this a devotee? YES
      10,  // Is this in Gujarat? YES - Surat
      15,  // Met Bhagwan Swaminarayan? YES
      18,  // Different faith/background? YES - Parsi official
    ],
    unknownIndices: [],
  },

  {
    // King of Bhavnagar who honoured Ladudanji with gold ornaments,
    // asked Ladudanji to investigate Swaminarayan
    id: 'king_vakhatsinh',
    name: 'King Vakhatsinh',
    yesIndices: [
      0,   // Is this a person? YES
      10,  // Is this in Gujarat? YES - Bhavnagar
    ],
    unknownIndices: [
      15,  // Met Bhagwan Swaminarayan? 0.5 - told Ladudanji to investigate
    ],
  },

  {
    // Maharaj's personal attendant, held the 20kg cushion,
    // saw Maharaj after his passing in Akshar Ordi
    id: 'bhaguji',
    name: 'Bhaguji',
    yesIndices: [
      0,   // Is this a person? YES
      5,   // Is this a devotee? YES
      10,  // Is this in Gujarat? YES - Gadhada
      15,  // Met Bhagwan Swaminarayan? YES
      103, // Never doubt Maharaj? YES - always with Maharaj
    ],
    unknownIndices: [],
  },

  {
    // Current spiritual leader of BAPS, blessed the Satsang Reader book
    id: 'mahant_swami_maharaj',
    name: 'Mahant Swami Maharaj',
    yesIndices: [
      0,   // Is this a person? YES
      4,   // Is this a sadhu? YES
      16,  // Modern era? YES - born 1933
      17,  // Related to BAPS? YES
    ],
    unknownIndices: [
      10,  // Is this in Gujarat? 0.5 - born in Jabalpur, MP but serves in Gujarat
      14,  // Associated with building? 0.5
    ],
  },

  {
    // Devotee who spoke of Jhinabhai's greatness before Maharaj,
    // received dhotiyu from Jhinabhai in exchange for speaking of him
    id: 'naja_jogia',
    name: 'Naja Jogia',
    yesIndices: [
      0,   // Is this a person? YES
      5,   // Is this a devotee? YES
      10,  // Is this in Gujarat? YES
      15,  // Met Bhagwan Swaminarayan? YES
    ],
    unknownIndices: [
      18,  // Different background? 0.5 - Jogia community
    ],
  },
];

function generateAnswers(
  questions: string[],
  entity: EntityDefinition
): number[] {
  const answers = new Array(questions.length).fill(0);

  for (const idx of entity.yesIndices) {
    if (idx < questions.length) {
      answers[idx] = 1;
    }
  }

  for (const idx of entity.unknownIndices) {
    if (idx < questions.length) {
      answers[idx] = 0.5;
    }
  }

  return answers;
}

async function main() {
  console.log('=== Batch Adding Entities to Answer Matrix ===\n');

  const matrix: MatrixData = readJson(PATHS.answerMatrix);
  const totalQuestions = matrix.questions.length;

  console.log(
    `Current matrix: ${matrix.entities.length} entities × ${totalQuestions} questions\n`
  );

  let added = 0;
  let skipped = 0;

  for (const entity of ENTITIES) {
    if (matrix.entities.includes(entity.id)) {
      console.log(`  SKIP: "${entity.name}" (${entity.id}) already exists`);
      skipped++;
      continue;
    }

    const answers = generateAnswers(matrix.questions, entity);

    const yesCount = answers.filter((a) => a === 1).length;
    const noCount = answers.filter((a) => a === 0).length;
    const unknownCount = answers.filter((a) => a === 0.5).length;

    matrix.entities.push(entity.id);
    matrix.matrix.push(answers);

    if (!matrix.evidence[entity.id]) {
      matrix.evidence[entity.id] = {};
    }

    console.log(
      `  ADD: "${entity.name}" (${entity.id}) - ${yesCount}Y ${noCount}N ${unknownCount}U`
    );
    added++;
  }

  // Update metadata
  matrix.metadata.totalEntities = matrix.entities.length;
  matrix.metadata.totalPairs =
    matrix.entities.length * matrix.questions.length;
  matrix.metadata.generatedAt = new Date().toISOString();

  writeJson(PATHS.answerMatrix, matrix);

  console.log(`\n=== Summary ===`);
  console.log(`Added: ${added}, Skipped: ${skipped}`);
  console.log(
    `Matrix now has ${matrix.entities.length} entities × ${totalQuestions} questions`
  );
}

main().catch(console.error);
