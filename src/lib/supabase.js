import { createClient } from '@supabase/supabase-js';
import { validateSupabaseClientConfig } from './supabaseEnv';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

const validation = validateSupabaseClientConfig({
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  appEnv: import.meta.env.VITE_APP_ENV || '',
  supabaseUrl: url,
  publishableKey,
});

export const supabaseConfigError = validation.error;
export const hasSupabase = validation.ok;

if (!validation.ok && import.meta.env.MODE !== 'test') {
  console.error('[Supabase Config Error]', validation.error);
}

export const supabase = hasSupabase
  ? createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
