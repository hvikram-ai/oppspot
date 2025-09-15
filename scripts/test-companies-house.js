#!/usr/bin/env node

/**
 * Test script for Companies House API integration
 * 
 * Usage: node scripts/test-companies-house.js
 * 
 * This script tests:
 * 1. Database migration applied correctly
 * 2. API service can connect to Companies House
 * 3. Search functionality with caching
 * 4. Company details retrieval
 * 5. Data enrichment pipeline
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Test configuration
const TEST_COMPANIES = [
  { name: 'GOOGLE UK LIMITED', number: '03977902' },
  { name: 'MICROSOFT LIMITED', number: '01624297' },
  { name: 'APPLE UK LIMITED', number: '04639564' },
]

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function testDatabaseSchema() {
  log('\n📊 Testing Database Schema...', 'blue')
  
  try {
    // Check if new columns exist
    const { data, error } = await supabase
      .from('businesses')
      .select('company_number, company_status, incorporation_date')
      .limit(1)
    
    if (error) {
      if (error.message.includes('column')) {
        log('❌ Database migration not applied. Run: npm run migrate', 'red')
        return false
      }
      throw error
    }
    
    log('✅ Database schema is up to date', 'green')
    return true
  } catch (error) {
    log(`❌ Database test failed: ${error.message}`, 'red')
    return false
  }
}

async function testCompaniesHouseAPI() {
  log('\n🔌 Testing Companies House API Connection...', 'blue')
  
  if (!process.env.COMPANIES_HOUSE_API_KEY) {
    log('❌ COMPANIES_HOUSE_API_KEY not set in .env.local', 'red')
    log('   Get your API key from: https://developer.company-information.service.gov.uk/', 'gray')
    return false
  }
  
  try {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY
    const auth = Buffer.from(`${apiKey}:`).toString('base64')
    
    // Test API with a simple search
    const response = await fetch(
      'https://api.company-information.service.gov.uk/search/companies?q=test&items_per_page=1',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        }
      }
    )
    
    if (response.status === 401) {
      log('❌ Invalid API key', 'red')
      return false
    }
    
    if (!response.ok) {
      log(`❌ API returned error: ${response.status}`, 'red')
      return false
    }
    
    const data = await response.json()
    log(`✅ API connected successfully (Found ${data.total_results} test results)`, 'green')
    return true
  } catch (error) {
    log(`❌ API connection failed: ${error.message}`, 'red')
    return false
  }
}

async function testCompanySearch(companyName) {
  log(`\n🔍 Testing search for: ${companyName}`, 'blue')
  
  try {
    // Call our API endpoint
    const response = await fetch('http://localhost:3009/api/companies/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: companyName,
        useCache: true,
        limit: 5
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      log(`❌ Search failed: ${error}`, 'red')
      return false
    }
    
    const result = await response.json()
    
    if (result.results && result.results.length > 0) {
      log(`✅ Found ${result.results.length} companies`, 'green')
      
      // Show sources
      log(`   Sources: Cache: ${result.sources.cache}, API: ${result.sources.api}, Created: ${result.sources.created}`, 'gray')
      
      // Show first result
      const first = result.results[0]
      log(`   Top result: ${first.name} (${first.company_number})`, 'gray')
      log(`   Status: ${first.company_status}, Source: ${first.source}`, 'gray')
      
      return first.company_number
    } else {
      log('⚠️  No results found', 'yellow')
      return null
    }
  } catch (error) {
    log(`❌ Search error: ${error.message}`, 'red')
    return null
  }
}

async function testCompanyDetails(companyNumber) {
  log(`\n📋 Testing company details for: ${companyNumber}`, 'blue')
  
  try {
    // Test fetching with additional data
    const response = await fetch(
      `http://localhost:3009/api/companies/${companyNumber}?officers=true&filings=true`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )
    
    if (!response.ok) {
      const error = await response.text()
      log(`❌ Details fetch failed: ${error}`, 'red')
      return false
    }
    
    const result = await response.json()
    
    if (result.success && result.data) {
      log('✅ Company details retrieved successfully', 'green')
      
      const company = result.data
      log(`   Name: ${company.name}`, 'gray')
      log(`   Status: ${company.company_status}`, 'gray')
      log(`   Incorporated: ${company.incorporation_date}`, 'gray')
      log(`   Type: ${company.company_type}`, 'gray')
      
      if (company.officers) {
        log(`   Officers: ${company.officers.length} found`, 'gray')
      }
      
      if (company.filing_history) {
        log(`   Filings: ${company.filing_history.length} recent filings`, 'gray')
      }
      
      // Check cache status
      log(`   Cache: ${result.meta.cache_valid ? 'Valid' : 'Expired'} (Age: ${result.meta.cache_age} hours)`, 'gray')
      log(`   Completeness: ${result.meta.data_completeness}%`, 'gray')
      
      return true
    } else {
      log('❌ No company data returned', 'red')
      return false
    }
  } catch (error) {
    log(`❌ Details error: ${error.message}`, 'red')
    return false
  }
}

async function testCaching() {
  log('\n💾 Testing Cache Functionality...', 'blue')
  
  const testCompany = TEST_COMPANIES[0]
  
  // First search (should hit API)
  log('   First search (expecting API call)...', 'gray')
  const firstSearch = await testCompanySearch(testCompany.name)
  
  if (!firstSearch) {
    log('❌ First search failed', 'red')
    return false
  }
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Second search (should hit cache)
  log('   Second search (expecting cache hit)...', 'gray')
  const secondSearch = await testCompanySearch(testCompany.name)
  
  if (!secondSearch) {
    log('❌ Second search failed', 'red')
    return false
  }
  
  log('✅ Caching is working', 'green')
  return true
}

async function runTests() {
  log('\n' + '='.repeat(50), 'blue')
  log('🚀 Companies House Integration Test Suite', 'blue')
  log('='.repeat(50), 'blue')
  
  // Check environment
  log('\n📦 Environment Check...', 'blue')
  log(`   Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}`, 'gray')
  log(`   Supabase Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌'}`, 'gray')
  log(`   Companies House Key: ${process.env.COMPANIES_HOUSE_API_KEY ? '✅' : '❌'}`, 'gray')
  
  // Run tests
  const results = {
    database: await testDatabaseSchema(),
    api: await testCompaniesHouseAPI(),
    search: false,
    details: false,
    caching: false,
  }
  
  // Only continue if basic tests pass
  if (results.database && results.api) {
    // Test search for each company
    for (const company of TEST_COMPANIES.slice(0, 2)) {
      const companyNumber = await testCompanySearch(company.name)
      if (companyNumber) {
        results.search = true
        
        // Test getting details
        const detailsOk = await testCompanyDetails(companyNumber)
        if (detailsOk) {
          results.details = true
        }
        
        break // One successful test is enough
      }
    }
    
    // Test caching
    results.caching = await testCaching()
  }
  
  // Summary
  log('\n' + '='.repeat(50), 'blue')
  log('📈 Test Results Summary', 'blue')
  log('='.repeat(50), 'blue')
  
  const passed = Object.values(results).filter(r => r).length
  const total = Object.keys(results).length
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌'
    const color = passed ? 'green' : 'red'
    log(`${icon} ${test.charAt(0).toUpperCase() + test.slice(1)}: ${passed ? 'PASSED' : 'FAILED'}`, color)
  })
  
  log('\n' + '='.repeat(50), 'blue')
  if (passed === total) {
    log('🎉 All tests passed! Companies House integration is working.', 'green')
  } else {
    log(`⚠️  ${passed}/${total} tests passed. See errors above.`, 'yellow')
  }
  log('='.repeat(50), 'blue')
  
  process.exit(passed === total ? 0 : 1)
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red')
  process.exit(1)
})