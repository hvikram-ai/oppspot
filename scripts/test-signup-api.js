#!/usr/bin/env node

/**
 * Test the signup API endpoint directly
 */

const fetch = require('node-fetch')
require('dotenv').config({ path: '.env.local' })

async function testSignupAPI() {
  console.log('🧪 Testing signup API endpoint...\n')
  
  // Generate test data
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'
  
  // First, we need to create an auth user via Supabase
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  
  console.log('1️⃣ Creating test auth user...')
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  })
  
  if (authError) {
    console.error('❌ Failed to create auth user:', authError.message)
    return
  }
  
  console.log('✅ Auth user created:', authData.user.id)
  
  // Now test the signup API
  console.log('\n2️⃣ Testing signup API with org_id...')
  
  const response = await fetch('http://localhost:3001/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: authData.user.id,
      email: testEmail,
      fullName: 'Test User',
      companyName: 'Test Company',
      role: 'sales'
    })
  }).catch(err => {
    console.error('❌ Failed to call API:', err.message)
    console.log('   Make sure the dev server is running: npm run dev')
    return null
  })
  
  if (!response) return
  
  const result = await response.json()
  
  if (response.ok) {
    console.log('✅ Signup API succeeded!')
    console.log('   Organization:', result.organization)
    
    // Clean up test data
    console.log('\n3️⃣ Cleaning up test data...')
    await supabase.auth.admin.deleteUser(authData.user.id)
    console.log('✅ Test completed successfully!')
    
    console.log('\n🎉 SIGNUP IS WORKING! The org_id column fix was successful.')
  } else {
    console.error('❌ Signup API failed:', result.error)
    if (result.error && result.error.includes('org_id')) {
      console.log('\n⚠️  The org_id column might still be missing in some environments')
    }
  }
}

testSignupAPI().catch(console.error)