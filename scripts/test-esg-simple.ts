/**
 * Simplified ESG Workflow Test
 * Uses ITONICS as example company (or creates mock data)
 */

import { createClient } from '@supabase/supabase-js';

async function testESGSimple() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🧪 Simplified ESG Workflow Test\n');
  console.log('═'.repeat(60));

  // Use a real company ID from database
  const testCompanyId = 'fc508e2d-6fc7-4341-a565-b3ab94c82014';
  const testCompanyName = 'ITONICS Innovation (Test Data)';
  const testYear = 2024;

  console.log(`\n📍 Test Company: ${testCompanyName}`);
  console.log(`   ID: ${testCompanyId}`);
  console.log(`   Year: ${testYear}`);

  // Step 1: Create sample metrics
  console.log('\n📊 Step 1: Creating sample ESG metrics...');

  const sampleMetrics = [
    // Environmental - 4 metrics
    {
      company_id: testCompanyId,
      period_year: testYear,
      category: 'environmental',
      subcategory: 'Climate & Emissions',
      metric_key: 'ghg_scope1_tco2e',
      metric_name: 'GHG Scope 1 Emissions',
      value_numeric: 420,
      confidence: 0.90
    },
    {
      company_id: testCompanyId,
      period_year: testYear,
      category: 'environmental',
      subcategory: 'Climate & Emissions',
      metric_key: 'ghg_scope2_tco2e',
      metric_name: 'GHG Scope 2 Emissions',
      value_numeric: 310,
      confidence: 0.88
    },
    {
      company_id: testCompanyId,
      period_year: testYear,
      category: 'environmental',
      subcategory: 'Energy',
      metric_key: 'energy_consumption_mwh',
      metric_name: 'Total Energy Consumption',
      value_numeric: 1180,
      confidence: 0.95
    },
    {
      company_id: testCompanyId,
      period_year: testYear,
      category: 'environmental',
      subcategory: 'Energy',
      metric_key: 'renewable_energy_pct',
      metric_name: 'Renewable Energy %',
      value_numeric: 52,
      confidence: 0.92
    },

    // Social - 4 metrics
    {
      company_id: testCompanyId,
      period_year: testYear,
      category: 'social',
      subcategory: 'Workforce',
      metric_key: 'employee_turnover_pct',
      metric_name: 'Employee Turnover Rate',
      value_numeric: 14,
      confidence: 0.98
    },
    {
      company_id: testCompanyId,
      period_year: testYear,
      category: 'social',
      subcategory: 'Workforce',
      metric_key: 'training_hours_per_employee',
      metric_name: 'Training Hours per Employee',
      value_numeric: 38,
      confidence: 0.85
    },
    {
      company_id: testCompanyId,
      period_year: testYear,
      category: 'social',
      subcategory: 'Diversity & Inclusion',
      metric_key: 'gender_diversity_pct',
      metric_name: 'Gender Diversity',
      value_numeric: 33,
      confidence: 1.0
    },
    {
      company_id: testCompanyId,
      period_year: testYear,
      category: 'social',
      subcategory: 'Health & Safety',
      metric_key: 'trir',
      metric_name: 'Total Recordable Incident Rate',
      value_numeric: 0.4,
      confidence: 0.95
    },

    // Governance - 4 metrics
    {
      company_id: testCompanyId,
      period_year: testYear,
      category: 'governance',
      subcategory: 'Board Structure',
      metric_key: 'board_independence_pct',
      metric_name: 'Board Independence',
      value_numeric: 58,
      confidence: 1.0
    },
    {
      company_id: testCompanyId,
      period_year: testYear,
      category: 'governance',
      subcategory: 'Board Structure',
      metric_key: 'board_diversity_pct',
      metric_name: 'Board Diversity',
      value_numeric: 35,
      confidence: 1.0
    },
    {
      company_id: testCompanyId,
      period_year: testYear,
      category: 'governance',
      subcategory: 'Ethics & Compliance',
      metric_key: 'ethics_policy_exists',
      metric_name: 'Ethics Policy Exists',
      value_boolean: true,
      confidence: 1.0
    },
    {
      company_id: testCompanyId,
      period_year: testYear,
      category: 'governance',
      subcategory: 'ESG Oversight',
      metric_key: 'esg_committee_exists',
      metric_name: 'ESG Committee Exists',
      value_boolean: true,
      confidence: 0.95
    }
  ];

  // Delete existing test metrics
  await supabase
    .from('esg_metrics')
    .delete()
    .eq('company_id', testCompanyId);

  const { data: insertedMetrics, error: metricsError } = await supabase
    .from('esg_metrics')
    .insert(sampleMetrics)
    .select();

  if (metricsError) {
    console.error('❌ Error creating metrics:', metricsError);
    return false;
  }

  console.log(`✅ Created ${insertedMetrics?.length || 0} metrics`);
  console.log('   Environmental: 4, Social: 4, Governance: 4');

  // Step 2: Test scoring engine
  console.log('\n🧮 Step 2: Computing ESG scores...');

  const { getScoringEngine } = await import('@/lib/esg');
  const scoringEngine = getScoringEngine();

  const { data: benchmarks } = await supabase
    .from('esg_benchmarks')
    .select('*');

  try {
    const scores = await scoringEngine.computeAllScores({
      companyId: testCompanyId,
      periodYear: testYear,
      metrics: insertedMetrics,
      benchmarks: benchmarks || [],
      sector: 'Technology',
      sizeBand: 'medium',
      region: 'UK'
    });

    console.log(`✅ Computed ${scores.length} scores\n`);

    // Display category scores
    const categoryScores = scores.filter(s => !s.subcategory);
    categoryScores.forEach(score => {
      const emoji = score.level === 'leading' ? '🟢' : score.level === 'par' ? '🟡' : '🔴';
      console.log(`   ${emoji} ${score.category.toUpperCase()}: ${score.score.toFixed(1)}/100 [${score.level}]`);
      console.log(`      Completeness: ${(score.data_completeness * 100).toFixed(0)}%`);
      if (score.benchmark_percentile !== null) {
        console.log(`      Percentile: ${score.benchmark_percentile.toFixed(0)}th`);
      }
    });

    // Step 3: Save scores
    console.log('\n💾 Step 3: Saving scores to database...');

    await supabase
      .from('esg_scores')
      .delete()
      .eq('company_id', testCompanyId);

    const scoresToInsert = scores.map(s => ({
      company_id: testCompanyId,
      period_year: testYear,
      category: s.category,
      subcategory: s.subcategory,
      score: s.score,
      level: s.level,
      metrics_count: s.metric_count,
      metrics_with_data: s.metrics_with_benchmarks,
      details: {
        metric_count: s.metric_count,
        metrics_with_benchmarks: s.metrics_with_benchmarks,
        benchmark_percentile: s.benchmark_percentile,
        data_completeness: s.data_completeness
      },
      computed_at: new Date().toISOString()
    }));

    const { data: savedScores, error: scoresError } = await supabase
      .from('esg_scores')
      .insert(scoresToInsert)
      .select();

    if (scoresError) {
      console.error('❌ Error saving scores:', scoresError);
      return false;
    }

    console.log(`✅ Saved ${savedScores?.length || 0} scores`);

    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('✅ ESG WORKFLOW TEST COMPLETE!\n');
    console.log('Test Results:');
    console.log(`  ✅ Company: ${testCompanyName}`);
    console.log(`  ✅ Metrics Created: ${insertedMetrics?.length || 0}`);
    console.log(`  ✅ Scores Computed: ${scores.length}`);
    console.log(`  ✅ Scores Saved: ${savedScores?.length || 0}`);
    console.log('\nTest the APIs:');
    console.log(`  1. Summary: GET /api/companies/${testCompanyId}/esg/summary?year=${testYear}`);
    console.log(`  2. Metrics: GET /api/companies/${testCompanyId}/esg/metrics?year=${testYear}`);
    console.log(`  3. Recompute: POST /api/companies/${testCompanyId}/esg/recompute`);
    console.log(`  4. Report: GET /api/companies/${testCompanyId}/esg/report?year=${testYear}`);
    console.log('\nView Dashboard:');
    console.log(`  http://localhost:3000/companies/${testCompanyId}/esg`);
    console.log('═'.repeat(60));

    return true;

  } catch (err) {
    console.error('❌ Error:', err);
    return false;
  }
}

testESGSimple()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
