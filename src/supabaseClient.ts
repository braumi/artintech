import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Log all VITE_ env vars to see what's loaded
console.log('🔍 Environment variables check:');
console.log('All VITE_ vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Found' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Supabase env vars are missing!'
  );
  console.error('VITE_SUPABASE_URL:', supabaseUrl || 'MISSING');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'MISSING');
  console.error('Make sure:');
  console.error('1. The .env file exists in the project root');
  console.error('2. The variables start with VITE_');
  console.error('3. You restarted the dev server after adding them');
} else {
  console.log('✅ Supabase client initialized');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Anon key preview:', supabaseAnonKey.substring(0, 20) + '...');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');


