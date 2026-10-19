import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://sbwmatblhpsvhwfieguu.supabase.co';
// @ts-ignore
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1hpMBW7y0DMkQbaRx4I44A_LcHQ04R0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
