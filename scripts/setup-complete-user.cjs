#!/usr/bin/env node
 

/**
 * Set up a complete user with organization for testing
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function setupCompleteUser() {
  console.log('🚀 Setting up complete user with organization...\n')
  
  const email = 'demo@oppspot.com'
  const password = 'Demo123456!'
  
  try {
    // 1. Check if user already exists
    const { data: { users } } = await supabase.auth.admin.listUsers()
    let user = users.find(u => u.email === email)
    
    if (user) {
      console.log('✅ User already exists, updating password...')
      // Update password
      await supabase.auth.admin.updateUserById(user.id, { password })
    } else {
      // Create new user
      console.log('Creating new user...')
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: 'Demo User'
        }
      })
      
      if (authError) throw authError
      user = authData.user
      console.log('✅ User created')
    }
    
    // 2. Check/Create organization
    console.log('Setting up organization...')
    
    // Check if user already has an org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()
    
    let orgId = profile?.org_id
    
    if (!orgId) {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Demo Company Ltd',
          slug: 'demo-company-' + Date.now(),
          subscription_tier: 'trial',
          industry: 'Technology',
          company_size: '11-50'
        })
        .select()
        .single()
      
      if (orgError) throw orgError
      orgId = org.id
      console.log('✅ Organization created')
    } else {
      console.log('✅ Organization already exists')
    }
    
    // 3. Update profile with complete information
    console.log('Updating profile...')
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        org_id: orgId,
        email: email,
        full_name: 'Demo User',
        role: 'sales',
        preferences: {
          email_notifications: true,
          weekly_digest: true
        },
        streak_count: 0,
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        onboarding_completed: true,
        email_verified_at: new Date().toISOString()
      })
    
    if (profileError) throw profileError
    console.log('✅ Profile updated')
    
    console.log('\n🎉 Setup complete!')
    console.log('\n📝 Login credentials:')
    console.log('   Email:', email)
    console.log('   Password:', password)
    console.log('\n✨ This user has:')
    console.log('   - Verified email')
    console.log('   - Complete profile')
    console.log('   - Organization assigned')
    console.log('   - Trial subscription')
    console.log('\n🚀 Login at:')
    console.log('   http://localhost:3001/login')
    console.log('   https://oppspot.vercel.app/login')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

setupCompleteUser()