/**
 * Seed ESG Scores for 2025 Only
 */

import { createClient } from '@supabase/supabase-js';

async function seed2025Scores() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const companyId = 'fc508e2d-6fc7-4341-a565-b3ab94c82014';

  console.log('🌱 Seeding ESG scores for 2025...\n');

  // Get 2024 scores
  const { data: scores2024 } = await supabase
    .from('esg_scores')
    .select('*')
    .eq('company_id', companyId)
    .eq('period_year', 2024);

  if (!scores2024 || scores2024.length === 0) {
    console.log('❌ No 2024 scores found');
    return;
  }

  console.log(`Found ${scores2024.length} scores from 2024`);

  // Create 2025 versions with improvements
  const scores2025 = scores2024.map(s => ({
    company_id: s.company_id,
    period_year: 2025,
    category: s.category,
    subcategory: s.subcategory,
    score: Math.min(100, s.score + (Math.random() * 3 + 2)),
    level: s.score + 3 >= 75 ? 'leading' : s.score + 3 >= 25 ? 'par' : 'lagging',
    metrics_count: s.metrics_count,
    metrics_with_data: s.metrics_with_data,
    details: s.details ? {
      ...s.details,
      year_over_year_change: `+${(Math.random() * 5 + 2).toFixed(1)}%`,
    } : null,
  }));

  const { data: inserted, error } = await supabase
    .from('esg_scores')
    .insert(scores2025)
    .select();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Inserted ${inserted?.length || 0} scores for 2025\n`);

  // Verify
  const { data: verify } = await supabase
    .from('esg_scores')
    .select('category, score, level')
    .eq('company_id', companyId)
    .eq('period_year', 2025)
    .order('category');

  console.log('2025 Scores:');
  verify?.forEach(s => {
    console.log(`  ${s.category}: ${s.score.toFixed(1)} (${s.level})`);
  });

  console.log('\n✅ 2025 scores seeded successfully!');
}

seed2025Scores()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
