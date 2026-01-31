import express from 'express';
import cors from 'cors';
import gameRoutes from './routes/game';
import { initBinaryTreeEngine } from './services/binaryTreeEngine';
import { seedDatabase } from './db/seed';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/game', gameRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SSE Master Mind API is running' });
});

// Initialize and start server
async function start() {
  try {
    // Seed database first (will skip if already seeded)
    console.log('Initializing database...');
    await seedDatabase();

    // Initialize binary tree game engine
    console.log('Initializing binary tree game engine...');
    await initBinaryTreeEngine();

    // Start server
    app.listen(PORT, () => {
      console.log(`\nServer running on http://localhost:${PORT}`);
      console.log('\nAPI endpoints:');
      console.log('  POST /api/game/start - Start a new game');
      console.log('  GET  /api/game/question/:sessionId - Get next question');
      console.log('  POST /api/game/answer/:sessionId - Submit answer');
      console.log('  POST /api/game/guess/:sessionId - Confirm/deny guess');
      console.log('  POST /api/game/reveal/:sessionId - Reveal correct answer');
      console.log('  GET  /api/game/entities - Get all entity names');
      console.log('  GET  /api/game/stats - Get game statistics');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
