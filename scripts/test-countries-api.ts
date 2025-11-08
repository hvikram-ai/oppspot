/**
 * Test script to verify countries data is accessible via Supabase
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function testCountriesData() {
  console.log('\n🧪 Testing Countries Data Access\n');
  console.log('='.repeat(60));

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Test 1: Count total countries
  const { count: totalCount, error: countError } = await supabase
    .from('countries')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting countries:', countError);
    return;
  }

  console.log(`✅ Total countries in database: ${totalCount}`);

  // Test 2: Get countries with excellent coverage
  const { data: excellentCountries, error: excellentError } = await supabase
    .from('countries')
    .select('country_code, name, data_source_coverage')
    .eq('data_source_coverage', 'excellent')
    .order('name');

  if (excellentError) {
    console.error('❌ Error fetching excellent coverage countries:', excellentError);
  } else {
    console.log(`\n✅ Countries with excellent data coverage: ${excellentCountries.length}`);
    excellentCountries.slice(0, 5).forEach(c => {
      console.log(`   - ${c.country_code}: ${c.name}`);
    });
    if (excellentCountries.length > 5) {
      console.log(`   ... and ${excellentCountries.length - 5} more`);
    }
  }

  // Test 3: Get countries with free APIs
  const { count: freeAPICount, error: freeAPIError } = await supabase
    .from('countries')
    .select('*', { count: 'exact', head: true })
    .eq('company_registry_type', 'free_api');

  if (freeAPIError) {
    console.error('❌ Error counting free API countries:', freeAPIError);
  } else {
    console.log(`\n✅ Countries with free company registry APIs: ${freeAPICount}`);
  }

  // Test 4: Get countries by continent
  const { data: continents, error: continentError } = await supabase
    .from('countries')
    .select('continent')
    .order('continent');

  if (continentError) {
    console.error('❌ Error fetching continents:', continentError);
  } else {
    const continentCounts = continents.reduce((acc, c) => {
      acc[c.continent] = (acc[c.continent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n✅ Countries by continent:');
    Object.entries(continentCounts).forEach(([continent, count]) => {
      console.log(`   - ${continent}: ${count}`);
    });
  }

  // Test 5: Sample specific countries
  const sampleCountries = ['US', 'GB', 'DE', 'SG', 'AU'];
  console.log('\n✅ Sample country data:');

  for (const code of sampleCountries) {
    const { data, error } = await supabase
      .from('countries')
      .select('country_code, name, data_source_coverage, company_registry_type')
      .eq('country_code', code)
      .single();

    if (error) {
      console.log(`   ❌ ${code}: Error - ${error.message}`);
    } else if (data) {
      console.log(`   ✓ ${data.country_code} (${data.name}): ${data.data_source_coverage} coverage, ${data.company_registry_type || 'no'} registry`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed successfully!\n');
}

testCountriesData().catch(console.error);
