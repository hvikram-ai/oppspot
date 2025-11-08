/**
 * Seed Countries Script
 *
 * Populates the countries table with comprehensive metadata for 195 countries
 *
 * Usage:
 *   npx tsx lib/opp-scan/data/seed-countries.ts
 *
 * Requirements:
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable must be set
 *   - Database migration 20250112000001_add_global_countries.sql must be applied
 */

import { createClient } from '@supabase/supabase-js';
import { COUNTRIES_SEED_DATA, type CountrySeedData } from './countries-seed-data';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Transform seed data to database format
 */
function transformCountryData(country: CountrySeedData) {
  return {
    country_code: country.country_code,
    country_code_alpha3: country.country_code_alpha3,
    numeric_code: country.numeric_code || null,
    name: country.name,
    official_name: country.official_name || null,
    native_name: country.native_name || null,

    // Geographic
    continent: country.continent,
    region: country.region || null,
    capital: country.capital || null,
    latitude: country.latitude || null,
    longitude: country.longitude || null,
    area_sq_km: country.area_sq_km || null,

    // Currency & Economic
    currency_code: country.currency_code,
    currency_name: country.currency_name || null,
    currency_symbol: country.currency_symbol || null,

    // Time & Language
    timezone: country.timezone || null,
    utc_offset: country.utc_offset || null,
    languages: country.languages || null,

    // Business & Economic Data
    population: country.population || null,
    gdp_usd: country.gdp_usd || null,
    gdp_per_capita_usd: country.gdp_per_capita_usd || null,
    business_density: country.business_density || null,
    ease_of_business_score: country.ease_of_business_score || null,
    corporate_tax_rate: country.corporate_tax_rate || null,
    vat_gst_rate: country.vat_gst_rate || null,

    // Regulatory & Compliance
    regulatory_complexity: country.regulatory_complexity || null,
    legal_system: country.legal_system || null,
    corruption_perception_index: country.corruption_perception_index || null,
    geopolitical_risk: country.geopolitical_risk || null,

    // Industry & Trade
    key_industries: country.key_industries || null,
    trade_agreements: country.trade_agreements || null,
    foreign_investment_restrictions: country.foreign_investment_restrictions || null,

    // Data Sources Available
    has_company_registry: country.has_company_registry,
    company_registry_url: country.company_registry_url || null,
    company_registry_type: country.company_registry_type || null,
    company_registry_notes: country.company_registry_notes || null,
    data_source_coverage: country.data_source_coverage,

    // Metadata
    enabled: country.enabled,
    notes: country.notes || null,
  };
}

/**
 * Seed countries table
 */
async function seedCountries() {
  console.log('🌍 Starting country seed process...\n');
  console.log(`📊 Total countries to seed: ${COUNTRIES_SEED_DATA.length}`);

  const stats = {
    inserted: 0,
    updated: 0,
    errors: 0,
    byContinent: {} as Record<string, number>,
    byDataCoverage: {} as Record<string, number>,
  };

  // Process countries in batches of 50 to avoid rate limits
  const BATCH_SIZE = 50;
  const batches = [];

  for (let i = 0; i < COUNTRIES_SEED_DATA.length; i += BATCH_SIZE) {
    batches.push(COUNTRIES_SEED_DATA.slice(i, i + BATCH_SIZE));
  }

  console.log(`\n📦 Processing ${batches.length} batches (${BATCH_SIZE} countries each)...\n`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\n⏳ Batch ${batchIndex + 1}/${batches.length} (${batch.length} countries)...`);

    for (const countryData of batch) {
      try {
        const dbData = transformCountryData(countryData);

        // Upsert (insert or update) based on country_code
        const { data, error } = await supabase
          .from('countries')
          .upsert(dbData, {
            onConflict: 'country_code',
          })
          .select('country_code, name');

        if (error) {
          console.error(`  ❌ ${countryData.country_code} - ${countryData.name}: ${error.message}`);
          stats.errors++;
        } else {
          // Check if it was an insert or update by querying if the country existed before
          // For simplicity, we'll count all as "inserted" since upsert doesn't tell us
          console.log(`  ✓ ${countryData.country_code} - ${countryData.name}`);
          stats.inserted++;

          // Update stats
          stats.byContinent[countryData.continent] = (stats.byContinent[countryData.continent] || 0) + 1;
          stats.byDataCoverage[countryData.data_source_coverage] =
            (stats.byDataCoverage[countryData.data_source_coverage] || 0) + 1;
        }
      } catch (err) {
        console.error(`  ❌ ${countryData.country_code} - ${countryData.name}:`, err);
        stats.errors++;
      }
    }

    // Small delay between batches to avoid rate limiting
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEED SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully processed: ${stats.inserted}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log(`📍 Total: ${COUNTRIES_SEED_DATA.length}`);

  console.log('\n📍 By Continent:');
  Object.entries(stats.byContinent)
    .sort((a, b) => b[1] - a[1])
    .forEach(([continent, count]) => {
      console.log(`   ${continent.padEnd(12)}: ${count}`);
    });

  console.log('\n📊 By Data Coverage:');
  Object.entries(stats.byDataCoverage)
    .sort((a, b) => b[1] - a[1])
    .forEach(([coverage, count]) => {
      console.log(`   ${coverage.padEnd(12)}: ${count}`);
    });

  // Verify final count
  const { count, error: countError } = await supabase
    .from('countries')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\n✅ Final database count: ${count} countries`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Seed process completed!\n');

  return stats;
}

/**
 * Verify seed data integrity
 */
async function verifySeedData() {
  console.log('\n🔍 Verifying seed data...\n');

  const checks = [];

  // Check 1: Enabled countries
  const { count: enabledCount, error: e1 } = await supabase
    .from('countries')
    .select('*', { count: 'exact', head: true })
    .eq('enabled', true);
  if (!e1) {
    checks.push(`✓ Enabled countries: ${enabledCount}`);
  }

  // Check 2: Countries with free APIs
  const { count: freeAPICount, error: e2 } = await supabase
    .from('countries')
    .select('*', { count: 'exact', head: true })
    .eq('company_registry_type', 'free_api');
  if (!e2) {
    checks.push(`✓ Countries with free APIs: ${freeAPICount}`);
  }

  // Check 3: Countries with excellent data coverage
  const { count: excellentCount, error: e3 } = await supabase
    .from('countries')
    .select('*', { count: 'exact', head: true })
    .eq('data_source_coverage', 'excellent');
  if (!e3) {
    checks.push(`✓ Countries with excellent data coverage: ${excellentCount}`);
  }

  // Check 4: Sample specific countries
  const sampleCountries = ['US', 'GB', 'DE', 'SG', 'AU'];
  for (const code of sampleCountries) {
    const { data, error } = await supabase
      .from('countries')
      .select('country_code, name, data_source_coverage')
      .eq('country_code', code)
      .single();

    if (!error && data) {
      checks.push(`✓ ${code} (${data.name}): ${data.data_source_coverage}`);
    } else {
      checks.push(`✗ ${code}: Not found or error`);
    }
  }

  checks.forEach(check => console.log('  ' + check));
  console.log('\n✅ Verification complete\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🌍 COUNTRY SEED SCRIPT');
  console.log('='.repeat(60) + '\n');

  try {
    // Seed countries
    const stats = await seedCountries();

    // Verify data
    await verifySeedData();

    // Exit with success
    process.exit(stats.errors > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { seedCountries, verifySeedData };
