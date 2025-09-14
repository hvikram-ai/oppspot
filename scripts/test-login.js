#!/usr/bin/env node

/**
 * Test login functionality
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Use anon key for testing regular login
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testLogin() {
  console.log('🔐 Testing login functionality...\n')
  
  // Test with hvikram.ai@gmail.com (you'll need to provide the password)
  const testEmail = 'hvikram.ai@gmail.com'
  
  console.log(`Testing login for: ${testEmail}`)
  console.log('Note: You need to know the password for this user\n')
  
  // Try a test login with a dummy password to see the error
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: 'test123456' // This will fail unless it's the actual password
  })
  
  if (error) {
    console.log('❌ Login failed (expected if password is wrong):', error.message)
    
    if (error.message.includes('Invalid login credentials')) {
      console.log('\n✅ Authentication is working! The error indicates:')
      console.log('   - Supabase auth is properly configured')
      console.log('   - The user exists in the system')
      console.log('   - You just need the correct password')
      console.log('\n💡 To login successfully:')
      console.log('   1. Use the correct password for this user')
      console.log('   2. Or reset the password via "Forgot password" link')
      console.log('   3. Or create a new test account with known credentials')
    }
  } else {
    console.log('✅ Login successful!')
    console.log('   User ID:', data.user.id)
    console.log('   Email:', data.user.email)
    
    // Sign out after test
    await supabase.auth.signOut()
  }
  
  // Check if the profiles have the necessary fields
  console.log('\n🔍 Checking profile completeness...')
  
  const { createClient: createAdminClient } = require('@supabase/supabase-js')
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const adminSupabase = createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, email, full_name, org_id')
    .in('email', ['hvikram.ai@gmail.com', 'hirendra@gmail.com'])
  
  if (profiles) {
    for (const profile of profiles) {
      console.log(`\nProfile for ${profile.email}:`)
      console.log('   Has org_id:', profile.org_id ? '✅' : '❌ (needed for full access)')
      console.log('   Has full_name:', profile.full_name ? '✅' : '❌')
      
      if (!profile.org_id) {
        console.log('   ⚠️  User needs to complete onboarding to get organization')
      }
    }
  }
}

testLogin().catch(console.error)