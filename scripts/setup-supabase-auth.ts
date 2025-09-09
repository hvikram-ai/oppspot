#!/usr/bin/env tsx

/**
 * Setup Supabase Auth Configuration
 * 
 * This script configures Supabase authentication settings for the signup workflow.
 * Run with: npm run setup:auth (add to package.json) or tsx scripts/setup-supabase-auth.ts
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import * as readline from 'readline'

// Load environment variables
dotenv.config({ path: '.env.local' })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function setupSupabase() {
  console.log('🚀 Setting up Supabase Auth for oppSpot\n')

  // Check for required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:')
    if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    console.log('\n📝 Please add these to your .env.local file')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    console.log('📋 Current Setup Checklist:\n')
    
    // 1. Check database connection
    console.log('1️⃣ Checking database connection...')
    const { data: testQuery, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (testError && testError.message.includes('does not exist')) {
      console.log('   ⚠️  Tables not created yet')
      console.log('   📝 Run migrations first: npx supabase db push')
    } else if (testError) {
      console.log('   ❌ Database connection failed:', testError.message)
      process.exit(1)
    } else {
      console.log('   ✅ Database connected successfully')
    }

    // 2. Auth Configuration Instructions
    console.log('\n2️⃣ Supabase Auth Configuration (Dashboard):')
    console.log('   Go to: Authentication → Settings in your Supabase dashboard')
    console.log('   ')
    console.log('   📧 Email Settings:')
    console.log('      • Enable Email Confirmations: ON (recommended for production)')
    console.log('      • Confirm Email Change: ON')
    console.log('      • Secure Email Change: ON')
    console.log('   ')
    console.log('   🔗 Site URL:')
    console.log(`      • Production: https://oppspot.ai`)
    console.log(`      • Development: http://localhost:3000`)
    console.log('   ')
    console.log('   ↩️  Redirect URLs (add all):')
    console.log('      • http://localhost:3000/**')
    console.log('      • https://oppspot.ai/**')
    console.log('      • https://www.oppspot.ai/**')
    console.log('   ')
    console.log('   📬 Email Templates:')
    console.log('      • Customize the confirmation email template')
    console.log('      • Verification URL: {{ .SiteURL }}/auth/verify?token={{ .Token }}&email={{ .Email }}')

    // 3. Create test data
    console.log('\n3️⃣ Sample Data Setup:')
    const createTestData = await question('   Create test organization and user? (y/n): ')
    
    if (createTestData.toLowerCase() === 'y') {
      console.log('   Creating test data...')
      
      // Create test organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Test Company',
          slug: 'test-company-' + Math.random().toString(36).substring(7),
          subscription_tier: 'trial',
          industry: 'Technology',
          company_size: '11-50',
        })
        .select()
        .single()
      
      if (orgError) {
        console.log('   ⚠️  Could not create test organization:', orgError.message)
      } else {
        console.log('   ✅ Test organization created:', org.name)
      }
    }

    // 4. Migration status
    console.log('\n4️⃣ Database Migrations:')
    console.log('   Run the following command to apply migrations:')
    console.log('   ')
    console.log('   npx supabase db push')
    console.log('   ')
    console.log('   Or if using Supabase CLI locally:')
    console.log('   supabase db push --db-url "YOUR_DATABASE_URL"')

    // 5. Environment variables check
    console.log('\n5️⃣ Environment Variables:')
    console.log('   ✅ NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
    console.log('   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
    console.log('   ✅ SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing')
    console.log('   ' + (process.env.RESEND_API_KEY ? '✅' : '⚠️') + ' RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set' : 'Missing (optional for email)')
    console.log('   ' + (process.env.OPENROUTER_API_KEY ? '✅' : '⚠️') + ' OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? 'Set' : 'Missing (optional for AI)')

    // 6. Next steps
    console.log('\n📝 Next Steps:')
    console.log('   1. Apply the database migration: npx supabase db push')
    console.log('   2. Configure auth settings in Supabase dashboard')
    console.log('   3. Set up email provider (Resend) if needed')
    console.log('   4. Test signup flow: npm run dev → visit /signup')
    console.log('   5. Monitor auth logs in Supabase dashboard')

    console.log('\n✨ Setup checklist complete!')

  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

// Run the setup
setupSupabase().catch(console.error)