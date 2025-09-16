/* eslint-disable @typescript-eslint/no-require-imports */
#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkColumns() {
  console.log('🔍 Checking ALL columns in profiles table...\n')
  
  // Method 1: Try to select all columns
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('❌ Error querying profiles:', error.message)
  } else {
    console.log('✅ Can query profiles table')
    if (data && data.length > 0) {
      console.log('📋 Columns found:', Object.keys(data[0]))
    } else {
      console.log('   (No data in table yet)')
    }
  }
  
  // Method 2: Try specifically with org_id
  console.log('\n🔍 Testing org_id column specifically...')
  const { error: orgIdError } = await supabase
    .from('profiles')
    .select('id, org_id')
    .limit(1)
  
  if (orgIdError) {
    console.error('❌ Cannot select org_id:', orgIdError.message)
    console.log('\n🚨 URGENT: Run this SQL in Supabase Dashboard:')
    console.log('   ALTER TABLE profiles ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;')
  } else {
    console.log('✅ org_id column is accessible')
  }
  
  // Method 3: Try an insert to see what columns are expected
  console.log('\n🔍 Testing insert capability...')
  const testData = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Random test UUID
    org_id: null,
    email: 'test@example.com',
    full_name: 'Test User'
  }
  
  const { error: insertError } = await supabase
    .from('profiles')
    .insert(testData)
    .select()
  
  if (insertError) {
    if (insertError.message.includes('org_id')) {
      console.error('❌ Insert failed due to org_id:', insertError.message)
    } else if (insertError.message.includes('duplicate')) {
      console.log('✅ Insert would work (test ID already exists)')
    } else {
      console.log('⚠️  Insert error:', insertError.message)
    }
  } else {
    console.log('✅ Test insert successful')
    // Clean up test data
    await supabase.from('profiles').delete().eq('id', testData.id)
  }
}

checkColumns().catch(console.error)