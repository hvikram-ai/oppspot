/**
 * Check if profiles table exists and has proper structure
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  console.log('Checking profiles table...\n');

  try {
    // Try to query profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(0);

    if (error) {
      console.log('❌ Profiles table error:', error.message);
      console.log('\n⚠️  The profiles table may be missing or have RLS issues.');
      console.log('This is likely causing user creation to fail.\n');
      return false;
    }

    console.log('✅ Profiles table exists and is accessible');

    // Check if we can insert
    const testProfile = {
      id: '00000000-0000-0000-0000-000000000000', // Will fail but tests permission
      email: 'test@test.com',
    };

    const { error: insertError } = await supabase
      .from('profiles')
      .insert(testProfile);

    if (insertError) {
      console.log('⚠️  Cannot insert to profiles table:', insertError.message);
      console.log('This may be expected if RLS is enabled.\n');
    } else {
      console.log('✅ Can insert to profiles table');
      // Clean up
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testProfile.id);
    }

    return true;
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    return false;
  }
}

checkProfiles();
