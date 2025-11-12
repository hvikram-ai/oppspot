#!/usr/bin/env node
 

/**
 * Secure Account Creation Script for OppSpot
 * Creates a user account with proper organization and profile setup
 */

const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')
const { promisify } = require('util')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗')
  console.log('\n💡 Add these to your .env.local file')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = promisify(rl.question).bind(rl)

// Function to mask password input
async function askPassword(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    rl.stdoutMuted = true
    rl.question(prompt, (password) => {
      rl.close()
      console.log('') // New line after password
      resolve(password)
    })
    
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted)
        rl.output.write("*")
      else
        rl.output.write(stringToWrite)
    }
  })
}

async function createAccount() {
  console.log('🚀 OppSpot Account Creation Tool')
  console.log('================================\n')

  try {
    // Collect user information
    const email = await question('Email address: ')
    const password = await askPassword('Password (min 8 characters): ')
    const fullName = await question('Full name: ')
    const companyName = await question('Company name: ')
    const role = await question('Role (sales/marketing/business-dev/research/founder/other): ')

    // Validate inputs
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address')
    }
    
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }
    
    if (!fullName || !companyName) {
      throw new Error('Full name and company name are required')
    }

    const validRoles = ['sales', 'marketing', 'business-dev', 'research', 'founder', 'other']
    if (!validRoles.includes(role)) {
      throw new Error(`Role must be one of: ${validRoles.join(', ')}`)
    }

    console.log('\n📝 Creating account...')

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        company_name: companyName,
        role: role
      }
    })

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`)
    }

    console.log('✅ User authentication created')

    const userId = authData.user.id

    // Step 2: Create organization
    const orgSlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 7)

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: companyName,
        slug: orgSlug,
        subscription_tier: 'trial',
        onboarding_step: 0
      })
      .select()
      .single()

    if (orgError) {
      console.error('Organization creation failed:', orgError)
      // Try to clean up the auth user
      await supabase.auth.admin.deleteUser(userId)
      throw new Error(`Failed to create organization: ${orgError.message}`)
    }

    console.log('✅ Organization created')

    // Step 3: Create or update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        org_id: orgData.id,
        full_name: fullName,
        email: email,
        role: role,
        preferences: {
          email_notifications: true,
          weekly_digest: true
        },
        streak_count: 0,
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        onboarding_completed: false,
        email_verified_at: new Date().toISOString() // Mark as verified since we auto-confirmed
      })

    if (profileError) {
      console.error('Profile creation failed:', profileError)
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    console.log('✅ Profile created')

    // Step 4: Log the signup event
    await supabase
      .from('events')
      .insert({
        user_id: userId,
        org_id: orgData.id,
        event_type: 'user_signup',
        metadata: {
          method: 'script',
          email: email,
          company: companyName
        }
      })

    console.log('\n🎉 Account created successfully!')
    console.log('\n📊 Account Details:')
    console.log('   Email:', email)
    console.log('   User ID:', userId)
    console.log('   Organization:', companyName)
    console.log('   Organization ID:', orgData.id)
    console.log('   Trial ends:', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString())
    console.log('\n✨ You can now log in at: https://oppspot.ai/login')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  } finally {
    rl.close()
  }
}

// Check if tables exist before proceeding
async function checkDatabase() {
  console.log('🔍 Checking database setup...')
  
  const tables = ['organizations', 'profiles', 'events']
  let allTablesExist = true
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('*')
      .limit(0)
    
    if (error) {
      console.error(`   ❌ Table '${table}' does not exist`)
      allTablesExist = false
    } else {
      console.log(`   ✅ Table '${table}' exists`)
    }
  }
  
  if (!allTablesExist) {
    console.error('\n❌ Database is not properly set up!')
    console.log('📝 Please run the SQL migration first:')
    console.log('   1. Go to your Supabase dashboard')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Run the contents of RUN_THIS_IN_SUPABASE.sql')
    process.exit(1)
  }
  
  console.log('✅ Database is ready\n')
}

// Main execution
async function main() {
  await checkDatabase()
  await createAccount()
}

main().catch(console.error)