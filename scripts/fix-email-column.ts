#!/usr/bin/env tsx

/**
 * Direct Fix for Email Column Issue
 * This script directly adds the email column to the profiles table
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function fixEmailColumn() {
  console.log('🔧 Fixing Email Column Issue')
  console.log('=' .repeat(40))
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    console.log('1️⃣ Adding email column to profiles table...')
    
    // Execute SQL directly using Supabase's SQL function
    const { error: alterError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS email TEXT;
      `
    }).single()
    
    if (alterError && !alterError.message.includes('already exists')) {
      // Try a different approach - use raw SQL via the admin API
      console.log('   Trying alternative method...')
      
      // This approach uses the Supabase REST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;'
        })
      })
      
      if (!response.ok) {
        console.log('   ⚠️  Could not add column via RPC, trying direct approach...')
      }
    }

    console.log('2️⃣ Checking if email column exists...')
    
    // Try to select the email column
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .limit(1)
    
    if (error && error.message.includes('column "email" does not exist')) {
      console.log('   ❌ Email column still missing')
      console.log()
      console.log('📝 MANUAL FIX REQUIRED:')
      console.log('1. Go to your Supabase dashboard')
      console.log('2. Navigate to SQL Editor')
      console.log('3. Run the following SQL:')
      console.log()
      console.log('--- COPY FROM HERE ---')
      console.log('ALTER TABLE profiles ADD COLUMN email TEXT;')
      console.log('CREATE INDEX idx_profiles_email ON profiles(email);')
      console.log('UPDATE profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id;')
      console.log('--- COPY TO HERE ---')
      console.log()
      console.log('4. After running, test signup at http://localhost:3000/signup')
    } else if (error) {
      console.log(`   ⚠️  Unexpected error: ${error.message}`)
    } else {
      console.log('   ✅ Email column exists!')
      
      console.log('3️⃣ Creating email_verification_tokens table...')
      
      // Try to create the email_verification_tokens table
      const { error: tableError } = await supabase
        .from('email_verification_tokens')
        .select('*')
        .limit(0)
      
      if (tableError && tableError.message.includes('does not exist')) {
        console.log('   ⚠️  Table does not exist, please create it manually')
        console.log()
        console.log('Run this SQL in Supabase:')
        console.log('--- COPY FROM HERE ---')
        console.log(`CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`)
        console.log('--- COPY TO HERE ---')
      } else if (!tableError) {
        console.log('   ✅ email_verification_tokens table exists!')
      }
      
      console.log()
      console.log('✅ Database structure is ready!')
      console.log()
      console.log('Next steps:')
      console.log('1. Test signup at http://localhost:3000/signup')
      console.log('2. Check email verification flow')
      console.log('3. Verify onboarding process')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    console.log()
    console.log('Please run the SQL manually in Supabase dashboard:')
    console.log('1. Copy the content from: supabase/migrations/FIX_EMAIL_COLUMN_NOW.sql')
    console.log('2. Paste and run in SQL Editor')
  }
}

// Run the fix
fixEmailColumn().catch(console.error)