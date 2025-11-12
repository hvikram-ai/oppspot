#!/usr/bin/env node
 

/**
 * Test the exact insert that signup is trying to do
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function testSignupInsert() {
  // Generate proper UUIDs
  const crypto = require('crypto')
  const testUserId = crypto.randomUUID()
  const testOrgId = crypto.randomUUID()
  
  console.log('🧪 Testing the exact insert that signup does...\n')
  
  // First, try to create a test organization
  console.log('1️⃣ Creating test organization...')
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      id: testOrgId,
      name: 'Test Company',
      slug: 'test-company-' + Date.now(),
      subscription_tier: 'trial'
    })
    .select()
    .single()
  
  if (orgError) {
    console.error('❌ Cannot create organization:', orgError.message)
    return
  }
  console.log('✅ Organization created:', org.id)
  
  // Now try the exact upsert that signup does
  console.log('\n2️⃣ Testing profile upsert with org_id...')
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: testUserId,
      org_id: org.id,  // THIS IS WHERE THE ERROR HAPPENS
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'sales',
      preferences: {
        email_notifications: true,
        weekly_digest: true,
      },
      streak_count: 0,
      last_active: new Date().toISOString(),
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      onboarding_completed: false,
    })
  
  if (profileError) {
    console.error('❌ Profile upsert failed:', profileError.message)
    
    if (profileError.message.includes('org_id')) {
      console.log('\n🚨 THE org_id COLUMN IS MISSING!')
      console.log('📋 Run this SQL in Supabase Dashboard NOW:')
      console.log('\n   ALTER TABLE profiles ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;\n')
    }
  } else {
    console.log('✅ Profile created successfully with org_id!')
    
    // Clean up test data
    await supabase.from('profiles').delete().eq('id', testUserId)
    await supabase.from('organizations').delete().eq('id', testOrgId)
    console.log('🧹 Test data cleaned up')
  }
}

testSignupInsert().catch(console.error)