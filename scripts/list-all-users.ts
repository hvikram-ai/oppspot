/**
 * List all existing users
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

async function listUsers() {
  console.log('Fetching all users...\n');

  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`Total users: ${data.users.length}\n`);

    data.users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`  Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`  Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
      console.log('');
    });

    console.log('\n💡 Suggestion: We can use one of these existing users for testing.');
    console.log('Would you like to update the test fixtures to use an existing user?');
  } catch (error: any) {
    console.error('Fatal error:', error.message);
  }
}

listUsers();
