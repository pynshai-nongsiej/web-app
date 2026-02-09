import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Create the client. It will use placeholders during the build, 
// but MUST have real values in Netlify for the live app to work.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
