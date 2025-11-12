/**
 * Check ESG Data Years
 */

import { createClient } from '@supabase/supabase-js';

async function checkData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const companyId = 'fc508e2d-6fc7-4341-a565-b3ab94c82014';

  console.log('🔍 Checking ESG data for company:', companyId);
  console.log('');

  // Check metrics by year
  const { data: metrics } = await supabase
    .from('esg_metrics')
    .select('period_year')
    .eq('company_id', companyId);

  const years = [...new Set(metrics?.map(m => m.period_year))].sort();
  console.log('📅 Available years in esg_metrics:', years);

  // Check scores by year
  const { data: scores } = await supabase
    .from('esg_scores')
    .select('period_year, category, score, level')
    .eq('company_id', companyId)
    .order('period_year')
    .order('category');

  console.log('\n📊 Scores by year:');
  scores?.forEach(s => {
    console.log(`  ${s.period_year} - ${s.category}: ${s.score} (${s.level})`);
  });

  console.log('\n✅ To fix the 401 error, make sure you are logged in first!');
  console.log('✅ Then change the year selector to:', years[0] || '2024');
}

checkData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
