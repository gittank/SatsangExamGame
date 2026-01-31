# Satsang Exam Game (20 Questions)

A 20-questions style guessing game based on the **Satsang Reader Part 1** by BAPS Swaminarayan Sanstha. Think of a person, place, object, concept, or event from the Satsang Reader and the AI will try to guess it by asking yes/no questions. When it guesses wrong, it learns from you and gets smarter over time.

## How It Works

1. Think of an entity from the Satsang Reader
2. The AI asks up to 20 yes/no questions
3. Based on your answers, it narrows down and makes a guess
4. If wrong, you teach it the correct answer and it updates its decision tree
5. Each game makes the AI more accurate

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** sql.js (SQLite in-memory with file persistence)
- **Game Engine:** Binary decision tree with information-gain-based question selection

## Setup

### Backend

```bash
cd backend
npm install
npm run seed    # Initialize the database
npm run build   # Compile TypeScript
npm start       # Start server on port 3001
```

For development with hot reload:
```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev     # Start dev server on port 5173
```

For production build:
```bash
npm run build
```

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.ts                  # Express server
│   │   ├── routes/game.ts            # Game API endpoints
│   │   ├── services/
│   │   │   └── binaryTreeEngine.ts   # Core decision tree engine
│   │   └── db/
│   │       ├── database.ts           # sql.js wrapper
│   │       └── seed.ts               # DB initialization
│   └── data/                         # Decision tree & DB files
├── frontend/
│   └── src/
│       └── App.tsx                   # Main game UI
├── data/
│   ├── answer_matrix.json            # Entity-question answer mappings
│   ├── entities.json                 # Entity definitions
│   └── decision_tree.json            # Decision tree structure
└── scripts/                          # Utility scripts for data generation
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/game/start` | Start a new game session |
| GET | `/api/game/question/:sessionId` | Get next question or guess |
| POST | `/api/game/answer/:sessionId` | Submit answer to a question |
| POST | `/api/game/guess/:sessionId` | Confirm or deny a guess |
| POST | `/api/game/reveal/:sessionId` | Reveal correct answer (teaches the AI) |
| POST | `/api/game/add-question/:sessionId` | Submit a distinguishing question |
| GET | `/api/game/entities` | Get all entity names (autocomplete) |
| GET | `/api/game/stats` | Game statistics |

## Features

- Binary decision tree with information-gain splitting for optimal question selection
- Learning system that improves after every game
- Answer matrix tracking entity-question relationships with confidence scores
- Divergence detection showing where the AI's path went wrong
- Entity autocomplete when teaching the AI
- Game statistics (accuracy, average questions per game)
