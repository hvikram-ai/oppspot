#!/usr/bin/env node
 

/**
 * Simple Supabase authentication test
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testAuth() {
  console.log('🧪 Testing Supabase Authentication (Simple)\n')
  
  console.log('Environment:')
  console.log('  URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('  Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
  
  // Test authentication only
  console.log('\nTrying demo login...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'demo@oppspot.com',
    password: 'Demo123456!'
  })
  
  if (error) {
    console.error('❌ Authentication failed:')
    console.error('   Message:', error.message)
    console.error('   Code:', error.code)
    console.error('   Status:', error.status)
    console.error('   Full error:', JSON.stringify(error, null, 2))
    return
  }
  
  console.log('✅ Authentication successful!')
  console.log('   User ID:', data.user?.id)
  console.log('   Email:', data.user?.email)
  console.log('   Session exists:', !!data.session)
  console.log('   Access token:', data.session?.access_token?.substring(0, 20) + '...')
  
  // Sign out
  await supabase.auth.signOut()
  console.log('\n✅ Signed out successfully')
}

testAuth().catch(error => {
  console.error('Script error:', error.message)
  if (error.cause) {
    console.error('Cause:', error.cause)
  }
})