'use client';

import { useState, useEffect, useMemo } from 'react';
import questionsData from '@/data/questions.json';
import { Question, UserStats } from '@/types/quiz';
import { MemoryEngine } from '@/lib/srs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Auth from '@/components/Auth';

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
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

  // Load Data from Supabase
  useEffect(() => {
    if (!user) return;

    async function loadUserData() {
      // 1. Fetch Profile Stats
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (profile) {
        setStats({
          totalAttempted: profile.total_attempted,
          correctCount: profile.correct_count,
          mastery: profile.mastery_score,
          subjectProgress: {},
        });
      }

      // 2. Fetch Question Overrides
      const { data: qData } = await supabase
        .from('user_questions')
        .select('*')
        .eq('user_id', user!.id);

      if (qData) {
        const ov: Record<number, Partial<Question>> = {};
        qData.forEach((row: any) => {
          ov[row.question_id] = {
            review_count: row.review_count,
            last_reviewed_at: row.last_reviewed_at,
          };
        });
        setOverrides(ov);
      }
    }

    loadUserData();
  }, [user]);

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

    // Shuffle FIRST to break ties
    const shuffledScored = [...scored].sort(() => 0.5 - Math.random());
    const sorted = shuffledScored.sort((a, b) => a.predicted_recall - b.predicted_recall);
    const sessionBatch = sorted.slice(0, 10);

    setCurrentQuestions(sessionBatch as Question[]);
    setSelectedSubject(subject);
    setCurrentIndex(0);
    setMode('session');
  };

  const handleAnswer = async (choice: string) => {
    const q = currentQuestions[currentIndex];
    const isCorrect = choice.toUpperCase() === q.correct_answer.toUpperCase();
    const { reviewCount, lastReviewedAt } = getQuestionStats(q);

    // 1. Train ML Model (Local Optimistic)
    const newWeights = memory.train(reviewCount, lastReviewedAt, isCorrect ? 1.0 : 0.0);
    setWeights(newWeights);

    // 2. Update Cloud (Supabase)
    const newReviewCount = reviewCount + 1;
    const newLastReviewed = new Date().toISOString();

    await supabase.from('user_questions').upsert({
      user_id: user!.id,
      question_id: q.id,
      review_count: newReviewCount,
      last_reviewed_at: newLastReviewed,
    });

    // Update individual question stats (Local Optimistic)
    setOverrides({
      ...overrides,
      [q.id]: { review_count: newReviewCount, last_reviewed_at: newLastReviewed }
    });

    // 3. Update Stats (Cloud & Local)
    const newCorrectCount = stats.correctCount + (isCorrect ? 1 : 0);
    const newTotalAttempted = stats.totalAttempted + 1;
    const newMastery = Math.min(100, Math.floor((newCorrectCount / (newTotalAttempted || 1)) * 100));

    await supabase.from('profiles').update({
      correct_count: newCorrectCount,
      total_attempted: newTotalAttempted,
      mastery_score: newMastery,
    }).eq('id', user!.id);

    setStats({
      ...stats,
      totalAttempted: newTotalAttempted,
      correctCount: newCorrectCount,
      mastery: newMastery
    });

    setFeedback({
      isCorrect,
      message: isCorrect ? 'CORRECT' : `INCORRECT. ANSWER: ${q.correct_answer}`,
    });
  };

  const nextQuestion = () => {
    setFeedback(null);
    if (currentIndex < currentQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setMode('dashboard');
    }
  };

  if (authLoading) return <div className="min-h-screen bg-white flex items-center justify-center font-black">LOADING...</div>;
  if (!user) return <Auth />;

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
    <main className="min-h-screen p-8 max-w-2xl mx-auto bg-white text-black relative">
      <button
        onClick={() => signOut()}
        className="absolute top-8 right-8 text-[10px] font-black underline uppercase"
      >
        Logout
      </button>

      <header className="mb-16 border-b-8 border-black pb-6">
        <h1 className="text-6xl font-black leading-none">VIVA<br />LDA</h1>
        <div className="mt-4 flex justify-between items-baseline">
          <p className="text-sm font-bold tracking-widest">VERSION 3.0 / CLOUD</p>
          <p className="text-sm font-bold truncate max-w-[150px]">{user.email}</p>
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
            ALL SUBJECTS <span>(CLOUD RECALL)</span>
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

      <footer className="text-[10px] font-bold text-gray-400 border-t border-gray-100 pt-8 uppercase tracking-widest flex justify-between">
        <span>Cloud Sync: Active</span>
        <span>User ID: {user.id.slice(0, 8)}</span>
      </footer>
    </main>
  );
}
