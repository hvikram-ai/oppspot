/**
 * Apply ESG Migration via Supabase Client
 * Reads the migration SQL and executes it
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  // Create Supabase client with service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('📖 Reading migration file...');

  // Read the migration SQL file
  const migrationPath = join(process.cwd(), 'supabase/migrations/20251031120000_esg_benchmarking_copilot.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('📝 Migration file size:', migrationSQL.length, 'bytes');
  console.log('\n🚀 Applying migration...\n');

  try {
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql RPC not available, trying alternative method...');

      // Split SQL into individual statements and execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`Found ${statements.length} SQL statements\n`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.length > 100) {
          console.log(`[${i + 1}/${statements.length}] Executing: ${stmt.substring(0, 80)}...`);
        } else {
          console.log(`[${i + 1}/${statements.length}] Executing: ${stmt}`);
        }

        // For CREATE TYPE and CREATE TABLE, we need to use raw SQL
        // This is a limitation - we'll need to run via Supabase Dashboard
      }

      console.log('\n⚠️  MIGRATION MUST BE APPLIED VIA SUPABASE DASHBOARD');
      console.log('\nPlease follow these steps:');
      console.log('1. Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new');
      console.log('2. Copy the contents of: supabase/migrations/20251031120000_esg_benchmarking_copilot.sql');
      console.log('3. Paste into the SQL Editor');
      console.log('4. Click "Run" to execute the migration');
      console.log('\nAfter that, run: npm run tsx scripts/verify-esg-tables.ts');

      return;
    }

    console.log('✅ Migration applied successfully!');
    console.log('\n📊 Data:', data);

  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  }
}

applyMigration().catch(console.error);
