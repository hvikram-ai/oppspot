/**
 * Find Companies with ESG Data for Testing
 */

import { createClient } from '@supabase/supabase-js';

async function findTestCompanies() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Finding companies with ESG data...\n');

  // 1. Find companies with ESG metrics
  const { data: metricsData } = await supabase
    .from('esg_metrics')
    .select('company_id')
    .limit(10);

  if (metricsData && metricsData.length > 0) {
    console.log('✅ Companies with ESG metrics:');
    const uniqueIds = [...new Set(metricsData.map(m => m.company_id))];

    for (const companyId of uniqueIds) {
      // Get company name
      const { data: business } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('id', companyId)
        .single();

      // Get metric count
      const { count } = await supabase
        .from('esg_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      console.log(`\n  Company ID: ${companyId}`);
      console.log(`  Name: ${business?.name || 'Unknown'}`);
      console.log(`  ESG Metrics: ${count || 0}`);
      console.log(`  Test URL: https://oppspot-one.vercel.app/companies/${companyId}/esg`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Use any of the Company IDs above to test the ESG dashboard');
    console.log('='.repeat(60));
    return;
  }

  // 2. If no metrics, find any businesses
  console.log('⚠️  No companies with ESG data found yet.\n');
  console.log('Sample businesses (you can add ESG data to these):');

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, sector')
    .limit(10);

  if (businesses && businesses.length > 0) {
    for (const b of businesses) {
      console.log(`\n  Company ID: ${b.id}`);
      console.log(`  Name: ${b.name}`);
      console.log(`  Sector: ${b.sector || 'N/A'}`);
      console.log(`  Test URL: https://oppspot-one.vercel.app/companies/${b.id}/esg`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('ℹ️  These companies have no ESG data yet.');
    console.log('   The dashboard will show "No ESG data available" message.');
    console.log('   Upload ESG documents to generate metrics.');
    console.log('='.repeat(60));
  }
}

findTestCompanies()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
