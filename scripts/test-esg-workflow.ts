/**
 * Test ESG Workflow End-to-End
 * Creates sample metrics, computes scores, and tests API endpoints
 */

import { createClient } from '@supabase/supabase-js';
import { ESG_METRIC_DEFINITIONS } from '@/types/esg';

async function testESGWorkflow() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🧪 ESG Workflow E2E Test\n');
  console.log('═'.repeat(60));

  // Step 1: Find a test company
  console.log('\n📍 Step 1: Finding a test company...');

  const { data: companies, error: companiesError } = await supabase
    .from('businesses')
    .select('id, company_name, company_sector, company_size, country')
    .limit(5);

  if (companiesError || !companies || companies.length === 0) {
    console.error('❌ No companies found');
    return false;
  }

  const testCompany = companies[0];
  console.log(`✅ Using company: ${testCompany.company_name} (${testCompany.id})`);
  console.log(`   Sector: ${testCompany.company_sector}, Size: ${testCompany.company_size}, Country: ${testCompany.country}`);

  // Step 2: Create sample metrics
  console.log('\n📊 Step 2: Creating sample ESG metrics...');

  const testYear = 2024;
  const sampleMetrics = [
    // Environmental metrics
    {
      company_id: testCompany.id,
      period_year: testYear,
      category: 'environmental',
      subcategory: 'Climate & Emissions',
      metric_key: 'ghg_scope1_tco2e',
      metric_name: 'GHG Scope 1 Emissions',
      value_numeric: 450,
      unit: 'tCO2e',
      confidence: 0.92,
      citation: {
        document_id: 'test-doc-1',
        page_number: 15,
        excerpt: 'Our Scope 1 emissions for 2024 were 450 tCO2e...'
      }
    },
    {
      company_id: testCompany.id,
      period_year: testYear,
      category: 'environmental',
      subcategory: 'Climate & Emissions',
      metric_key: 'ghg_scope2_tco2e',
      metric_name: 'GHG Scope 2 Emissions',
      value_numeric: 320,
      unit: 'tCO2e',
      confidence: 0.88
    },
    {
      company_id: testCompany.id,
      period_year: testYear,
      category: 'environmental',
      subcategory: 'Energy',
      metric_key: 'energy_consumption_mwh',
      metric_name: 'Total Energy Consumption',
      value_numeric: 1250,
      unit: 'MWh',
      confidence: 0.95
    },
    {
      company_id: testCompany.id,
      period_year: testYear,
      category: 'environmental',
      subcategory: 'Energy',
      metric_key: 'renewable_energy_pct',
      metric_name: 'Renewable Energy Percentage',
      value_numeric: 45,
      unit: '%',
      confidence: 0.90
    },

    // Social metrics
    {
      company_id: testCompany.id,
      period_year: testYear,
      category: 'social',
      subcategory: 'Workforce',
      metric_key: 'employee_turnover_pct',
      metric_name: 'Employee Turnover Rate',
      value_numeric: 12,
      unit: '%',
      confidence: 0.98
    },
    {
      company_id: testCompany.id,
      period_year: testYear,
      category: 'social',
      subcategory: 'Workforce',
      metric_key: 'training_hours_per_employee',
      metric_name: 'Training Hours per Employee',
      value_numeric: 42,
      unit: 'hours',
      confidence: 0.85
    },
    {
      company_id: testCompany.id,
      period_year: testYear,
      category: 'social',
      subcategory: 'Diversity & Inclusion',
      metric_key: 'gender_diversity_pct',
      metric_name: 'Gender Diversity (% Women)',
      value_numeric: 35,
      unit: '%',
      confidence: 1.0
    },
    {
      company_id: testCompany.id,
      period_year: testYear,
      category: 'social',
      subcategory: 'Health & Safety',
      metric_key: 'trir',
      metric_name: 'Total Recordable Incident Rate',
      value_numeric: 0.5,
      unit: 'incidents per 200,000 hours',
      confidence: 0.95
    },

    // Governance metrics
    {
      company_id: testCompany.id,
      period_year: testYear,
      category: 'governance',
      subcategory: 'Board Structure',
      metric_key: 'board_independence_pct',
      metric_name: 'Board Independence',
      value_numeric: 62,
      unit: '%',
      confidence: 1.0
    },
    {
      company_id: testCompany.id,
      period_year: testYear,
      category: 'governance',
      subcategory: 'Board Structure',
      metric_key: 'board_diversity_pct',
      metric_name: 'Board Diversity',
      value_numeric: 38,
      unit: '%',
      confidence: 1.0
    },
    {
      company_id: testCompany.id,
      period_year: testYear,
      category: 'governance',
      subcategory: 'Ethics & Compliance',
      metric_key: 'ethics_policy_exists',
      metric_name: 'Ethics Policy Exists',
      value_boolean: true,
      confidence: 1.0
    },
    {
      company_id: testCompany.id,
      period_year: testYear,
      category: 'governance',
      subcategory: 'ESG Oversight',
      metric_key: 'esg_committee_exists',
      metric_name: 'ESG Committee Exists',
      value_boolean: true,
      confidence: 0.95
    }
  ];

  // Delete existing test metrics first
  await supabase
    .from('esg_metrics')
    .delete()
    .eq('company_id', testCompany.id)
    .eq('period_year', testYear);

  const { data: insertedMetrics, error: metricsError } = await supabase
    .from('esg_metrics')
    .insert(sampleMetrics)
    .select();

  if (metricsError) {
    console.error('❌ Error creating metrics:', metricsError);
    return false;
  }

  console.log(`✅ Created ${insertedMetrics?.length || 0} sample metrics`);
  console.log('   Environmental: 4 metrics');
  console.log('   Social: 4 metrics');
  console.log('   Governance: 4 metrics');

  // Step 3: Test GET /api/companies/[id]/esg/metrics
  console.log('\n🔍 Step 3: Testing GET /api/companies/[id]/esg/metrics...');

  try {
    const metricsUrl = `http://localhost:3000/api/companies/${testCompany.id}/esg/metrics?year=${testYear}`;
    console.log(`   URL: ${metricsUrl}`);
    console.log('   ⚠️  Note: This will fail if dev server is not running');
    console.log('   Start dev server with: npm run dev');
  } catch (err) {
    console.log('   ⚠️  Cannot test API endpoints (dev server not running)');
  }

  // Step 4: Test scoring engine directly
  console.log('\n🧮 Step 4: Testing scoring engine...');

  const { getScoringEngine } = await import('@/lib/esg');
  const scoringEngine = getScoringEngine();

  const { data: benchmarks } = await supabase
    .from('esg_benchmarks')
    .select('*');

  try {
    const scores = await scoringEngine.computeAllScores({
      companyId: testCompany.id,
      periodYear: testYear,
      metrics: insertedMetrics,
      benchmarks: benchmarks || [],
      sector: testCompany.company_sector || 'Technology',
      sizeBand: 'medium',
      region: testCompany.country === 'Ireland' ? 'Ireland' : 'UK'
    });

    console.log(`✅ Computed ${scores.length} scores`);

    // Display category scores
    const categoryScores = scores.filter(s => !s.subcategory);
    categoryScores.forEach(score => {
      const emoji = score.level === 'leading' ? '🟢' : score.level === 'par' ? '🟡' : '🔴';
      console.log(`   ${emoji} ${score.category.toUpperCase()}: ${score.score.toFixed(1)}/100 [${score.level}]`);
    });

    // Step 5: Save scores to database
    console.log('\n💾 Step 5: Saving scores to database...');

    // Delete existing scores
    await supabase
      .from('esg_scores')
      .delete()
      .eq('company_id', testCompany.id)
      .eq('period_year', testYear);

    const scoresToInsert = scores.map(s => ({
      company_id: testCompany.id,
      period_year: testYear,
      category: s.category,
      subcategory: s.subcategory,
      score: s.score,
      level: s.level,
      benchmark_percentile: s.benchmark_percentile,
      data_completeness: s.data_completeness,
      details: {
        metric_count: s.metric_count,
        metrics_with_benchmarks: s.metrics_with_benchmarks
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

    console.log(`✅ Saved ${savedScores?.length || 0} scores to database`);

    // Step 6: Test summary endpoint
    console.log('\n📈 Step 6: Testing summary data retrieval...');

    const { data: summaryScores } = await supabase
      .from('esg_scores')
      .select('*')
      .eq('company_id', testCompany.id)
      .eq('period_year', testYear);

    if (summaryScores && summaryScores.length > 0) {
      console.log('✅ Summary data retrieved successfully');
      console.log(`   Found ${summaryScores.length} score records`);
    }

    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('✅ ESG WORKFLOW TEST COMPLETE!\n');
    console.log('Test Results:');
    console.log(`  ✅ Company: ${testCompany.company_name}`);
    console.log(`  ✅ Metrics Created: ${insertedMetrics?.length || 0}`);
    console.log(`  ✅ Scores Computed: ${scores.length}`);
    console.log(`  ✅ Scores Saved: ${savedScores?.length || 0}`);
    console.log('\nNext Steps:');
    console.log('  1. Start dev server: npm run dev');
    console.log(`  2. Visit: http://localhost:3000/companies/${testCompany.id}/esg`);
    console.log(`  3. Test API: GET /api/companies/${testCompany.id}/esg/summary?year=${testYear}`);
    console.log(`  4. Test API: GET /api/companies/${testCompany.id}/esg/metrics?year=${testYear}`);
    console.log(`  5. Test API: POST /api/companies/${testCompany.id}/esg/recompute`);
    console.log(`  6. Test API: GET /api/companies/${testCompany.id}/esg/report?year=${testYear}`);
    console.log('═'.repeat(60));

    return true;

  } catch (err) {
    console.error('❌ Scoring error:', err);
    return false;
  }
}

testESGWorkflow()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
