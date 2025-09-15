#!/usr/bin/env node

/**
 * Simple test for Companies House API integration
 */

require('dotenv').config({ path: '.env.local' })

const API_KEY = process.env.COMPANIES_HOUSE_API_KEY

async function testAPI() {
  console.log('\n🔍 Testing Companies House API...\n')
  
  if (!API_KEY) {
    console.log('❌ No API key found in .env.local')
    return
  }
  
  console.log('✅ API key found\n')
  
  // Test search
  console.log('📋 Searching for "Google UK"...')
  
  const auth = Buffer.from(`${API_KEY}:`).toString('base64')
  
  try {
    const response = await fetch(
      'https://api.company-information.service.gov.uk/search/companies?q=Google%20UK&items_per_page=3',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        }
      }
    )
    
    if (!response.ok) {
      console.log(`❌ API error: ${response.status}`)
      return
    }
    
    const data = await response.json()
    
    console.log(`✅ Found ${data.total_results} results\n`)
    
    if (data.items && data.items.length > 0) {
      console.log('Top results:')
      data.items.forEach((company, i) => {
        console.log(`\n${i + 1}. ${company.title}`)
        console.log(`   Number: ${company.company_number}`)
        console.log(`   Status: ${company.company_status}`)
        console.log(`   Type: ${company.company_type}`)
        if (company.date_of_incorporation) {
          console.log(`   Incorporated: ${company.date_of_incorporation}`)
        }
        if (company.address) {
          const addr = company.address
          console.log(`   Address: ${[addr.premises, addr.address_line_1, addr.locality, addr.postal_code].filter(Boolean).join(', ')}`)
        }
      })
      
      // Get details of first company
      if (data.items[0]) {
        console.log(`\n📊 Getting details for ${data.items[0].title}...`)
        
        const detailResponse = await fetch(
          `https://api.company-information.service.gov.uk/company/${data.items[0].company_number}`,
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json',
            }
          }
        )
        
        if (detailResponse.ok) {
          const company = await detailResponse.json()
          console.log('\n✅ Company details:')
          console.log(`   Full name: ${company.company_name}`)
          console.log(`   Number: ${company.company_number}`)
          console.log(`   Status: ${company.company_status}`)
          console.log(`   Type: ${company.type}`)
          console.log(`   Incorporated: ${company.date_of_incorporation}`)
          
          if (company.sic_codes) {
            console.log(`   SIC codes: ${company.sic_codes.join(', ')}`)
          }
          
          if (company.registered_office_address) {
            const addr = company.registered_office_address
            console.log(`   Registered office: ${[addr.address_line_1, addr.locality, addr.postal_code].filter(Boolean).join(', ')}`)
          }
          
          if (company.accounts) {
            console.log(`   Next accounts due: ${company.accounts.next_due || 'N/A'}`)
          }
        }
      }
    }
    
    console.log('\n🎉 Companies House API is working!\n')
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
  }
}

testAPI()