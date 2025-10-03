#!/usr/bin/env node

/**
 * Apply Data Room RLS Fix Migration
 *
 * This script applies the migration to fix infinite recursion in data room policies.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🔧 Applying Data Room RLS Fix Migration...\n');

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20251003010513_fix_data_room_rls_recursion.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split SQL into individual statements (simple split by semicolon)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  let success = 0;
  let failed = 0;

  for (const statement of statements) {
    if (!statement || statement.startsWith('COMMENT')) {
      // Skip comments and empty statements
      continue;
    }

    try {
      console.log(`Executing: ${statement.substring(0, 60)}...`);

      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });

      if (error) {
        // Try alternative method using raw query
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ sql_query: statement + ';' })
        });

        if (!response.ok) {
          throw new Error(`Failed: ${await response.text()}`);
        }
      }

      console.log('✅ Success\n');
      success++;
    } catch (err) {
      console.error(`❌ Error: ${err.message}\n`);
      failed++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Successful: ${success}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📝 Total: ${success + failed}`);

  if (failed === 0) {
    console.log('\n✨ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test creating a data room');
    console.log('   2. Verify no infinite recursion errors');
  } else {
    console.log('\n⚠️  Some statements failed. Manual intervention may be required.');
    console.log('   You can run the SQL directly in Supabase Dashboard > SQL Editor');
  }
}

applyMigration().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
