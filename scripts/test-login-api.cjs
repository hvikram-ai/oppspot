/* eslint-disable @typescript-eslint/no-require-imports */
#!/usr/bin/env node

/**
 * Test login API directly
 */

async function testLogin() {
  const loginUrl = 'http://localhost:3009/api/auth/signin' // Check if this endpoint exists
  const supabaseUrl = 'https://fuqdbewftdthbjfcecrz.supabase.co'
  
  console.log('🔐 Testing login with demo account...\n')
  
  // Test direct Supabase auth
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cWRiZXdmdGR0aGJqZmNlY3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDczODYsImV4cCI6MjA3MjA4MzM4Nn0.peIt7dPqPLJEp-bCsKTl4kfmmu08zjzq9iK7FV6szHY'
      },
      body: JSON.stringify({
        email: 'demo@oppspot.com',
        password: 'Demo123456!'
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Direct Supabase login successful!')
      console.log('   Access token received:', result.access_token ? 'Yes' : 'No')
      console.log('   User ID:', result.user?.id)
      console.log('   Email:', result.user?.email)
    } else {
      console.log('❌ Direct Supabase login failed:')
      console.log('   Status:', response.status)
      console.log('   Error:', result.error || result.msg || JSON.stringify(result))
    }
  } catch (error) {
    console.error('❌ Network error:', error.message)
    console.log('\n💡 This suggests:')
    console.log('   - Check if Supabase URL is correct')
    console.log('   - Check network connectivity')
    console.log('   - Check if running behind a proxy')
  }
  
  // Also test via the app's client library
  console.log('\n🔐 Testing via app client...')
  
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(
    supabaseUrl,
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cWRiZXdmdGR0aGJqZmNlY3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDczODYsImV4cCI6MjA3MjA4MzM4Nn0.peIt7dPqPLJEp-bCsKTl4kfmmu08zjzq9iK7FV6szHY'
  )
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'demo@oppspot.com',
    password: 'Demo123456!'
  })
  
  if (error) {
    console.log('❌ Client login failed:', error.message)
  } else {
    console.log('✅ Client login successful!')
    console.log('   User:', data.user?.email)
  }
}

testLogin().catch(console.error)