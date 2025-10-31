/**
 * Check if feedback system tables exist
 * Run with: npx tsx scripts/check-feedback-tables.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkTables() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const tables = [
    'feedback',
    'feedback_votes',
    'feedback_comments',
    'feedback_followers',
    'feedback_activity',
    'feedback_submissions',
  ];

  console.log('🔍 Checking feedback system tables...\n');

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);

      if (error) {
        console.log(`❌ Table "${table}" does not exist or is not accessible`);
        console.log(`   Error: ${error.message}\n`);
      } else {
        console.log(`✅ Table "${table}" exists`);
      }
    } catch (err) {
      console.log(`❌ Table "${table}" - Error: ${err}\n`);
    }
  }

  console.log('\n📋 Next steps:');
  console.log('1. If tables do NOT exist, apply the migration:');
  console.log('   - Go to https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/editor');
  console.log('   - Copy contents from: supabase/migrations/20251031060948_feedback_system.sql');
  console.log('   - Paste and run in SQL Editor');
  console.log('2. If tables exist, test the feedback form at /feedback\n');
}

checkTables().catch(console.error);
