/**
 * Check ESG Benchmark Count in Production
 */

import { createClient } from '@supabase/supabase-js';

async function checkBenchmarks() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Checking ESG benchmark data...\n');

  try {
    const { data, error, count } = await supabase
      .from('esg_benchmarks')
      .select('*', { count: 'exact' });

    if (error) {
      console.error('❌ Error:', error);
      return false;
    }

    console.log(`📊 Total benchmarks: ${count || 0}`);

    if (count === 0) {
      console.log('\n⚠️  No benchmark data found. Run: npx tsx scripts/seed-esg-benchmarks.ts');
      return false;
    }

    // Show breakdown
    const sectors = new Set(data?.map(b => b.sector) || []);
    const regions = new Set(data?.map(b => b.region) || []);

    console.log(`✅ Sectors: ${Array.from(sectors).join(', ')}`);
    console.log(`✅ Regions: ${Array.from(regions).join(', ')}`);
    console.log(`✅ Expected: 31 benchmarks (from seed script)`);

    if (count && count >= 31) {
      console.log('\n✅ Sufficient benchmark data exists!');
      return true;
    } else {
      console.log(`\n⚠️  Only ${count} benchmarks found, expected 31. Consider re-seeding.`);
      return false;
    }

  } catch (err) {
    console.error('❌ Error:', err);
    return false;
  }
}

checkBenchmarks()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
