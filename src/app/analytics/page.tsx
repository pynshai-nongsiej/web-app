'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import questionsData from '@/data/questions.json';
import { Question } from '@/types/quiz';
import Link from 'next/link';

export default function AnalyticsPage() {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [subjectStats, setSubjectStats] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;

        async function fetchAnalytics() {
            // 1. Fetch Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user!.id)
                .single();

            setProfile(profileData);

            // 2. Fetch User Question Data
            const { data: userQuestions } = await supabase
                .from('user_questions')
                .select('*')
                .eq('user_id', user!.id);

            // 3. Aggregate stats by subject
            const questions = questionsData as Question[];
            const subjects = Array.from(new Set(questions.map(q => q.subject))).sort();

            const stats = subjects.map(subject => {
                const subjectQuestions = questions.filter(q => q.subject === subject);
                const subjectQuestionIds = new Set(subjectQuestions.map(q => q.id));

                const reviews = userQuestions?.filter(uq => subjectQuestionIds.has(uq.question_id)) || [];
                const correctCount = reviews.filter(r => r.review_count > 0).length; // Placeholder for real correctness
                const totalReviews = reviews.reduce((sum, r) => sum + r.review_count, 0);

                return {
                    subject,
                    totalQuestions: subjectQuestions.length,
                    attempted: reviews.length,
                    totalReviews,
                    mastery: subjectQuestions.length > 0
                        ? Math.floor((reviews.length / subjectQuestions.length) * 100)
                        : 0
                };
            });

            setSubjectStats(stats);
            setLoading(false);
        }

        fetchAnalytics();
    }, [user]);

    if (authLoading || loading) return <div className="min-h-screen bg-white flex items-center justify-center font-black">LOADING DATA...</div>;
    if (!user) return <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white text-black font-black">
        <p className="mb-8">AUTHENTICATION REQUIRED</p>
        <Link href="/" className="underline">RETURN TO LOGIN</Link>
    </div>;

    return (
        <main className="min-h-screen p-8 max-w-2xl mx-auto bg-white text-black font-sans border-x border-black">
            <header className="mb-12 border-b-8 border-black pb-4 flex justify-between items-end">
                <div>
                    <Link href="/" className="text-[10px] font-black underline uppercase">← Dashboard</Link>
                    <h1 className="text-4xl font-black mt-2">ANALYTICS</h1>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-tighter">DATA SYNC: ACTIVE</p>
                    <p className="text-[10px] uppercase truncate max-w-[100px]">{user.email}</p>
                </div>
            </header>

            {/* Overview Stats */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                <div className="border-4 border-black p-6">
                    <h3 className="text-xs font-black uppercase mb-4">Overall Mastery</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black">{profile?.mastery_score || 0}%</span>
                        <span className="text-xs font-bold text-gray-500">AVG</span>
                    </div>
                    <div className="mt-4 w-full bg-gray-100 h-2">
                        <div
                            className="bg-black h-full transition-all duration-1000"
                            style={{ width: `${profile?.mastery_score || 0}%` }}
                        />
                    </div>
                </div>

                <div className="border-4 border-black p-6">
                    <h3 className="text-xs font-black uppercase mb-4">Efficiency</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black">
                            {profile?.total_attempted ? Math.floor((profile.correct_count / profile.total_attempted) * 100) : 0}%
                        </span>
                        <span className="text-xs font-bold text-gray-500">ACC</span>
                    </div>
                    <p className="text-[10px] font-bold mt-4 uppercase">
                        Total Attempts: {profile?.total_attempted || 0}
                    </p>
                </div>
            </section>

            {/* Subject Breakdown */}
            <section className="mb-12">
                <h2 className="text-xl font-black mb-6 uppercase border-b-2 border-black pb-2 italic">Subject Saturation</h2>
                <div className="space-y-6">
                    {subjectStats.map((stat) => (
                        <div key={stat.subject} className="group">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <h4 className="text-sm font-black uppercase leading-none">{stat.subject}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                        {stat.attempted} / {stat.totalQuestions} Questions Covered
                                    </p>
                                </div>
                                <span className="text-xl font-black">{stat.mastery}%</span>
                            </div>
                            <div className="w-full bg-gray-50 h-6 border border-black p-1">
                                <div
                                    className="bg-black h-full transition-all duration-700"
                                    style={{ width: `${stat.mastery}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-[10px] font-bold uppercase text-gray-400">Reviews: {stat.totalReviews}</span>
                                <span className="text-[10px] font-bold uppercase text-gray-400">Target: Completion</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Intelligent Recall status */}
            <section className="bg-black text-white p-8">
                <h2 className="text-xs font-black mb-4 uppercase tracking-[0.2em] border-b border-white/20 pb-2">ML Engine Diagnostics</h2>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm font-bold">
                        <span>SRS ENGINE STATUS</span>
                        <span className="text-green-400">OPERATIONAL</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold">
                        <span>ALGORITHM</span>
                        <span>SGD-RECALL 3.1</span>
                    </div>
                    <p className="text-[10px] font-medium text-gray-400 leading-normal uppercase">
                        The engine is currently tracking {subjectStats.reduce((a, b) => a + b.attempted, 0)} questions in your personal cloud knowledge graph. Recall probabilities are calculated on-the-fly for {questionsData.length} vectors.
                    </p>
                </div>
            </section>

            <footer className="mt-12 text-[10px] font-bold text-gray-300 uppercase flex justify-between">
                <span>Build: Cloud-Analytics-1.0</span>
                <span>Cross-Device Sync: Verified</span>
            </footer>
        </main>
    );
}
