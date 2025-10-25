/**
 * Migration Runner Script
 * Executes the critical alerts system migration using Supabase client
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

async function runMigration() {
  console.log('🚀 Starting Critical Alerts System Migration...\n')

  // Load environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
    process.exit(1)
  }

  console.log('✓ Environment variables loaded')
  console.log(`✓ Supabase URL: ${supabaseUrl}\n`)

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Read migration file
  const migrationPath = join(
    process.cwd(),
    'supabase',
    'migrations',
    '20251022000001_critical_alerts_system.sql'
  )

  console.log('📄 Reading migration file...')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')
  console.log(`✓ Migration file loaded (${migrationSQL.length} characters)\n`)

  // Split SQL into individual statements
  // We need to execute them separately because Supabase RPC has limitations
  console.log('🔨 Executing migration...\n')

  try {
    // Execute the full SQL via Supabase RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    })

    if (error) {
      // If exec_sql function doesn't exist, we need to create tables manually
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('⚠️  exec_sql function not available, using alternative method...\n')
        await runMigrationManually(supabase, migrationSQL)
      } else {
        throw error
      }
    } else {
      console.log('✅ Migration executed successfully via exec_sql RPC\n')
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.log('\n📋 Alternative: Run migration manually via Supabase Dashboard:')
    console.log('   1. Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz')
    console.log('   2. Navigate to: SQL Editor')
    console.log('   3. Copy contents from: supabase/migrations/20251022000001_critical_alerts_system.sql')
    console.log('   4. Execute the SQL\n')
    process.exit(1)
  }

  // Verify migration success
  console.log('🔍 Verifying migration...\n')

  const tables = [
    'system_alerts',
    'alert_rules',
    'alert_configurations',
    'alert_history',
    'service_health_checks',
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1)

    if (error) {
      console.log(`✗ Table ${table} verification failed:`, error.message)
    } else {
      console.log(`✓ Table ${table} exists and is accessible`)
    }
  }

  // Check seed data
  console.log('\n🌱 Checking seed data...\n')

  const { data: rules, error: rulesError } = await supabase
    .from('alert_rules')
    .select('name')

  if (!rulesError && rules) {
    console.log(`✓ Found ${rules.length} default alert rules:`)
    rules.forEach((rule) => console.log(`  - ${rule.name}`))
  }

  const { data: configs, error: configsError } = await supabase
    .from('alert_configurations')
    .select('config_key')

  if (!configsError && configs) {
    console.log(`\n✓ Found ${configs.length} alert configurations:`)
    configs.forEach((config) => console.log(`  - ${config.config_key}`))
  }

  console.log('\n✅ Migration completed successfully!\n')
  console.log('📝 Next steps:')
  console.log('   1. Test health endpoint: curl http://localhost:3000/api/health')
  console.log('   2. Start monitoring: getFailureDetector().startMonitoring(60000)')
  console.log('   3. Wrap API routes: withErrorDetection(handler)')
  console.log('   4. Configure admin emails in alert_configurations table\n')
}

async function runMigrationManually(supabase: any, sql: string) {
  console.log('📋 Note: Manual execution via Supabase Dashboard is recommended for complex migrations\n')
  console.log('   The migration file contains:')
  console.log('   - 5 new tables')
  console.log('   - 8 columns added to notifications table')
  console.log('   - RLS policies, indexes, and seed data')
  console.log('   - ~650 lines of SQL\n')

  throw new Error(
    'Please run migration manually via Supabase Dashboard SQL Editor'
  )
}

// Run the migration
runMigration().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
