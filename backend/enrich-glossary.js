const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// More detailed answer mappings for glossary terms
const detailedAnswers = {
  // Food items
  "Prasad": {
    "Is this a food item or sweet?": "yes",
    "Is this something found in a mandir?": "yes",
    "Is this something you can eat?": "yes",
    "Is this offered to God?": "yes"
  },
  "Khichdi": {
    "Is this a food item or sweet?": "yes",
    "Is this something you can eat?": "yes",
    "Is this a sweet dish?": "no"
  },
  "Sukhdi": {
    "Is this a food item or sweet?": "yes",
    "Is this something you can eat?": "yes",
    "Is this a sweet dish?": "yes"
  },
  "Rotlo": {
    "Is this a food item or sweet?": "yes",
    "Is this something you can eat?": "yes",
    "Is this a sweet dish?": "no",
    "Is this a type of bread?": "yes"
  },
  "Ponk": {
    "Is this a food item or sweet?": "yes",
    "Is this something you can eat?": "yes",
    "Is this made from wheat?": "yes"
  },
  "Thuli": {
    "Is this a food item or sweet?": "yes",
    "Is this something you can eat?": "yes",
    "Is this a grain?": "yes"
  },

  // Body marks and applications
  "Chandlo": {
    "Is this applied to the forehead or body?": "yes",
    "Is this something you can wear?": "no",
    "Is this a mark on the body?": "yes",
    "Is this red in color?": "yes"
  },
  "Tilak": {
    "Is this applied to the forehead or body?": "yes",
    "Is this a mark on the body?": "yes",
    "Is this U-shaped?": "yes"
  },
  "Tilak-chandlo": {
    "Is this applied to the forehead or body?": "yes",
    "Is this a mark on the body?": "yes",
    "Is this a combination of two marks?": "yes"
  },
  "Kumkum": {
    "Is this applied to the forehead or body?": "yes",
    "Is this a powder?": "yes",
    "Is this red in color?": "yes"
  },
  "Gopichandan": {
    "Is this applied to the forehead or body?": "yes",
    "Is this a type of sandalwood?": "yes"
  },
  "Gulal": {
    "Is this a powder?": "yes",
    "Is this red in color?": "yes",
    "Is this used during Fuldol/Holi?": "yes"
  },

  // Jewelry and worn items
  "Kanthi": {
    "Is this a type of jewelry or necklace?": "yes",
    "Is this something you can wear?": "yes",
    "Is this worn around the neck?": "yes",
    "Is this made of wooden beads?": "yes"
  },
  "Mala": {
    "Is this a type of jewelry or necklace?": "yes",
    "Is this used for prayer?": "yes",
    "Is this a rosary?": "yes"
  },
  "Berkho": {
    "Is this a type of jewelry or necklace?": "yes",
    "Is this used for prayer?": "yes",
    "Is this a small rosary?": "yes"
  },
  "Janoi": {
    "Is this something you can wear?": "yes",
    "Is this a sacred thread?": "yes",
    "Is this worn by brahmins?": "yes"
  },
  "Pagh": {
    "Is this something you can wear?": "yes",
    "Is this worn on the head?": "yes",
    "Is this a type of turban?": "yes"
  },
  "Dhotiyu": {
    "Is this something you can wear?": "yes",
    "Is this worn on the lower body?": "yes"
  },

  // Musical instruments
  "Mrudang": {
    "Is this a musical term or instrument?": "yes",
    "Is this a percussion instrument?": "yes",
    "Is this a type of drum?": "yes"
  },
  "Jhanjh": {
    "Is this a musical term or instrument?": "yes",
    "Is this a percussion instrument?": "yes",
    "Is this a type of cymbal?": "yes"
  },
  "Chhand": {
    "Is this a musical term or instrument?": "yes",
    "Is this a musical metre or rhythm?": "yes"
  },
  "Chopai": {
    "Is this a musical term or instrument?": "yes",
    "Is this a musical metre or rhythm?": "yes"
  },
  "Dhun": {
    "Is this a musical term or instrument?": "yes",
    "Is this a type of chanting?": "yes"
  },
  "Raas": {
    "Is this a musical term or instrument?": "yes",
    "Is this a type of dance?": "yes"
  },

  // Worship related
  "Arti": {
    "Is this related to worship or rituals?": "yes",
    "Is this performed with light?": "yes",
    "Is this done with waving motion?": "yes"
  },
  "Mangala Arti": {
    "Is this related to worship or rituals?": "yes",
    "Is this performed at sunrise?": "yes",
    "Is this the first arti of the day?": "yes"
  },
  "Abhishek": {
    "Is this related to worship or rituals?": "yes",
    "Is this a ritual offering?": "yes",
    "Does this involve pouring substances?": "yes"
  },
  "Pujan": {
    "Is this related to worship or rituals?": "yes",
    "Is this an act of worship?": "yes"
  },
  "Pradakshina": {
    "Is this related to worship or rituals?": "yes",
    "Does this involve walking in circles?": "yes"
  },
  "Dandvat": {
    "Is this related to worship or rituals?": "yes",
    "Is this a prostration?": "yes",
    "Does this involve lying on the ground?": "yes"
  },
  "Yagna": {
    "Is this related to worship or rituals?": "yes",
    "Is this a ceremonial ritual?": "yes",
    "Does this involve fire?": "yes"
  },

  // Spiritual concepts
  "Atma": {
    "Is this a spiritual concept?": "yes",
    "Is this the soul?": "yes"
  },
  "Moksha": {
    "Is this a spiritual concept?": "yes",
    "Is this liberation?": "yes",
    "Is this the goal of spiritual life?": "yes"
  },
  "Upasana": {
    "Is this a spiritual concept?": "yes",
    "Is this related to understanding God?": "yes"
  },
  "Brahmacharya": {
    "Is this a spiritual concept?": "yes",
    "Is this related to celibacy?": "yes"
  },
  "Brahmarup": {
    "Is this a spiritual concept?": "yes",
    "Is this a state of being?": "yes"
  },
  "Atmarup": {
    "Is this a spiritual concept?": "yes",
    "Is this a state of being?": "yes",
    "Is this self-realization?": "yes"
  },

  // Religious observances
  "Ekadashi": {
    "Is this a type of religious observance or practice?": "yes",
    "Is this related to fasting?": "yes",
    "Is this observed on the 11th day?": "yes"
  },
  "Khatras": {
    "Is this a type of religious observance or practice?": "yes",
    "Is this related to fasting?": "yes",
    "Is this about restricting taste?": "yes"
  },
  "Diksha": {
    "Is this a type of religious observance or practice?": "yes",
    "Is this initiation?": "yes"
  },
  "Bhagvati Diksha": {
    "Is this a type of religious observance or practice?": "yes",
    "Is this initiation?": "yes",
    "Is this for becoming a sadhu?": "yes"
  },
  "Vartman": {
    "Is this a type of religious observance or practice?": "yes",
    "Is this a vow?": "yes"
  },
  "Parayan": {
    "Is this a type of religious observance or practice?": "yes",
    "Is this a series of discourses?": "yes"
  },
  "Samskars": {
    "Is this a type of religious observance or practice?": "yes",
    "Is this a sacrament?": "yes"
  },

  // Types of persons/roles
  "Paramhansa": {
    "Is this a type of person or role?": "yes",
    "Is this a type of ascetic?": "yes",
    "Is this the highest type of sannyasi?": "yes"
  },
  "Sadguru": {
    "Is this a type of person or role?": "yes",
    "Is this a senior sadhu?": "yes"
  },
  "Satsangi": {
    "Is this a type of person or role?": "yes",
    "Is this a devotee?": "yes"
  },
  "Mukta": {
    "Is this a type of person or role?": "yes",
    "Is this a liberated soul?": "yes"
  },
  "Parshad": {
    "Is this a type of person or role?": "yes",
    "Does this person wear white?": "yes"
  },
  "Kothari": {
    "Is this a type of person or role?": "yes",
    "Is this an administrative role?": "yes"
  },
  "Bawa": {
    "Is this a type of person or role?": "yes",
    "Is this a type of ascetic?": "yes"
  },
  "Vairagi": {
    "Is this a type of person or role?": "yes",
    "Is this a type of ascetic?": "yes"
  },
  "Yati": {
    "Is this a type of person or role?": "yes",
    "Is this about self-control?": "yes"
  },
  "Nawab": {
    "Is this a type of person or role?": "yes",
    "Is this a ruler?": "yes"
  },

  // Objects in mandir
  "Murti": {
    "Is this something found in a mandir?": "yes",
    "Is this a sacred image?": "yes",
    "Is this worshipped?": "yes"
  },
  "Sinhasan": {
    "Is this something found in a mandir?": "yes",
    "Is this a throne?": "yes"
  },
  "Hindolo": {
    "Is this something found in a mandir?": "yes",
    "Is this a swing?": "yes"
  },
  "Patlo": {
    "Is this something found in a mandir?": "yes",
    "Is this a platform?": "yes"
  },
  "Shikhar": {
    "Is this something found in a mandir?": "yes",
    "Is this a pinnacle?": "yes",
    "Is this on top of the mandir?": "yes"
  },
  "Rangoli": {
    "Is this a decoration?": "yes",
    "Is this made on the floor?": "yes"
  },

  // Misc objects
  "Pichkari": {
    "Is this used during Fuldol/Holi?": "yes",
    "Is this for squirting water?": "yes"
  },
  "Bilipatra": {
    "Is this a leaf?": "yes",
    "Is this sacred to Shiv?": "yes"
  },
  "Sanjivani": {
    "Is this a herb?": "yes",
    "Is this magical?": "yes"
  },
  "Kalpavruksh": {
    "Is this a tree?": "yes",
    "Is this magical?": "yes",
    "Can this grant wishes?": "yes"
  },

  // Places
  "Dham": {
    "Is this a place?": "yes",
    "Is this an abode?": "yes"
  },
  "Dharmashala": {
    "Is this a place?": "yes",
    "Is this for pilgrims?": "yes"
  },

  // Time-related
  "Sud": {
    "Is this related to the lunar calendar?": "yes",
    "Is this the bright half of the month?": "yes"
  },
  "Vad": {
    "Is this related to the lunar calendar?": "yes",
    "Is this the dark half of the month?": "yes"
  },

  // Organizations
  "Sampradaya": {
    "Is this an organization?": "yes",
    "Is this a religious tradition?": "yes"
  },

  // Hair
  "Shikha": {
    "Is this related to hair?": "yes",
    "Is this a tuft of hair?": "yes"
  }
};

async function enrichGlossary() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/knowledge.db');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Get all questions
  const questions = db.exec('SELECT id, text FROM questions');
  const questionMap = new Map();
  for (const row of questions[0].values) {
    questionMap.set(row[1], row[0]);
  }

  // Create any missing questions
  const allQuestionTexts = new Set();
  for (const answers of Object.values(detailedAnswers)) {
    for (const q of Object.keys(answers)) {
      allQuestionTexts.add(q);
    }
  }

  for (const qText of allQuestionTexts) {
    if (!questionMap.has(qText)) {
      const escaped = qText.replace(/'/g, "''");
      db.run(`INSERT INTO questions (text, category) VALUES ('${escaped}', 'all')`);
      const result = db.exec('SELECT last_insert_rowid()');
      const qId = result[0].values[0][0];
      questionMap.set(qText, qId);
      console.log(`Created question: "${qText}" (ID: ${qId})`);
    }
  }

  // Get all entities
  const entities = db.exec('SELECT id, name FROM entities');
  const entityMap = new Map();
  for (const row of entities[0].values) {
    entityMap.set(row[1], row[0]);
  }

  // Add answers
  let answerCount = 0;
  for (const [entityName, answers] of Object.entries(detailedAnswers)) {
    const entityId = entityMap.get(entityName);
    if (!entityId) {
      console.log(`Entity not found: ${entityName}`);
      continue;
    }

    for (const [qText, answer] of Object.entries(answers)) {
      const qId = questionMap.get(qText);
      if (!qId) {
        console.log(`Question not found: ${qText}`);
        continue;
      }

      db.run(`INSERT OR REPLACE INTO entity_question_answers (entity_id, question_id, answer, confidence)
              VALUES (${entityId}, ${qId}, '${answer}', 1.0)`);
      answerCount++;
    }
  }

  // Save
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();

  console.log(`\nAdded ${answerCount} detailed answers for glossary terms`);
}

enrichGlossary().catch(console.error);
