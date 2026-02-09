'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMessage('Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (error: any) {
            console.error('Connection Error:', error);
            setMessage(error.message || 'Connection failed. Check your internet or Supabase URL.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center px-8 bg-white text-black">
            <header className="mb-12 border-b-8 border-black pb-4">
                <h1 className="text-5xl font-black">{isSignUp ? 'JOIN' : 'LOGIN'}</h1>
            </header>

            <form onSubmit={handleAuth} className="space-y-6">
                <div>
                    <label className="text-xs font-black block mb-2 uppercase">Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border-2 border-black p-4 font-bold focus:bg-black focus:text-white outline-none transition-all"
                        required
                    />
                </div>

                <div>
                    <label className="text-xs font-black block mb-2 uppercase">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border-2 border-black p-4 font-bold focus:bg-black focus:text-white outline-none transition-all"
                        required
                    />
                </div>

                {message && <p className="text-xs font-black uppercase text-red-600">{message}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white p-6 font-black text-xl hover:bg-white hover:text-black border-2 border-black transition-all disabled:opacity-50"
                >
                    {loading ? 'WAITING...' : (isSignUp ? 'CREATE ACCOUNT' : 'LOG IN →')}
                </button>
            </form>

            <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="mt-8 text-xs font-black underline uppercase text-center w-full"
            >
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign up"}
            </button>
        </div>
    );
}
