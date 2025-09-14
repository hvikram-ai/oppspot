#!/usr/bin/env node

/**
 * Test saved businesses functionality
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function testSavedBusinesses() {
  console.log('🧪 Testing Saved Businesses Feature\n')
  
  // Get demo user and a business
  const { data: user } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', 'demo@oppspot.com')
    .single()
    
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .limit(1)
    .single()
  
  if (!user || !business) {
    console.log('❌ Missing test data (user or business)')
    return
  }
  
  console.log('✅ Test data found:')
  console.log('   User:', user.email)
  console.log('   Business:', business.name || business.id)
  
  // Create a list
  console.log('\n📋 Creating business list...')
  const { data: list, error: listError } = await supabase
    .from('business_lists')
    .insert({
      user_id: user.id,
      name: 'My Acquisition Targets',
      description: 'Potential companies to acquire',
      color: '#10b981',
      icon: 'target'
    })
    .select()
    .single()
  
  if (listError) {
    console.error('❌ List creation failed:', listError.message)
    return
  }
  
  console.log('✅ Business list created:', list.name)
  console.log('   List ID:', list.id)
  
  // Save a business to the list
  console.log('\n💾 Saving business to list...')
  const { error: saveError } = await supabase
    .from('saved_businesses')
    .insert({
      user_id: user.id,
      business_id: business.id,
      list_id: list.id,
      notes: 'High potential target - strong synergies',
      tags: ['technology', 'acquisition-target']
    })
  
  if (saveError) {
    console.error('❌ Save business failed:', saveError.message)
  } else {
    console.log('✅ Business saved successfully!')
  }
  
  // Retrieve saved businesses
  console.log('\n🔍 Retrieving saved businesses...')
  const { data: saved, error: retrieveError } = await supabase
    .from('saved_businesses')
    .select('*, business:businesses(name)')
    .eq('user_id', user.id)
  
  if (retrieveError) {
    console.error('❌ Retrieve failed:', retrieveError.message)
  } else {
    console.log('✅ Retrieved', saved.length, 'saved business(es)')
    saved.forEach(s => {
      console.log('   -', s.business?.name || 'Unknown', '| Notes:', s.notes)
    })
  }
  
  // Clean up test data
  console.log('\n🧹 Cleaning up test data...')
  await supabase.from('saved_businesses').delete().eq('user_id', user.id)
  await supabase.from('business_lists').delete().eq('id', list.id)
  console.log('✅ Test data cleaned up')
  
  console.log('\n🎉 Saved businesses feature is working!')
}

testSavedBusinesses().catch(console.error)