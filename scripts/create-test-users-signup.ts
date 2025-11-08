/**
 * Create test users via signup endpoint
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const testUsers = [
  { email: 'test@oppspot.com', password: 'Test123456!', role: 'owner' },
  { email: 'viewer@oppspot.com', password: 'Test123456!', role: 'viewer' },
  { email: 'admin@oppspot.com', password: 'Admin123456!', role: 'admin' },
];

async function createUser(email: string, password: string, role: string) {
  // Create a new client instance for each user
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log(`Creating ${role}: ${email}...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        role,
      },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log(`  ℹ️  User already exists`);
      return true;
    }
    console.error(`  ❌ Error:`, error.message);
    return false;
  }

  if (data.user) {
    console.log(`  ✅ Created successfully (${data.user.id})`);
    if (data.user.identities && data.user.identities.length === 0) {
      console.log(`  ⚠️  Email confirmation may be required`);
    }
    return true;
  }

  return false;
}

async function main() {
  console.log('🔧 Creating test users via signup...\n');

  for (const user of testUsers) {
    await createUser(user.email, user.password, user.role);
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('\n✅ Test user creation complete!\n');
  console.log('Test credentials:');
  testUsers.forEach((u) => {
    console.log(`  ${u.role.padEnd(10)} - ${u.email} / ${u.password}`);
  });
  console.log('\n⚠️  Note: Email confirmation may be required depending on Supabase settings.');
  console.log('Check Supabase Dashboard > Authentication > Users to confirm email addresses.');
}

main().catch(console.error);
