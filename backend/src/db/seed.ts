import * as fs from 'fs';
import * as path from 'path';
import { getDatabase, saveDatabase } from './database';

const schemaPath = path.join(__dirname, 'schema.sql');

export async function seedDatabase(): Promise<void> {
  const db = await getDatabase();

  // Run schema first (creates tables if they don't exist)
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Check if already seeded
  const result = db.exec('SELECT COUNT(*) as count FROM entities');
  if (result.length > 0 && (result[0].values[0][0] as number) > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  // Initial entities from Satsang Reader Part 1 (expanded from Pravesh exam papers)
  const entities = [
    // Chapter 1: Brahmanand Swami
    { name: 'Brahmanand Swami', category: 'person', description: 'Sadguru, poet, builder of Junagadh and Muli mandirs, original name Ladudanji', chapter: 1 },
    { name: 'Ladudanji', category: 'person', description: 'Birth name of Brahmanand Swami, Rajput prince from Modhera', chapter: 1 },
    { name: 'Junagadh Mandir', category: 'place', description: 'Mandir built by Brahmanand Swami', chapter: 1 },
    { name: 'Muli Mandir', category: 'place', description: 'Mandir built by Brahmanand Swami', chapter: 1 },

    // Chapter 2: Devanand Swami
    { name: 'Devanand Swami', category: 'person', description: 'Sadguru, musician and poet, invented Swaminarayan Raag', chapter: 2 },
    { name: 'Tribhovandas', category: 'person', description: 'Birth name of Devanand Swami', chapter: 2 },

    // Chapter 3: Shukanand Swami
    { name: 'Shukanand Swami', category: 'person', description: 'Sadguru, secretary and scribe, compiled Vachanamrut, called Lekh Lakhi Bhagat', chapter: 3 },
    { name: 'Shukamuni', category: 'person', description: 'Another name for Shukanand Swami', chapter: 3 },
    { name: 'Vachanamrut', category: 'object', description: 'Sacred scripture compiled by Shukanand Swami containing 262 discourses of Swaminarayan', chapter: 3 },

    // Chapter 4: Jhinabhai Darbar
    { name: 'Jhinabhai Darbar', category: 'person', description: 'Bhaktaraj, chieftain of Vaso, gave entire wealth to Shriji Maharaj', chapter: 4 },
    { name: 'Vaso', category: 'place', description: 'Village where Jhinabhai Darbar lived', chapter: 4 },

    // Chapter 5: Joban Pagi
    { name: 'Joban Pagi', category: 'person', description: 'Bhaktaraj, former bandit transformed by Shriji Maharaj, became great devotee', chapter: 5 },
    { name: 'Pagi', category: 'concept', description: 'Title meaning tracker or guide', chapter: 5 },

    // Chapter 6: Jivuba
    { name: 'Jivuba', category: 'person', description: 'Bhaktaraj, female devotee, sister of Dada Khachar, refused marriage to observe celibacy and worship God, served Bhagwan Swaminarayan', chapter: 6 },

    // Chapter 7: Nirgundasji
    { name: 'Swami Nirgundasji', category: 'person', description: 'Modern era sadhu, served in Akshar Deri for many years', chapter: 7 },

    // Chapter 8: Yagnapriyadasji / Shastriji Maharaj
    { name: 'Swami Yagnapriyadasji', category: 'person', description: 'Modern era sadhu, became Shastriji Maharaj, established BAPS', chapter: 8 },
    { name: 'Shastriji Maharaj', category: 'person', description: 'Title of Swami Yagnapriyadasji, 3rd spiritual successor, established BAPS in 1907', chapter: 8 },
    { name: 'BAPS', category: 'concept', description: 'Bochasanwasi Akshar Purushottam Sanstha, established in 1907', chapter: 8 },

    // Key figures mentioned throughout (expanded from exam papers)
    { name: 'Bhagwan Swaminarayan', category: 'person', description: 'Founder of the Swaminarayan Sampradaya, also known as Shriji Maharaj', chapter: null },
    { name: 'Shriji Maharaj', category: 'person', description: 'Another name for Bhagwan Swaminarayan', chapter: null },
    { name: 'Nilkanth Varni', category: 'person', description: 'Childhood name of Bhagwan Swaminarayan during his 7-year pilgrimage', chapter: null },
    { name: 'Ghanshyam', category: 'person', description: 'Birth name of Bhagwan Swaminarayan, born in Chhapaiya', chapter: null },
    { name: 'Ramanand Swami', category: 'person', description: 'Guru of Bhagwan Swaminarayan, gave him diksha', chapter: null },
    { name: 'Gunatitanand Swami', category: 'person', description: 'First spiritual successor, Akshar, mahant of Junagadh mandir for 40 years', chapter: null },
    { name: 'Muktanand Swami', category: 'person', description: 'Senior paramhansa, poet, original name Mukundanand', chapter: null },
    { name: 'Gopalanand Swami', category: 'person', description: 'Learned paramhansa, could make murtis speak', chapter: null },
    { name: 'Nityanand Swami', category: 'person', description: 'Paramhansa, author of Satsangijivanam in Sanskrit', chapter: null },
    { name: 'Premanand Swami', category: 'person', description: 'Poet saint, wrote many devotional songs and kirtans', chapter: null },
    { name: 'Bhagatji Maharaj', category: 'person', description: 'Second spiritual successor, original name Pragji Bhagat', chapter: null },
    { name: 'Yogiji Maharaj', category: 'person', description: 'Fourth spiritual successor, known for his childlike innocence', chapter: null },
    { name: 'Pramukh Swami Maharaj', category: 'person', description: 'Fifth spiritual successor, built over 1100 mandirs worldwide', chapter: null },
    { name: 'Mahant Swami Maharaj', category: 'person', description: 'Sixth and current spiritual successor', chapter: null },

    // Additional sadhus from exam papers
    { name: 'Nishkulanand Swami', category: 'person', description: 'Paramhansa, poet, originally named Lalji Suthar', chapter: null },
    { name: 'Swayamprakashanand Swami', category: 'person', description: 'Paramhansa, first mahant of Ahmedabad mandir', chapter: null },
    { name: 'Akhandanand Swami', category: 'person', description: 'Paramhansa who met Nilkanth Varni in the forest', chapter: null },

    // Female devotees from exam papers
    { name: 'Adiba', category: 'person', description: 'Female devotee, sister of Jhinabhai Darbar, served Bhagwan Swaminarayan', chapter: null },
    { name: 'Jasuba', category: 'person', description: 'Female devotee of Bhagwan Swaminarayan', chapter: null },
    { name: 'Merai', category: 'person', description: 'Female devotee known for her service', chapter: null },
    { name: 'Laluba', category: 'person', description: 'Female devotee of Gadhada', chapter: null },
    { name: 'Kushalkuvarba', category: 'person', description: 'Female devotee, wife of Jhinabhai Darbar', chapter: null },

    // Householder devotees from exam papers
    { name: 'Dada Khachar', category: 'person', description: 'Bhaktaraj, chieftain of Gadhada, hosted Bhagwan Swaminarayan', chapter: null },
    { name: 'Parvatbhai', category: 'person', description: 'Bhaktaraj, devotee of Agatrai', chapter: null },
    { name: 'Ashabhai', category: 'person', description: 'Bhaktaraj, devotee from Ahmedabad, visited Dakor regularly, had darshan of Ranchhodray in dream', chapter: null },
    { name: 'Dubli Bhatt', category: 'person', description: 'Brahmin devotee who was initially arrogant but transformed', chapter: null },
    { name: 'Dama Sheth', category: 'person', description: 'Wealthy merchant devotee of Ahmedabad', chapter: null },
    { name: 'Somla Khachar', category: 'person', description: 'Devotee who served Bhagwan Swaminarayan', chapter: null },
    { name: 'Kamalshibhai', category: 'person', description: 'Devotee who once had a headache, related to story of Adiba', chapter: null },
    { name: 'Jetha Bhagat', category: 'person', description: 'Devotee who wore saffron clothes after being advised by Shastriji Maharaj', chapter: null },

    // Birth names and alternate identities
    { name: 'Pragji Bhagat', category: 'person', description: 'Birth name of Bhagatji Maharaj, stone carver', chapter: null },
    { name: 'Dungar Bhagat', category: 'person', description: 'Birth name of Gunatitanand Swami', chapter: null },
    { name: 'Jaga Swami', category: 'person', description: 'Another name for Swayamprakashanand Swami', chapter: null },

    // Places (expanded from exam papers)
    { name: 'Gadhada', category: 'place', description: 'Primary residence of Bhagwan Swaminarayan, Dada Khachar\'s darbar', chapter: null },
    { name: 'Vartal', category: 'place', description: 'Location of Laxminarayan Mandir, important Swaminarayan pilgrimage site', chapter: null },
    { name: 'Ahmedabad', category: 'place', description: 'Location of first Swaminarayan Mandir (Kalupur), Gujarat\'s largest city', chapter: null },
    { name: 'Sarangpur', category: 'place', description: 'Location of Hanuman Mandir, important pilgrimage site', chapter: null },
    { name: 'Bochasan', category: 'place', description: 'First mandir of BAPS, established by Shastriji Maharaj', chapter: null },
    { name: 'Gujarat', category: 'place', description: 'State in India where Swaminarayan Sampradaya originated', chapter: null },
    { name: 'Chhapaiya', category: 'place', description: 'Birthplace of Bhagwan Swaminarayan in Uttar Pradesh', chapter: null },
    { name: 'Loj', category: 'place', description: 'Village where Nilkanth Varni met Ramanand Swami', chapter: null },
    { name: 'Piplana', category: 'place', description: 'Village where Nilkanth Varni met Muktanand Swami', chapter: null },
    { name: 'Kariyani', category: 'place', description: 'Village of Jivuba, location of famous mandir', chapter: null },
    { name: 'Gondal', category: 'place', description: 'Town where Shastriji Maharaj did much seva', chapter: null },
    { name: 'Junagadh', category: 'place', description: 'City in Gujarat with mandir built by Brahmanand Swami', chapter: null },
    { name: 'Dholera', category: 'place', description: 'Town where important assemblies were held', chapter: null },
    { name: 'Akshar Deri', category: 'place', description: 'Sacred site at Gondal, memorial of Gunatitanand Swami', chapter: null },
    { name: 'Swaminarayan Nagar', category: 'place', description: 'Large pilgrimage center', chapter: null },
    { name: 'Dakor', category: 'place', description: 'Pilgrimage site with Ranchhodray temple, visited by Ashabhai', chapter: null },

    // Objects and concepts (expanded)
    { name: 'Shikshapatri', category: 'object', description: 'Code of conduct with 212 verses written by Bhagwan Swaminarayan', chapter: null },
    { name: 'Mandir', category: 'object', description: 'Hindu temple where murtis are installed', chapter: null },
    { name: 'Murti', category: 'object', description: 'Sacred image installed and worshipped in mandir', chapter: null },
    { name: 'Kanthi', category: 'object', description: 'Double-beaded tulsi necklace worn by devotees', chapter: null },
    { name: 'Tilak Chandlo', category: 'object', description: 'U-shaped sandalwood mark and kumkum dot worn on forehead', chapter: null },
    { name: 'Satsangijivanam', category: 'object', description: 'Scripture written by Nityanand Swami in Sanskrit', chapter: null },
    { name: 'Swamini Vato', category: 'object', description: 'Collection of spiritual teachings of Gunatitanand Swami', chapter: null },
    { name: 'Bhaktachintamani', category: 'object', description: 'Scripture written by Nishkulanand Swami', chapter: null },
    { name: 'Chesta Padd', category: 'object', description: 'Devotional songs describing divine leelas', chapter: null },
    { name: 'Janmangal Namavali', category: 'object', description: 'List of 108 names of Bhagwan Swaminarayan', chapter: null },

    // Concepts (expanded)
    { name: 'Akshar Purushottam', category: 'concept', description: 'Doctrine of eternal Akshar and supreme Purushottam revealed by Swaminarayan', chapter: null },
    { name: 'Samadhi', category: 'concept', description: 'State of deep meditation or sacred resting place of a saint', chapter: null },
    { name: 'Moksha', category: 'concept', description: 'Liberation from cycle of birth and death, achieved through Akshar', chapter: null },
    { name: 'Satsang', category: 'concept', description: 'Company of the true, spiritual fellowship with God and saints', chapter: null },
    { name: 'Paramhansa', category: 'concept', description: 'Title for renunciant saints who have attained highest spiritual state', chapter: null },
    { name: 'Ekantik Dharma', category: 'concept', description: 'Highest form of devotion with dharma, gnan, vairagya, and bhakti', chapter: null },
    { name: 'Nishkam Bhakti', category: 'concept', description: 'Selfless devotion without expectation of reward', chapter: null },
    { name: 'Guru Parampara', category: 'concept', description: 'Lineage of spiritual successors from Bhagwan Swaminarayan', chapter: null },
    { name: 'Akshar', category: 'concept', description: 'Eternal abode and ideal devotee, manifests as the Guru', chapter: null },
    { name: 'Purushottam', category: 'concept', description: 'Supreme being, Bhagwan Swaminarayan as God', chapter: null },
    { name: 'Samp Suhradbhav Ekta', category: 'concept', description: 'Unity, mutual understanding and oneness - core values of BAPS', chapter: null },

    // Events (expanded from exam papers)
    { name: 'Fuldol', category: 'event', description: 'Festival of colors (Holi) celebrated in spring', chapter: null },
    { name: 'Annakut', category: 'event', description: 'Festival of offering mountain of food to God after Diwali', chapter: null },
    { name: 'Mandir Pratishtha', category: 'event', description: 'Ceremony of installing murtis in a new mandir', chapter: null },
    { name: 'Shakotsav', category: 'event', description: 'Festival of vegetables, celebrated in January', chapter: null },
    { name: 'Janmashtami', category: 'event', description: 'Celebration of Lord Krishna\'s birth', chapter: null },
    { name: 'Swaminarayan Jayanti', category: 'event', description: 'Celebration of Bhagwan Swaminarayan\'s birth on Chaitra Sud 9', chapter: null },
    { name: 'Guru Purnima', category: 'event', description: 'Day honoring the Guru, celebrated on full moon in July', chapter: null },
    { name: 'Hari Jayanti', category: 'event', description: 'Another name for Swaminarayan Jayanti, Ram Navami', chapter: null },

    // ============ ADDITIONAL ENTITIES FROM PRAVESH EXAM PAPERS ============

    // Additional people from exam answers
    { name: 'Ranchhodray', category: 'person', description: 'Deity at Dakor temple, granted darshan to Ashabhai in dream directing him to Bhagwan Swaminarayan', chapter: 8 },
    { name: 'Devidanji', category: 'person', description: 'Young devotee who continued his father\'s daily worship of Shivji and received darshan and boon from Lord Shivji', chapter: 2 },
    { name: 'Lord Shivji', category: 'person', description: 'Hindu deity who appeared to Devidanji and directed him to Bhagwan Swaminarayan', chapter: 2 },
    { name: 'Abhel Khachar', category: 'person', description: 'Father of Jivuba, initially opposed her devotion, barged into her room with a sword but was silenced by permission letter', chapter: 6 },
    { name: 'Dungarbhai', category: 'person', description: 'Devotee who received vartman (initiation) from Shukmuni, was blessed that he would do great work for satsang', chapter: 6 },
    { name: 'Sundar Pagi', category: 'person', description: 'Brother of Joban Pagi', chapter: 5 },
    { name: 'Shakaro Pagi', category: 'person', description: 'Brother of Joban Pagi', chapter: 5 },
    { name: 'Dalo Pagi', category: 'person', description: 'Brother of Joban Pagi', chapter: 5 },
    { name: 'Khaiyo Khatri', category: 'person', description: 'Learned scholar of Vedant from Mandvi in Kutch who challenged Maharaj to scriptural debate but became devotee', chapter: null },
    { name: 'Ladu Barot', category: 'person', description: 'Person to whom Jivuba explained the futility of the world through religious teachings', chapter: 6 },
    { name: 'Bapujibhai', category: 'person', description: 'Devotee from Vartal at whose home Maharaj stayed with his horse Rojho', chapter: 5 },
    { name: 'Raya Khatan', category: 'person', description: 'Devotee at whose house Shriji Maharaj sat on the yoke of a cart and ate milk and thuli', chapter: 2 },
    { name: 'Raiji', category: 'person', description: 'Person who warned Joban Pagi when he tried to steal Maharaj\'s horse at Bapujibhai\'s enclave', chapter: 5 },
    { name: 'Nirgundas Swami', category: 'person', description: 'Same as Swami Nirgundasji, sadhu who prayed to Shastriji Maharaj for forgiveness in his last moments', chapter: 7 },

    // Additional places from exam answers
    { name: 'Mandvi', category: 'place', description: 'Town in Kutch where learned scholar Khaiyo Khatri lived', chapter: null },
    { name: 'Kutch', category: 'place', description: 'Region in Gujarat where Shriji Maharaj went with sadhus and devotees', chapter: null },
    { name: 'Dabhan', category: 'place', description: 'Village where Maharaj organized grand yagna, where Joban Pagi tried to steal Rojho', chapter: 5 },
    { name: 'Modhera', category: 'place', description: 'Place where Ladudanji (Brahmanand Swami) was a Rajput prince', chapter: 1 },
    { name: 'Khan', category: 'place', description: 'Village in Shirohi region, birthplace of Brahmanand Swami', chapter: 1 },
    { name: 'Shirohi', category: 'place', description: 'Region where the village of Khan is located', chapter: 1 },
    { name: 'Mumbai', category: 'place', description: 'City where Nirgundas Swami was brought for treatment during his illness', chapter: 7 },
    { name: 'Akshar Ordi', category: 'place', description: 'Place where Gunatitanand Swami came for Maharaj\'s darshan', chapter: 3 },

    // Additional objects from exam answers
    { name: 'Sukhdi', category: 'object', description: 'Sweet given by Shriji Maharaj to Shukmuni to freshen his mouth after ekadashi fast', chapter: 3 },
    { name: 'Rojho', category: 'object', description: 'Shriji Maharaj\'s horse that Joban Pagi tried to steal twice', chapter: 5 },
    { name: 'Thuli', category: 'object', description: 'Preparation of wheat flakes that Shriji Maharaj ate with milk at Raya Khatan\'s house', chapter: 2 },
    { name: 'Bilipatra', category: 'object', description: 'Sacred leaves offered to Shivji during worship', chapter: 2 },

    // Additional concepts from exam answers
    { name: 'Ekadashi', category: 'concept', description: 'Fasting day observed every 11th day of lunar fortnight', chapter: null },
    { name: 'Vartman', category: 'concept', description: 'Initiation ceremony given to new devotees in Swaminarayan Sampradaya', chapter: null },
    { name: 'Yagna', category: 'concept', description: 'Sacred fire ritual or sacrifice', chapter: null },
    { name: 'Diksha', category: 'concept', description: 'Spiritual initiation into sadhu-fold or satsang', chapter: null },
    { name: 'Punam', category: 'concept', description: 'Full moon day, auspicious time for pilgrimage', chapter: null },
    { name: 'Abhishek', category: 'concept', description: 'Ritual bathing of deity with sacred substances', chapter: null },
    { name: 'Akshardham', category: 'concept', description: 'Eternal abode of God, supreme divine realm', chapter: null },

    // Additional events from exam answers
    { name: 'Vasant Panchmi', category: 'event', description: 'Spring festival, birthday of Brahmanand Swami in Samvat 1828', chapter: 1 },

    // ============ MORE ENTITIES FROM PRAVESH EXAM PAPERS (BATCH 2) ============

    // More people mentioned in exam answers
    { name: 'Bhaguji', category: 'person', description: 'Devoted servant of Shriji Maharaj, mentioned by Jhinabhai as example of one kept in Maharaj\'s service', chapter: 4 },
    { name: 'Miyaji', category: 'person', description: 'Devoted servant of Shriji Maharaj, mentioned by Jhinabhai as example of one kept in Maharaj\'s service', chapter: 4 },
    { name: 'Mulji Brahmachari', category: 'person', description: 'Brahmachari devotee of Shriji Maharaj, mentioned by Jhinabhai as example of one kept in Maharaj\'s service', chapter: 4 },
    { name: 'Khaiyo Khatri\'s Mother', category: 'person', description: 'Mother of Khaiyo Khatri who identified the real Swaminarayan during scriptural debate', chapter: null },
    { name: 'Swayamprakashanand Swami', category: 'person', description: 'Paramhansa, first mahant of Ahmedabad mandir, also known as Jaga Swami', chapter: null },
    { name: 'Akhandanand Swami', category: 'person', description: 'Paramhansa who met Nilkanth Varni during his pilgrimage in the forest', chapter: null },
    { name: 'Dungar Bhagat', category: 'person', description: 'Birth name of Gunatitanand Swami, from Bhadra village', chapter: null },
    { name: 'Jaga Swami', category: 'person', description: 'Another name for Swayamprakashanand Swami', chapter: null },
    { name: 'Dada Khachar\'s Carpenter', category: 'person', description: 'Carpenter called by Dada Khachar to cut wood for fire for Maharaj', chapter: 3 },
    { name: 'Somla Khachar', category: 'person', description: 'Khachar family devotee who served Bhagwan Swaminarayan', chapter: null },
    { name: 'Dama Sheth', category: 'person', description: 'Wealthy merchant devotee of Ahmedabad', chapter: null },

    // Historical figures and royalty
    { name: 'Rao of Kutch', category: 'person', description: 'Ruler of Kutch who hosted Brahmanand Swami', chapter: 1 },

    // Additional female devotees
    { name: 'Laduba', category: 'person', description: 'Female devotee, sister of Dada Khachar along with Jivuba', chapter: 6 },

    // More places
    { name: 'Bhadra', category: 'place', description: 'Village where Gunatitanand Swami (Dungar Bhagat) was born', chapter: null },
    { name: 'Piplana', category: 'place', description: 'Village where Nilkanth Varni met Muktanand Swami during pilgrimage', chapter: null },
    { name: 'Dholera', category: 'place', description: 'Town in Gujarat where important assemblies and events were held', chapter: null },
    { name: 'Gondal', category: 'place', description: 'Town where Shastriji Maharaj did much seva, location of Akshar Deri', chapter: null },
    { name: 'Swaminarayan Nagar', category: 'place', description: 'Large pilgrimage center established by BAPS', chapter: null },
    { name: 'Agatrai', category: 'place', description: 'Village associated with devotee Parvatbhai', chapter: null },

    // More objects
    { name: 'Chesta Padd', category: 'object', description: 'Devotional songs describing divine leelas of Bhagwan Swaminarayan', chapter: null },
    { name: 'Janmangal Namavali', category: 'object', description: 'List of 108 names of Bhagwan Swaminarayan recited during worship', chapter: null },
    { name: 'Clay Pot', category: 'object', description: 'Pot broken by Dada Khachar to light fire for Maharaj, also used by Jivuba', chapter: 3 },
    { name: 'Permission Letter', category: 'object', description: 'Letter that silenced Abhel Khachar when he saw Jivuba with it', chapter: 6 },
    { name: 'Saffron Robes', category: 'object', description: 'Orange/saffron clothes worn by sadhus after initiation', chapter: null },
    { name: 'Pepper', category: 'object', description: 'Spice that Adiba refused to give Kamalshibhai but later gave to Jinabhai', chapter: 4 },

    // More concepts
    { name: 'Upasana', category: 'concept', description: 'Worship and devotion, understanding of God\'s true nature', chapter: null },
    { name: 'Samvat', category: 'concept', description: 'Hindu calendar system, Vikram Samvat', chapter: null },
    { name: 'Posh', category: 'concept', description: 'Hindu month (December-January) when Joban Pagi took vows in Samvat 1866', chapter: null },
    { name: 'Brahmachari', category: 'concept', description: 'Celibate student devoted to spiritual practice, not yet a sadhu', chapter: null },
    { name: 'Darbar', category: 'concept', description: 'Royal court or chieftain\'s residence, also title for Khachar family', chapter: null },
    { name: 'Kathi Darbar', category: 'concept', description: 'Warrior chieftains of the Kathi community in Gujarat', chapter: null },
    { name: 'Vedant', category: 'concept', description: 'Hindu philosophical tradition, Khaiyo Khatri was a scholar of this', chapter: null },
    { name: 'Sadhufold', category: 'concept', description: 'Community of sadhus, joining the order of renunciants', chapter: null },

    // More events
    { name: 'Diwali', category: 'event', description: 'Festival of lights, celebrated before Annakut', chapter: null },
    { name: 'Holi', category: 'event', description: 'Festival of colors, same as Fuldol in spring', chapter: null },
  ];

  // Initial questions (expanded from Pravesh exam papers)
  const questions = [
    // Category questions
    { text: 'Is this a person?', category: 'all' },
    { text: 'Is this a place?', category: 'all' },
    { text: 'Is this an object or thing?', category: 'all' },
    { text: 'Is this a concept or idea?', category: 'all' },
    { text: 'Is this an event or festival?', category: 'all' },

    // Person-specific questions - Basic
    { text: 'Is this person a sadhu (renunciant sant)?', category: 'person' },
    { text: 'Is this person a householder devotee?', category: 'person' },
    { text: 'Is this person male?', category: 'person' },
    { text: 'Is this person female?', category: 'person' },
    { text: 'Did this person meet Bhagwan Swaminarayan directly?', category: 'person' },
    { text: 'Is this person from the modern era (after 1900)?', category: 'person' },

    // Person-specific questions - Skills and achievements
    { text: 'Was this person a poet or writer?', category: 'person' },
    { text: 'Was this person known for music or singing?', category: 'person' },
    { text: 'Did this person build any mandirs?', category: 'person' },
    { text: 'Did this person write any scriptures?', category: 'person' },
    { text: 'Was this person known for giving spiritual discourses?', category: 'person' },
    { text: 'Did this person compile the Vachanamrut?', category: 'person' },

    // Person-specific questions - Background
    { text: 'Was this person originally from a royal or warrior family?', category: 'person' },
    { text: 'Did this person have a dramatic life transformation?', category: 'person' },
    { text: 'Was this person originally a bandit or criminal?', category: 'person' },
    { text: 'Was this person a Brahmin by birth?', category: 'person' },
    { text: 'Was this person born in Gujarat?', category: 'person' },

    // Person-specific questions - Spiritual status
    { text: 'Is this person known as a spiritual successor (Guru)?', category: 'person' },
    { text: 'Is this person Bhagwan Swaminarayan himself?', category: 'person' },
    { text: 'Is this a birth name or childhood name of someone?', category: 'person' },
    { text: 'Was this person the mahant (head) of a mandir?', category: 'person' },
    { text: 'Is this person one of the Nand saints (paramhansas)?', category: 'person' },

    // Person-specific questions - Relationships
    { text: 'Did this person give diksha (initiation) to Bhagwan Swaminarayan?', category: 'person' },
    { text: 'Was this person Gunatitanand Swami?', category: 'person' },
    { text: 'Is this person the same as Shriji Maharaj?', category: 'person' },
    { text: 'Was this person a chieftain or darbar?', category: 'person' },

    // Person-specific questions - Quotes and statements
    { text: 'Did this person say "I want to observe celibacy and devote myself to the worship of God"?', category: 'person' },
    { text: 'Did this person refuse marriage to devote themselves to God?', category: 'person' },
    { text: 'Is this person related to Dada Khachar?', category: 'person' },

    // Person-specific questions - From Pravesh exam answers
    { text: 'Is this person the sister of Jhinabhai Darbar?', category: 'person' },
    { text: 'Did this person go to Dakor regularly for darshan?', category: 'person' },
    { text: 'Did this person have darshan of Ranchhodray in a dream?', category: 'person' },
    { text: 'Did this person wear saffron clothes after being advised by a Guru?', category: 'person' },
    { text: 'Was this person busy writing letters for Shriji Maharaj?', category: 'person' },
    { text: "Did this person's family come to Gadhada to persuade them to return home?", category: 'person' },

    // Place-specific questions
    { text: 'Is this place in Gujarat?', category: 'place' },
    { text: 'Is this place a mandir (temple)?', category: 'place' },
    { text: 'Did Bhagwan Swaminarayan live in this place?', category: 'place' },
    { text: 'Is this place associated with BAPS specifically?', category: 'place' },
    { text: 'Is this the birthplace of Bhagwan Swaminarayan?', category: 'place' },
    { text: 'Is this place associated with a specific saint?', category: 'place' },
    { text: 'Is this place a village or town?', category: 'place' },
    { text: 'Is this a samadhi or memorial site?', category: 'place' },

    // Object-specific questions
    { text: 'Is this something you can wear?', category: 'object' },
    { text: 'Is this a scripture or text?', category: 'object' },
    { text: 'Is this something found in a mandir?', category: 'object' },
    { text: 'Was this written by Bhagwan Swaminarayan?', category: 'object' },
    { text: 'Does this contain verses or shlokas?', category: 'object' },
    { text: 'Is this written in Sanskrit?', category: 'object' },
    { text: 'Is this a collection of discourses or talks?', category: 'object' },

    // Concept-specific questions
    { text: 'Is this a spiritual or religious concept?', category: 'concept' },
    { text: 'Is this related to a title or designation?', category: 'concept' },
    { text: 'Is this related to an organization?', category: 'concept' },
    { text: 'Is this a form of worship or devotion?', category: 'concept' },
    { text: 'Is this one of the core beliefs of BAPS?', category: 'concept' },
    { text: 'Does this refer to God or his abode?', category: 'concept' },

    // Event-specific questions
    { text: 'Is this an annual festival?', category: 'event' },
    { text: 'Is this a one-time ceremony?', category: 'event' },
    { text: 'Is this celebrated during spring?', category: 'event' },
    { text: 'Is this related to a birthday celebration?', category: 'event' },
    { text: 'Does this involve offering food to God?', category: 'event' },

    // ============ ADDITIONAL QUESTIONS FROM PRAVESH EXAM PAPERS ============

    // Questions about specific stories/incidents
    { text: 'Did this person grant darshan to Ashabhai in a dream?', category: 'person' },
    { text: 'Did this person challenge Shriji Maharaj to a scriptural debate?', category: 'person' },
    { text: 'Did this person try to steal Maharaj\'s horse?', category: 'person' },
    { text: 'Is this person a brother of Joban Pagi?', category: 'person' },
    { text: 'Did this person barge into Jivuba\'s room with a sword?', category: 'person' },
    { text: 'Did this person give vartman/diksha to Dungarbhai?', category: 'person' },
    { text: 'Is this person a Hindu deity (not Swaminarayan)?', category: 'person' },
    { text: 'Did this person appear to Devidanji in his childhood?', category: 'person' },
    { text: 'Did this person become Maharaj\'s bodyguard?', category: 'person' },
    { text: 'Was this person transformed from a critic to a devotee?', category: 'person' },
    { text: 'Did this person sit in Maharaj\'s seat during a scriptural debate?', category: 'person' },
    { text: 'Did this person explain the futility of the world to Ladu Barot?', category: 'person' },
    { text: 'Did this person pray for forgiveness in their last moments?', category: 'person' },
    { text: 'Did this person receive blessing that they would do great work for satsang?', category: 'person' },
    { text: 'Was this person silenced by seeing a permission letter?', category: 'person' },
    { text: 'Did this person dress Maharaj as a shepherdess to protect him?', category: 'person' },
    { text: 'Did this person host Maharaj at their darbar in Gadhada?', category: 'person' },
    { text: 'Did Shriji Maharaj eat milk and thuli at this person\'s house?', category: 'person' },
    { text: 'Was this person born on Vasant Panchmi?', category: 'person' },

    // Additional place questions
    { text: 'Is this place in Kutch region?', category: 'place' },
    { text: 'Is this place where a yagna was organized?', category: 'place' },
    { text: 'Is this place where a scriptural debate took place?', category: 'place' },
    { text: 'Is this place outside India?', category: 'place' },

    // Additional object questions
    { text: 'Is this a food item or sweet?', category: 'object' },
    { text: 'Is this an animal (like a horse)?', category: 'object' },
    { text: 'Is this something used in worship/puja?', category: 'object' },
    { text: 'Did Shriji Maharaj give this to Shukmuni?', category: 'object' },
    { text: 'Did Joban Pagi try to steal this?', category: 'object' },

    // Additional concept questions
    { text: 'Is this a fasting observance?', category: 'concept' },
    { text: 'Is this a type of initiation ceremony?', category: 'concept' },
    { text: 'Is this a fire ritual?', category: 'concept' },
    { text: 'Is this related to the lunar calendar?', category: 'concept' },
    { text: 'Is this the eternal abode of God?', category: 'concept' },

    // Additional event questions
    { text: 'Is this a birthday of a saint?', category: 'event' },

    // ============ MORE QUESTIONS FROM PRAVESH EXAM PAPERS (BATCH 2) ============

    // More person-specific questions from stories
    { text: 'Did this person\'s mother identify Maharaj as the real God?', category: 'person' },
    { text: 'Was this person mentioned by Jhinabhai as example of devoted service?', category: 'person' },
    { text: 'Is this person a Brahmachari (celibate student)?', category: 'person' },
    { text: 'Did this person refuse to give pepper to someone with a headache?', category: 'person' },
    { text: 'Did this person call a carpenter to cut wood for Maharaj?', category: 'person' },
    { text: 'Did this person break a clay pot to light fire for Maharaj?', category: 'person' },
    { text: 'Was this person a wealthy merchant?', category: 'person' },
    { text: 'Did this person host Brahmanand Swami as a guest?', category: 'person' },
    { text: 'Did this person meet Nilkanth Varni during his pilgrimage?', category: 'person' },
    { text: 'Was this person first mahant of Ahmedabad mandir?', category: 'person' },
    { text: 'Did this person give up rich clothes and ornaments for Maharaj?', category: 'person' },
    { text: 'Did this person washed Maharaj\'s feet with tears?', category: 'person' },
    { text: 'Did this person see circles of light around Maharaj?', category: 'person' },
    { text: 'Was this person a terror that even kings feared?', category: 'person' },
    { text: 'Did this person take vows of satsang in Samvat 1866?', category: 'person' },
    { text: 'Is this person a sister of Dada Khachar?', category: 'person' },

    // More place-specific questions
    { text: 'Is this place the birthplace of a spiritual successor?', category: 'place' },
    { text: 'Is this place where Nilkanth Varni met a sadhu during pilgrimage?', category: 'place' },
    { text: 'Is this place associated with a grand yagna?', category: 'place' },
    { text: 'Is this place in Rajasthan?', category: 'place' },
    { text: 'Is this place where Dada Khachar\'s darbar was located?', category: 'place' },
    { text: 'Was this the primary residence of Bhagwan Swaminarayan?', category: 'place' },
    { text: 'Is this place associated with Jhinabhai Darbar?', category: 'place' },

    // More object-specific questions
    { text: 'Is this a letter or document?', category: 'object' },
    { text: 'Is this clothing worn by sadhus?', category: 'object' },
    { text: 'Is this a spice used in cooking?', category: 'object' },
    { text: 'Is this a container or pot?', category: 'object' },
    { text: 'Is this a list of names?', category: 'object' },
    { text: 'Is this a collection of songs?', category: 'object' },

    // More concept-specific questions
    { text: 'Is this a Hindu calendar term?', category: 'concept' },
    { text: 'Is this a Hindu month?', category: 'concept' },
    { text: 'Is this a philosophical tradition?', category: 'concept' },
    { text: 'Is this a social or community title?', category: 'concept' },
    { text: 'Is this related to warrior communities?', category: 'concept' },

    // More event-specific questions
    { text: 'Is this a festival of lights?', category: 'event' },
    { text: 'Is this celebrated in autumn?', category: 'event' },
  ];

  // Insert entities
  for (const entity of entities) {
    db.run(
      'INSERT OR IGNORE INTO entities (name, category, description, chapter) VALUES (?, ?, ?, ?)',
      [entity.name, entity.category, entity.description, entity.chapter]
    );
  }

  // Insert questions
  for (const question of questions) {
    db.run(
      'INSERT OR IGNORE INTO questions (text, category) VALUES (?, ?)',
      [question.text, question.category]
    );
  }

  // Get all entities and questions for creating answers
  const allEntitiesResult = db.exec('SELECT * FROM entities');
  const allQuestionsResult = db.exec('SELECT * FROM questions');

  const allEntities = allEntitiesResult.length > 0 ? allEntitiesResult[0].values.map((row: any[]) => ({
    id: row[0] as number,
    name: row[1] as string,
  })) : [];

  const allQuestions = allQuestionsResult.length > 0 ? allQuestionsResult[0].values.map((row: any[]) => ({
    id: row[0] as number,
    text: row[1] as string,
  })) : [];

  // Helper functions to create base answers for each category
  const personBase = (male: boolean = true): Record<string, string> => ({
    'Is this a person?': 'yes',
    'Is this a place?': 'no',
    'Is this an object or thing?': 'no',
    'Is this a concept or idea?': 'no',
    'Is this an event or festival?': 'no',
    'Is this person male?': male ? 'yes' : 'no',
    'Is this person female?': male ? 'no' : 'yes',
  });

  const placeBase = (): Record<string, string> => ({
    'Is this a person?': 'no',
    'Is this a place?': 'yes',
    'Is this an object or thing?': 'no',
    'Is this a concept or idea?': 'no',
    'Is this an event or festival?': 'no',
  });

  const objectBase = (): Record<string, string> => ({
    'Is this a person?': 'no',
    'Is this a place?': 'no',
    'Is this an object or thing?': 'yes',
    'Is this a concept or idea?': 'no',
    'Is this an event or festival?': 'no',
  });

  const conceptBase = (): Record<string, string> => ({
    'Is this a person?': 'no',
    'Is this a place?': 'no',
    'Is this an object or thing?': 'no',
    'Is this a concept or idea?': 'yes',
    'Is this an event or festival?': 'no',
  });

  const eventBase = (): Record<string, string> => ({
    'Is this a person?': 'no',
    'Is this a place?': 'no',
    'Is this an object or thing?': 'no',
    'Is this a concept or idea?': 'no',
    'Is this an event or festival?': 'yes',
  });

  // Define answers for each entity-question pair
  const answerMap: Record<string, Record<string, string>> = {
    // ============ CHAPTER 1: BRAHMANAND SWAMI ============
    'Brahmanand Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'yes',
      'Was this person known for music or singing?': 'no',
      'Did this person build any mandirs?': 'yes',
      'Did this person write any scriptures?': 'no',
      'Was this person known for giving spiritual discourses?': 'yes',
      'Did this person compile the Vachanamrut?': 'no',
      'Was this person originally from a royal or warrior family?': 'yes',
      'Did this person have a dramatic life transformation?': 'yes',
      'Was this person originally a bandit or criminal?': 'no',
      'Was this person a Brahmin by birth?': 'no',
      'Was this person born in Gujarat?': 'no',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
      'Is this a birth name or childhood name of someone?': 'no',
      'Was this person the mahant (head) of a mandir?': 'yes',
      'Is this person one of the Nand saints (paramhansas)?': 'yes',
      'Did this person give diksha (initiation) to Bhagwan Swaminarayan?': 'no',
      'Was this person Gunatitanand Swami?': 'no',
      'Is this person the same as Shriji Maharaj?': 'no',
      'Was this person a chieftain or darbar?': 'no',
      'Was this person born on Vasant Panchmi?': 'yes',
      'Did this person sit in Maharaj\'s seat during a scriptural debate?': 'yes',
    },
    'Ladudanji': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person originally from a royal or warrior family?': 'yes',
      'Is this a birth name or childhood name of someone?': 'yes',
      "Did this person's family come to Gadhada to persuade them to return home?": 'yes',
      'Did this person give up rich clothes and ornaments for Maharaj?': 'yes',
      'Did this person have a dramatic life transformation?': 'yes',
      'Was this person originally a bandit or criminal?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'no',
      'Did this person become Maharaj\'s bodyguard?': 'no',
      'Was this person a terror that even kings feared?': 'no',
      'Was this person a chieftain or darbar?': 'no',
      'Was this person a poet or writer?': 'yes',
    },
    // ============ CHAPTER 2: DEVANAND SWAMI ============
    'Devanand Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'yes',
      'Was this person known for music or singing?': 'yes',
      'Did this person build any mandirs?': 'no',
      'Did this person write any scriptures?': 'no',
      'Did this person compile the Vachanamrut?': 'no',
      'Was this person originally from a royal or warrior family?': 'no',
      'Did this person have a dramatic life transformation?': 'no',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
      'Is this a birth name or childhood name of someone?': 'no',
      'Is this person one of the Nand saints (paramhansas)?': 'yes',
    },
    'Tribhovandas': {
      ...personBase(),
      'Is this a birth name or childhood name of someone?': 'yes',
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Did this person have a dramatic life transformation?': 'no',
      'Was this person originally a bandit or criminal?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'no',
      'Did this person become Maharaj\'s bodyguard?': 'no',
      'Was this person a terror that even kings feared?': 'no',
      'Was this person a poet or writer?': 'yes',
      'Was this person known for music or singing?': 'yes',
      'Is this person one of the Nand saints (paramhansas)?': 'no',
    },

    // ============ CHAPTER 3: SHUKANAND SWAMI ============
    'Shukanand Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'yes',
      'Was this person known for music or singing?': 'no',
      'Did this person build any mandirs?': 'no',
      'Did this person write any scriptures?': 'yes',
      'Did this person compile the Vachanamrut?': 'yes',
      'Was this person originally from a royal or warrior family?': 'no',
      'Did this person have a dramatic life transformation?': 'no',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
      'Is this person one of the Nand saints (paramhansas)?': 'yes',
      'Was this person busy writing letters for Shriji Maharaj?': 'yes',
      'Did this person give vartman/diksha to Dungarbhai?': 'yes',
      'Was this person Gunatitanand Swami?': 'no',
      'Was this person the mahant (head) of a mandir?': 'no',
      'Was this person known for giving spiritual discourses?': 'no',
    },
    'Shukamuni': {
      ...personBase(),
      'Is this a birth name or childhood name of someone?': 'no',
      'Did this person compile the Vachanamrut?': 'yes',
      'Was this person busy writing letters for Shriji Maharaj?': 'yes',
      'Did this person give vartman/diksha to Dungarbhai?': 'yes',
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person one of the Nand saints (paramhansas)?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Was this person Gunatitanand Swami?': 'no',
      'Was this person the mahant (head) of a mandir?': 'no',
      'Was this person known for giving spiritual discourses?': 'no',
      'Was this person a poet or writer?': 'yes',
      'Did this person write any scriptures?': 'yes',
    },

    // ============ CHAPTER 4: JHINABHAI DARBAR ============
    'Jhinabhai Darbar': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'no',
      'Was this person known for music or singing?': 'no',
      'Did this person build any mandirs?': 'no',
      'Was this person originally from a royal or warrior family?': 'yes',
      'Did this person have a dramatic life transformation?': 'no',
      'Was this person originally a bandit or criminal?': 'no',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
      'Was this person a chieftain or darbar?': 'yes',
      'Is this person the sister of Jhinabhai Darbar?': 'no',
    },

    // ============ CHAPTER 5: JOBAN PAGI ============
    'Joban Pagi': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'no',
      'Was this person known for music or singing?': 'no',
      'Did this person build any mandirs?': 'no',
      'Was this person originally from a royal or warrior family?': 'no',
      'Did this person have a dramatic life transformation?': 'yes',
      'Was this person originally a bandit or criminal?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
      'Was this person a chieftain or darbar?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'yes',
      'Did this person become Maharaj\'s bodyguard?': 'yes',
      'Is this person a brother of Joban Pagi?': 'no',
      'Did this person washed Maharaj\'s feet with tears?': 'yes',
      'Did this person see circles of light around Maharaj?': 'yes',
      'Was this person a terror that even kings feared?': 'yes',
      'Did this person take vows of satsang in Samvat 1866?': 'yes',
      'Was this person transformed from a critic to a devotee?': 'yes',
    },

    // ============ CHAPTER 6: JIVUBA ============
    'Jivuba': {
      ...personBase(false),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'no',
      'Was this person known for music or singing?': 'no',
      'Did this person build any mandirs?': 'no',
      'Was this person originally from a royal or warrior family?': 'yes',
      'Did this person have a dramatic life transformation?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
      'Did this person say "I want to observe celibacy and devote myself to the worship of God"?': 'yes',
      'Did this person refuse marriage to devote themselves to God?': 'yes',
      'Is this person related to Dada Khachar?': 'yes',
      'Was this person a chieftain or darbar?': 'no',
      'Did this person dress Maharaj as a shepherdess to protect him?': 'yes',
      'Did this person explain the futility of the world to Ladu Barot?': 'yes',
      'Is this person a sister of Dada Khachar?': 'yes',
    },

    // ============ CHAPTER 7: NIRGUNDASJI ============
    'Swami Nirgundasji': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'no',
      'Is this person from the modern era (after 1900)?': 'yes',
      'Was this person a poet or writer?': 'no',
      'Was this person known for music or singing?': 'no',
      'Did this person build any mandirs?': 'no',
      'Was this person originally from a royal or warrior family?': 'no',
      'Did this person have a dramatic life transformation?': 'no',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
    },

    // ============ CHAPTER 8: SHASTRIJI MAHARAJ ============
    'Swami Yagnapriyadasji': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'no',
      'Is this person from the modern era (after 1900)?': 'yes',
      'Was this person a poet or writer?': 'no',
      'Was this person known for music or singing?': 'no',
      'Did this person build any mandirs?': 'yes',
      'Was this person originally from a royal or warrior family?': 'no',
      'Did this person have a dramatic life transformation?': 'no',
      'Is this person known as a spiritual successor (Guru)?': 'yes',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
    },
    'Shastriji Maharaj': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'no',
      'Is this person from the modern era (after 1900)?': 'yes',
      'Was this person a poet or writer?': 'no',
      'Was this person known for music or singing?': 'no',
      'Did this person build any mandirs?': 'yes',
      'Was this person originally from a royal or warrior family?': 'no',
      'Did this person have a dramatic life transformation?': 'no',
      'Is this person known as a spiritual successor (Guru)?': 'yes',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
    },

    // ============ KEY DIVINE FIGURES ============
    'Bhagwan Swaminarayan': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'yes',
      'Was this person known for music or singing?': 'no',
      'Did this person build any mandirs?': 'yes',
      'Did this person write any scriptures?': 'yes',
      'Was this person known for giving spiritual discourses?': 'yes',
      'Was this person originally from a royal or warrior family?': 'no',
      'Did this person have a dramatic life transformation?': 'no',
      'Is this person known as a spiritual successor (Guru)?': 'yes',
      'Is this person Bhagwan Swaminarayan himself?': 'yes',
      'Is this person the same as Shriji Maharaj?': 'yes',
      'Was this person born in Gujarat?': 'no',
    },
    'Shriji Maharaj': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Is this person Bhagwan Swaminarayan himself?': 'yes',
      'Is this person the same as Shriji Maharaj?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Did this person build any mandirs?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'yes',
    },
    'Nilkanth Varni': {
      ...personBase(),
      'Is this a birth name or childhood name of someone?': 'yes',
      'Is this person Bhagwan Swaminarayan himself?': 'yes',
      'Is this person the same as Shriji Maharaj?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person originally a bandit or criminal?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'no',
      'Did this person become Maharaj\'s bodyguard?': 'no',
      'Was this person a terror that even kings feared?': 'no',
      'Is this person a householder devotee?': 'no',
      'Is this person a sadhu (renunciant sant)?': 'yes',
    },
    'Ghanshyam': {
      ...personBase(),
      'Is this a birth name or childhood name of someone?': 'yes',
      'Is this person Bhagwan Swaminarayan himself?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person originally a bandit or criminal?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'no',
      'Is this person a householder devotee?': 'no',
      'Did this person have a dramatic life transformation?': 'no',
      'Was this person born in Gujarat?': 'no',
    },
    'Ramanand Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'no',
      'Did this person build any mandirs?': 'no',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
      'Did this person give diksha (initiation) to Bhagwan Swaminarayan?': 'yes',
    },
    'Gunatitanand Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'no',
      'Was this person known for music or singing?': 'no',
      'Did this person build any mandirs?': 'no',
      'Was this person known for giving spiritual discourses?': 'yes',
      'Was this person originally from a royal or warrior family?': 'no',
      'Did this person have a dramatic life transformation?': 'no',
      'Is this person known as a spiritual successor (Guru)?': 'yes',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
      'Was this person Gunatitanand Swami?': 'yes',
      'Was this person the mahant (head) of a mandir?': 'yes',
      'Is this person one of the Nand saints (paramhansas)?': 'yes',
    },
    // ============ OTHER PARAMHANSAS ============
    'Muktanand Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'yes',
      'Was this person known for music or singing?': 'yes',
      'Is this person one of the Nand saints (paramhansas)?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Was this person Gunatitanand Swami?': 'no',
      'Was this person the mahant (head) of a mandir?': 'no',
      'Did this person compile the Vachanamrut?': 'no',
    },
    'Gopalanand Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'no',
      'Was this person known for giving spiritual discourses?': 'yes',
      'Is this person one of the Nand saints (paramhansas)?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Was this person Gunatitanand Swami?': 'no',
      'Was this person the mahant (head) of a mandir?': 'no',
      'Did this person compile the Vachanamrut?': 'no',
    },
    'Nityanand Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'yes',
      'Did this person write any scriptures?': 'yes',
      'Is this person one of the Nand saints (paramhansas)?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Was this person Gunatitanand Swami?': 'no',
      'Was this person the mahant (head) of a mandir?': 'no',
      'Did this person compile the Vachanamrut?': 'no',
      'Was this person known for music or singing?': 'no',
    },
    'Premanand Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'yes',
      'Was this person known for music or singing?': 'yes',
      'Is this person one of the Nand saints (paramhansas)?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Was this person Gunatitanand Swami?': 'no',
      'Was this person the mahant (head) of a mandir?': 'no',
      'Did this person compile the Vachanamrut?': 'no',
    },
    'Nishkulanand Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a poet or writer?': 'yes',
      'Did this person write any scriptures?': 'yes',
      'Is this person one of the Nand saints (paramhansas)?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'no',
      'Was this person Gunatitanand Swami?': 'no',
      'Was this person the mahant (head) of a mandir?': 'no',
      'Did this person compile the Vachanamrut?': 'no',
      'Was this person known for music or singing?': 'no',
    },

    // ============ SPIRITUAL SUCCESSORS ============
    'Bhagatji Maharaj': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'no',
      'Is this person from the modern era (after 1900)?': 'no',
      'Is this person known as a spiritual successor (Guru)?': 'yes',
      'Was this person Gunatitanand Swami?': 'no',
    },
    'Pragji Bhagat': {
      ...personBase(),
      'Is this a birth name or childhood name of someone?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'yes',
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'no',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person originally a bandit or criminal?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'no',
      'Did this person become Maharaj\'s bodyguard?': 'no',
      'Was this person a terror that even kings feared?': 'no',
      'Did this person have a dramatic life transformation?': 'yes',
    },
    'Yogiji Maharaj': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'no',
      'Is this person from the modern era (after 1900)?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'yes',
      'Did this person build any mandirs?': 'yes',
      'Is this person a householder devotee?': 'no',
    },
    'Pramukh Swami Maharaj': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'no',
      'Is this person from the modern era (after 1900)?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'yes',
      'Did this person build any mandirs?': 'yes',
    },
    'Mahant Swami Maharaj': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'no',
      'Is this person from the modern era (after 1900)?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'yes',
    },

    // ============ FEMALE DEVOTEES ============
    'Adiba': {
      ...personBase(false),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Did this person say "I want to observe celibacy and devote myself to the worship of God"?': 'no',
      'Did this person refuse marriage to devote themselves to God?': 'no',
      'Is this person related to Dada Khachar?': 'no',
      'Is this person the sister of Jhinabhai Darbar?': 'yes',
      'Did this person refuse to give pepper to someone with a headache?': 'yes',
      'Is this person a sister of Dada Khachar?': 'no',
    },
    'Jasuba': {
      ...personBase(false),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Did this person say "I want to observe celibacy and devote myself to the worship of God"?': 'no',
      'Did this person refuse marriage to devote themselves to God?': 'no',
      'Is this person related to Dada Khachar?': 'no',
    },
    'Merai': {
      ...personBase(false),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Did this person say "I want to observe celibacy and devote myself to the worship of God"?': 'no',
      'Did this person refuse marriage to devote themselves to God?': 'no',
      'Is this person related to Dada Khachar?': 'no',
    },
    'Laluba': {
      ...personBase(false),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Did this person say "I want to observe celibacy and devote myself to the worship of God"?': 'no',
      'Did this person refuse marriage to devote themselves to God?': 'no',
      'Is this person related to Dada Khachar?': 'no',
    },
    'Kushalkuvarba': {
      ...personBase(false),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Did this person say "I want to observe celibacy and devote myself to the worship of God"?': 'no',
      'Did this person refuse marriage to devote themselves to God?': 'no',
      'Is this person related to Dada Khachar?': 'no',
    },

    // ============ HOUSEHOLDER DEVOTEES ============
    'Dada Khachar': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a chieftain or darbar?': 'yes',
      'Was this person originally from a royal or warrior family?': 'yes',
      'Did this person say "I want to observe celibacy and devote myself to the worship of God"?': 'no',
      'Did this person refuse marriage to devote themselves to God?': 'no',
      'Is this person related to Dada Khachar?': 'yes',
      'Did this person host Maharaj at their darbar in Gadhada?': 'yes',
      'Did this person call a carpenter to cut wood for Maharaj?': 'yes',
      'Did this person break a clay pot to light fire for Maharaj?': 'yes',
      'Is this person a sister of Dada Khachar?': 'no',
    },
    'Parvatbhai': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person originally a bandit or criminal?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'no',
      'Did this person become Maharaj\'s bodyguard?': 'no',
      'Was this person a terror that even kings feared?': 'no',
      'Did this person have a dramatic life transformation?': 'no',
    },
    'Dubli Bhatt': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a Brahmin by birth?': 'yes',
      'Did this person have a dramatic life transformation?': 'yes',
      'Was this person originally a bandit or criminal?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'no',
      'Did this person become Maharaj\'s bodyguard?': 'no',
      'Was this person a terror that even kings feared?': 'no',
    },
    'Ashabhai': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Did this person go to Dakor regularly for darshan?': 'yes',
      'Did this person have darshan of Ranchhodray in a dream?': 'yes',
      'Did this person have a dramatic life transformation?': 'yes',
      'Was this person originally a bandit or criminal?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'no',
      'Did this person become Maharaj\'s bodyguard?': 'no',
      'Was this person a terror that even kings feared?': 'no',
    },
    'Kamalshibhai': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person originally a bandit or criminal?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'no',
      'Did this person become Maharaj\'s bodyguard?': 'no',
      'Was this person a terror that even kings feared?': 'no',
      'Did this person have a dramatic life transformation?': 'no',
    },
    'Jetha Bhagat': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'no',
      'Is this person from the modern era (after 1900)?': 'yes',
      'Did this person wear saffron clothes after being advised by a Guru?': 'yes',
      'Was this person originally a bandit or criminal?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'no',
      'Did this person become Maharaj\'s bodyguard?': 'no',
      'Was this person a terror that even kings feared?': 'no',
      'Did this person have a dramatic life transformation?': 'yes',
    },

    // ============ PLACES ============
    'Gadhada': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Did Bhagwan Swaminarayan live in this place?': 'yes',
      'Is this place associated with BAPS specifically?': 'no',
      'Is this the birthplace of Bhagwan Swaminarayan?': 'no',
      'Is this place a village or town?': 'yes',
      'Is this a samadhi or memorial site?': 'no',
      'Is this place associated with a specific saint?': 'yes',
      'Is this place where Dada Khachar\'s darbar was located?': 'yes',
      'Was this the primary residence of Bhagwan Swaminarayan?': 'yes',
      'Is this place associated with Jhinabhai Darbar?': 'no',
    },
    'Vartal': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Did Bhagwan Swaminarayan live in this place?': 'yes',
      'Is this place associated with BAPS specifically?': 'no',
      'Is this the birthplace of Bhagwan Swaminarayan?': 'no',
      'Is this place a village or town?': 'yes',
      'Is this place associated with a specific saint?': 'yes',
      'Is this place where Dada Khachar\'s darbar was located?': 'no',
      'Was this the primary residence of Bhagwan Swaminarayan?': 'no',
      'Is this place associated with Jhinabhai Darbar?': 'no',
    },
    'Ahmedabad': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Did Bhagwan Swaminarayan live in this place?': 'yes',
      'Is this place associated with BAPS specifically?': 'no',
      'Is this the birthplace of Bhagwan Swaminarayan?': 'no',
      'Is this place a village or town?': 'no',
    },
    'Junagadh Mandir': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'yes',
      'Did Bhagwan Swaminarayan live in this place?': 'no',
      'Is this place associated with BAPS specifically?': 'no',
      'Is this place associated with a specific saint?': 'yes',
    },
    'Muli Mandir': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'yes',
      'Did Bhagwan Swaminarayan live in this place?': 'no',
      'Is this place associated with BAPS specifically?': 'no',
    },
    'Bochasan': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Did Bhagwan Swaminarayan live in this place?': 'no',
      'Is this place associated with BAPS specifically?': 'yes',
      'Is this place a village or town?': 'yes',
    },
    'Sarangpur': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Did Bhagwan Swaminarayan live in this place?': 'yes',
      'Is this place associated with BAPS specifically?': 'yes',
      'Is this place a village or town?': 'yes',
    },
    'Chhapaiya': {
      ...placeBase(),
      'Is this place in Gujarat?': 'no',
      'Is this place a mandir (temple)?': 'no',
      'Did Bhagwan Swaminarayan live in this place?': 'yes',
      'Is this the birthplace of Bhagwan Swaminarayan?': 'yes',
      'Is this place a village or town?': 'yes',
    },
    'Loj': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Did Bhagwan Swaminarayan live in this place?': 'yes',
      'Is this the birthplace of Bhagwan Swaminarayan?': 'no',
      'Is this place a village or town?': 'yes',
    },
    'Kariyani': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place associated with a specific saint?': 'yes',
      'Is this place a village or town?': 'yes',
    },
    'Akshar Deri': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place associated with BAPS specifically?': 'yes',
      'Is this a samadhi or memorial site?': 'yes',
      'Is this place associated with a specific saint?': 'yes',
    },
    'Vaso': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'yes',
      'Is this place associated with a specific saint?': 'yes',
      'Did Bhagwan Swaminarayan live in this place?': 'yes',
      'Is this place where Dada Khachar\'s darbar was located?': 'no',
      'Was this the primary residence of Bhagwan Swaminarayan?': 'no',
      'Is this place associated with Jhinabhai Darbar?': 'yes',
    },
    'Junagadh': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'no',
    },
    'Gujarat': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'no',
    },
    'Dakor': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'yes',
      'Is this place associated with a specific saint?': 'no',
    },

    // ============ OBJECTS / SCRIPTURES ============
    'Vachanamrut': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'yes',
      'Is this something found in a mandir?': 'yes',
      'Was this written by Bhagwan Swaminarayan?': 'no',
      'Does this contain verses or shlokas?': 'no',
      'Is this written in Sanskrit?': 'no',
      'Is this a collection of discourses or talks?': 'yes',
    },
    'Shikshapatri': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'yes',
      'Is this something found in a mandir?': 'yes',
      'Was this written by Bhagwan Swaminarayan?': 'yes',
      'Does this contain verses or shlokas?': 'yes',
      'Is this written in Sanskrit?': 'yes',
      'Is this a collection of discourses or talks?': 'no',
    },
    'Satsangijivanam': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'yes',
      'Is this something found in a mandir?': 'yes',
      'Was this written by Bhagwan Swaminarayan?': 'no',
      'Does this contain verses or shlokas?': 'yes',
      'Is this written in Sanskrit?': 'yes',
      'Is this a collection of discourses or talks?': 'no',
    },
    'Swamini Vato': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'yes',
      'Is this something found in a mandir?': 'yes',
      'Was this written by Bhagwan Swaminarayan?': 'no',
      'Is this a collection of discourses or talks?': 'yes',
    },
    'Bhaktachintamani': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'yes',
      'Was this written by Bhagwan Swaminarayan?': 'no',
      'Does this contain verses or shlokas?': 'yes',
    },
    'Kanthi': {
      ...objectBase(),
      'Is this something you can wear?': 'yes',
      'Is this a scripture or text?': 'no',
      'Is this something found in a mandir?': 'no',
    },
    'Tilak Chandlo': {
      ...objectBase(),
      'Is this something you can wear?': 'yes',
      'Is this a scripture or text?': 'no',
      'Is this something found in a mandir?': 'no',
    },
    'Murti': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'no',
      'Is this something found in a mandir?': 'yes',
    },
    'Mandir': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'no',
      'Is this something found in a mandir?': 'no',
    },

    // ============ CONCEPTS ============
    'Akshar Purushottam': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this related to a title or designation?': 'no',
      'Is this related to an organization?': 'sometimes',
      'Is this a form of worship or devotion?': 'no',
      'Is this one of the core beliefs of BAPS?': 'yes',
      'Does this refer to God or his abode?': 'yes',
    },
    'Akshar': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this one of the core beliefs of BAPS?': 'yes',
      'Does this refer to God or his abode?': 'yes',
    },
    'Purushottam': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this one of the core beliefs of BAPS?': 'yes',
      'Does this refer to God or his abode?': 'yes',
    },
    'Satsang': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this related to a title or designation?': 'no',
      'Is this related to an organization?': 'no',
      'Is this a form of worship or devotion?': 'yes',
    },
    'BAPS': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'no',
      'Is this related to a title or designation?': 'no',
      'Is this related to an organization?': 'yes',
    },
    'Paramhansa': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this related to a title or designation?': 'yes',
      'Is this related to an organization?': 'no',
    },
    'Moksha': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this related to a title or designation?': 'no',
      'Is this one of the core beliefs of BAPS?': 'yes',
    },
    'Samadhi': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this related to a title or designation?': 'no',
    },
    'Ekantik Dharma': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this one of the core beliefs of BAPS?': 'yes',
      'Is this a form of worship or devotion?': 'yes',
    },
    'Nishkam Bhakti': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this a form of worship or devotion?': 'yes',
    },
    'Guru Parampara': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this one of the core beliefs of BAPS?': 'yes',
    },
    'Pagi': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'no',
      'Is this related to a title or designation?': 'yes',
    },
    'Samp Suhradbhav Ekta': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this one of the core beliefs of BAPS?': 'yes',
    },

    // ============ EVENTS ============
    'Fuldol': {
      ...eventBase(),
      'Is this an annual festival?': 'yes',
      'Is this a one-time ceremony?': 'no',
      'Is this celebrated during spring?': 'yes',
      'Is this related to a birthday celebration?': 'no',
      'Does this involve offering food to God?': 'no',
    },
    'Annakut': {
      ...eventBase(),
      'Is this an annual festival?': 'yes',
      'Is this a one-time ceremony?': 'no',
      'Is this celebrated during spring?': 'no',
      'Is this related to a birthday celebration?': 'no',
      'Does this involve offering food to God?': 'yes',
    },
    'Mandir Pratishtha': {
      ...eventBase(),
      'Is this an annual festival?': 'no',
      'Is this a one-time ceremony?': 'yes',
      'Is this celebrated during spring?': 'no',
      'Is this related to a birthday celebration?': 'no',
      'Does this involve offering food to God?': 'no',
    },
    'Shakotsav': {
      ...eventBase(),
      'Is this an annual festival?': 'yes',
      'Is this a one-time ceremony?': 'no',
      'Is this celebrated during spring?': 'no',
      'Is this related to a birthday celebration?': 'no',
      'Does this involve offering food to God?': 'yes',
    },
    'Janmashtami': {
      ...eventBase(),
      'Is this an annual festival?': 'yes',
      'Is this a one-time ceremony?': 'no',
      'Is this celebrated during spring?': 'no',
      'Is this related to a birthday celebration?': 'yes',
      'Does this involve offering food to God?': 'no',
    },
    'Swaminarayan Jayanti': {
      ...eventBase(),
      'Is this an annual festival?': 'yes',
      'Is this a one-time ceremony?': 'no',
      'Is this celebrated during spring?': 'yes',
      'Is this related to a birthday celebration?': 'yes',
      'Does this involve offering food to God?': 'no',
    },
    'Hari Jayanti': {
      ...eventBase(),
      'Is this an annual festival?': 'yes',
      'Is this a one-time ceremony?': 'no',
      'Is this celebrated during spring?': 'yes',
      'Is this related to a birthday celebration?': 'yes',
    },
    'Guru Purnima': {
      ...eventBase(),
      'Is this an annual festival?': 'yes',
      'Is this a one-time ceremony?': 'no',
      'Is this celebrated during spring?': 'no',
      'Is this related to a birthday celebration?': 'no',
    },

    // ============ ADDITIONAL ANSWER MAPPINGS FROM PRAVESH EXAM PAPERS ============

    // Ranchhodray - deity at Dakor
    'Ranchhodray': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'no',
      'Is this person from the modern era (after 1900)?': 'no',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
      'Is this person a Hindu deity (not Swaminarayan)?': 'yes',
      'Did this person grant darshan to Ashabhai in a dream?': 'yes',
      'Did this person appear to Devidanji in his childhood?': 'no',
    },

    // Lord Shivji - deity who appeared to Devidanji
    'Lord Shivji': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'no',
      'Is this person from the modern era (after 1900)?': 'no',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
      'Is this person a Hindu deity (not Swaminarayan)?': 'yes',
      'Did this person grant darshan to Ashabhai in a dream?': 'no',
      'Did this person appear to Devidanji in his childhood?': 'yes',
    },

    // Devidanji - young devotee
    'Devidanji': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Is this person Bhagwan Swaminarayan himself?': 'no',
      'Is this person a Hindu deity (not Swaminarayan)?': 'no',
      'Did this person have a dramatic life transformation?': 'yes',
    },

    // Abhel Khachar - Jivuba's father
    'Abhel Khachar': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person originally from a royal or warrior family?': 'yes',
      'Was this person a chieftain or darbar?': 'yes',
      'Is this person related to Dada Khachar?': 'no',
      'Did this person barge into Jivuba\'s room with a sword?': 'yes',
      'Was this person silenced by seeing a permission letter?': 'yes',
      'Did this person have a dramatic life transformation?': 'no',
    },

    // Dungarbhai - received vartman from Shukmuni
    'Dungarbhai': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Did this person receive blessing that they would do great work for satsang?': 'yes',
    },

    // Joban Pagi's brothers
    'Sundar Pagi': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Is this person a brother of Joban Pagi?': 'yes',
      'Did this person have a dramatic life transformation?': 'no',
      'Was this person originally a bandit or criminal?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'no',
      'Did this person become Maharaj\'s bodyguard?': 'no',
      'Was this person a terror that even kings feared?': 'no',
    },
    'Shakaro Pagi': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Is this person a brother of Joban Pagi?': 'yes',
      'Did this person have a dramatic life transformation?': 'no',
      'Was this person originally a bandit or criminal?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'no',
      'Did this person become Maharaj\'s bodyguard?': 'no',
      'Was this person a terror that even kings feared?': 'no',
    },
    'Dalo Pagi': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Is this person a brother of Joban Pagi?': 'yes',
      'Did this person have a dramatic life transformation?': 'no',
      'Was this person originally a bandit or criminal?': 'no',
      'Did this person try to steal Maharaj\'s horse?': 'no',
      'Did this person become Maharaj\'s bodyguard?': 'no',
      'Was this person a terror that even kings feared?': 'no',
    },

    // Khaiyo Khatri - scholar from Mandvi
    'Khaiyo Khatri': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a Brahmin by birth?': 'no',
      'Did this person have a dramatic life transformation?': 'yes',
      'Was this person transformed from a critic to a devotee?': 'yes',
      'Did this person challenge Shriji Maharaj to a scriptural debate?': 'yes',
      'Did this person\'s mother identify Maharaj as the real God?': 'yes',
      'Was this person known for giving spiritual discourses?': 'no',
    },

    // Ladu Barot
    'Ladu Barot': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
    },

    // Bapujibhai - devotee from Vartal
    'Bapujibhai': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
    },

    // Raya Khatan
    'Raya Khatan': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Did Shriji Maharaj eat milk and thuli at this person\'s house?': 'yes',
    },

    // Raiji
    'Raiji': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
    },

    // Nirgundas Swami (alternate name)
    'Nirgundas Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'no',
      'Is this person from the modern era (after 1900)?': 'yes',
      'Did this person pray for forgiveness in their last moments?': 'yes',
    },

    // ============ ADDITIONAL PLACES ============

    'Mandvi': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place in Kutch region?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'yes',
      'Is this place where a scriptural debate took place?': 'yes',
    },

    'Kutch': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place in Kutch region?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'no',
    },

    'Dabhan': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'yes',
      'Is this place where a yagna was organized?': 'yes',
    },

    'Modhera': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'yes',
    },

    'Khan': {
      ...placeBase(),
      'Is this place in Gujarat?': 'no',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'yes',
    },

    'Shirohi': {
      ...placeBase(),
      'Is this place in Gujarat?': 'no',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'no',
    },

    'Mumbai': {
      ...placeBase(),
      'Is this place in Gujarat?': 'no',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'no',
      'Is this place outside India?': 'no',
    },

    'Akshar Ordi': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place associated with a specific saint?': 'yes',
    },

    // ============ ADDITIONAL OBJECTS ============

    'Sukhdi': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'no',
      'Is this something found in a mandir?': 'no',
      'Is this a food item or sweet?': 'yes',
      'Did Shriji Maharaj give this to Shukmuni?': 'yes',
    },

    'Rojho': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'no',
      'Is this something found in a mandir?': 'no',
      'Is this a food item or sweet?': 'no',
      'Is this an animal (like a horse)?': 'yes',
      'Did Joban Pagi try to steal this?': 'yes',
    },

    'Thuli': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'no',
      'Is this something found in a mandir?': 'no',
      'Is this a food item or sweet?': 'yes',
    },

    'Bilipatra': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'no',
      'Is this something found in a mandir?': 'yes',
      'Is this something used in worship/puja?': 'yes',
      'Is this a food item or sweet?': 'no',
    },

    // ============ ADDITIONAL CONCEPTS ============

    'Ekadashi': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this related to a title or designation?': 'no',
      'Is this a fasting observance?': 'yes',
      'Is this related to the lunar calendar?': 'yes',
    },

    'Vartman': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this related to a title or designation?': 'no',
      'Is this a type of initiation ceremony?': 'yes',
    },

    'Yagna': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this related to a title or designation?': 'no',
      'Is this a fire ritual?': 'yes',
    },

    'Diksha': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this related to a title or designation?': 'no',
      'Is this a type of initiation ceremony?': 'yes',
    },

    'Punam': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this related to a title or designation?': 'no',
      'Is this related to the lunar calendar?': 'yes',
    },

    'Abhishek': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this related to a title or designation?': 'no',
      'Is this a form of worship or devotion?': 'yes',
    },

    'Akshardham': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this one of the core beliefs of BAPS?': 'yes',
      'Does this refer to God or his abode?': 'yes',
      'Is this the eternal abode of God?': 'yes',
    },

    // ============ ADDITIONAL EVENTS ============

    'Vasant Panchmi': {
      ...eventBase(),
      'Is this an annual festival?': 'yes',
      'Is this a one-time ceremony?': 'no',
      'Is this celebrated during spring?': 'yes',
      'Is this related to a birthday celebration?': 'no',
      'Is this a birthday of a saint?': 'yes',
    },

    // ============ MORE ANSWER MAPPINGS (BATCH 2) ============

    // Bhaguji - devoted servant
    'Bhaguji': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person mentioned by Jhinabhai as example of devoted service?': 'yes',
    },

    // Miyaji - devoted servant
    'Miyaji': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person mentioned by Jhinabhai as example of devoted service?': 'yes',
    },

    // Mulji Brahmachari
    'Mulji Brahmachari': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'no',
      'Is this person a Brahmachari (celibate student)?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person mentioned by Jhinabhai as example of devoted service?': 'yes',
    },

    // Khaiyo Khatri's Mother
    'Khaiyo Khatri\'s Mother': {
      ...personBase(false),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Did this person\'s mother identify Maharaj as the real God?': 'no',
      'Was this person transformed from a critic to a devotee?': 'no',
    },

    // Swayamprakashanand Swami
    'Swayamprakashanand Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person first mahant of Ahmedabad mandir?': 'yes',
      'Was this person the mahant (head) of a mandir?': 'yes',
      'Is this person one of the Nand saints (paramhansas)?': 'yes',
    },

    // Akhandanand Swami
    'Akhandanand Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Did this person meet Nilkanth Varni during his pilgrimage?': 'yes',
      'Is this person one of the Nand saints (paramhansas)?': 'yes',
    },

    // Dungar Bhagat (birth name of Gunatitanand Swami)
    'Dungar Bhagat': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Is this a birth name or childhood name of someone?': 'yes',
      'Is this person known as a spiritual successor (Guru)?': 'yes',
      'Was this person Gunatitanand Swami?': 'yes',
    },

    // Jaga Swami (alternate name)
    'Jaga Swami': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person first mahant of Ahmedabad mandir?': 'yes',
      'Was this person the mahant (head) of a mandir?': 'yes',
    },

    // Somla Khachar
    'Somla Khachar': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person originally from a royal or warrior family?': 'yes',
      'Was this person a chieftain or darbar?': 'yes',
    },

    // Dama Sheth
    'Dama Sheth': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person a wealthy merchant?': 'yes',
    },

    // Rao of Kutch
    'Rao of Kutch': {
      ...personBase(),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'no',
      'Did this person meet Bhagwan Swaminarayan directly?': 'no',
      'Is this person from the modern era (after 1900)?': 'no',
      'Was this person originally from a royal or warrior family?': 'yes',
      'Did this person host Brahmanand Swami as a guest?': 'yes',
    },

    // Laduba
    'Laduba': {
      ...personBase(false),
      'Is this person a sadhu (renunciant sant)?': 'no',
      'Is this person a householder devotee?': 'yes',
      'Did this person meet Bhagwan Swaminarayan directly?': 'yes',
      'Is this person from the modern era (after 1900)?': 'no',
      'Is this person a sister of Dada Khachar?': 'yes',
      'Is this person related to Dada Khachar?': 'yes',
    },

    // ============ MORE PLACES ============

    'Bhadra': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'yes',
      'Is this place the birthplace of a spiritual successor?': 'yes',
      'Is this place associated with a specific saint?': 'yes',
    },

    'Piplana': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'yes',
      'Is this place where Nilkanth Varni met a sadhu during pilgrimage?': 'yes',
    },

    'Dholera': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'yes',
    },

    'Gondal': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'yes',
      'Is this place associated with BAPS specifically?': 'yes',
      'Is this place associated with a specific saint?': 'yes',
    },

    'Swaminarayan Nagar': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place associated with BAPS specifically?': 'yes',
    },

    'Agatrai': {
      ...placeBase(),
      'Is this place in Gujarat?': 'yes',
      'Is this place a mandir (temple)?': 'no',
      'Is this place a village or town?': 'yes',
      'Is this place associated with a specific saint?': 'yes',
    },

    // ============ MORE OBJECTS ============

    'Chesta Padd': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'yes',
      'Is this a collection of discourses or talks?': 'no',
      'Is this a collection of songs?': 'yes',
    },

    'Janmangal Namavali': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'yes',
      'Is this a list of names?': 'yes',
      'Does this contain verses or shlokas?': 'yes',
    },

    'Clay Pot': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'no',
      'Is this a container or pot?': 'yes',
      'Is this something found in a mandir?': 'no',
    },

    'Permission Letter': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'no',
      'Is this a letter or document?': 'yes',
    },

    'Saffron Robes': {
      ...objectBase(),
      'Is this something you can wear?': 'yes',
      'Is this a scripture or text?': 'no',
      'Is this clothing worn by sadhus?': 'yes',
    },

    'Pepper': {
      ...objectBase(),
      'Is this something you can wear?': 'no',
      'Is this a scripture or text?': 'no',
      'Is this a food item or sweet?': 'no',
      'Is this a spice used in cooking?': 'yes',
    },

    // ============ MORE CONCEPTS ============

    'Upasana': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this a form of worship or devotion?': 'yes',
      'Is this one of the core beliefs of BAPS?': 'yes',
    },

    'Samvat': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'no',
      'Is this a Hindu calendar term?': 'yes',
    },

    'Posh': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'no',
      'Is this a Hindu calendar term?': 'yes',
      'Is this a Hindu month?': 'yes',
    },

    'Brahmachari': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this related to a title or designation?': 'yes',
    },

    'Darbar': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'no',
      'Is this related to a title or designation?': 'yes',
      'Is this a social or community title?': 'yes',
    },

    'Kathi Darbar': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'no',
      'Is this related to a title or designation?': 'yes',
      'Is this a social or community title?': 'yes',
      'Is this related to warrior communities?': 'yes',
    },

    'Vedant': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this a philosophical tradition?': 'yes',
    },

    'Sadhufold': {
      ...conceptBase(),
      'Is this a spiritual or religious concept?': 'yes',
      'Is this related to an organization?': 'yes',
    },

    // ============ MORE EVENTS ============

    'Diwali': {
      ...eventBase(),
      'Is this an annual festival?': 'yes',
      'Is this a one-time ceremony?': 'no',
      'Is this celebrated during spring?': 'no',
      'Is this related to a birthday celebration?': 'no',
      'Is this a festival of lights?': 'yes',
      'Is this celebrated in autumn?': 'yes',
    },

    'Holi': {
      ...eventBase(),
      'Is this an annual festival?': 'yes',
      'Is this a one-time ceremony?': 'no',
      'Is this celebrated during spring?': 'yes',
      'Is this related to a birthday celebration?': 'no',
    },
  };

  // Insert entity-question answers
  for (const entity of allEntities) {
    const entityAnswers = answerMap[entity.name];
    if (entityAnswers) {
      for (const question of allQuestions) {
        const answer = entityAnswers[question.text];
        if (answer) {
          db.run(
            'INSERT OR IGNORE INTO entity_question_answers (entity_id, question_id, answer, confidence) VALUES (?, ?, ?, ?)',
            [entity.id, question.id, answer, 0.9]
          );
        }
      }
    }
  }

  // Save the database
  saveDatabase();

  const entityCountResult = db.exec('SELECT COUNT(*) as count FROM entities');
  const questionCountResult = db.exec('SELECT COUNT(*) as count FROM questions');
  const answerCountResult = db.exec('SELECT COUNT(*) as count FROM entity_question_answers');

  const entityCount = entityCountResult.length > 0 ? entityCountResult[0].values[0][0] : 0;
  const questionCount = questionCountResult.length > 0 ? questionCountResult[0].values[0][0] : 0;
  const answerCount = answerCountResult.length > 0 ? answerCountResult[0].values[0][0] : 0;

  console.log(`Seeded ${entityCount} entities`);
  console.log(`Seeded ${questionCount} questions`);
  console.log(`Seeded ${answerCount} entity-question answers`);
  console.log('Database seeded successfully!');
}

// Run if called directly
if (require.main === module) {
  seedDatabase().catch(console.error);
}
