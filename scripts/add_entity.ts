/**
 * Add a single entity to the answer matrix.
 *
 * Usage: npx tsx add_entity.ts
 */

import { readJson, writeJson, PATHS } from './utils.js';

interface MatrixData {
  entities: string[];
  questions: string[];
  matrix: number[][];
  evidence: Record<string, Record<string, any>>;
  metadata: any;
}

// ====== ENTITY TO ADD ======
const NEW_ENTITY_ID = 'dada_khachar';
const NEW_ENTITY_NAME = 'Dada Khachar';

// Dada Khachar facts:
// - Male devotee, younger brother of Jivuba (Jaya/Motiba) and Laduba (Lalita)
// - Son of Abhal Khachar, chieftain of Gadhada
// - Maharaj stayed in his darbar in Gadhada - made Gadhada his home
// - Owned Lakshmi Vadi farm with mango tree
// - Maharaj asked him "Can't these rafters and bamboos be removed?" to make fire for Shuk Muni
// - Called a carpenter, broke open clay pot, lit fire for sadhus
// - Met Bhagwan Swaminarayan directly
// - From Gadhada, Gujarat
// - Constantly in Maharaj's seva along with his sisters
// - Not a sadhu, a householder/devotee
// - Not from modern era

// 1 = yes, 0 = no, 0.5 = unknown
function getAnswers(questions: string[]): number[] {
  return questions.map((q, i) => {
    if (i === 0) return 1;   // Is this a person? YES
    if (i === 1) return 0;   // Is this an object? NO
    if (i === 2) return 0;   // Is this a concept? NO
    if (i === 3) return 0;   // Is this an event? NO
    if (i === 4) return 0;   // Is this a sadhu? NO
    if (i === 5) return 1;   // Is this a devotee? YES
    if (i === 6) return 0;   // Is this a female? NO
    if (i === 7) return 0;   // Is this a deity? NO
    if (i === 8) return 0;   // Is this a mandir? NO
    if (i === 9) return 0;   // Is this a city? NO
    if (i === 10) return 1;  // Is this in Gujarat? YES (Gadhada)
    if (i === 11) return 0;  // Is this from glossary? NO
    if (i === 12) return 0;  // Associated with music? NO
    if (i === 13) return 0;  // Associated with poetry? NO
    if (i === 14) return 0;  // Associated with building? NO
    if (i === 15) return 1;  // Met Bhagwan Swaminarayan? YES
    if (i === 16) return 0;  // Modern era? NO
    if (i === 17) return 0;  // Related to BAPS? NO
    if (i === 18) return 0;  // Different faith? NO
    if (i === 19) return 0;  // Disciple of Devanand Swami? NO
    if (i === 20) return 0;  // Write Shikshapatri Anvayarth Tika? NO
    if (i === 21) return 0;  // Write Satsangijivan Hetu Tika? NO
    if (i === 22) return 0;  // Celebrate Holi Joban Pagi? NO
    if (i === 23) return 0;  // Said celibacy to Raibai? NO
    if (i === 24) return 0;  // 'composing poems not dozing'? NO
    if (i === 25) return 0;  // Compose Narayan Kavach? NO
    if (i === 26) return 0;  // Dalpatram student? NO
    if (i === 27) return 0;  // Lift Kamalshi's cot? NO
    if (i === 28) return 0;  // 'turned an ass into a cow'? NO
    if (i === 29) return 0;  // 'served my sadhu'? NO
    if (i === 30) return 0;  // 'Jogi Maharaj great sadhu'? NO
    if (i === 31) return 0;  // Request become sadhu after Jivuba? NO
    if (i === 32) return 0;  // Kirtans as 'lashes'? NO
    if (i === 33) return 0;  // Took initiation Shastriji? NO
    if (i === 34) return 0;  // Compile Vachanamrut? NO
    if (i === 35) return 0;  // Called Motiba Punamatiba? NO
    if (i === 36) return 0;  // 'importance not dependent on seat'? NO
    if (i === 37) return 0;  // 'loss in way of work' fire? NO
    if (i === 38) return 0;  // Write both tikas? NO
    if (i === 39) return 0;  // Envious Swaminarayan Vaso? NO
    if (i === 40) return 0;  // Speak dharma Vartal? NO
    if (i === 41) return 0;  // celibacy to Raibai? NO
    if (i === 42) return 0;  // Ask money murtis? NO
    if (i === 43) return 0;  // Give Ladudanji name Shrirangdas? NO
    if (i === 44) return 0;  // Accept renunciation Shastriji? NO
    if (i === 45) return 0;  // Stop talking sister pepper? NO
    if (i === 46) return 0;  // Enlighten Jethabhai? NO
    if (i === 47) return 0;  // Compositions 'lashes'? NO
    if (i === 48) return 0;  // About son Hathisinh? NO
    if (i === 49) return 0;  // Home destroyed fire? NO
    if (i === 50) return 0;  // Quote 'Re rang sahit'? NO
    if (i === 51) return 0;  // Bhagatji to Jethabhai? NO
    if (i === 52) return 0;  // Question Joban Pagi? NO
    if (i === 53) return 0;  // Compositions popular? NO
    if (i === 54) return 0;  // Consecrate murti Vartal? NO
    if (i === 55) return 0;  // Known as Motiba? NO
    if (i === 56) return 0;  // Called Punamatiba? NO
    if (i === 57) return 0;  // 'Lose some weight'? NO
    if (i === 58) return 0;  // 'Please have pity'? NO
    if (i === 59) return 0;  // Eyes opened Yagnapurushdasji? NO
    if (i === 60) return 0;  // Call true yati? NO
    if (i === 61) return 0;  // Crops burnt fire? NO
    if (i === 62) return 0;  // Pray forgive Shastriji? NO
    if (i === 63) return 0;  // About son Hathisinh? NO
    if (i === 64) return 0;  // Lift bier? NO
    if (i === 65) return 0;  // Explain Akshar Purushottam Jethabhai? NO
    if (i === 66) return 0;  // 'pleased building mandirs'? NO
    if (i === 67) return 0;  // Offer dandvats Mahuva? NO
    if (i === 68) return 0;  // Carry Kamalshi's cot? NO
    if (i === 69) return 0;  // Go Pune rob? NO
    if (i === 70) return 0;  // Teach Dalpatram? NO
    if (i === 71) return 0;  // Gunatitanand greatness? NO
    if (i === 72) return 0;  // Ask forgiveness Akshardham? NO
    if (i === 73) return 0;  // Ask Maharaj service? NO
    if (i === 74) return 0;  // Named Mota Swami? NO
    if (i === 75) return 0;  // Ask about pepper? NO
    if (i === 76) return 0;  // Sukhdi Shuk Muni? NO
    if (i === 77) return 0;  // Barge sword? NO
    if (i === 78) return 0;  // Pray Akshardham? NO
    if (i === 79) return 0;  // 'ash has run out'? NO
    if (i === 80) return 0;  // Accept renunciation wealthy? NO
    if (i === 81) return 0;  // 'want see miracle'? NO
    if (i === 82) return 0;  // Test divinity four wishes? NO
    if (i === 83) return 0;  // Rose garland 16 signs? NO
    if (i === 84) return 0;  // Apologize divine darshan? NO
    if (i === 85) return 0;  // Understand Akshar? NO
    if (i === 86) return 0;  // Go Junagadh Gunatitanand? NO
    if (i === 87) return 0;  // Bhagatji embrace? NO
    if (i === 88) return 0;  // Spirit fade ash? NO
    if (i === 89) return 1;  // 'rafters bamboos removed'? YES - Maharaj asked HIM this
    if (i === 90) return 0;  // Return shivering River Ghela? NO
    if (i === 91) return 0;  // 'served my sadhu' about Jivuba? NO
    if (i === 92) return 0;  // Leave Vadtal Shastriji? NO
    if (i === 93) return 0;  // Break ekadashi sukhdi? NO
    if (i === 94) return 0;  // Motiba Punamatiba Jaya? NO
    if (i === 95) return 0;  // Swamishri saffron clothes? NO
    if (i === 96) return 0;  // Composing poems dozing? NO
    if (i === 97) return 0;  // Transform bandit? NO
    if (i === 98) return 0;  // Arrange money murtis? NO
    if (i === 99) return 0;  // Married Hathiya Patgar? NO
    if (i === 100) return 0; // Born Mumbai? NO
    if (i === 101) return 0; // Wife say ash? NO
    if (i === 102) return 0; // Stop talking sister Adiba? NO
    if (i === 103) return 1; // Never doubt Maharaj? YES - constantly in seva
    if (i === 104) return 0; // Supervise Ahmedabad mandir? NO
    if (i === 105) return 0; // Set up Vartal? NO
    if (i === 106) return 0; // Bhagwati diksha? NO
    if (i === 107) return 0; // Write 'Saheb sarikha'? NO
    if (i === 108) return 0; // 'cut sword' to Jivuba? NO - that was Abhal Khachar (father)
    if (i === 109) return 1; // 'rafters bamboos' Shuk Muni? YES - Maharaj said this to Dada Khachar
    if (i === 110) return 0; // Break fast sukhdi letter? NO
    if (i === 111) return 0; // Break fast River Ghela? NO
    if (i === 112) return 0; // Amazed Joban Pagi? NO
    if (i === 113) return 0; // Walk tilak-chandlo? NO
    if (i === 114) return 0; // Sundar Pagi brother? NO
    if (i === 115) return 0; // Tell mother-in-law celibate? NO
    if (i === 116) return 0; // Insist female devotees Panchala? NO
    if (i === 117) return 0; // Motiba Punamatiba Jaya names? NO
    if (i === 118) return 0; // Bhagwati diksha Vasant Panchmi? NO
    if (i === 119) return 0; // Acharya diksha? NO
    if (i === 120) return 0; // Entrust Atladra? NO
    if (i === 121) return 0; // Transform bandit kanthi? NO
    if (i === 122) return 0; // Embrace Jethabhai? NO
    if (i === 123) return 0; // 'make better today'? NO
    if (i === 124) return 0; // Learn pingal shastra? NO
    if (i === 125) return 0; // Go Khodiyar Mata? NO
    if (i === 126) return 0; // Become Kavishwar? NO
    if (i === 127) return 0; // Write Shikshapatri commentary? NO
    if (i === 128) return 0; // Avoid reading letters? NO
    if (i === 129) return 0; // Married Hathiya Patgar Kundal? NO
    if (i === 130) return 0; // Celibate vows despite married? NO
    if (i === 131) return 0; // Request mandir Sorath? NO
    if (i === 132) return 0; // Compositions lashes? NO
    if (i === 133) return 0; // Write Sati Gita? NO
    if (i === 134) return 0; // Learn music Premanand? NO
    if (i === 135) return 0; // Celebrate Holi Vartal? NO
    if (i === 136) return 0; // 'dear child worshipping' to Jivuba? NO
    if (i === 137) return 0; // Offer sukhdi Shukmuni? NO
    if (i === 138) return 0; // Sit Swaminarayan's place? NO
    if (i === 139) return 0; // Mistake Brahmanand for Swaminarayan? NO
    if (i === 140) return 0; // Insist female devotees? NO
    if (i === 141) return 0; // Always by Shastriji? NO
    if (i === 142) return 0; // Famous poet Devanand disciple? NO
    if (i === 143) return 0; // Prepare sanjivani? NO
    if (i === 144) return 0; // Compositions popular? NO
    if (i === 145) return 0; // Compose Hari Gita? NO
    if (i === 146) return 0; // 'greatness not seat'? NO
    if (i === 147) return 0; // Sarvamangal Stotra? NO
    if (i === 148) return 0; // Write Shikshapatri Tika? NO
    if (i === 149) return 0; // Shivji Sarasvati? NO
    if (i === 150) return 0; // 'still wish miracle'? NO
    if (i === 151) return 0; // 'hiding bawa'? NO
    if (i === 152) return 0; // 'dear child worship' to Jivuba? NO
    if (i === 153) return 0; // Work Khandesh? NO
    if (i === 154) return 0; // Write Updesh Chintamani? NO
    if (i === 155) return 0; // Give sukhdi ekadashi? NO
    if (i === 156) return 0; // Ask mandir Junagadh? NO
    if (i === 157) return 0; // 'five footsteps kumkum'? NO
    if (i === 158) return 0; // Refuse read letters? NO
    if (i === 159) return 0; // Sarvamangal Stotra? NO
    if (i === 160) return 0; // Sing 'Re rang sahit'? NO
    if (i === 161) return 0; // Deed Ahmedabad? NO
    if (i === 162) return 0; // celibate Raibai? NO
    if (i === 163) return 0; // Closer Shastriji Vartal? NO
    if (i === 164) return 0; // Chariot barefooted? NO
    if (i === 165) return 0; // 'yogi stay with us'? NO

    return 0.5;
  });
}

async function main() {
  console.log(`=== Adding ${NEW_ENTITY_NAME} to Answer Matrix ===\n`);

  const matrix: MatrixData = readJson(PATHS.answerMatrix);

  if (matrix.entities.includes(NEW_ENTITY_ID)) {
    console.log(`Entity "${NEW_ENTITY_ID}" already exists in matrix. Skipping.`);
    return;
  }

  const answers = getAnswers(matrix.questions);

  const yesCount = answers.filter(a => a === 1).length;
  const noCount = answers.filter(a => a === 0).length;
  const unknownCount = answers.filter(a => a === 0.5).length;
  console.log(`Answers: ${yesCount} yes, ${noCount} no, ${unknownCount} unknown`);

  matrix.entities.push(NEW_ENTITY_ID);
  matrix.matrix.push(answers);

  if (!matrix.evidence[NEW_ENTITY_ID]) {
    matrix.evidence[NEW_ENTITY_ID] = {};
  }

  matrix.metadata.totalEntities = matrix.entities.length;
  matrix.metadata.totalPairs = matrix.entities.length * matrix.questions.length;
  matrix.metadata.generatedAt = new Date().toISOString();

  writeJson(PATHS.answerMatrix, matrix);
  console.log(`\nAdded ${NEW_ENTITY_NAME} to answer matrix.`);
  console.log(`Matrix now has ${matrix.entities.length} entities × ${matrix.questions.length} questions.`);
}

main().catch(console.error);
