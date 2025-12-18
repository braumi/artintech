// Test script to verify Supabase connection
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file manually
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase connection...\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables not found!');
  console.log('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are in your .env file');
  process.exit(1);
}

console.log('✅ Environment variables found:');
console.log('URL:', supabaseUrl);
console.log('Anon Key preview:', supabaseAnonKey.substring(0, 20) + '...\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
  try {
    // Test 1: Check if we can reach Supabase auth
    console.log('Test 1: Testing authentication service...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('⚠️  Session check error:', sessionError.message);
    } else {
      console.log('✅ Auth service is accessible');
      if (sessionData.session) {
        console.log('   Current session exists');
      } else {
        console.log('   No active session (expected if not signed in)');
      }
    }

    // Test 2: Try to get user (this will work even without a session)
    console.log('\nTest 2: Testing getUser()...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError && userError.message.includes('JWT')) {
      console.log('✅ getUser() works (no user signed in, which is expected)');
    } else if (userError) {
      console.log('⚠️  getUser() error:', userError.message);
    } else {
      console.log('✅ getUser() successful');
      if (userData.user) {
        console.log('   User ID:', userData.user.id);
      }
    }

    // Test 3: Try a simple query (if profiles table exists)
    console.log('\nTest 3: Testing database query...');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log('⚠️  Query test:', error.message);
        if (error.code === 'PGRST116') {
          console.log('   (This is OK - profiles table might not exist yet)');
        }
      } else {
        console.log('✅ Database query successful');
      }
    } catch (err) {
      console.log('⚠️  Query error:', err.message);
    }

    console.log('\n✅ Supabase connection test completed!');
    console.log('\nIf authentication is not working, check:');
    console.log('1. Your Supabase project is active at:', supabaseUrl);
    console.log('2. The API key is correct');
    console.log('3. Google OAuth is enabled in Supabase Dashboard → Authentication → Providers');
    console.log('4. Redirect URLs are configured in Supabase Dashboard → Authentication → URL Configuration');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.message.includes('fetch')) {
      console.error('   This might be a network issue or incorrect URL');
    }
    process.exit(1);
  }
}

testSupabase();
