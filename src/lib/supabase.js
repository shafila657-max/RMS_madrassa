import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder_key',
  {
    auth: {
      // Persist session tokens in localStorage so they survive PWA/browser restarts.
      persistSession: true,
      // Automatically refresh the access token using the refresh token (60-day window).
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Explicitly use localStorage (not sessionStorage which clears on tab close).
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'rms-madrasa-auth',
    },
  }
);
