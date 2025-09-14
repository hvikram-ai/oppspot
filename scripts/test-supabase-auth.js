#!/usr/bin/env node

/**
 * Test Supabase authentication
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testAuth() {
  console.log('🧪 Testing Supabase Authentication\n')
  
  // Test 1: Check connection
  console.log('1. Testing Supabase connection...')
  const { data: healthCheck, error: healthError } = await supabase
    .from('profiles')
    .select('count')
    .limit(0)
  
  if (healthError) {
    console.error('❌ Supabase connection failed:', healthError.message)
    return
  }
  console.log('✅ Supabase connection successful\n')
  
  // Test 2: Try demo login
  console.log('2. Testing demo account login...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'demo@oppspot.com',
    password: 'Demo123456!'
  })
  
  if (error) {
    console.error('❌ Authentication failed:', error.message)
    console.error('   Error code:', error.code)
    console.error('   Error status:', error.status)
    return
  }
  
  console.log('✅ Authentication successful!')
  console.log('   User ID:', data.user?.id)
  console.log('   Email:', data.user?.email)
  console.log('   Session:', data.session ? 'Active' : 'None')
  
  // Test 3: Get user profile
  console.log('\n3. Testing profile retrieval...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user?.id)
    .single()
  
  if (profileError) {
    console.error('❌ Profile retrieval failed:', profileError.message)
  } else {
    console.log('✅ Profile retrieved successfully')
    console.log('   Name:', profile.full_name || profile.email)
    console.log('   Role:', profile.role)
  }
  
  // Sign out
  await supabase.auth.signOut()
  console.log('\n✅ Test completed - signed out')
}

testAuth().catch(console.error)