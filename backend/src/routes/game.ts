import { Router, Request, Response } from 'express';
import * as gameEngine from '../services/binaryTreeEngine';

const router = Router();

// Start a new game
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { sessionId, totalEntities } = await gameEngine.startGame();

    res.json({
      sessionId,
      totalEntities,
      message: 'Think of something from the Satsang Reader Part 1 book!'
    });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Get next question
router.get('/question/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);

    const result = await gameEngine.getNextQuestion(sessionId);

    if (result.type === 'guess') {
      return res.json({
        type: 'guess',
        guess: result.guess ? {
          id: result.guess.id,
          name: result.guess.name,
          description: result.guess.description,
          category: result.guess.category
        } : null,
        questionCount: result.questionCount,
        confidence: result.confidence
      });
    }

    res.json({
      type: 'question',
      question: result.question,
      questionNumber: result.questionNumber,
      maxQuestions: 21
    });
  } catch (error: any) {
    console.error('Error getting question:', error);
    if (error.message === 'Session not found') {
      return res.status(404).json({ error: 'Game session not found' });
    }
    res.status(500).json({ error: 'Failed to get question' });
  }
});

// Submit answer to a question
router.post('/answer/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { questionId, answer } = req.body;

    if (!['yes', 'no', 'sometimes', 'unknown'].includes(answer)) {
      return res.status(400).json({ error: 'Invalid answer. Use: yes, no, sometimes, or unknown' });
    }

    const result = await gameEngine.submitAnswer(sessionId, questionId, answer);

    res.json({
      success: true,
      remainingCandidates: result.remainingCandidates
    });
  } catch (error: any) {
    console.error('Error submitting answer:', error);
    if (error.message === 'Session not found') {
      return res.status(404).json({ error: 'Game session not found' });
    }
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Confirm or deny a guess
router.post('/guess/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { guessedEntityId, isCorrect } = req.body;

    await gameEngine.handleGuessResponse(sessionId, guessedEntityId, isCorrect);

    if (isCorrect) {
      // Clean up session
      gameEngine.cleanupSession(sessionId);

      const stats = await gameEngine.getStats();
      res.json({
        success: true,
        message: 'I guessed correctly!',
        stats
      });
    } else {
      // AI was wrong - need to learn
      res.json({
        success: false,
        message: 'I was wrong. Please tell me what you were thinking of.',
        needsLearning: true
      });
    }
  } catch (error: any) {
    console.error('Error processing guess:', error);
    if (error.message === 'Session not found') {
      return res.status(404).json({ error: 'Game session not found' });
    }
    res.status(500).json({ error: 'Failed to process guess' });
  }
});

// Reveal the correct answer when AI fails
router.post('/reveal/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const {
      correctName,
      correctCategory,
      correctDescription,
      guessedEntityId,
    } = req.body;

    if (!correctName || !correctCategory) {
      return res.status(400).json({ error: 'Please provide correctName and correctCategory' });
    }

    const result = await gameEngine.revealAnswer(
      sessionId,
      correctName,
      correctCategory,
      guessedEntityId || null,
      correctDescription || null
    );

    const stats = await gameEngine.getStats();

    if (result.needsDistinguishingQuestion) {
      // Need user to provide a distinguishing question
      res.json({
        success: true,
        needsDistinguishingQuestion: true,
        message: `I've learned about "${correctName}", but I need your help to tell it apart from "${result.wrongEntityName}".`,
        prompt: `Please provide a yes/no question that is TRUE for "${correctName}" but FALSE for "${result.wrongEntityName}" (or vice versa).`,
        entityId: result.entityId,
        isNew: result.isNew,
        wrongEntityName: result.wrongEntityName,
        correctEntityName: correctName,
        divergenceInfo: result.divergenceInfo || null,
        stats
      });
    } else {
      res.json({
        success: true,
        needsDistinguishingQuestion: false,
        message: `Thanks! I've learned about "${correctName}".`,
        entityId: result.entityId,
        isNew: result.isNew,
        divergenceInfo: result.divergenceInfo || null,
        stats
      });
    }
  } catch (error: any) {
    console.error('Error revealing answer:', error);
    if (error.message === 'Session not found') {
      return res.status(404).json({ error: 'Game session not found' });
    }
    res.status(500).json({ error: 'Failed to reveal answer' });
  }
});

// Add a user-provided distinguishing question
router.post('/add-question/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { questionText, correctEntityAnswer } = req.body;

    if (!questionText) {
      return res.status(400).json({ error: 'Please provide questionText' });
    }

    if (!['yes', 'no'].includes(correctEntityAnswer)) {
      return res.status(400).json({ error: 'correctEntityAnswer must be "yes" or "no"' });
    }

    const result = await gameEngine.addUserDistinguishingQuestion(
      sessionId,
      questionText,
      correctEntityAnswer
    );

    const stats = await gameEngine.getStats();
    res.json({
      success: true,
      message: `Great! I've added your question and updated my knowledge.`,
      questionId: result.questionId,
      stats
    });
  } catch (error: any) {
    console.error('Error adding question:', error);
    if (error.message === 'Session not found') {
      return res.status(404).json({ error: 'Game session not found or expired' });
    }
    if (error.message === 'No pending distinguish request') {
      return res.status(400).json({ error: 'No pending request for a distinguishing question' });
    }
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// Get all entity names (for autocomplete)
router.get('/entities', async (req: Request, res: Response) => {
  try {
    const names = gameEngine.getEntityNames();
    res.json({ entities: names });
  } catch (error) {
    console.error('Error getting entities:', error);
    res.status(500).json({ error: 'Failed to get entities' });
  }
});

// Get game statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await gameEngine.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Debug endpoint
router.get('/debug', async (req: Request, res: Response) => {
  try {
    const entityName = req.query.entity as string | undefined;
    const info = gameEngine.getDebugInfo(entityName);
    res.json(info);
  } catch (error) {
    console.error('Error getting debug info:', error);
    res.status(500).json({ error: 'Failed to get debug info' });
  }
});

export default router;
