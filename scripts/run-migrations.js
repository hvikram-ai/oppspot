#!/usr/bin/env node

/**
 * Script to run database migrations on Supabase
 * This will create all necessary tables for the signup flow
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

// Migrations to run in order
const migrations = [
  '20250110_complete_signup_workflow.sql',
  '20250110_fix_profiles_email_column.sql',
  '20250909002000_add_signup_rls_policies_and_fix_org_function.sql'
]

async function runMigration(filename) {
  const filePath = path.join(__dirname, '..', 'supabase', 'migrations', filename)
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Migration file not found: ${filename}`)
    return false
  }
  
  console.log(`📝 Running migration: ${filename}`)
  
  const sql = fs.readFileSync(filePath, 'utf8')
  
  // Split by semicolons but be careful with functions/procedures
  const statements = sql
    .split(/;\s*$/gm)
    .filter(stmt => stmt.trim())
    .map(stmt => stmt.trim() + ';')
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    
    // Skip comments-only statements
    if (statement.replace(/--.*$/gm, '').trim() === ';') continue
    
    try {
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      }).catch(async (err) => {
        // If exec_sql doesn't exist, try direct execution via REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: statement })
        })
        
        if (!response.ok) {
          // Try alternative approach - use pg REST endpoint
          const directResponse = await fetch(`${SUPABASE_URL}/pg/query`, {
            method: 'POST',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: statement })
          })
          
          if (!directResponse.ok) {
            throw new Error(`Failed to execute: ${await directResponse.text()}`)
          }
        }
        
        return { error: null }
      })
      
      if (error) {
        // Check if it's a "already exists" error which we can ignore
        if (error.message?.includes('already exists') || 
            error.message?.includes('duplicate')) {
          console.log(`   ℹ️  Object already exists, skipping...`)
        } else {
          console.error(`   ❌ Error in statement ${i + 1}:`, error.message)
          console.error(`      Statement preview: ${statement.substring(0, 100)}...`)
        }
      }
    } catch (err) {
      console.error(`   ❌ Failed to execute statement ${i + 1}:`, err.message)
    }
  }
  
  console.log(`   ✅ Migration completed: ${filename}`)
  return true
}

async function checkTables() {
  console.log('\n🔍 Checking existing tables...')
  
  const tables = ['organizations', 'profiles', 'events', 'email_verification_tokens']
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(0)
    
    if (error) {
      console.log(`   ❌ Table '${table}' does not exist`)
    } else {
      console.log(`   ✅ Table '${table}' exists`)
    }
  }
}

async function main() {
  console.log('🚀 Starting database migration...')
  console.log(`   Supabase URL: ${SUPABASE_URL}`)
  console.log('')
  
  // Check current state
  await checkTables()
  
  console.log('\n📦 Running migrations...')
  
  // Run each migration
  for (const migration of migrations) {
    await runMigration(migration)
  }
  
  // Check final state
  console.log('\n🔍 Verifying final state...')
  await checkTables()
  
  console.log('\n✨ Migration process completed!')
  console.log('\n💡 Next steps:')
  console.log('   1. Go to your Supabase dashboard')
  console.log('   2. Navigate to the SQL Editor')
  console.log('   3. Run the migration SQL files manually if they failed here')
  console.log('   4. Ensure Row Level Security is properly configured')
}

main().catch(console.error)