/**
 * Check if test users exist
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkUsers() {
  console.log('Checking for test users...\n');

  const testEmails = ['test@oppspot.com', 'viewer@oppspot.com', 'admin@oppspot.com'];

  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`Total users in database: ${data.users.length}\n`);

    for (const email of testEmails) {
      const user = data.users.find((u) => u.email === email);
      if (user) {
        console.log(`✅ ${email} exists`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      } else {
        console.log(`❌ ${email} NOT FOUND`);
      }
      console.log('');
    }
  } catch (error: any) {
    console.error('Fatal error:', error.message);
  }
}

checkUsers();
