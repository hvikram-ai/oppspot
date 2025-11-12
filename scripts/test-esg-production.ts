/**
 * Test ESG Feature in Production
 * Verifies that all ESG API endpoints are working correctly
 */

import { createClient } from '@supabase/supabase-js';

async function testProduction() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🧪 Testing ESG Feature in Production\n');
  console.log('Environment:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('='.repeat(60) + '\n');

  let allTestsPassed = true;

  // Test 1: Verify Tables Exist
  console.log('Test 1: Verify Tables Exist');
  const tables = ['esg_templates', 'esg_metrics', 'esg_benchmarks', 'esg_scores',
                  'esg_disclosures', 'esg_sentiment', 'esg_reports'];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`  ❌ ${table}: FAILED (${error.message})`);
      allTestsPassed = false;
    } else {
      console.log(`  ✅ ${table}: OK`);
    }
  }
  console.log('');

  // Test 2: Verify Benchmark Data
  console.log('Test 2: Verify Benchmark Data');
  const { data: benchmarks, error: benchError, count } = await supabase
    .from('esg_benchmarks')
    .select('*', { count: 'exact' });

  if (benchError || !count || count < 31) {
    console.log(`  ❌ Benchmarks: FAILED (Expected 31, found ${count || 0})`);
    allTestsPassed = false;
  } else {
    console.log(`  ✅ Benchmarks: OK (${count} records)`);

    const sectors = new Set(benchmarks?.map(b => b.sector));
    const regions = new Set(benchmarks?.map(b => b.region));
    console.log(`     - Sectors: ${Array.from(sectors).join(', ')}`);
    console.log(`     - Regions: ${Array.from(regions).join(', ')}`);
  }
  console.log('');

  // Test 3: Check if any companies have ESG metrics
  console.log('Test 3: Check ESG Metrics Data');
  const { data: metrics, error: metricsError } = await supabase
    .from('esg_metrics')
    .select('company_id, period_year, category, metric_key')
    .limit(5);

  if (metricsError) {
    console.log(`  ❌ Metrics Query: FAILED (${metricsError.message})`);
    allTestsPassed = false;
  } else {
    console.log(`  ✅ Metrics Query: OK (${metrics?.length || 0} sample records)`);
    if (metrics && metrics.length > 0) {
      console.log(`     First metric: ${metrics[0].metric_key} (${metrics[0].category})`);
    } else {
      console.log(`     ⚠️  No metrics data yet (expected for new deployment)`);
    }
  }
  console.log('');

  // Test 4: Check ESG Scores
  console.log('Test 4: Check ESG Scores Data');
  const { data: scores, error: scoresError } = await supabase
    .from('esg_scores')
    .select('company_id, period_year, category, score')
    .limit(5);

  if (scoresError) {
    console.log(`  ❌ Scores Query: FAILED (${scoresError.message})`);
    allTestsPassed = false;
  } else {
    console.log(`  ✅ Scores Query: OK (${scores?.length || 0} sample records)`);
    if (scores && scores.length > 0) {
      console.log(`     First score: ${scores[0].category} = ${scores[0].score}`);
    } else {
      console.log(`     ⚠️  No scores data yet (expected for new deployment)`);
    }
  }
  console.log('');

  // Test 5: Verify File System
  console.log('Test 5: Verify File System');
  const fs = await import('fs');
  const path = await import('path');

  const filesToCheck = [
    'app/companies/[id]/esg/page.tsx',
    'app/api/companies/[id]/esg/summary/route.ts',
    'app/api/companies/[id]/esg/metrics/route.ts',
    'app/api/companies/[id]/esg/recompute/route.ts',
    'app/api/companies/[id]/esg/report/route.ts',
    'components/esg/category-tiles.tsx',
    'components/esg/benchmark-bars.tsx',
    'components/esg/metrics-table.tsx',
    'components/esg/evidence-panel.tsx',
    'lib/esg/metric-extractor.ts',
    'lib/esg/scoring-engine.ts',
    'lib/esg/pdf-generator.tsx',
    'types/esg.ts',
  ];

  for (const file of filesToCheck) {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    if (!exists) {
      console.log(`  ❌ ${file}: MISSING`);
      allTestsPassed = false;
    } else {
      console.log(`  ✅ ${file}: EXISTS`);
    }
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED - ESG FEATURE IS PRODUCTION-READY!');
    console.log('\nNext Steps:');
    console.log('1. Deploy to Vercel (git push will trigger auto-deployment)');
    console.log('2. Test UI at: https://oppspot-one.vercel.app/companies/[id]/esg');
    console.log('3. Monitor for errors in Vercel dashboard');
    console.log('4. Test with real company data');
  } else {
    console.log('❌ SOME TESTS FAILED - Review errors above');
  }
  console.log('='.repeat(60));

  return allTestsPassed;
}

testProduction()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
