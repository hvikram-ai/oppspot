import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkUser() {
  const email = 'hvikram.ai@gmail.com'
  
  // Get user from auth
  const { data: users, error: authError } = await supabase.auth.admin.listUsers()
  const user = users?.users.find(u => u.email === email)
  
  if (!user) {
    console.log('❌ User not found in auth')
    return
  }
  
  console.log('✅ User found:', user.id)
  console.log('Email:', user.email)
  console.log('Email confirmed:', user.email_confirmed_at)
  console.log('Created at:', user.created_at)
  
  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single()
  
  if (profileError) {
    console.log('\n❌ Profile error:', profileError.message)
  } else if (profile) {
    console.log('\n👤 Profile:')
    console.log('Name:', profile.full_name)
    console.log('Role:', profile.role)
    console.log('Org:', profile.organizations?.name)
    console.log('Tier:', profile.organizations?.subscription_tier)
    console.log('Onboarding completed:', profile.onboarding_completed)
  } else {
    console.log('\n⚠️  No profile found')
  }
}

checkUser().catch(console.error)
