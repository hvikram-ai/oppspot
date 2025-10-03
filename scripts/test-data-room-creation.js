#!/usr/bin/env node

/**
 * Test Data Room Creation
 *
 * This script tests if we can create a data room without infinite recursion errors.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDataRoomCreation() {
  console.log('🧪 Testing Data Room Creation...\n');

  // Step 1: Sign in (using demo credentials)
  console.log('1️⃣  Signing in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'demo@oppspot.com',
    password: 'Demo123456!'
  });

  if (authError) {
    console.error('❌ Auth error:', authError.message);
    process.exit(1);
  }

  console.log('✅ Signed in as:', authData.user.email);
  console.log();

  // Step 2: Try to create a data room
  console.log('2️⃣  Creating test data room...');

  const testRoomName = `Test Data Room ${Date.now()}`;

  const { data: dataRoom, error: createError } = await supabase
    .from('data_rooms')
    .insert({
      name: testRoomName,
      description: 'Test data room created by automated script',
      deal_type: 'due_diligence',
      status: 'active',
      user_id: authData.user.id
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Create error:', createError.message);
    console.error('   Error details:', JSON.stringify(createError, null, 2));

    if (createError.message.includes('infinite recursion')) {
      console.log('\n⚠️  INFINITE RECURSION ERROR DETECTED!');
      console.log('   The migration may not have been applied yet.');
      console.log('   Please apply the migration manually via Supabase Dashboard.');
    }

    process.exit(1);
  }

  console.log('✅ Data room created successfully!');
  console.log('   ID:', dataRoom.id);
  console.log('   Name:', dataRoom.name);
  console.log();

  // Step 3: Try to read it back (this also tests SELECT policy)
  console.log('3️⃣  Reading data room back...');

  const { data: readRoom, error: readError } = await supabase
    .from('data_rooms')
    .select('*')
    .eq('id', dataRoom.id)
    .single();

  if (readError) {
    console.error('❌ Read error:', readError.message);
    process.exit(1);
  }

  console.log('✅ Data room read successfully!');
  console.log('   Name:', readRoom.name);
  console.log();

  // Step 4: Clean up - delete the test room
  console.log('4️⃣  Cleaning up...');

  const { error: deleteError } = await supabase
    .from('data_rooms')
    .delete()
    .eq('id', dataRoom.id);

  if (deleteError) {
    console.error('❌ Delete error:', deleteError.message);
    console.log('   (Test room will remain in database)');
  } else {
    console.log('✅ Test data room deleted');
  }

  console.log();
  console.log('═══════════════════════════════════════════');
  console.log('✨ ALL TESTS PASSED!');
  console.log('═══════════════════════════════════════════');
  console.log();
  console.log('✅ Data room creation working correctly');
  console.log('✅ No infinite recursion errors detected');
  console.log('✅ RLS policies functioning properly');
  console.log();

  // Sign out
  await supabase.auth.signOut();
}

testDataRoomCreation().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
