#!/usr/bin/env node

/**
 * Quick script to verify if org_id column exists in profiles table
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkOrgId() {
  console.log('🔍 Checking for org_id column in profiles table...\n')
  
  try {
    // Try to select org_id column
    const { data, error } = await supabase
      .from('profiles')
      .select('id, org_id')
      .limit(1)
    
    if (error) {
      if (error.message.includes('org_id')) {
        console.error('❌ org_id column DOES NOT exist!')
        console.error('   Error:', error.message)
        console.log('\n📋 To fix this:')
        console.log('   1. Open QUICK_FIX_SIGNUP.md')
        console.log('   2. Follow the instructions to run the SQL in Supabase')
        return false
      } else {
        console.log('⚠️  Query error (not related to org_id):', error.message)
      }
    } else {
      console.log('✅ org_id column EXISTS in profiles table!')
      console.log('   Signup should work now.')
      return true
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
    return false
  }
  
  // Also check if organizations table has all columns
  console.log('\n🔍 Checking organizations table structure...')
  
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .limit(1)
  
  if (orgError) {
    console.log('⚠️  Organizations table issue:', orgError.message)
  } else {
    console.log('✅ Organizations table is accessible')
    if (orgData && orgData.length === 0) {
      console.log('   (No organizations yet - this is normal)')
    }
  }
  
  return true
}

checkOrgId().then(success => {
  if (success) {
    console.log('\n🎉 Database is ready for signups!')
    console.log('   You can now:')
    console.log('   - Use the signup form at /signup')
    console.log('   - Run: npm run create-account')
  } else {
    console.log('\n❌ Database needs fixing before signups will work')
    process.exit(1)
  }
})