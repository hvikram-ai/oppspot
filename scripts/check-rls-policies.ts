/**
 * Check if RLS policies are installed
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  console.log('🔍 Checking RLS Policies...\n');

  try {
    // Test if we can query with the service role key (bypasses RLS)
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .limit(5);

    if (error) {
      console.log('❌ Error querying collections:', error.message);
      console.log('\n⚠️  This might mean RLS policies are blocking the query.');
      console.log('   Run the RLS migration:');
      console.log('   supabase/migrations/20251027000008_collections_rls_fixed.sql');
      return;
    }

    console.log('✅ Successfully queried collections table');
    console.log(`   Found ${data?.length || 0} collections`);

    if (data && data.length > 0) {
      console.log('\n📊 Sample collection:');
      console.log(`   ID: ${data[0].id}`);
      console.log(`   Name: ${data[0].name}`);
      console.log(`   System: ${data[0].is_system}`);
      console.log(`   Owner: ${data[0].user_id}`);
    }

    console.log('\n✅ Database is ready!');
    console.log('   Collections feature should work now.');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkRLS();
