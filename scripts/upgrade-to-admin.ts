import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function upgradeToAdmin() {
  const email = 'hvikram.ai@gmail.com'
  const userId = '4af82612-2a9f-4e5f-8dc3-02296c43d67e'
  
  console.log('🚀 Upgrading user to admin with enterprise organization...\n')
  
  try {
    // Step 1: Create or find organization
    console.log('🏢 Creating BoardGuru organization...')
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('name', 'BoardGuru')
      .single()
    
    let orgId: string
    
    if (existingOrg) {
      console.log('✅ Organization already exists, updating...')
      const { data: updatedOrg, error: updateError } = await supabase
        .from('organizations')
        .update({
          subscription_tier: 'enterprise',
          onboarding_step: 999
        })
        .eq('id', existingOrg.id)
        .select()
        .single()
      
      if (updateError) throw updateError
      orgId = updatedOrg.id
    } else {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'BoardGuru',
          slug: 'boardguru-' + Math.random().toString(36).substring(2, 7),
          settings: { industry: 'Technology', company_size: 'enterprise' },
          subscription_tier: 'enterprise',
          onboarding_step: 999
        })
        .select()
        .single()
      
      if (orgError) throw orgError
      orgId = newOrg.id
      console.log('✅ Organization created:', newOrg.id)
    }
    
    // Step 2: Update profile
    console.log('\n👤 Updating user profile...')
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        org_id: orgId,
        full_name: 'Vik Hirendra',
        role: 'admin',
        onboarding_completed: true,
        email_verified_at: new Date().toISOString(),
        preferences: {
          email_notifications: true,
          weekly_digest: true
        }
      })
      .eq('id', userId)
    
    if (profileError) throw profileError
    console.log('✅ Profile updated to admin role')
    
    // Step 3: Update user metadata
    console.log('\n🔧 Updating auth metadata...')
    const { error: metadataError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          full_name: 'Vik Hirendra',
          company_name: 'BoardGuru',
          role: 'admin'
        }
      }
    )
    
    if (metadataError) throw metadataError
    console.log('✅ Auth metadata updated')
    
    // Success!
    console.log('\n🎉 User successfully upgraded to admin!')
    console.log('\n📋 Account Details:')
    console.log('=====================================')
    console.log('Email:          hvikram.ai@gmail.com')
    console.log('Role:           admin')
    console.log('Organization:   BoardGuru')
    console.log('Tier:           enterprise')
    console.log('User ID:        ' + userId)
    console.log('=====================================')
    console.log('\n✨ The user can now log in with full admin privileges')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

upgradeToAdmin().catch(console.error)
