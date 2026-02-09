import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

if (typeof window !== 'undefined') {
    if (supabaseUrl.includes('placeholder') || supabaseAnonKey === 'placeholder') {
        console.error('⚠️ SUPABASE CONFIG ERROR: Using placeholder keys. Make sure to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.');
    } else {
        console.log('✅ Supabase initialized with URL:', supabaseUrl.slice(0, 20) + '...');
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
