import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3001/api';

type AnswerType = 'yes' | 'no' | 'sometimes' | 'unknown';

interface Question {
  id: number;
  text: string;
}

interface Entity {
  id: number;
  name: string;
  category: string;
  description: string | null;
}

interface Stats {
  totalGames: number;
  correctGuesses: number;
  accuracy: number;
  averageQuestions: number;
}

type GameStatus = 'idle' | 'playing' | 'guessing' | 'learning' | 'askingQuestion' | 'finished';

function App() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [status, setStatus] = useState<GameStatus>('idle');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [currentGuess, setCurrentGuess] = useState<Entity | null>(null);
  const [remainingCandidates, setRemainingCandidates] = useState(0);
  const [result, setResult] = useState<'won' | 'lost' | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [entities, setEntities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [learnName, setLearnName] = useState('');
  const [learnCategory, setLearnCategory] = useState('person');
  const [learnDescription, setLearnDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [distinguishPrompt, setDistinguishPrompt] = useState<string | null>(null);
  const [distinguishQuestion, setDistinguishQuestion] = useState('');
  const [distinguishAnswer, setDistinguishAnswer] = useState<'yes' | 'no'>('yes');
  const [correctEntityName, setCorrectEntityName] = useState('');
  const [divergenceInfo, setDivergenceInfo] = useState<{ questionText: string; userAnswer: string; expectedAnswer: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/game/stats`)
      .then(res => res.json())
      .then(setStats)
      .catch(err => console.error('Failed to load stats:', err));

    fetch(`${API_BASE}/game/entities`)
      .then(res => res.json())
      .then(data => setEntities(data.entities))
      .catch(err => console.error('Failed to load entities:', err));
  }, []);

  const startGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      setRemainingCandidates(data.totalEntities);
      setStatus('playing');
      setQuestionNumber(0);
      setResult(null);
      await getNextQuestion(data.sessionId);
    } catch (err) {
      setError('Failed to start game');
      console.error(err);
    }
    setLoading(false);
  };

  const getNextQuestion = async (sid: number) => {
    try {
      const res = await fetch(`${API_BASE}/game/question/${sid}`);
      const data = await res.json();

      if (data.type === 'question') {
        setCurrentQuestion(data.question);
        setQuestionNumber(data.questionNumber);
        setStatus('playing');
      } else if (data.type === 'guess') {
        setCurrentGuess(data.guess);
        setQuestionNumber(data.questionCount);
        setStatus('guessing');
      }
    } catch (err) {
      console.error('Failed to get question:', err);
    }
  };

  const submitAnswer = async (answer: AnswerType) => {
    if (!sessionId || !currentQuestion) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/game/answer/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: currentQuestion.id, answer }),
      });
      const data = await res.json();
      setRemainingCandidates(data.remainingCandidates);
      await getNextQuestion(sessionId);
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
    setLoading(false);
  };

  const handleGuessResponse = async (isCorrect: boolean) => {
    if (!sessionId || !currentGuess) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/game/guess/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guessedEntityId: currentGuess.id, isCorrect }),
      });
      const data = await res.json();

      if (isCorrect) {
        setStatus('finished');
        setResult('won');
        if (data.stats) setStats(data.stats);
      } else {
        setStatus('learning');
      }
    } catch (err) {
      console.error('Failed to confirm guess:', err);
    }
    setLoading(false);
  };

  const submitLearning = async () => {
    if (!sessionId || !learnName) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/game/reveal/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctName: learnName,
          correctCategory: learnCategory,
          correctDescription: learnDescription || null,
          guessedEntityId: currentGuess?.id || null,
        }),
      });
      const data = await res.json();

      if (data.divergenceInfo) {
        setDivergenceInfo(data.divergenceInfo);
      }

      if (data.needsDistinguishingQuestion) {
        // Need user to provide a distinguishing question
        setDistinguishPrompt(data.prompt);
        setCorrectEntityName(data.correctEntityName);
        setStatus('askingQuestion');
      } else {
        setStatus('finished');
        setResult('lost');
        setStats(data.stats);

        // Refresh entities
        const entRes = await fetch(`${API_BASE}/game/entities`);
        const entData = await entRes.json();
        setEntities(entData.entities);
      }
    } catch (err) {
      console.error('Failed to submit learning:', err);
    }
    setLoading(false);
  };

  const submitDistinguishingQuestion = async () => {
    if (!sessionId || !distinguishQuestion) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/game/add-question/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: distinguishQuestion,
          correctEntityAnswer: distinguishAnswer,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus('finished');
        setResult('lost');

        // Refresh entities
        const entRes = await fetch(`${API_BASE}/game/entities`);
        const entData = await entRes.json();
        setEntities(entData.entities);

        // Refresh stats
        const statsRes = await fetch(`${API_BASE}/game/stats`);
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to submit distinguishing question:', err);
    }
    setLoading(false);
  };

  const resetGame = () => {
    setSessionId(null);
    setStatus('idle');
    setCurrentQuestion(null);
    setQuestionNumber(0);
    setCurrentGuess(null);
    setRemainingCandidates(0);
    setResult(null);
    setLearnName('');
    setLearnCategory('person');
    setLearnDescription('');
    setError(null);
    setDistinguishPrompt(null);
    setDistinguishQuestion('');
    setDistinguishAnswer('yes');
    setCorrectEntityName('');
    setDivergenceInfo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      <header className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-6 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center">SSE Master Mind</h1>
          <p className="text-center text-orange-100 mt-2">
            21 Questions - Satsang Reader Part 1
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {stats && stats.totalGames > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Game Statistics</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.totalGames}</div>
                <div className="text-xs text-gray-500">Games</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.accuracy.toFixed(0)}%</div>
                <div className="text-xs text-gray-500">Accuracy</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.averageQuestions.toFixed(1)}</div>
                <div className="text-xs text-gray-500">Avg Qs</div>
              </div>
            </div>
          </div>
        )}

        {status === 'idle' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🙏</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Think of something from Satsang Reader Part 1
            </h2>
            <p className="text-gray-600 mb-6">
              It could be a person, place, object, concept, or event from the book.
            </p>
            <button
              onClick={startGame}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Starting...' : "I'm Ready!"}
            </button>
          </div>
        )}

        {status === 'playing' && currentQuestion && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Question {questionNumber} of 21</span>
                <span>{remainingCandidates} possibilities</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(questionNumber / 21) * 100}%` }}
                />
              </div>
            </div>

            <div className="text-center mb-8">
              <p className="text-xl font-semibold text-gray-800">
                {currentQuestion.text}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => submitAnswer('yes')}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-lg text-lg disabled:opacity-50"
              >
                Yes
              </button>
              <button
                onClick={() => submitAnswer('no')}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-lg text-lg disabled:opacity-50"
              >
                No
              </button>
              <button
                onClick={() => submitAnswer('sometimes')}
                disabled={loading}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 rounded-lg text-lg disabled:opacity-50"
              >
                Sometimes
              </button>
              <button
                onClick={() => submitAnswer('unknown')}
                disabled={loading}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 rounded-lg text-lg disabled:opacity-50"
              >
                Don't Know
              </button>
            </div>
          </div>
        )}

        {status === 'guessing' && currentGuess && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-4xl mb-4">🤔</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              I think you're thinking of...
            </h2>
            <div className="bg-orange-100 rounded-lg p-6 mb-6">
              <h3 className="text-2xl font-bold text-orange-700 mb-2">
                {currentGuess.name}
              </h3>
              <p className="text-sm text-orange-600 capitalize mb-2">
                ({currentGuess.category})
              </p>
              {currentGuess.description && (
                <p className="text-gray-600 text-sm">{currentGuess.description}</p>
              )}
            </div>
            <p className="text-gray-600 mb-4">Am I correct?</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleGuessResponse(true)}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50"
              >
                Yes!
              </button>
              <button
                onClick={() => handleGuessResponse(false)}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50"
              >
                No
              </button>
            </div>
          </div>
        )}

        {status === 'learning' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4 text-center">📚</div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Help me learn!
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              What were you thinking of?
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={learnName}
                  onChange={e => setLearnName(e.target.value)}
                  placeholder="e.g., Brahmanand Swami"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  list="entities"
                />
                <datalist id="entities">
                  {entities.map(e => <option key={e} value={e} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={learnCategory}
                  onChange={e => setLearnCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="person">Person</option>
                  <option value="place">Place</option>
                  <option value="object">Object</option>
                  <option value="concept">Concept</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={learnDescription}
                  onChange={e => setLearnDescription(e.target.value)}
                  placeholder="e.g., Householder devotee who hosted Bhagwan Swaminarayan in Gadhada"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 h-20 resize-none"
                />
              </div>

              <button
                onClick={submitLearning}
                disabled={loading || !learnName}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Teach Me!'}
              </button>
            </div>
          </div>
        )}

        {status === 'askingQuestion' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4 text-center">❓</div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Help me tell them apart!
            </h2>
            {divergenceInfo && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-amber-800 text-sm">
                  <span className="font-semibold">Where I went wrong:</span>{' '}
                  Most people answer the question "<span className="font-medium">{divergenceInfo.questionText}</span>" as{' '}
                  <span className="font-bold capitalize">{divergenceInfo.expectedAnswer}</span> for {correctEntityName}.
                </p>
              </div>
            )}
            <p className="text-gray-600 mb-6 text-center">
              {distinguishPrompt}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yes/No Question
                </label>
                <input
                  type="text"
                  value={distinguishQuestion}
                  onChange={e => setDistinguishQuestion(e.target.value)}
                  placeholder="e.g., Did this person write poetry?"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  For "{correctEntityName}", the answer is:
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setDistinguishAnswer('yes')}
                    className={`flex-1 py-2 rounded-lg font-bold ${
                      distinguishAnswer === 'yes'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setDistinguishAnswer('no')}
                    className={`flex-1 py-2 rounded-lg font-bold ${
                      distinguishAnswer === 'no'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              <button
                onClick={submitDistinguishingQuestion}
                disabled={loading || !distinguishQuestion}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Submit Question'}
              </button>
            </div>
          </div>
        )}

        {status === 'finished' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            {result === 'won' ? (
              <>
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-green-600 mb-4">I guessed it!</h2>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">🙏</div>
                <h2 className="text-2xl font-bold text-orange-600 mb-4">Thank you for teaching me!</h2>
                {divergenceInfo && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-left">
                    <p className="text-amber-800 text-sm">
                      <span className="font-semibold">Where I went wrong:</span>{' '}
                      Most people answer the question "<span className="font-medium">{divergenceInfo.questionText}</span>" as{' '}
                      <span className="font-bold capitalize">{divergenceInfo.expectedAnswer}</span> for {learnName}.
                    </p>
                  </div>
                )}
              </>
            )}
            <button
              onClick={resetGame}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full text-lg"
            >
              Play Again
            </button>
          </div>
        )}
      </main>

      <footer className="text-center text-gray-500 text-sm p-4 mt-8">
        <p>Based on Satsang Reader Part 1 - BAPS Swaminarayan Sanstha</p>
      </footer>
    </div>
  );
}

export default App;
