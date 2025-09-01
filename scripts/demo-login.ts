#!/usr/bin/env tsx

/**
 * Script to quickly log in as a demo user for testing the dashboard
 * Run with: npm run demo-login
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables')
  console.log('Please make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function demoLogin() {
  console.log('🚀 Logging in as demo user...')

  const demoEmail = 'demo@oppspot.com'
  const demoPassword = 'Demo123456!'

  try {
    // Try to sign in first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    })

    if (signInError) {
      console.log('Demo user not found, creating...')
      
      // Create the demo user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: demoEmail,
        password: demoPassword,
        options: {
          data: {
            full_name: 'Demo User',
            company_name: 'Demo Company',
            role: 'demo',
          },
        },
      })

      if (signUpError) {
        console.error('❌ Error creating demo user:', signUpError.message)
        process.exit(1)
      }

      console.log('✅ Demo user created successfully!')
      console.log('User ID:', signUpData.user?.id)
    } else {
      console.log('✅ Successfully logged in as demo user!')
      console.log('User ID:', signInData.user?.id)
    }

    console.log('\n📝 Demo Account Credentials:')
    console.log('Email:', demoEmail)
    console.log('Password:', demoPassword)
    console.log('\n🔗 You can now visit: http://localhost:3001/dashboard')
    console.log('The demo user will stay logged in for this session.')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the script
demoLogin()