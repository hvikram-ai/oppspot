#!/usr/bin/env node
 

/**
 * Test Opp Scan creation
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function testOppScan() {
  console.log('🧪 Testing Opp Scan Creation\n')
  
  // Get demo user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, org_id, email')
    .eq('email', 'demo@oppspot.com')
    .single()
  
  if (!profile) {
    console.error('❌ Demo user not found')
    return
  }
  
  console.log('✅ Using demo user:', profile.email)
  console.log('   User ID:', profile.id)
  console.log('   Org ID:', profile.org_id)
  
  // Create a test scan
  console.log('\n📝 Creating test Opp Scan...')
  
  const scanData = {
    user_id: profile.id,
    org_id: profile.org_id,
    name: 'Test Acquisition Scan',
    description: 'Testing scan functionality after migration',
    status: 'configuring',
    selected_industries: ['technology', 'software'],
    selected_regions: ['london', 'manchester'],
    required_capabilities: ['cloud-services', 'data-analytics'],
    scan_depth: 'comprehensive',
    current_step: 'industry_selection',
    targets_identified: 0,
    targets_analyzed: 0,
    progress_percentage: 0
  }
  
  const { data: scan, error } = await supabase
    .from('acquisition_scans')
    .insert(scanData)
    .select()
    .single()
  
  if (error) {
    console.error('❌ Failed to create scan:', error.message)
    console.error('   Error code:', error.code)
    return
  }
  
  console.log('✅ Scan created successfully!')
  console.log('   Scan ID:', scan.id)
  console.log('   Name:', scan.name)
  console.log('   Status:', scan.status)
  
  // Test reading the scan back
  console.log('\n🔍 Verifying scan retrieval...')
  
  const { data: retrievedScan, error: readError } = await supabase
    .from('acquisition_scans')
    .select('*')
    .eq('id', scan.id)
    .single()
  
  if (readError) {
    console.error('❌ Failed to retrieve scan:', readError.message)
  } else {
    console.log('✅ Scan retrieved successfully')
    console.log('   Industries:', retrievedScan.selected_industries)
    console.log('   Regions:', retrievedScan.selected_regions)
  }
  
  // Clean up test data
  console.log('\n🧹 Cleaning up test data...')
  const { error: deleteError } = await supabase
    .from('acquisition_scans')
    .delete()
    .eq('id', scan.id)
  
  if (deleteError) {
    console.error('⚠️  Failed to clean up:', deleteError.message)
  } else {
    console.log('✅ Test data cleaned up')
  }
  
  console.log('\n🎉 Opp Scan feature is working!')
  console.log('   You can now create scans at: http://localhost:3009/opp-scan/new')
}

testOppScan().catch(console.error)