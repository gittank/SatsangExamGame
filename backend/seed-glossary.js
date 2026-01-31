const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const glossaryTerms = [
  { name: "Abhishek", description: "A ritual offering in respect and reverence", category: "concept" },
  { name: "Atma", description: "The pure jiva distinct from the physical, subtle and causal bodies – i.e., distinct from the indriyas, the antahkaran, worldly desires, or any other traces of maya", category: "concept" },
  { name: "Arti", description: "Hindu ritual of waving lighted wicks before the murti of God as an act of worship", category: "concept" },
  { name: "Atmarup", description: "One who has realized one's true self as the atma", category: "concept" },
  { name: "Bawa", description: "Ascetic", category: "concept" },
  { name: "Berkho", description: "A small rosary made of large beads", category: "object" },
  { name: "Bhagvati Diksha", description: "Initiation into the sadhu-fold", category: "concept" },
  { name: "Bilipatra", description: "Leaves of tree (Aegle marmelos) sacred to Shiv", category: "object" },
  { name: "Brahmacharya", description: "Eight-fold celibacy and being immersed in Parabrahma", category: "concept" },
  { name: "Brahmarup", description: "Possessing qualities similar to those of Brahma or Aksharbrahma", category: "concept" },
  { name: "Chandlo", description: "Auspicious round mark of vermilion applied on the forehead", category: "object" },
  { name: "Chhand", description: "A musical metre", category: "concept" },
  { name: "Chopai", description: "A musical metre", category: "concept" },
  { name: "Dandvat", description: "Prostration", category: "concept" },
  { name: "Darbar", description: "Court of residence of a king or feudal ruler, traditionally with a central courtyard surrounded by rooms with verandas; also village chieftain or ruler", category: "place" },
  { name: "Devas", description: "Deities", category: "concept" },
  { name: "Dham", description: "Abode", category: "place" },
  { name: "Dharmashala", description: "Rest home for pilgrims", category: "place" },
  { name: "Dhotiyu", description: "Lower garment worn by men", category: "object" },
  { name: "Dhun", description: "Form of jap, i.e., chanting of the holy name of God, often to the accompaniment of musical instruments", category: "concept" },
  { name: "Diksha", description: "Initiation", category: "concept" },
  { name: "Ekadashi", description: "Special religious observance of fasting performed on the 11th day of the bright and dark halves of a lunar month", category: "concept" },
  { name: "Gopichandan", description: "Sanctified sandalwood", category: "object" },
  { name: "Gulal", description: "Fragrant reddish powder used on joyous occasions", category: "object" },
  { name: "Hindolo", description: "Swing", category: "object" },
  { name: "Janoi", description: "Sacred thread", category: "object" },
  { name: "Jhanjh", description: "Small pair of hand cymbals", category: "object" },
  { name: "Kalpavruksh", description: "Magical tree possessing power to fulfil the wishes of anyone sitting under it", category: "concept" },
  { name: "Kanthi", description: "A double-stranded necklace of miniature beads, usually of wood", category: "object" },
  { name: "Khatras", description: "An observance in which only food devoid of the six types of taste – sweet, salty, bitter, sour, spicy, astringent – is eaten", category: "concept" },
  { name: "Khichdi", description: "Spiced boiled rice with lentil grains", category: "object" },
  { name: "Kothari", description: "Administrative head of mandir", category: "concept" },
  { name: "Kumkum", description: "Vermilion powder used for applying chandlo", category: "object" },
  { name: "Mala", description: "Rosary", category: "object" },
  { name: "Mangala Arti", description: "First arti of the day, performed at sunrise", category: "concept" },
  { name: "Moksha", description: "Liberation", category: "concept" },
  { name: "Mrudang", description: "Type of double-sided drum. Traditional Indian percussion instrument played to provide rhythm in the singing of devotional songs", category: "object" },
  { name: "Mukta", description: "A liberated devotee, beyond all attachments; akshar-mukta", category: "concept" },
  { name: "Murti", description: "Sacred image of God", category: "object" },
  { name: "Murti-pratishtha", description: "Traditional Vedic ceremony in which murtis are consecrated in a mandir", category: "concept" },
  { name: "Nawab", description: "A local ruler", category: "concept" },
  { name: "Pagh", description: "Traditional headgear", category: "object" },
  { name: "Paramhansa", description: "An ascetic; the best of the four types of sannyasis", category: "concept" },
  { name: "Parayan", description: "Series of spiritual discourses held for several days", category: "concept" },
  { name: "Parshad", description: "A renunciate who wears white robes", category: "concept" },
  { name: "Patlo", description: "A low platform", category: "object" },
  { name: "Pichkari", description: "Water squirter used during the festival of Fuldol", category: "object" },
  { name: "Ponk", description: "Soft, green wheat grain", category: "object" },
  { name: "Pradakshina", description: "Circumambulation", category: "concept" },
  { name: "Prasad", description: "Sanctified food, blessed and consecrated by having been offered to God", category: "object" },
  { name: "Pujan", description: "Act of worship, usually with some ritual", category: "concept" },
  { name: "Rangoli", description: "Traditional design made on festive days with special coloured powder", category: "object" },
  { name: "Raas", description: "A traditional folk dance of Gujarat", category: "concept" },
  { name: "Rojho", description: "A breed of horse", category: "concept" },
  { name: "Rotlo", description: "Unleavened bread made of millet flour", category: "object" },
  { name: "Sadguru", description: "Senior sadhu", category: "concept" },
  { name: "Sampradaya", description: "Religious organization where there is the traditional transmission of knowledge through successive gurus", category: "concept" },
  { name: "Samskars", description: "To improve upon something; sacrament", category: "concept" },
  { name: "Sanjivani", description: "A special herb that rekindles life", category: "object" },
  { name: "Satsangi", description: "A devotee who practices the vows of satsang", category: "concept" },
  { name: "Shikhar", description: "Pinnacle", category: "object" },
  { name: "Shikha", description: "Tuft of hair", category: "object" },
  { name: "Sinhasan", description: "Throne for God; seat for eminent persons", category: "object" },
  { name: "Sud", description: "Bright half of lunar month", category: "concept" },
  { name: "Sukhdi", description: "A sweet delicacy of wheat flour, ghee and gur", category: "object" },
  { name: "Thuli", description: "A type of cheap grain", category: "object" },
  { name: "Tilak", description: "U-shaped mark made with sandalwood paste on one's forehead, chest and arms", category: "object" },
  { name: "Tilak-chandlo", description: "U-shaped mark made with sandalwood paste and a round mark of kumkum in its centre applied by male devotees; a hallmark of one's allegiance to the Swaminarayan Sampradaya", category: "object" },
  { name: "Upasana", description: "Philosophical understanding of the nature of God", category: "concept" },
  { name: "Vad", description: "Dark half of lunar month", category: "concept" },
  { name: "Vairagi", description: "Ascetic", category: "concept" },
  { name: "Vartman", description: "Vow", category: "concept" },
  { name: "Vicharan", description: "Spiritual travels", category: "concept" },
  { name: "Yagna", description: "Ceremonial ritual performed as a form of worship to seek the good favour and receive the blessings of the deities", category: "concept" },
  { name: "Yati", description: "Person with great self-control", category: "concept" }
];

// Questions for glossary terms
const glossaryQuestions = [
  { text: "Is this a concept or term (not a physical object)?", category: "concept" },
  { text: "Is this a physical object you can touch?", category: "object" },
  { text: "Is this related to worship or rituals?", category: "all" },
  { text: "Is this something worn on the body?", category: "object" },
  { text: "Is this a type of food?", category: "object" },
  { text: "Is this a musical term or instrument?", category: "all" },
  { text: "Is this related to spiritual liberation or enlightenment?", category: "concept" },
  { text: "Is this a type of religious observance or practice?", category: "concept" },
  { text: "Is this applied to the forehead or body?", category: "object" },
  { text: "Is this used in ceremonies?", category: "all" },
  { text: "Is this a type of person or role?", category: "concept" },
  { text: "Is this related to fasting?", category: "concept" },
  { text: "Is this a type of jewelry or necklace?", category: "object" }
];

// Answer mappings for each term
const termAnswers = {
  "Abhishek": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to worship or rituals?": "yes", "Is this used in ceremonies?": "yes" },
  "Atma": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to spiritual liberation or enlightenment?": "yes" },
  "Arti": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to worship or rituals?": "yes", "Is this used in ceremonies?": "yes" },
  "Atmarup": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to spiritual liberation or enlightenment?": "yes" },
  "Bawa": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of person or role?": "yes" },
  "Berkho": { "Is this a physical object you can touch?": "yes", "Is this a type of jewelry or necklace?": "yes", "Is this related to worship or rituals?": "yes" },
  "Bhagvati Diksha": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of religious observance or practice?": "yes", "Is this used in ceremonies?": "yes" },
  "Bilipatra": { "Is this a physical object you can touch?": "yes", "Is this used in ceremonies?": "yes" },
  "Brahmacharya": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of religious observance or practice?": "yes", "Is this related to spiritual liberation or enlightenment?": "yes" },
  "Brahmarup": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to spiritual liberation or enlightenment?": "yes" },
  "Chandlo": { "Is this a physical object you can touch?": "yes", "Is this applied to the forehead or body?": "yes", "Is this related to worship or rituals?": "yes" },
  "Chhand": { "Is this a concept or term (not a physical object)?": "yes", "Is this a musical term or instrument?": "yes" },
  "Chopai": { "Is this a concept or term (not a physical object)?": "yes", "Is this a musical term or instrument?": "yes" },
  "Dandvat": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to worship or rituals?": "yes" },
  "Darbar": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of person or role?": "yes" },
  "Devas": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to spiritual liberation or enlightenment?": "yes" },
  "Dham": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to spiritual liberation or enlightenment?": "yes" },
  "Dharmashala": { "Is this a concept or term (not a physical object)?": "no", "Is this a physical object you can touch?": "no" },
  "Dhotiyu": { "Is this a physical object you can touch?": "yes", "Is this something worn on the body?": "yes" },
  "Dhun": { "Is this a concept or term (not a physical object)?": "yes", "Is this a musical term or instrument?": "yes", "Is this related to worship or rituals?": "yes" },
  "Diksha": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of religious observance or practice?": "yes", "Is this used in ceremonies?": "yes" },
  "Ekadashi": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of religious observance or practice?": "yes", "Is this related to fasting?": "yes" },
  "Gopichandan": { "Is this a physical object you can touch?": "yes", "Is this applied to the forehead or body?": "yes", "Is this used in ceremonies?": "yes" },
  "Gulal": { "Is this a physical object you can touch?": "yes", "Is this used in ceremonies?": "yes" },
  "Hindolo": { "Is this a physical object you can touch?": "yes", "Is this used in ceremonies?": "yes" },
  "Janoi": { "Is this a physical object you can touch?": "yes", "Is this something worn on the body?": "yes", "Is this used in ceremonies?": "yes" },
  "Jhanjh": { "Is this a physical object you can touch?": "yes", "Is this a musical term or instrument?": "yes" },
  "Kalpavruksh": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to spiritual liberation or enlightenment?": "yes" },
  "Kanthi": { "Is this a physical object you can touch?": "yes", "Is this a type of jewelry or necklace?": "yes", "Is this something worn on the body?": "yes" },
  "Khatras": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of religious observance or practice?": "yes", "Is this related to fasting?": "yes" },
  "Khichdi": { "Is this a physical object you can touch?": "yes", "Is this a type of food?": "yes" },
  "Kothari": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of person or role?": "yes" },
  "Kumkum": { "Is this a physical object you can touch?": "yes", "Is this applied to the forehead or body?": "yes", "Is this used in ceremonies?": "yes" },
  "Mala": { "Is this a physical object you can touch?": "yes", "Is this a type of jewelry or necklace?": "yes", "Is this related to worship or rituals?": "yes" },
  "Mangala Arti": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to worship or rituals?": "yes", "Is this a type of religious observance or practice?": "yes" },
  "Moksha": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to spiritual liberation or enlightenment?": "yes" },
  "Mrudang": { "Is this a physical object you can touch?": "yes", "Is this a musical term or instrument?": "yes" },
  "Mukta": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to spiritual liberation or enlightenment?": "yes", "Is this a type of person or role?": "yes" },
  "Murti": { "Is this a physical object you can touch?": "yes", "Is this related to worship or rituals?": "yes", "Is this used in ceremonies?": "yes" },
  "Murti-pratishtha": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to worship or rituals?": "yes", "Is this used in ceremonies?": "yes" },
  "Nawab": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of person or role?": "yes" },
  "Pagh": { "Is this a physical object you can touch?": "yes", "Is this something worn on the body?": "yes" },
  "Paramhansa": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of person or role?": "yes", "Is this related to spiritual liberation or enlightenment?": "yes" },
  "Parayan": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of religious observance or practice?": "yes" },
  "Parshad": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of person or role?": "yes" },
  "Patlo": { "Is this a physical object you can touch?": "yes" },
  "Pichkari": { "Is this a physical object you can touch?": "yes", "Is this used in ceremonies?": "yes" },
  "Ponk": { "Is this a physical object you can touch?": "yes", "Is this a type of food?": "yes" },
  "Pradakshina": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to worship or rituals?": "yes" },
  "Prasad": { "Is this a physical object you can touch?": "yes", "Is this a type of food?": "yes", "Is this related to worship or rituals?": "yes" },
  "Pujan": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to worship or rituals?": "yes", "Is this used in ceremonies?": "yes" },
  "Rangoli": { "Is this a physical object you can touch?": "yes", "Is this used in ceremonies?": "yes" },
  "Raas": { "Is this a concept or term (not a physical object)?": "yes", "Is this a musical term or instrument?": "yes" },
  "Rojho": { "Is this a concept or term (not a physical object)?": "yes" },
  "Rotlo": { "Is this a physical object you can touch?": "yes", "Is this a type of food?": "yes" },
  "Sadguru": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of person or role?": "yes", "Is this related to spiritual liberation or enlightenment?": "yes" },
  "Sampradaya": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to spiritual liberation or enlightenment?": "yes" },
  "Samskars": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of religious observance or practice?": "yes", "Is this used in ceremonies?": "yes" },
  "Sanjivani": { "Is this a physical object you can touch?": "yes" },
  "Satsangi": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of person or role?": "yes" },
  "Shikhar": { "Is this a physical object you can touch?": "yes" },
  "Shikha": { "Is this a physical object you can touch?": "yes", "Is this something worn on the body?": "no" },
  "Sinhasan": { "Is this a physical object you can touch?": "yes", "Is this used in ceremonies?": "yes" },
  "Sud": { "Is this a concept or term (not a physical object)?": "yes" },
  "Sukhdi": { "Is this a physical object you can touch?": "yes", "Is this a type of food?": "yes" },
  "Thuli": { "Is this a physical object you can touch?": "yes", "Is this a type of food?": "yes" },
  "Tilak": { "Is this a physical object you can touch?": "yes", "Is this applied to the forehead or body?": "yes", "Is this related to worship or rituals?": "yes" },
  "Tilak-chandlo": { "Is this a physical object you can touch?": "yes", "Is this applied to the forehead or body?": "yes", "Is this related to worship or rituals?": "yes" },
  "Upasana": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to spiritual liberation or enlightenment?": "yes" },
  "Vad": { "Is this a concept or term (not a physical object)?": "yes" },
  "Vairagi": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of person or role?": "yes" },
  "Vartman": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of religious observance or practice?": "yes" },
  "Vicharan": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of religious observance or practice?": "yes" },
  "Yagna": { "Is this a concept or term (not a physical object)?": "yes", "Is this related to worship or rituals?": "yes", "Is this used in ceremonies?": "yes" },
  "Yati": { "Is this a concept or term (not a physical object)?": "yes", "Is this a type of person or role?": "yes" }
};

async function seedGlossary() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/knowledge.db');
  const dbBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(dbBuffer);

  console.log('Adding glossary terms...\n');

  // First add new questions
  const existingQuestions = new Map();
  const qResult = db.exec('SELECT id, text FROM questions');
  if (qResult.length > 0) {
    for (const row of qResult[0].values) {
      existingQuestions.set(row[1], row[0]);
    }
  }

  const questionIdMap = new Map();
  for (const q of glossaryQuestions) {
    if (existingQuestions.has(q.text)) {
      questionIdMap.set(q.text, existingQuestions.get(q.text));
      console.log(`Question already exists: "${q.text}"`);
    } else {
      const escapedText = q.text.replace(/'/g, "''");
      db.run(`INSERT INTO questions (text, category) VALUES ('${escapedText}', '${q.category}')`);
      const result = db.exec('SELECT last_insert_rowid()');
      const qId = result[0].values[0][0];
      questionIdMap.set(q.text, qId);
      console.log(`Added question: "${q.text}" (ID: ${qId})`);
    }
  }

  console.log('\nAdding entities and answers...\n');

  let added = 0;
  let skipped = 0;

  for (const term of glossaryTerms) {
    // Check if entity already exists
    const existing = db.exec(`SELECT id FROM entities WHERE LOWER(name) = LOWER('${term.name.replace(/'/g, "''")}')`);

    let entityId;
    if (existing.length > 0 && existing[0].values.length > 0) {
      entityId = existing[0].values[0][0];
      console.log(`Entity already exists: ${term.name} (ID: ${entityId})`);
      skipped++;
    } else {
      // Add new entity
      const escapedName = term.name.replace(/'/g, "''");
      const escapedDesc = term.description.replace(/'/g, "''");
      db.run(`INSERT INTO entities (name, category, description) VALUES ('${escapedName}', '${term.category}', '${escapedDesc}')`);
      const result = db.exec('SELECT last_insert_rowid()');
      entityId = result[0].values[0][0];
      console.log(`Added entity: ${term.name} (ID: ${entityId})`);
      added++;
    }

    // Add answers for this entity
    const answers = termAnswers[term.name];
    if (answers) {
      for (const [questionText, answer] of Object.entries(answers)) {
        const questionId = questionIdMap.get(questionText);
        if (questionId) {
          db.run(`INSERT OR REPLACE INTO entity_question_answers (entity_id, question_id, answer, confidence)
                  VALUES (${entityId}, ${questionId}, '${answer}', 1.0)`);
        }
      }
    }

    // Also add the base category questions
    const isPersonQ = existingQuestions.get("Is this a person?");
    const isPlaceQ = existingQuestions.get("Is this a place?");
    const isEventQ = existingQuestions.get("Is this an event or occasion?");

    if (isPersonQ) {
      db.run(`INSERT OR REPLACE INTO entity_question_answers (entity_id, question_id, answer, confidence)
              VALUES (${entityId}, ${isPersonQ}, 'no', 1.0)`);
    }
    if (isPlaceQ) {
      const isPlace = term.category === 'place' ? 'yes' : 'no';
      db.run(`INSERT OR REPLACE INTO entity_question_answers (entity_id, question_id, answer, confidence)
              VALUES (${entityId}, ${isPlaceQ}, '${isPlace}', 1.0)`);
    }
  }

  // Save the database
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  db.close();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Added: ${added} new entities`);
  console.log(`Skipped: ${skipped} existing entities`);
  console.log(`Total glossary terms: ${glossaryTerms.length}`);
  console.log(`\nDatabase saved. Please restart the backend server.`);
}

seedGlossary().catch(console.error);
