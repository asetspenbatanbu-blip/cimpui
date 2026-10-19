import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://ywofqmwvjhunggaedmtr.supabase.co';
// @ts-ignore
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_iJQmjAnIYvOiTWP39nx76A_IktGqwfL';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
