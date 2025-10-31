/**
 * Check detailed migration status
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
  console.log('🔍 Checking Collections Migration Status...\n');

  const checks = {
    enums: {
      work_product_type: false,
      permission_level_enum: false,
    },
    tables: {
      collections: false,
      collection_items: false,
      collection_access: false,
    },
    columns: {
      'profiles.active_collection_id': false,
    },
  };

  try {
    // Check ENUM types by trying to use them
    const { error: wpError } = await supabase.rpc('check_type_exists', {
      type_name: 'work_product_type'
    }).single().catch(() => ({ error: null }));

    // Simpler check - try to query tables
    const { error: collectionsError } = await supabase
      .from('collections')
      .select('id')
      .limit(0);
    checks.tables.collections = !collectionsError;

    const { error: itemsError } = await supabase
      .from('collection_items')
      .select('id')
      .limit(0);
    checks.tables.collection_items = !itemsError;

    const { error: accessError } = await supabase
      .from('collection_access')
      .select('id')
      .limit(0);
    checks.tables.collection_access = !accessError;

    const { error: profilesError } = await supabase
      .from('profiles')
      .select('active_collection_id')
      .limit(0);
    checks.columns['profiles.active_collection_id'] = !profilesError;

    // Display results
    console.log('📊 Migration Status:\n');

    console.log('Tables:');
    console.log(checks.tables.collections ? '  ✅ collections' : '  ❌ collections');
    console.log(checks.tables.collection_items ? '  ✅ collection_items' : '  ❌ collection_items');
    console.log(checks.tables.collection_access ? '  ✅ collection_access' : '  ❌ collection_access');

    console.log('\nColumns:');
    console.log(checks.columns['profiles.active_collection_id'] ? '  ✅ profiles.active_collection_id' : '  ❌ profiles.active_collection_id');

    const allDone =
      checks.tables.collections &&
      checks.tables.collection_items &&
      checks.tables.collection_access &&
      checks.columns['profiles.active_collection_id'];

    console.log('\n' + '='.repeat(50));
    if (allDone) {
      console.log('✅ ALL MIGRATIONS APPLIED SUCCESSFULLY!');
      console.log('   Collections feature is ready to use.');
    } else {
      console.log('⚠️  PARTIAL MIGRATION DETECTED');
      console.log('   Some components are missing.');
      console.log('\n📝 Next steps:');
      console.log('   Run the safe migration script I\'ll create for you.');
    }

  } catch (error) {
    console.error('Error checking status:', error);
  }
}

checkStatus();
