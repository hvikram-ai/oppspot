#!/usr/bin/env node
 

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  console.log('🚀 Applying Companies House Integration Migration...\n')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250115_add_companies_house_integration.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Split into individual statements (basic split, may need refinement)
    const statements = migrationSQL
      .split(';')
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';')

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comments
      if (statement.startsWith('--') || statement.match(/^\/\*.*\*\/$/)) {
        continue
      }

      // Extract a description for logging
      let description = 'SQL statement'
      if (statement.includes('ALTER TABLE')) {
        description = 'Adding column'
        const match = statement.match(/ADD COLUMN IF NOT EXISTS (\w+)/)
        if (match) description = `Adding column: ${match[1]}`
      } else if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)
        if (match) description = `Creating table: ${match[1]}`
      } else if (statement.includes('CREATE INDEX')) {
        const match = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/)
        if (match) description = `Creating index: ${match[1]}`
      } else if (statement.includes('CREATE FUNCTION')) {
        const match = statement.match(/CREATE OR REPLACE FUNCTION (\w+)/)
        if (match) description = `Creating function: ${match[1]}`
      } else if (statement.includes('CREATE POLICY')) {
        const match = statement.match(/CREATE POLICY "([^"]+)"/)
        if (match) description = `Creating policy: ${match[1]}`
      }

      process.stdout.write(`[${i + 1}/${statements.length}] ${description}... `)

      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        }).single()

        if (error) {
          // Check if it's an "already exists" error
          if (error.message?.includes('already exists') || 
              error.message?.includes('duplicate')) {
            console.log('⏭️  Already exists')
            skipCount++
          } else {
            console.log(`❌ Error: ${error.message}`)
            errorCount++
          }
        } else {
          console.log('✅')
          successCount++
        }
      } catch (err) {
        console.log(`❌ Error: ${err.message}`)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 Migration Summary:')
    console.log('='.repeat(50))
    console.log(`✅ Successful: ${successCount}`)
    console.log(`⏭️  Skipped (already exists): ${skipCount}`)
    console.log(`❌ Errors: ${errorCount}`)
    console.log('='.repeat(50))

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!')
      
      // Test the new columns
      console.log('\n🔍 Verifying new columns...')
      const { data, error } = await supabase
        .from('businesses')
        .select('company_number, company_status, incorporation_date')
        .limit(1)

      if (error) {
        console.log('❌ Column verification failed:', error.message)
      } else {
        console.log('✅ New columns are accessible!')
      }
    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review.')
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Alternative: Direct SQL execution if RPC doesn't work
async function runDirectMigration() {
  console.log('🚀 Applying Companies House Migration (Direct Method)...\n')
  
  try {
    // Test if the columns already exist
    const { data: testData, error: testError } = await supabase
      .from('businesses')
      .select('id, name')
      .limit(1)

    if (testError) {
      console.log('❌ Cannot connect to database:', testError.message)
      return
    }

    console.log('✅ Database connection successful\n')

    // Check if migration is already applied
    const { data: checkData, error: checkError } = await supabase
      .from('businesses')
      .select('company_number')
      .limit(1)

    if (!checkError) {
      console.log('✅ Companies House columns already exist!')
      console.log('   Migration appears to be already applied.\n')
      
      // Show current schema
      const { data: businesses } = await supabase
        .from('businesses')
        .select('*')
        .limit(1)

      if (businesses && businesses[0]) {
        const companiesHouseFields = [
          'company_number',
          'company_status', 
          'incorporation_date',
          'company_type',
          'sic_codes',
          'companies_house_last_updated'
        ]

        console.log('📋 Companies House fields status:')
        companiesHouseFields.forEach(field => {
          const exists = field in businesses[0]
          console.log(`   ${exists ? '✅' : '❌'} ${field}`)
        })
      }
    } else {
      console.log('❌ Companies House columns not found')
      console.log('   You may need to apply the migration manually in Supabase dashboard')
      console.log('\n📝 Migration file: supabase/migrations/20250115_add_companies_house_integration.sql')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Try the direct method
runDirectMigration().catch(console.error)