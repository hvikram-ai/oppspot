/**
 * Seed ESG Data for 2025
 * Copies 2024 data and creates 2025 records for testing
 */

import { createClient } from '@supabase/supabase-js';

async function seed2025Data() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const companyId = 'fc508e2d-6fc7-4341-a565-b3ab94c82014';

  console.log('🌱 Seeding ESG data for 2025...\n');

  // 1. Copy metrics from 2024 to 2025
  console.log('Step 1: Copying metrics from 2024 to 2025...');

  const { data: metrics2024 } = await supabase
    .from('esg_metrics')
    .select('*')
    .eq('company_id', companyId)
    .eq('period_year', 2024);

  if (!metrics2024 || metrics2024.length === 0) {
    console.log('❌ No 2024 metrics found to copy');
    return;
  }

  console.log(`  Found ${metrics2024.length} metrics from 2024`);

  // Create 2025 versions (with slight improvements to show progress)
  const metrics2025 = metrics2024.map(m => {
    const newMetric = { ...m };
    delete newMetric.id; // Let DB generate new ID
    newMetric.period_year = 2025;
    newMetric.updated_at = new Date().toISOString();

    // Slightly improve numeric values to show year-over-year progress
    if (newMetric.value_numeric !== null) {
      // Improve environmental metrics (reduce emissions, increase renewable %)
      if (m.category === 'environmental') {
        if (m.metric_key.includes('ghg') || m.metric_key.includes('emission')) {
          newMetric.value_numeric = m.value_numeric * 0.95; // 5% reduction
        } else if (m.metric_key.includes('renewable')) {
          newMetric.value_numeric = Math.min(100, m.value_numeric * 1.1); // 10% increase
        }
      }
      // Improve social metrics slightly
      else if (m.category === 'social') {
        if (m.metric_key.includes('turnover')) {
          newMetric.value_numeric = m.value_numeric * 0.98; // 2% reduction
        } else if (m.metric_key.includes('training') || m.metric_key.includes('diversity')) {
          newMetric.value_numeric = m.value_numeric * 1.05; // 5% increase
        }
      }
      // Improve governance metrics slightly
      else if (m.category === 'governance') {
        if (m.metric_key.includes('independence') || m.metric_key.includes('diversity')) {
          newMetric.value_numeric = Math.min(100, m.value_numeric * 1.03); // 3% increase
        }
      }
    }

    return newMetric;
  });

  const { data: insertedMetrics, error: metricsError } = await supabase
    .from('esg_metrics')
    .insert(metrics2025)
    .select();

  if (metricsError) {
    console.error('❌ Error inserting 2025 metrics:', metricsError);
    return;
  }

  console.log(`  ✅ Inserted ${insertedMetrics?.length || 0} metrics for 2025\n`);

  // 2. Copy scores from 2024 to 2025
  console.log('Step 2: Copying scores from 2024 to 2025...');

  const { data: scores2024 } = await supabase
    .from('esg_scores')
    .select('*')
    .eq('company_id', companyId)
    .eq('period_year', 2024);

  if (!scores2024 || scores2024.length === 0) {
    console.log('⚠️  No 2024 scores found, skipping scores');
  } else {
    console.log(`  Found ${scores2024.length} scores from 2024`);

    // Create 2025 versions (with slight improvements)
    const scores2025 = scores2024.map(s => {
      const newScore = { ...s };
      delete newScore.id;
      delete newScore.computed_at; // Let DB generate new timestamp
      newScore.period_year = 2025;

      // Improve scores slightly (2-5 points) to show progress
      newScore.score = Math.min(100, s.score + (Math.random() * 3 + 2));

      // Update level based on new score
      if (newScore.score >= 75) {
        newScore.level = 'leading';
      } else if (newScore.score >= 25) {
        newScore.level = 'par';
      } else {
        newScore.level = 'lagging';
      }

      // Update details if present
      if (newScore.details) {
        newScore.details = {
          ...newScore.details,
          year_over_year_change: `+${(Math.random() * 5 + 2).toFixed(1)}%`,
        };
      }

      return newScore;
    });

    const { data: insertedScores, error: scoresError } = await supabase
      .from('esg_scores')
      .insert(scores2025)
      .select();

    if (scoresError) {
      console.error('❌ Error inserting 2025 scores:', scoresError);
    } else {
      console.log(`  ✅ Inserted ${insertedScores?.length || 0} scores for 2025\n`);
    }
  }

  // 3. Verify the data
  console.log('Step 3: Verifying 2025 data...');

  const { data: verify2025, count } = await supabase
    .from('esg_metrics')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .eq('period_year', 2025);

  console.log(`  ✅ Total 2025 metrics: ${count || 0}`);

  const { data: verifyScores2025, count: scoresCount } = await supabase
    .from('esg_scores')
    .select('category, score, level', { count: 'exact' })
    .eq('company_id', companyId)
    .eq('period_year', 2025);

  console.log(`  ✅ Total 2025 scores: ${scoresCount || 0}`);

  if (verifyScores2025 && verifyScores2025.length > 0) {
    console.log('\n  Sample 2025 scores:');
    verifyScores2025.slice(0, 5).forEach(s => {
      console.log(`    - ${s.category}: ${s.score.toFixed(1)} (${s.level})`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 2025 ESG DATA SEEDED SUCCESSFULLY!');
  console.log('\nYou can now test the ESG dashboard with year 2025:');
  console.log(`https://oppspot-one.vercel.app/companies/${companyId}/esg`);
  console.log('='.repeat(60));
}

seed2025Data()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
