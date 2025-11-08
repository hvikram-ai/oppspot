/**
 * Check businesses in database
 */

import { createClient } from '@supabase/supabase-js';

async function checkBusinesses() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Checking businesses table...\n');

  const { data, error, count } = await supabase
    .from('businesses')
    .select('id, name, categories', { count: 'exact' })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${count} total businesses\n`);

  if (data && data.length > 0) {
    console.log('Sample businesses:');
    data.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.name} (${b.id})`);
      console.log(`     Categories: ${b.categories?.join(', ') || 'N/A'}`);
    });
  } else {
    console.log('⚠️  No businesses found. Run seed script to populate test data.');
  }
}

checkBusinesses();
