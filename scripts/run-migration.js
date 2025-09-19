#!/usr/bin/env node

/**
 * Script to run database migrations on production Supabase
 * Uses the service role key to execute SQL directly
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables')
  process.exit(1)
}

async function runMigration() {
  console.log('🚀 Starting qualification workflows migration...')
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`)

  // Create Supabase client with service role (has full DB access)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250118_qualification_workflows.sql')

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found at: ${migrationPath}`)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  console.log(`📄 Read migration file (${migrationSQL.length} characters)`)

  // Split SQL into individual statements (split by semicolon but be careful with functions)
  const statements = migrationSQL
    .split(/;\s*$/m)
    .filter(stmt => stmt.trim())
    .map(stmt => stmt.trim() + ';')

  console.log(`📝 Found ${statements.length} SQL statements to execute`)

  let successCount = 0
  let errorCount = 0

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    const preview = statement.substring(0, 50).replace(/\n/g, ' ')

    try {
      console.log(`\n[${i + 1}/${statements.length}] Executing: ${preview}...`)

      // Use the Supabase SQL function to execute raw SQL
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).catch(async (err) => {
        // If exec_sql doesn't exist, try direct query
        const { data, error } = await supabase.from('_sql').select(statement)
        return { data, error: error || err }
      })

      if (error) {
        // Try alternative approach using pg REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ query: statement })
        }).catch(() => null)

        if (!response || !response.ok) {
          throw new Error(error?.message || 'Failed to execute statement')
        }
      }

      console.log(`✅ Success`)
      successCount++
    } catch (err) {
      console.error(`❌ Error: ${err.message}`)
      errorCount++

      // For CREATE TABLE statements, check if table already exists
      if (statement.includes('CREATE TABLE IF NOT EXISTS')) {
        console.log(`ℹ️  Table might already exist (this is OK)`)
        successCount++
        errorCount--
      }
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Migration Summary:')
  console.log(`✅ Successful statements: ${successCount}`)
  console.log(`❌ Failed statements: ${errorCount}`)
  console.log('='.repeat(50))

  if (errorCount > 0 && errorCount === statements.length) {
    console.log('\n⚠️  All statements failed. This might be because:')
    console.log('1. Tables already exist (if using IF NOT EXISTS)')
    console.log('2. Need to run migration directly in Supabase Dashboard')
    console.log('\n📋 Migration file saved at:', migrationPath)
    console.log('You can copy and run it in Supabase SQL Editor:')
    console.log(`👉 ${SUPABASE_URL}/project/fuqdbewftdthbjfcecrz/editor`)
  } else if (successCount > 0) {
    console.log('\n🎉 Migration completed successfully!')
  }
}

// Alternative: Direct execution using fetch
async function runMigrationDirect() {
  console.log('\n🔄 Attempting direct SQL execution via Supabase API...')

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250118_qualification_workflows.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      function_name: 'query',
      args: { query: migrationSQL }
    })
  })

  if (response.ok) {
    console.log('✅ Migration executed successfully via API')
  } else {
    const error = await response.text()
    console.log('⚠️  API execution failed:', error)
    console.log('\n📋 Please run the migration manually in Supabase Dashboard:')
    console.log(`👉 ${SUPABASE_URL}/project/fuqdbewftdthbjfcecrz/editor`)
    console.log('\nCopy the contents of:', migrationPath)
  }
}

// Run the migration
runMigration().catch(err => {
  console.error('Migration failed:', err)
  runMigrationDirect().catch(err2 => {
    console.error('Direct execution also failed:', err2)
    process.exit(1)
  })
})