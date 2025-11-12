#!/usr/bin/env node
 

/**
 * Script to fix database schema issues including missing org_id column
 * This runs the FIX_DATABASE_NOW.sql file against your Supabase database
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSQLFile() {
  console.log('🔧 Starting database fix...')
  console.log(`   Supabase URL: ${SUPABASE_URL}`)
  console.log('')
  
  const sqlPath = path.join(__dirname, '..', 'FIX_DATABASE_NOW.sql')
  
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ FIX_DATABASE_NOW.sql file not found!')
    process.exit(1)
  }
  
  const sqlContent = fs.readFileSync(sqlPath, 'utf8')
  
  console.log('📝 Executing database fixes...')
  console.log('   This will:')
  console.log('   - Check and add missing columns (including org_id)')
  console.log('   - Create missing tables if needed')
  console.log('   - Set up proper RLS policies')
  console.log('   - Configure triggers and functions')
  console.log('')
  
  // For complex SQL with DO blocks and functions, we need to execute as a single statement
  try {
    // Try direct execution via Supabase's SQL endpoint
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: sqlContent
      })
    })
    
    if (!response.ok) {
      // If RPC doesn't work, try alternative approach
      console.log('⚠️  Direct RPC failed, trying alternative method...')
      
      // Split the SQL into sections and execute key parts
      const criticalStatements = [
        // First ensure organizations table exists
        `CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          settings JSONB DEFAULT '{}',
          subscription_tier TEXT DEFAULT 'trial',
          onboarding_step INTEGER DEFAULT 0,
          industry TEXT,
          company_size TEXT,
          website TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );`,
        
        // Then add org_id to profiles if missing
        `DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'profiles' AND column_name = 'org_id') THEN
              ALTER TABLE profiles ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
          END IF;
        END $$;`,
        
        // Add other missing columns to profiles
        `DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'profiles' AND column_name = 'email') THEN
              ALTER TABLE profiles ADD COLUMN email TEXT;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
              ALTER TABLE profiles ADD COLUMN full_name TEXT;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'profiles' AND column_name = 'role') THEN
              ALTER TABLE profiles ADD COLUMN role TEXT;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'profiles' AND column_name = 'preferences') THEN
              ALTER TABLE profiles ADD COLUMN preferences JSONB DEFAULT '{"email_notifications": true, "weekly_digest": true}';
          END IF;
        END $$;`
      ]
      
      for (let i = 0; i < criticalStatements.length; i++) {
        console.log(`   Executing statement ${i + 1}/${criticalStatements.length}...`)
        
        // Try to execute via Supabase REST API
        const { error } = await supabase.rpc('query', { 
          query: criticalStatements[i] 
        }).catch(() => ({ error: null }))
        
        if (error && !error.message?.includes('already exists')) {
          console.warn(`   ⚠️  Statement ${i + 1} had issues but continuing...`)
        }
      }
    }
    
    console.log('✅ Database fix attempt completed!')
    
  } catch (error) {
    console.error('❌ Error executing SQL:', error.message)
    console.log('')
    console.log('💡 Alternative: Please run the SQL manually:')
    console.log('   1. Go to your Supabase dashboard')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Copy and paste the contents of FIX_DATABASE_NOW.sql')
    console.log('   4. Click "Run" to execute')
    process.exit(1)
  }
  
  // Verify the fix worked
  console.log('')
  console.log('🔍 Verifying database structure...')
  
  try {
    // Check if we can query profiles with org_id
    const { data, error } = await supabase
      .from('profiles')
      .select('id, org_id, email, full_name')
      .limit(1)
    
    if (error) {
      if (error.message.includes('org_id')) {
        console.error('❌ org_id column still missing!')
        console.log('   Please run FIX_DATABASE_NOW.sql manually in Supabase')
      } else {
        console.log('⚠️  Profiles table query error:', error.message)
      }
    } else {
      console.log('✅ Profiles table has org_id column!')
    }
    
    // Check organizations table
    const { error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
    
    if (orgError) {
      console.log('⚠️  Organizations table issue:', orgError.message)
    } else {
      console.log('✅ Organizations table exists!')
    }
    
  } catch (err) {
    console.error('❌ Verification failed:', err.message)
  }
  
  console.log('')
  console.log('📋 Next steps:')
  console.log('   1. If you see errors above, run FIX_DATABASE_NOW.sql manually in Supabase')
  console.log('   2. Try creating an account with: npm run create-account')
  console.log('   3. Test signup at http://localhost:3001/signup')
}

executeSQLFile().catch(console.error)