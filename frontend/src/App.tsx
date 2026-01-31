import { useState, useEffect } from 'react';

const API_BASE = '/api';

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
  const [maxQuestions] = useState(21);
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
        setDistinguishPrompt(data.prompt);
        setCorrectEntityName(data.correctEntityName);
        setStatus('askingQuestion');
      } else {
        setStatus('finished');
        setResult('lost');
        setStats(data.stats);

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

        const entRes = await fetch(`${API_BASE}/game/entities`);
        const entData = await entRes.json();
        setEntities(entData.entities);

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
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">SSE Master Mind</h1>
          <span className="text-sm text-gray-400 font-light">
            21 Questions &mdash; Satsang Reader Part 1
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        {error && (
          <div className="border border-red-200 text-red-600 px-5 py-3 rounded mb-8 text-sm">
            {error}
          </div>
        )}

        {stats && stats.totalGames > 0 && (
          <div className="border-b border-gray-100 pb-8 mb-10">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">Statistics</p>
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-light">{stats.totalGames}</div>
                <div className="text-xs text-gray-400 mt-1">Games</div>
              </div>
              <div>
                <div className="text-3xl font-light">{stats.accuracy.toFixed(0)}%</div>
                <div className="text-xs text-gray-400 mt-1">Accuracy</div>
              </div>
              <div>
                <div className="text-3xl font-light">{stats.averageQuestions.toFixed(1)}</div>
                <div className="text-xs text-gray-400 mt-1">Avg Questions</div>
              </div>
            </div>
          </div>
        )}

        {/* Idle */}
        {status === 'idle' && (
          <div className="py-16 text-center">
            <h2 className="text-4xl font-light leading-tight mb-6">
              Think of something from<br />Satsang Reader Part 1
            </h2>
            <p className="text-gray-400 mb-10 text-lg font-light">
              It could be a person, place, object, concept, or event from the book.
            </p>
            <button
              onClick={startGame}
              disabled={loading}
              className="bg-black text-white px-10 py-3 text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              {loading ? 'Starting...' : "I'm Ready"}
            </button>
          </div>
        )}

        {/* Playing */}
        {status === 'playing' && currentQuestion && (
          <div>
            <div className="mb-10">
              <div className="flex justify-between text-xs text-gray-400 mb-3 uppercase tracking-widest">
                <span>Question {questionNumber} of {maxQuestions}</span>
                <span>{remainingCandidates} possibilities</span>
              </div>
              <div className="w-full bg-gray-100 h-px">
                <div
                  className="bg-black h-px transition-all duration-300"
                  style={{ width: `${(questionNumber / maxQuestions) * 100}%` }}
                />
              </div>
            </div>

            <div className="text-center mb-12">
              <p className="text-2xl font-light leading-relaxed">
                {currentQuestion.text}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              <button
                onClick={() => submitAnswer('yes')}
                disabled={loading}
                className="border border-black text-black py-3 text-sm font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-40"
              >
                Yes
              </button>
              <button
                onClick={() => submitAnswer('no')}
                disabled={loading}
                className="border border-black text-black py-3 text-sm font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-40"
              >
                No
              </button>
              <button
                onClick={() => submitAnswer('sometimes')}
                disabled={loading}
                className="border border-gray-300 text-gray-500 py-3 text-sm font-medium hover:border-black hover:text-black transition-colors disabled:opacity-40"
              >
                Sometimes
              </button>
              <button
                onClick={() => submitAnswer('unknown')}
                disabled={loading}
                className="border border-gray-300 text-gray-500 py-3 text-sm font-medium hover:border-black hover:text-black transition-colors disabled:opacity-40"
              >
                Don't Know
              </button>
            </div>
          </div>
        )}

        {/* Guessing */}
        {status === 'guessing' && currentGuess && (
          <div className="py-8 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-8">My Guess</p>
            <h2 className="text-4xl font-light mb-2">
              {currentGuess.name}
            </h2>
            <p className="text-sm text-gray-400 capitalize mb-4">
              {currentGuess.category}
            </p>
            {currentGuess.description && (
              <p className="text-gray-500 font-light max-w-md mx-auto mb-10">{currentGuess.description}</p>
            )}
            <p className="text-gray-400 mb-6">Am I correct?</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => handleGuessResponse(true)}
                disabled={loading}
                className="bg-black text-white px-8 py-3 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                Yes!
              </button>
              <button
                onClick={() => handleGuessResponse(false)}
                disabled={loading}
                className="border border-black text-black px-8 py-3 text-sm font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-40"
              >
                No
              </button>
            </div>
          </div>
        )}

        {/* Learning */}
        {status === 'learning' && (
          <div className="max-w-md mx-auto">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2 text-center">Learning</p>
            <h2 className="text-2xl font-light text-center mb-2">
              Help me learn!
            </h2>
            <p className="text-gray-400 mb-8 text-center font-light">
              What were you thinking of?
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  value={learnName}
                  onChange={e => setLearnName(e.target.value)}
                  placeholder="e.g., Brahmanand Swami"
                  className="w-full border-b border-gray-300 px-0 py-2 text-sm focus:outline-none focus:border-black transition-colors bg-transparent"
                  list="entities"
                />
                <datalist id="entities">
                  {entities.map(e => <option key={e} value={e} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Category</label>
                <select
                  value={learnCategory}
                  onChange={e => setLearnCategory(e.target.value)}
                  className="w-full border-b border-gray-300 px-0 py-2 text-sm focus:outline-none focus:border-black transition-colors bg-transparent"
                >
                  <option value="person">Person</option>
                  <option value="place">Place</option>
                  <option value="object">Object</option>
                  <option value="concept">Concept</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Description (optional)</label>
                <textarea
                  value={learnDescription}
                  onChange={e => setLearnDescription(e.target.value)}
                  placeholder="e.g., Householder devotee who hosted Bhagwan Swaminarayan in Gadhada"
                  className="w-full border-b border-gray-300 px-0 py-2 text-sm focus:outline-none focus:border-black transition-colors bg-transparent h-16 resize-none"
                />
              </div>

              <button
                onClick={submitLearning}
                disabled={loading || !learnName}
                className="w-full bg-black text-white py-3 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 mt-4"
              >
                {loading ? 'Saving...' : 'Teach Me'}
              </button>
            </div>
          </div>
        )}

        {/* Asking Question */}
        {status === 'askingQuestion' && (
          <div className="max-w-md mx-auto">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2 text-center">Distinguish</p>
            <h2 className="text-2xl font-light text-center mb-4">
              Help me tell them apart!
            </h2>
            {divergenceInfo && (
              <div className="border border-gray-200 rounded px-4 py-3 mb-6">
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-black">Where I went wrong:</span>{' '}
                  Most people answer the question &ldquo;{divergenceInfo.questionText}&rdquo; as{' '}
                  <span className="font-medium text-black capitalize">{divergenceInfo.expectedAnswer}</span> for {correctEntityName}.
                </p>
              </div>
            )}
            <p className="text-gray-400 mb-8 text-center font-light">
              {distinguishPrompt}
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">
                  Yes/No Question
                </label>
                <input
                  type="text"
                  value={distinguishQuestion}
                  onChange={e => setDistinguishQuestion(e.target.value)}
                  placeholder="e.g., Did this person write poetry?"
                  className="w-full border-b border-gray-300 px-0 py-2 text-sm focus:outline-none focus:border-black transition-colors bg-transparent"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">
                  For &ldquo;{correctEntityName}&rdquo;, the answer is:
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDistinguishAnswer('yes')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      distinguishAnswer === 'yes'
                        ? 'bg-black text-white'
                        : 'border border-gray-300 text-gray-400 hover:border-black hover:text-black'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setDistinguishAnswer('no')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      distinguishAnswer === 'no'
                        ? 'bg-black text-white'
                        : 'border border-gray-300 text-gray-400 hover:border-black hover:text-black'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              <button
                onClick={submitDistinguishingQuestion}
                disabled={loading || !distinguishQuestion}
                className="w-full bg-black text-white py-3 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 mt-4"
              >
                {loading ? 'Saving...' : 'Submit Question'}
              </button>
            </div>
          </div>
        )}

        {/* Finished */}
        {status === 'finished' && (
          <div className="py-16 text-center">
            {result === 'won' ? (
              <>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">Result</p>
                <h2 className="text-4xl font-light mb-6">I guessed it!</h2>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">Result</p>
                <h2 className="text-4xl font-light mb-6">Thank you for teaching me!</h2>
                {divergenceInfo && (
                  <div className="border border-gray-200 rounded px-4 py-3 mb-6 text-left max-w-md mx-auto">
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-black">Where I went wrong:</span>{' '}
                      Most people answer the question &ldquo;{divergenceInfo.questionText}&rdquo; as{' '}
                      <span className="font-medium text-black capitalize">{divergenceInfo.expectedAnswer}</span> for {learnName}.
                    </p>
                  </div>
                )}
              </>
            )}
            <button
              onClick={resetGame}
              className="bg-black text-white px-10 py-3 text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Based on Satsang Reader Part 1 &mdash; BAPS Swaminarayan Sanstha
          </p>
          <div className="flex gap-6">
            <a
              href="https://www.baps.org/SatsangExam/Studymaterials.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-black transition-colors"
            >
              Book
            </a>
            <a
              href="https://www.bapssatsangexams.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-black transition-colors"
            >
              Satsang Exams
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
