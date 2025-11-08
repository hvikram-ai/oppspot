/**
 * Find a business to use for ESG testing
 */

import { createClient } from '@supabase/supabase-js';

async function findBusiness() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Finding a business for ESG testing...\n');

  // Try to find one business with a simple query
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, categories')
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error:', error);
    console.log('\nℹ️  Will use a mock company ID for testing instead.');
    console.log('   ESG data will be stored but dashboard may not display without real business.');
    return null;
  }

  if (data) {
    console.log('✅ Found business:');
    console.log(`   ID: ${data.id}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   Categories: ${data.categories?.join(', ') || 'N/A'}`);
    return data;
  }

  return null;
}

findBusiness();
