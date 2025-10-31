/**
 * Check if collections tables exist in the database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking collections tables...\n');

  try {
    // Check collections table
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .limit(1);

    if (collectionsError) {
      console.log('❌ collections table: NOT FOUND');
      console.log('   Error:', collectionsError.message);
    } else {
      console.log('✅ collections table: EXISTS');
      console.log('   Sample data:', collections?.length || 0, 'rows');
    }

    // Check collection_items table
    const { data: items, error: itemsError } = await supabase
      .from('collection_items')
      .select('*')
      .limit(1);

    if (itemsError) {
      console.log('❌ collection_items table: NOT FOUND');
      console.log('   Error:', itemsError.message);
    } else {
      console.log('✅ collection_items table: EXISTS');
      console.log('   Sample data:', items?.length || 0, 'rows');
    }

    // Check collection_access table
    const { data: access, error: accessError } = await supabase
      .from('collection_access')
      .select('*')
      .limit(1);

    if (accessError) {
      console.log('❌ collection_access table: NOT FOUND');
      console.log('   Error:', accessError.message);
    } else {
      console.log('✅ collection_access table: EXISTS');
      console.log('   Sample data:', access?.length || 0, 'rows');
    }

    // Check if active_collection_id column exists in profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, active_collection_id')
      .limit(1);

    if (profilesError) {
      console.log('❌ profiles.active_collection_id column: NOT FOUND');
      console.log('   Error:', profilesError.message);
    } else {
      console.log('✅ profiles.active_collection_id column: EXISTS');
    }

    console.log('\n--- Summary ---');
    const allGood = !collectionsError && !itemsError && !accessError && !profilesError;
    if (allGood) {
      console.log('✅ All collections tables are set up correctly!');
      console.log('   You can now use the collections feature.');
    } else {
      console.log('❌ Some tables are missing. Please run the migrations:');
      console.log('   1. Go to Supabase Dashboard → SQL Editor');
      console.log('   2. Run: supabase/migrations/20251027000001_create_collections_tables.sql');
      console.log('   3. Run: supabase/migrations/20251027000002_collections_rls_policies.sql');
    }

  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkTables();
