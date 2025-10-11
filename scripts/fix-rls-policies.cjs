/* eslint-disable @typescript-eslint/no-require-imports */
#!/usr/bin/env node

/**
 * Fix RLS policies to remove infinite recursion
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS Policies...\n')
  
  // Read the SQL file
  const sqlPath = path.join(__dirname, '..', 'FIX_RLS_POLICIES.sql')
  const sqlContent = fs.readFileSync(sqlPath, 'utf8')
  
  console.log('📋 SQL script loaded')
  console.log('⚠️  This will:')
  console.log('   - Drop existing RLS policies on profiles and organizations')
  console.log('   - Create new, non-recursive policies')
  console.log('   - Fix the infinite recursion error')
  console.log('')
  
  console.log('🚨 IMPORTANT: Run the SQL manually in Supabase Dashboard')
  console.log('   1. Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new')
  console.log('   2. Copy the contents of FIX_RLS_POLICIES.sql')
  console.log('   3. Paste and click "Run"')
  console.log('')
  
  // Test current state
  console.log('🔍 Testing current state...')
  
  // Try to query as demo user
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'demo@oppspot.com',
    password: 'Demo123456!'
  })
  
  if (error) {
    console.log('❌ Cannot login as demo:', error.message)
    return
  }
  
  console.log('✅ Logged in as demo user')
  
  // Try to get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_completed, org_id')
    .eq('id', data.user.id)
    .single()
  
  if (profileError) {
    console.log('❌ Profile query error:', profileError.message)
    if (profileError.message.includes('infinite recursion')) {
      console.log('   ⚠️  This is the RLS recursion error that needs fixing!')
      console.log('   📝 Please run FIX_RLS_POLICIES.sql in Supabase')
    }
  } else {
    console.log('✅ Profile query successful!')
    console.log('   onboarding_completed:', profile.onboarding_completed)
    console.log('   org_id:', profile.org_id)
  }
  
  await supabase.auth.signOut()
  
  console.log('\n📌 Next Steps:')
  console.log('   1. Run FIX_RLS_POLICIES.sql in Supabase SQL Editor')
  console.log('   2. Test login at http://localhost:3009/login')
  console.log('   3. You should go directly to dashboard, not onboarding')
}

fixRLSPolicies().catch(console.error)