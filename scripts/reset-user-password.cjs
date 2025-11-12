#!/usr/bin/env node
 

/**
 * Reset password for existing users
 */

const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')
const { promisify } = require('util')

require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = promisify(rl.question).bind(rl)

async function resetPassword() {
  console.log('🔐 Password Reset Tool\n')
  
  // Show existing users
  console.log('Existing users:')
  console.log('1. hvikram.ai@gmail.com')
  console.log('2. hirendra@gmail.com')
  console.log('')
  
  const email = await question('Enter email address to reset password: ')
  const newPassword = await question('Enter new password (min 8 characters): ')
  
  if (newPassword.length < 8) {
    console.error('❌ Password must be at least 8 characters')
    process.exit(1)
  }
  
  console.log('\n🔄 Resetting password...')
  
  // Get user ID
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('❌ Error listing users:', listError.message)
    process.exit(1)
  }
  
  const user = users.find(u => u.email === email)
  
  if (!user) {
    console.error('❌ User not found')
    process.exit(1)
  }
  
  // Update password
  const { error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  )
  
  if (error) {
    console.error('❌ Failed to reset password:', error.message)
  } else {
    console.log('✅ Password reset successfully!')
    console.log('\n📝 Login credentials:')
    console.log('   Email:', email)
    console.log('   Password:', newPassword)
    console.log('\n🚀 You can now login at:')
    console.log('   http://localhost:3001/login')
    console.log('   https://oppspot.vercel.app/login')
  }
  
  rl.close()
}

resetPassword().catch(error => {
  console.error('Error:', error)
  rl.close()
  process.exit(1)
})