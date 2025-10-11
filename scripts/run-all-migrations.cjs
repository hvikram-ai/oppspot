/* eslint-disable @typescript-eslint/no-require-imports */
#!/usr/bin/env node

/**
 * Run all missing database migrations
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkTable(tableName) {
  const { error } = await supabase
    .from(tableName)
    .select('*')
    .limit(0)
  
  return !error
}

async function checkMissingTables() {
  const requiredTables = [
    'profiles',
    'organizations',
    'businesses',
    'locations',
    'business_lists',
    'saved_businesses',
    'acquisition_scans',
    'acquisition_targets',
    'events'
  ]
  
  const tableStatus = {}
  const missingTables = []
  
  console.log('🔍 Checking database tables...\n')
  
  for (const table of requiredTables) {
    const exists = await checkTable(table)
    tableStatus[table] = exists
    
    if (exists) {
      console.log(`✅ ${table}`)
    } else {
      console.log(`❌ ${table} (missing)`)
      missingTables.push(table)
    }
  }
  
  return { tableStatus, missingTables }
}

async function runMigrations() {
  console.log('\n🚀 Running Database Migrations\n')
  
  // Check current state
  const { tableStatus, missingTables } = await checkMissingTables()
  
  if (missingTables.length === 0) {
    console.log('\n✅ All required tables exist!')
    return
  }
  
  console.log(`\n⚠️  Missing ${missingTables.length} tables:`, missingTables.join(', '))
  
  // Check if CREATE_MISSING_TABLES.sql exists
  const migrationPath = path.join(__dirname, '..', 'CREATE_MISSING_TABLES.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error('\n❌ Migration file not found: CREATE_MISSING_TABLES.sql')
    process.exit(1)
  }
  
  console.log('\n📋 Migration file found: CREATE_MISSING_TABLES.sql')
  console.log('\n🚨 IMPORTANT: You need to run this SQL manually in Supabase')
  console.log('=' .repeat(60))
  console.log('\nSteps to complete migration:')
  console.log('\n1. Go to your Supabase Dashboard:')
  console.log('   https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new')
  console.log('\n2. Copy the entire contents of CREATE_MISSING_TABLES.sql')
  console.log('\n3. Paste it into the SQL Editor')
  console.log('\n4. Click "Run" to execute')
  console.log('\n5. Come back here and run: npm run check-tables')
  console.log('=' .repeat(60))
  
  // Show which specific features will be enabled
  console.log('\n✨ After running the migration, these features will work:')
  
  if (!tableStatus.acquisition_scans) {
    console.log('   • Opp Scan - AI-powered acquisition target discovery')
  }
  if (!tableStatus.saved_businesses) {
    console.log('   • Save & bookmark businesses')
  }
  if (!tableStatus.business_lists) {
    console.log('   • Create custom business lists')
  }
  if (!tableStatus.locations) {
    console.log('   • Location-based search and mapping')
  }
  if (!tableStatus.acquisition_targets) {
    console.log('   • Acquisition target tracking and scoring')
  }
  
  console.log('\n💡 Alternative: Run specific migration files from supabase/migrations/')
  console.log('   • 20250901000001_add_opp_scan_workflow.sql - For Opp Scan')
  console.log('   • add_saved_businesses.sql - For saved businesses')
}

// Add a check-only mode
async function checkTablesOnly() {
  console.log('\n🔍 Checking Database Status\n')
  
  const { tableStatus, missingTables } = await checkMissingTables()
  
  console.log('\n' + '=' .repeat(40))
  console.log('Database Status Summary:')
  console.log('=' .repeat(40))
  console.log(`Total tables checked: ${Object.keys(tableStatus).length}`)
  console.log(`Tables present: ${Object.values(tableStatus).filter(v => v).length}`)
  console.log(`Tables missing: ${missingTables.length}`)
  
  if (missingTables.length > 0) {
    console.log('\n⚠️  To fix missing tables, run:')
    console.log('   npm run migrate')
  } else {
    console.log('\n✅ Database is fully configured!')
  }
}

// Check command line arguments
const command = process.argv[2]

if (command === 'check') {
  checkTablesOnly().catch(console.error)
} else {
  runMigrations().catch(console.error)
}