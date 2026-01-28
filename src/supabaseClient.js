import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  'https://gxdtetxpvxenpgtulvfg.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'sb_publishable_G4BwFWSFDXC7gbvkm3lFEA_KpPKPE9Z';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
