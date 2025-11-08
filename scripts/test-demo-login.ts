/**
 * Test if we can login with demo user
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  const testCredentials = [
    { email: 'demo@oppspot.com', password: 'Demo123456!' },
    { email: 'demo@oppspot.com', password: 'demo123456!' },
    { email: 'demo@oppspot.com', password: 'Demo123456' },
  ];

  console.log('Testing demo user login...\n');

  for (const creds of testCredentials) {
    console.log(`Trying: ${creds.email} / ${creds.password}`);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: creds.email,
      password: creds.password,
    });

    if (error) {
      console.log(`  ❌ ${error.message}\n`);
    } else if (data.user) {
      console.log(`  ✅ SUCCESS!`);
      console.log(`  User ID: ${data.user.id}`);
      console.log(`  Email: ${data.user.email}\n`);

      // Sign out
      await supabase.auth.signOut();

      console.log('✅ Demo user credentials work!\n');
      console.log('We can use this for E2E tests.');
      return true;
    }
  }

  console.log('❌ Could not find working credentials for demo user.');
  return false;
}

testLogin();
