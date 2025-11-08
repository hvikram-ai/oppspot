import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function resetPassword() {
  const userId = '4af82612-2a9f-4e5f-8dc3-02296c43d67e'
  const newPassword = 'Admin2025!Secure'
  
  console.log('🔑 Resetting password for hvikram.ai@gmail.com...\n')
  
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    })
    
    if (error) throw error
    
    console.log('✅ Password reset successfully!')
    console.log('\n📋 Login Credentials:')
    console.log('=====================================')
    console.log('Email:    hvikram.ai@gmail.com')
    console.log('Password: Admin2025!Secure')
    console.log('=====================================')
    console.log('\n⚠️  Please change this password after first login')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

resetPassword().catch(console.error)
