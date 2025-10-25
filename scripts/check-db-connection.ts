/**
 * Check Database Connection
 * Verifies Supabase connection and checks for existing alert system tables
 */

import { createClient } from '@supabase/supabase-js'

async function checkConnection() {
  console.log('🔍 Checking Supabase Database Connection...\n')

  // Load environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    process.exit(1)
  }

  console.log(`✓ Supabase URL: ${supabaseUrl}`)
  console.log('✓ Service Role Key: [PRESENT]\n')

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Test connection
  console.log('🔌 Testing database connection...')
  const { data, error } = await supabase.from('profiles').select('id').limit(1)

  if (error) {
    console.error('❌ Connection failed:', error.message)
    process.exit(1)
  }

  console.log('✅ Database connection successful!\n')

  // Check if alert system tables exist
  console.log('📊 Checking for alert system tables...\n')

  const tables = [
    'system_alerts',
    'alert_rules',
    'alert_configurations',
    'alert_history',
    'service_health_checks',
  ]

  let existingTables = 0
  let missingTables = 0

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(0)

    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log(`✗ ${table} - NOT FOUND`)
        missingTables++
      } else if (error.message.includes('permission denied')) {
        console.log(`? ${table} - EXISTS (no SELECT permission - this is OK for new tables)`)
        existingTables++
      } else {
        console.log(`? ${table} - UNKNOWN (${error.message})`)
      }
    } else {
      console.log(`✓ ${table} - EXISTS`)
      existingTables++
    }
  }

  console.log(`\n📈 Summary:`)
  console.log(`   Tables found: ${existingTables}`)
  console.log(`   Tables missing: ${missingTables}`)

  if (missingTables === tables.length) {
    console.log('\n🚀 Ready to run migration!')
    console.log('\n📋 To run the migration, use ONE of these methods:\n')

    console.log('METHOD 1: Supabase Dashboard (Recommended - Most Reliable)')
    console.log('   1. Open: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql')
    console.log('   2. Click "New Query"')
    console.log('   3. Copy the contents of:')
    console.log('      supabase/migrations/20251022000001_critical_alerts_system.sql')
    console.log('   4. Paste and click "Run"\n')

    console.log('METHOD 2: Install & Use Supabase CLI')
    console.log('   npm install -g supabase')
    console.log('   supabase login')
    console.log('   supabase db push --project-ref fuqdbewftdthbjfcecrz\n')

    console.log('METHOD 3: Using psql (if direct DB access available)')
    console.log('   Get connection string from Supabase Dashboard > Settings > Database')
    console.log('   psql [connection-string] -f supabase/migrations/20251022000001_critical_alerts_system.sql\n')
  } else if (existingTables === tables.length) {
    console.log('\n✅ Alert system tables already exist!')
    console.log('   Migration appears to have been run previously.')

    // Check for seed data
    const { data: rules } = await supabase.from('alert_rules').select('name')
    if (rules && rules.length > 0) {
      console.log(`\n✓ Found ${rules.length} alert rules (seed data present)`)
    }
  } else {
    console.log('\n⚠️  Partial migration detected!')
    console.log('   Some tables exist but others are missing.')
    console.log('   This may indicate a failed migration.')
    console.log('   Recommend re-running the full migration.')
  }

  console.log('\n✅ Connection check complete!\n')
}

checkConnection().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
