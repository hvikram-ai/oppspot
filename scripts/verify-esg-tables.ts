/**
 * Verify ESG Tables Exist
 * Checks if all 7 ESG tables were created successfully
 */

import { createClient } from '@supabase/supabase-js';

async function verifyTables() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Verifying ESG tables...\n');

  const tables = [
    'esg_templates',
    'esg_metrics',
    'esg_benchmarks',
    'esg_scores',
    'esg_disclosures',
    'esg_sentiment',
    'esg_reports'
  ];

  const results: Record<string, boolean> = {};
  let allExist = true;

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        results[table] = false;
        allExist = false;
      } else {
        const count = data?.length || 0;
        console.log(`✅ ${table}: exists (${count} record${count === 1 ? '' : 's'} found)`);
        results[table] = true;
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err}`);
      results[table] = false;
      allExist = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allExist) {
    console.log('✅ ALL 7 ESG TABLES EXIST AND ARE ACCESSIBLE');
    console.log('\nYou can now:');
    console.log('1. Run: npx tsx scripts/seed-esg-benchmarks.ts');
    console.log('2. Test the API: GET /api/companies/[id]/esg/summary');
    console.log('3. View dashboard: /companies/[id]/esg');
  } else {
    console.log('❌ SOME TABLES ARE MISSING');
    console.log('\nPlease apply the migration via Supabase Dashboard:');
    console.log('1. Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new');
    console.log('2. Copy contents of: supabase/migrations/20251031120000_esg_benchmarking_copilot.sql');
    console.log('3. Paste and click "Run"');
  }
  console.log('='.repeat(60));

  return allExist;
}

verifyTables()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
