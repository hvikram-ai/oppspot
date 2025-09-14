#!/usr/bin/env node

/**
 * Check if profiles exist for authenticated users
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkUserProfiles() {
  console.log('🔍 Checking user profiles...\n')
  
  // User IDs from the screenshot
  const userIds = [
    '4af82612-2a9f-4e5f-8dc3-02296c43d67e', // hvikram.ai@gmail.com
    '5852ae5a-9454-4a4f-90cb-72aa1db64e1c'  // hirendra@gmail.com
  ]
  
  for (const userId of userIds) {
    console.log(`Checking user: ${userId}`)
    
    // Check if profile exists
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ No profile found for this user')
        console.log('   Creating profile now...')
        
        // Get user info from auth
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
        
        if (user && !userError) {
          // Create profile
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (createError) {
            console.log('   ❌ Failed to create profile:', createError.message)
          } else {
            console.log('   ✅ Profile created successfully')
          }
        }
      } else {
        console.log('❌ Error checking profile:', error.message)
      }
    } else {
      console.log('✅ Profile exists')
      console.log('   Email:', profile.email)
      console.log('   Full Name:', profile.full_name)
      console.log('   Org ID:', profile.org_id || 'None')
    }
    
    console.log('')
  }
  
  // Also check for any auth users without profiles
  console.log('🔍 Checking for auth users without profiles...\n')
  
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (!usersError && users) {
    for (const user of users) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
      
      if (!profile) {
        console.log(`⚠️  User ${user.email} (${user.id}) has no profile`)
      }
    }
  }
}

checkUserProfiles().catch(console.error)