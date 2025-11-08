/**
 * Create a test company for ESG testing
 */

import { createClient } from '@supabase/supabase-js';

async function createTestCompany() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🏢 Creating test company for ESG...\n');

  // Check if test company already exists
  const { data: existing } = await supabase
    .from('businesses')
    .select('id, company_name')
    .eq('company_name', 'Test Tech Company Ltd')
    .single();

  if (existing) {
    console.log('✅ Test company already exists:');
    console.log(`   ID: ${existing.id}`);
    console.log(`   Name: ${existing.company_name}`);
    return existing;
  }

  // Create new test company
  const testCompany = {
    company_name: 'Test Tech Company Ltd',
    company_number: 'TC123456',
    company_sector: 'Technology',
    company_size: 'medium',
    country: 'UK',
    registered_address: '123 Tech Street, London, UK',
    incorporation_date: '2020-01-01',
    sic_codes: ['62012'],
    description: 'Test company for ESG benchmarking demonstration',
    website: 'https://testtechcompany.example.com'
  };

  const { data: newCompany, error } = await supabase
    .from('businesses')
    .insert(testCompany)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating test company:', error);
    throw error;
  }

  console.log('✅ Test company created:');
  console.log(`   ID: ${newCompany.id}`);
  console.log(`   Name: ${newCompany.company_name}`);
  console.log(`   Sector: ${newCompany.company_sector}`);
  console.log(`   Size: ${newCompany.company_size}`);
  console.log(`   Country: ${newCompany.country}`);

  return newCompany;
}

createTestCompany()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
