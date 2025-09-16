#!/usr/bin/env tsx

/**
 * Test script for Companies House integration
 * Run with: npx tsx scripts/test-companies-integration.ts
 */

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

const baseUrl = 'http://localhost:3009'

// Create a test user session for authenticated endpoints
async function getAuthHeaders() {
  // Use service role key to create headers
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseServiceKey}`
  }
}

// Test companies to search for
const testCompanies = [
  'Google UK',
  'Microsoft',
  'Apple',
  'Amazon',
  'Tesla'
]

async function testCompaniesHouseSearch() {
  console.log('\n🔍 Testing Companies House Search API...')
  
  for (const company of testCompanies) {
    try {
      const response = await fetch(`${baseUrl}/api/companies/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: company, limit: 3 })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Search for "${company}": Found ${data.results?.length || 0} results`)
        if (data.sources) {
          console.log(`   Sources: ${data.sources.cache || 0} cached, ${data.sources.api || 0} from API`)
        }
      } else {
        console.log(`❌ Search for "${company}" failed: ${response.statusText}`)
      }
    } catch (err) {
      console.log(`❌ Search for "${company}" error:`, err)
    }
  }
}

async function testCompanyDetails() {
  console.log('\n📋 Testing Company Details API...')
  
  // First, get a company from the database
  const { data: companies } = await supabase
    .from('businesses')
    .select('id, name, company_number')
    .not('company_number', 'is', null)
    .limit(1)
  
  if (companies && companies.length > 0) {
    const company = companies[0]
    console.log(`Testing details for: ${company.name} (${company.company_number})`)
    
    try {
      const response = await fetch(`${baseUrl}/api/companies/${company.company_number}`, {
        method: 'GET'
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Got details for company ${company.company_number}`)
        console.log(`   Status: ${data.company_status}`)
        console.log(`   Type: ${data.company_type}`)
        console.log(`   Source: ${data.source}`)
      } else {
        console.log(`❌ Failed to get details: ${response.statusText}`)
      }
    } catch (err) {
      console.log(`❌ Error getting details:`, err)
    }
  } else {
    console.log('⚠️  No companies with company_number found in database')
  }
}

async function testRefreshSystem() {
  console.log('\n🔄 Testing Automated Refresh System...')
  
  // Check refresh status
  try {
    const statusResponse = await fetch(`${baseUrl}/api/companies/refresh?hoursStale=24`)
    
    if (statusResponse.ok) {
      const status = await statusResponse.json()
      console.log('📊 Refresh Status:')
      console.log(`   Total companies: ${status.totalCompanies}`)
      console.log(`   Stale companies: ${status.staleCompanies} (${status.percentStale}%)`)
      console.log(`   Refreshed today: ${status.refreshedToday}`)
    }
  } catch (err) {
    console.log('❌ Failed to get refresh status:', err)
  }
  
  // Test refresh endpoint
  try {
    const refreshResponse = await fetch(`${baseUrl}/api/companies/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 2, force: false })
    })
    
    if (refreshResponse.ok) {
      const result = await refreshResponse.json()
      console.log(`✅ Refresh completed: ${result.message}`)
    } else {
      console.log(`❌ Refresh failed: ${refreshResponse.statusText}`)
    }
  } catch (err) {
    console.log('❌ Refresh error:', err)
  }
}

async function testEnrichmentService() {
  console.log('\n💎 Testing Data Enrichment Service...')
  
  // Get a business to enrich
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name')
    .limit(1)
  
  if (businesses && businesses.length > 0) {
    const business = businesses[0]
    console.log(`Testing enrichment for: ${business.name}`)
    
    // Check enrichment status
    try {
      const statusResponse = await fetch(`${baseUrl}/api/companies/enrich?businessId=${business.id}`)
      
      if (statusResponse.ok) {
        const status = await statusResponse.json()
        console.log('📊 Enrichment Status:')
        console.log(`   Completeness: ${status.stats.completeness}%`)
        console.log(`   Sources used: ${status.stats.sources.join(', ') || 'none'}`)
        console.log(`   Available sources: ${status.availableSources.join(', ') || 'none'}`)
      }
    } catch (err) {
      console.log('❌ Failed to get enrichment status:', err)
    }
    
    // Test enrichment
    try {
      const enrichResponse = await fetch(`${baseUrl}/api/companies/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          sources: ['companies_house'],
          autoApply: true
        })
      })
      
      if (enrichResponse.ok) {
        const result = await enrichResponse.json()
        console.log('✅ Enrichment completed:')
        result.results.forEach((r) => {
          console.log(`   ${r.source}: ${r.success ? '✅' : '❌'} ${r.error || ''}`)
        })
      } else {
        console.log(`❌ Enrichment failed: ${enrichResponse.statusText}`)
      }
    } catch (err) {
      console.log('❌ Enrichment error:', err)
    }
  } else {
    console.log('⚠️  No businesses found in database')
  }
}

async function testMainSearchIntegration() {
  console.log('\n🔎 Testing Main Search Integration...')
  
  // Test searching for a company name
  try {
    const response = await fetch(`${baseUrl}/api/search?q=Google&limit=10`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Main search for "Google": Found ${data.results?.length || 0} results`)
      
      // Check if any results are from Companies House
      const companiesHouseResults = data.results?.filter((r: { metadata?: { company_number?: string } }) => r.metadata?.company_number)
      if (companiesHouseResults?.length > 0) {
        console.log(`   ✅ ${companiesHouseResults.length} results from Companies House`)
      }
      
      if (data.sources) {
        console.log(`   Sources: DB: ${data.sources.database}, CH: ${data.sources.companies_house}`)
      }
    } else {
      console.log(`❌ Main search failed: ${response.statusText}`)
    }
  } catch (err) {
    console.log('❌ Main search error:', err)
  }
}

async function testDatabaseIntegration() {
  console.log('\n💾 Testing Database Integration...')
  
  // Check if Companies House fields exist
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, company_number, company_status, companies_house_last_updated')
    .not('company_number', 'is', null)
    .limit(5)
  
  if (businesses && businesses.length > 0) {
    console.log(`✅ Found ${businesses.length} companies with Companies House data:`)
    businesses.forEach(b => {
      const cached = b.companies_house_last_updated 
        ? `cached ${new Date(b.companies_house_last_updated).toLocaleDateString()}`
        : 'not cached'
      console.log(`   - ${b.name}: ${b.company_number} (${b.company_status || 'unknown'}) - ${cached}`)
    })
  } else {
    console.log('⚠️  No Companies House data in database yet')
  }
}

async function runAllTests() {
  console.log('🚀 Starting Companies House Integration Tests...')
  console.log('=' .repeat(50))
  
  await testDatabaseIntegration()
  await testCompaniesHouseSearch()
  await testCompanyDetails()
  await testRefreshSystem()
  await testEnrichmentService()
  await testMainSearchIntegration()
  
  console.log('\n' + '=' .repeat(50))
  console.log('✨ All tests completed!')
}

// Run tests
runAllTests().catch(console.error)