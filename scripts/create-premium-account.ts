#!/usr/bin/env node

/**
 * Script to create premium accounts for paying clients
 * Usage: npm run create-account -- --email client@example.com --password SecurePass123 --name "John Doe" --company "ACME Corp"
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { parseArgs } from 'util'

// Load environment variables
config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

// Parse command line arguments
const { values } = parseArgs({
  options: {
    email: {
      type: 'string',
      short: 'e',
    },
    password: {
      type: 'string',
      short: 'p',
    },
    name: {
      type: 'string',
      short: 'n',
    },
    company: {
      type: 'string',
      short: 'c',
    },
    role: {
      type: 'string',
      short: 'r',
      default: 'admin',
    },
    tier: {
      type: 'string',
      short: 't',
      default: 'premium',
    },
    help: {
      type: 'boolean',
      short: 'h',
    },
  },
})

// Show help if requested
if (values.help) {
  console.log(`
📋 Create Premium Account Script

Usage: npm run create-account -- [options]

Options:
  -e, --email      Email address for the account (required)
  -p, --password   Password for the account (required)
  -n, --name       Full name of the user (required)
  -c, --company    Company name (required)
  -r, --role       User role (default: admin)
  -t, --tier       Subscription tier (default: premium)
  -h, --help       Show this help message

Example:
  npm run create-account -- --email client@example.com --password SecurePass123 --name "John Doe" --company "ACME Corp"
`)
  process.exit(0)
}

// Validate required arguments
if (!values.email || !values.password || !values.name || !values.company) {
  console.error('❌ Missing required arguments')
  console.error('Required: --email, --password, --name, --company')
  console.error('Run with --help for more information')
  process.exit(1)
}

async function createPremiumAccount() {
  const { email, password, name, company, role = 'admin', tier = 'premium' } = values

  console.log('🚀 Creating premium account...')
  console.log(`📧 Email: ${email}`)
  console.log(`👤 Name: ${name}`)
  console.log(`🏢 Company: ${company}`)
  console.log(`🎯 Role: ${role}`)
  console.log(`💎 Tier: ${tier}`)
  
  // Create Supabase admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Step 1: Create the user account
    console.log('\n📝 Creating user account...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email!,
      password: password!,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: name,
        company_name: company,
        role: role,
      },
    })

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('No user data returned')
    }

    const userId = authData.user.id
    console.log(`✅ User created with ID: ${userId}`)

    // Step 2: Create organization
    console.log('\n🏢 Creating organization...')
    const orgSlug = company!
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 7)

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: company,
        slug: orgSlug,
        settings: {
          industry: null,
          company_size: null,
        },
        subscription_tier: tier, // Set as premium/enterprise
        onboarding_step: 999, // Mark as completed
      })
      .select()
      .single()

    if (orgError) {
      // Try to clean up the user if org creation fails
      await supabase.auth.admin.deleteUser(userId)
      throw new Error(`Failed to create organization: ${orgError.message}`)
    }

    console.log(`✅ Organization created: ${orgData.name} (${orgData.slug})`)

    // Step 3: Create user profile
    console.log('\n👤 Creating user profile...')
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        org_id: orgData.id,
        full_name: name,
        role: role,
        preferences: {
          email_notifications: true,
          weekly_digest: true,
        },
        streak_count: 0,
        last_active: new Date().toISOString(),
        trial_ends_at: null, // No trial for premium users
        onboarding_completed: true, // Skip onboarding
        email_verified_at: new Date().toISOString(), // Pre-verified
      })

    if (profileError) {
      // Try to clean up
      await supabase.from('organizations').delete().eq('id', orgData.id)
      await supabase.auth.admin.deleteUser(userId)
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    console.log('✅ User profile created')

    // Success!
    console.log('\n🎉 Premium account created successfully!')
    console.log('\n📋 Account Details:')
    console.log('=====================================')
    console.log(`Email:    ${email}`)
    console.log(`Password: ${password}`)
    console.log('=====================================')
    console.log('\n✨ The user can now log in directly at /login')
    console.log('✨ No email verification or onboarding required')
    console.log('\n⚠️  Please share these credentials securely with the client')

  } catch (error) {
    console.error('\n❌ Error creating account:', error)
    process.exit(1)
  }
}

// Run the script
createPremiumAccount().catch(console.error)