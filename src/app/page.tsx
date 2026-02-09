'use client';

import { useState, useEffect, useMemo } from 'react';
import questionsData from '@/data/questions.json';
import { Question, UserStats } from '@/types/quiz';
import { MemoryEngine } from '@/lib/srs';

export default function Home() {
  const [mode, setMode] = useState<'dashboard' | 'session'>('dashboard');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalAttempted: 0,
    correctCount: 0,
    mastery: 0,
    subjectProgress: {},
  });

  // SRS State
  const [weights, setWeights] = useState<number[]>([0.5, -0.1, -0.05]);
  const [overrides, setOverrides] = useState<Record<number, Partial<Question>>>({});

  const memory = useMemo(() => new MemoryEngine(weights), [weights]);

  const subjects = Array.from(new Set(questionsData.map((q) => q.subject))).sort();

  useEffect(() => {
    const savedStats = localStorage.getItem('viva_stats');
    if (savedStats) setStats(JSON.parse(savedStats));

    const savedWeights = localStorage.getItem('viva_weights');
    if (savedWeights) setWeights(JSON.parse(savedWeights));

    const savedOverrides = localStorage.getItem('viva_overrides');
    if (savedOverrides) setOverrides(JSON.parse(savedOverrides));
  }, []);

  const getQuestionStats = (q: Question) => {
    const override = overrides[q.id] || {};
    return {
      reviewCount: override.review_count ?? q.review_count ?? 0,
      lastReviewedAt: override.last_reviewed_at ?? q.last_reviewed_at ?? null,
    };
  };

  const startSession = (subject: string | null) => {
    let filtered = subject
      ? (questionsData as Question[]).filter(q => q.subject === subject)
      : (questionsData as Question[]);

    // Calculate recall scores for all filtered questions
    const scored = filtered.map(q => {
      const { reviewCount, lastReviewedAt } = getQuestionStats(q);
      return {
        ...q,
        predicted_recall: memory.predict(reviewCount, lastReviewedAt)
      };
    });

    // Shuffle FIRST to break ties (e.g. all new questions have same score)
    const shuffledScored = [...scored].sort(() => 0.5 - Math.random());

    // Pick 10 questions with the LOWEST recall scores
    const sorted = shuffledScored.sort((a, b) => a.predicted_recall - b.predicted_recall);
    const sessionBatch = sorted.slice(0, 10);

    setCurrentQuestions(sessionBatch as Question[]);
    setSelectedSubject(subject);
    setCurrentIndex(0);
    setMode('session');
  };

  const handleAnswer = (choice: string) => {
    const q = currentQuestions[currentIndex];
    const isCorrect = choice.toUpperCase() === q.correct_answer.toUpperCase();
    const { reviewCount, lastReviewedAt } = getQuestionStats(q);

    // Train ML Model
    const newWeights = memory.train(reviewCount, lastReviewedAt, isCorrect ? 1.0 : 0.0);
    setWeights(newWeights);
    localStorage.setItem('viva_weights', JSON.stringify(newWeights));

    // Update individual question stats
    const newOverrides = {
      ...overrides,
      [q.id]: {
        review_count: reviewCount + 1,
        last_reviewed_at: new Date().toISOString(),
      }
    };
    setOverrides(newOverrides);
    localStorage.setItem('viva_overrides', JSON.stringify(newOverrides));

    setFeedback({
      isCorrect,
      message: isCorrect ? 'CORRECT' : `INCORRECT. ANSWER: ${q.correct_answer}`,
    });

    const newStats = {
      ...stats,
      totalAttempted: stats.totalAttempted + 1,
      correctCount: stats.correctCount + (isCorrect ? 1 : 0),
      mastery: Math.min(100, Math.floor(((stats.correctCount + (isCorrect ? 1 : 0)) / (stats.totalAttempted + 1)) * 100))
    };
    setStats(newStats);
    localStorage.setItem('viva_stats', JSON.stringify(newStats));
  };

  const nextQuestion = () => {
    setFeedback(null);
    if (currentIndex < currentQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setMode('dashboard');
    }
  };

  if (mode === 'session') {
    const q = currentQuestions[currentIndex];
    return (
      <main className="min-h-screen p-6 bg-white text-black font-sans max-w-2xl mx-auto border-x border-black">
        <header className="mb-12 border-b-4 border-black pb-4 flex justify-between items-end">
          <div>
            <h2 className="text-xs font-black tracking-widest">{q.subject}</h2>
            <h3 className="text-2xl">QUESTION {currentIndex + 1}/10</h3>
          </div>
          <button onClick={() => setMode('dashboard')} className="text-xs font-bold underline">EXIT</button>
        </header>

        <section className="mb-12">
          <p className="text-2xl font-bold leading-tight mb-10">{q.question_text}</p>

          <div className="grid grid-cols-1 gap-4">
            {['A', 'B', 'C', 'D'].map((label) => {
              const key = `option_${label.toLowerCase()}` as keyof Question;
              const text = q[key] as string;
              if (!text) return null;
              return (
                <button
                  key={label}
                  disabled={!!feedback}
                  onClick={() => handleAnswer(label)}
                  className={`w-full text-left p-6 border-2 transition-all font-bold ${feedback
                    ? (label === q.correct_answer ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-400')
                    : 'border-black hover:bg-black hover:text-white'
                    }`}
                >
                  <span className="mr-4">{label}.</span>
                  {text}
                </button>
              );
            })}
          </div>
        </section>

        {feedback && (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t-4 border-black">
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-xl font-black">{feedback.message}</p>
              <button
                onClick={nextQuestion}
                className="minimal-button w-full sm:w-auto"
              >
                CONTINUE →
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto bg-white text-black">
      <header className="mb-16 border-b-8 border-black pb-6">
        <h1 className="text-6xl font-black leading-none">VIVA<br />LDA</h1>
        <div className="mt-4 flex justify-between items-baseline">
          <p className="text-sm font-bold tracking-widest">VERSION 3.0 / ACADEMIC</p>
          <p className="text-sm font-bold underline">ML POWERED</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-8 mb-16">
        <div className="stat-box">
          <p className="text-xs font-black mb-1">MASTERY</p>
          <p className="text-5xl font-black">{stats.mastery}%</p>
        </div>
        <div className="stat-box">
          <p className="text-xs font-black mb-1">ACCURACY</p>
          <p className="text-5xl font-black">{stats.totalAttempted ? Math.floor((stats.correctCount / stats.totalAttempted) * 100) : 0}%</p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-xl font-black mb-6 border-b-2 border-black pb-2">CURRICULUM</h2>
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => startSession(null)}
            className="minimal-button text-left flex justify-between items-center hover:invert"
          >
            ALL SUBJECTS <span>(INTELLIGENT RECALL)</span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => startSession(sub)}
                className="p-4 border border-black font-bold text-sm hover:bg-black hover:text-white transition-all text-left uppercase truncate"
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="text-[10px] font-bold text-gray-400 border-t border-gray-100 pt-8 uppercase tracking-widest">
        Design: Minimalist Academic / ML Engine: SGD-Recall
      </footer>
    </main>
  );
}
