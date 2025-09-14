#!/usr/bin/env node

/**
 * Quick test to verify signup works with org_id
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function quickTest() {
  console.log('🧪 Quick signup test with org_id...\n')
  
  const testEmail = `test-${Date.now()}@example.com`
  
  try {
    // 1. Create auth user
    console.log('Creating test user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPass123!',
      email_confirm: true
    })
    
    if (authError) throw authError
    console.log('✅ User created:', authData.user.id)
    
    // 2. Create organization
    console.log('Creating organization...')
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Test Company',
        slug: 'test-' + Date.now(),
        subscription_tier: 'trial'
      })
      .select()
      .single()
    
    if (orgError) throw orgError
    console.log('✅ Organization created:', org.id)
    
    // 3. Create profile WITH org_id (this is where it would fail if column missing)
    console.log('Creating profile with org_id...')
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        org_id: org.id,  // THIS IS THE KEY TEST
        email: testEmail,
        full_name: 'Test User',
        role: 'sales'
      })
    
    if (profileError) throw profileError
    console.log('✅ Profile created with org_id!')
    
    // 4. Clean up
    await supabase.auth.admin.deleteUser(authData.user.id)
    await supabase.from('organizations').delete().eq('id', org.id)
    
    console.log('\n🎉 SUCCESS! Signup with org_id is working!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    if (error.message.includes('org_id')) {
      console.log('\n⚠️  org_id column issue detected')
      console.log('Run this SQL: ALTER TABLE profiles ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;')
    }
  }
}

quickTest()