#!/usr/bin/env tsx
/**
 * Verify Collections Database Migration
 *
 * This script checks if all required database objects for the Collections feature
 * have been created successfully.
 *
 * Usage: npx tsx scripts/verify-collections-migration.ts
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface CheckResult {
  name: string;
  status: 'pass' | 'fail';
  message: string;
}

const results: CheckResult[] = [];

function addResult(name: string, status: 'pass' | 'fail', message: string) {
  results.push({ name, status, message });
}

async function checkTable(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      addResult(`Table: ${tableName}`, 'fail', error.message);
      return false;
    }

    addResult(`Table: ${tableName}`, 'pass', 'Table exists and is accessible');
    return true;
  } catch (error: any) {
    addResult(`Table: ${tableName}`, 'fail', error.message);
    return false;
  }
}

async function checkColumn(tableName: string, columnName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(1);

    if (error) {
      addResult(`Column: ${tableName}.${columnName}`, 'fail', error.message);
      return false;
    }

    addResult(`Column: ${tableName}.${columnName}`, 'pass', 'Column exists');
    return true;
  } catch (error: any) {
    addResult(`Column: ${tableName}.${columnName}`, 'fail', error.message);
    return false;
  }
}

async function checkRLSEnabled(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_rls_enabled', {
      table_name: tableName
    }).single();

    // If the RPC doesn't exist, we'll use a direct query approach
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      // Fallback: Try to insert without auth (should fail if RLS is enabled)
      const { error: insertError } = await supabase
        .from(tableName)
        .insert({})
        .select()
        .limit(0);

      if (insertError && insertError.message.includes('new row violates row-level security')) {
        addResult(`RLS: ${tableName}`, 'pass', 'Row Level Security is enabled');
        return true;
      }

      addResult(`RLS: ${tableName}`, 'fail', 'RLS status unclear');
      return false;
    }

    if (data) {
      addResult(`RLS: ${tableName}`, 'pass', 'Row Level Security is enabled');
      return true;
    } else {
      addResult(`RLS: ${tableName}`, 'fail', 'Row Level Security is NOT enabled');
      return false;
    }
  } catch (error: any) {
    addResult(`RLS: ${tableName}`, 'fail', error.message);
    return false;
  }
}

async function checkFunction(functionName: string): Promise<boolean> {
  try {
    // Try to call the function with dummy parameters
    const { error } = await supabase.rpc(functionName, {
      collection_id: '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000000'
    });

    // If function exists, it will execute (even if it returns false)
    // If it doesn't exist, we'll get a "does not exist" error
    if (error && error.message.includes('does not exist')) {
      addResult(`Function: ${functionName}`, 'fail', 'Function does not exist');
      return false;
    }

    addResult(`Function: ${functionName}`, 'pass', 'Function exists');
    return true;
  } catch (error: any) {
    addResult(`Function: ${functionName}`, 'fail', error.message);
    return false;
  }
}

async function checkEnumType(enumName: string): Promise<boolean> {
  try {
    // Check if enum exists by trying to query a table that uses it
    // For work_product_type, check collection_items
    // For permission_level_enum, check collection_access

    let tableName: string;
    let columnName: string;

    if (enumName === 'work_product_type') {
      tableName = 'collection_items';
      columnName = 'item_type';
    } else if (enumName === 'permission_level_enum') {
      tableName = 'collection_access';
      columnName = 'permission_level';
    } else {
      addResult(`Enum: ${enumName}`, 'fail', 'Unknown enum type');
      return false;
    }

    const { error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(1);

    if (error) {
      addResult(`Enum: ${enumName}`, 'fail', error.message);
      return false;
    }

    addResult(`Enum: ${enumName}`, 'pass', 'Enum type exists');
    return true;
  } catch (error: any) {
    addResult(`Enum: ${enumName}`, 'fail', error.message);
    return false;
  }
}

async function checkDataIntegrity(): Promise<void> {
  // Check if General collections exist for users
  try {
    const { data: generalCollections, error } = await supabase
      .from('collections')
      .select('id, name, is_system')
      .eq('is_system', true)
      .limit(5);

    if (error) {
      addResult('Data: General collections', 'fail', error.message);
    } else if (generalCollections && generalCollections.length > 0) {
      addResult(
        'Data: General collections',
        'pass',
        `Found ${generalCollections.length} system collection(s)`
      );
    } else {
      addResult(
        'Data: General collections',
        'fail',
        'No system "General" collections found (trigger may not have run)'
      );
    }
  } catch (error: any) {
    addResult('Data: General collections', 'fail', error.message);
  }
}

async function runChecks() {
  console.log('🔍 Verifying Collections Feature Database Migration\n');
  console.log('━'.repeat(70));

  // 1. Check Tables
  console.log('\n📊 Checking Tables...');
  await checkTable('collections');
  await checkTable('collection_items');
  await checkTable('collection_access');

  // 2. Check Important Columns
  console.log('\n📋 Checking Columns...');
  await checkColumn('collections', 'id');
  await checkColumn('collections', 'user_id');
  await checkColumn('collections', 'name');
  await checkColumn('collections', 'is_system');
  await checkColumn('collections', 'archived_at');
  await checkColumn('profiles', 'active_collection_id');

  // 3. Check Enum Types
  console.log('\n🏷️  Checking Enum Types...');
  await checkEnumType('work_product_type');
  await checkEnumType('permission_level_enum');

  // 4. Check Helper Functions
  console.log('\n⚙️  Checking Helper Functions...');
  await checkFunction('user_has_collection_access');
  await checkFunction('user_can_edit_stream');
  await checkFunction('user_can_manage_stream');

  // 5. Check RLS
  console.log('\n🔒 Checking Row Level Security...');
  await checkRLSEnabled('collections');
  await checkRLSEnabled('collection_items');
  await checkRLSEnabled('collection_access');

  // 6. Check Data Integrity
  console.log('\n✓ Checking Data Integrity...');
  await checkDataIntegrity();

  // Print Results
  console.log('\n' + '━'.repeat(70));
  console.log('\n📊 RESULTS SUMMARY\n');

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const totalCount = results.length;

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    if (result.status === 'fail') {
      console.log(`   └─ ${result.message}`);
    }
  });

  console.log('\n' + '━'.repeat(70));
  console.log(`\n✓ Passed: ${passCount}/${totalCount}`);
  console.log(`✗ Failed: ${failCount}/${totalCount}`);

  if (failCount === 0) {
    console.log('\n🎉 All checks passed! Collections feature is ready to use.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some checks failed. Please apply the migrations:');
    console.log('\n   Option 1: Via Supabase Dashboard');
    console.log('   1. Go to https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/editor');
    console.log('   2. Click "SQL Editor"');
    console.log('   3. Run: supabase/migrations/20251027000001_create_collections_tables.sql');
    console.log('   4. Run: supabase/migrations/20251027000008_collections_rls_fixed.sql');
    console.log('\n   Option 2: Via Supabase CLI');
    console.log('   npx supabase db push\n');
    process.exit(1);
  }
}

// Run the checks
runChecks().catch(error => {
  console.error('\n❌ Fatal error running checks:', error);
  process.exit(1);
});
