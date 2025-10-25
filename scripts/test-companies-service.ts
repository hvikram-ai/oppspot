#!/usr/bin/env tsx

/**
 * Direct test of Companies House service
 * Run with: npx tsx scripts/test-companies-service.ts
 */

import { CompaniesHouseService } from '../lib/services/companies-house'
import { DataEnrichmentService } from '../lib/services/data-enrichment'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const companiesHouseApiKey = process.env.COMPANIES_HOUSE_API_KEY!

if (!supabaseUrl || !supabaseServiceKey || !companiesHouseApiKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testCompaniesHouseService() {
  console.log('\n🏢 Testing Companies House Service...')
  
  const service = new CompaniesHouseService()
  
  // Test search
  console.log('\n1️⃣ Testing company search...')
  try {
    const searchResult = await service.searchCompanies('Microsoft', 5)
    const results = searchResult.items || []
    console.log(`✅ Found ${results.length} companies (Total: ${searchResult.total_results})`)
    results.forEach(r => {
      console.log(`   - ${r.title} (${r.company_number}) - ${r.company_status}`)
    })
    
    // Test getting profile for first result
    if (results.length > 0) {
      console.log('\n2️⃣ Testing company profile fetch...')
      const profile = await service.getCompanyProfile(results[0].company_number)
      if (profile) {
        console.log(`✅ Got profile for ${profile.company_name}`)
        console.log(`   Status: ${profile.company_status}`)
        console.log(`   Type: ${profile.type}`)
        console.log(`   Incorporated: ${(profile as any).date_of_creation}`)
        
        // Test formatting for database
        console.log('\n3️⃣ Testing database formatting...')
        const formatted = service.formatForDatabase(profile)
        console.log('✅ Formatted data for database:')
        console.log(`   Fields populated: ${Object.keys(formatted).length}`)
      }
    }
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

async function testEnrichmentService() {
  console.log('\n💎 Testing Data Enrichment Service...')
  
  const service = new DataEnrichmentService()
  
  // Get or create a test business
  console.log('\n1️⃣ Finding/creating test business...')
  
  // First try to find an existing business
  let { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('name', 'Microsoft Limited')
    .single()
  
  if (!business) {
    // Create a test business
    const { data: created } = await supabase
      .from('businesses')
      .insert({
        name: 'Microsoft Limited',
        description: 'Technology company',
        categories: ['Technology', 'Software']
      })
      .select()
      .single()
    
    business = created
  }
  
  if (business) {
    console.log(`✅ Using business: ${business.name} (ID: ${business.id})`)
    
    // Test enrichment
    console.log('\n2️⃣ Testing enrichment...')
    const results = await service.enrichBusiness(business, ['companies_house'])
    
    console.log('📊 Enrichment Results:')
    results.forEach(r => {
      console.log(`   ${r.source}: ${r.success ? '✅' : '❌'} ${r.error || ''}`)
      if (r.success && r.data) {
        console.log(`      Fields enriched: ${Object.keys(r.data).length}`)
      }
    })
    
    // Get stats
    console.log('\n3️⃣ Testing enrichment stats...')
    const stats = service.getEnrichmentStats(business)
    console.log('📊 Business Stats:')
    console.log(`   Completeness: ${stats.completeness}%`)
    console.log(`   Sources: ${stats.sources.join(', ') || 'none'}`)
    console.log(`   Last enriched: ${stats.lastEnriched || 'never'}`)
  }
}

async function testDatabaseIntegration() {
  console.log('\n💾 Testing Database Integration...')
  
  // Check if migration was successful
  console.log('\n1️⃣ Checking Companies House columns...')
  
  const { data: sample } = await supabase
    .from('businesses')
    .select('*')
    .limit(1)
    .single()
  
  if (sample) {
    const companiesHouseFields = [
      'company_number',
      'company_status',
      'company_type',
      'incorporation_date',
      'companies_house_last_updated'
    ]
    
    const hasFields = companiesHouseFields.every(field => field in sample)
    
    if (hasFields) {
      console.log('✅ All Companies House fields present in database')
    } else {
      console.log('⚠️  Some Companies House fields missing')
      companiesHouseFields.forEach(field => {
        console.log(`   ${field}: ${field in sample ? '✅' : '❌'}`)
      })
    }
  }
  
  // Count Companies House enriched businesses
  console.log('\n2️⃣ Counting enriched businesses...')
  
  const { count: totalCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
  
  const { count: enrichedCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .not('company_number', 'is', null)
  
  console.log(`📊 Database Statistics:`)
  console.log(`   Total businesses: ${totalCount || 0}`)
  console.log(`   Companies House enriched: ${enrichedCount || 0}`)
  console.log(`   Enrichment coverage: ${totalCount ? Math.round((enrichedCount || 0) / totalCount * 100) : 0}%`)
}

async function runAllTests() {
  console.log('🚀 Starting Companies House Service Tests...')
  console.log('=' .repeat(50))
  
  await testDatabaseIntegration()
  await testCompaniesHouseService()
  await testEnrichmentService()
  
  console.log('\n' + '=' .repeat(50))
  console.log('✨ All tests completed!')
}

// Run tests
runAllTests().catch(console.error)