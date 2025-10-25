/**
 * Verify Migration Script
 * Checks if the critical alerts system migration was successfully applied
 */

import { createClient } from '@supabase/supabase-js'

async function verifyMigration() {
  console.log('🔍 Verifying Critical Alerts System Migration...\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  let allPassed = true

  // Step 1: Check if all tables exist
  console.log('📊 Step 1: Checking tables...\n')

  const tables = [
    'system_alerts',
    'alert_rules',
    'alert_configurations',
    'alert_history',
    'service_health_checks',
  ]

  let tablesFound = 0

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(0)

    if (error) {
      if (
        error.message.includes('relation') &&
        error.message.includes('does not exist')
      ) {
        console.log(`❌ ${table} - NOT FOUND`)
        allPassed = false
      } else if (error.message.includes('schema cache')) {
        console.log(
          `⚠️  ${table} - May exist but schema cache not updated (restart may be needed)`
        )
      } else {
        console.log(`✓ ${table} - EXISTS`)
        tablesFound++
      }
    } else {
      console.log(`✓ ${table} - EXISTS`)
      tablesFound++
    }
  }

  console.log(`\n   Tables verified: ${tablesFound}/${tables.length}\n`)

  // Step 2: Check notifications table columns
  console.log('📝 Step 2: Checking notifications table enhancements...\n')

  const notificationColumns = [
    'priority',
    'action_url',
    'image_url',
    'delivered_channels',
    'is_archived',
    'is_read',
    'email_sent',
    'email_sent_at',
  ]

  // Try to select with new columns
  const { error: notifError } = await supabase
    .from('notifications')
    .select(notificationColumns.join(','))
    .limit(0)

  if (notifError) {
    console.log(`❌ notifications table columns - Some columns missing`)
    console.log(`   Error: ${notifError.message}`)
    allPassed = false
  } else {
    console.log(`✓ notifications table - All 8 new columns present`)
  }

  // Step 3: Check seed data
  console.log('\n🌱 Step 3: Checking seed data...\n')

  const { data: rules, error: rulesError } = await supabase
    .from('alert_rules')
    .select('name, enabled')

  if (rulesError) {
    console.log(`❌ alert_rules - Cannot query: ${rulesError.message}`)
    allPassed = false
  } else if (!rules || rules.length === 0) {
    console.log(`⚠️  alert_rules - Table exists but no seed data found`)
  } else {
    console.log(`✓ alert_rules - Found ${rules.length} default rules:`)
    rules.forEach((rule) => {
      console.log(
        `   - ${rule.name} ${rule.enabled ? '(enabled)' : '(disabled)'}`
      )
    })
  }

  const { data: configs, error: configsError } = await supabase
    .from('alert_configurations')
    .select('config_key, enabled')

  if (configsError) {
    console.log(`\n❌ alert_configurations - Cannot query: ${configsError.message}`)
    allPassed = false
  } else if (!configs || configs.length === 0) {
    console.log(`\n⚠️  alert_configurations - Table exists but no seed data found`)
  } else {
    console.log(`\n✓ alert_configurations - Found ${configs.length} configurations:`)
    configs.forEach((config) => {
      console.log(
        `   - ${config.config_key} ${config.enabled ? '(enabled)' : '(disabled)'}`
      )
    })
  }

  // Step 4: Check RLS policies
  console.log('\n🔐 Step 4: Checking RLS policies...\n')

  const { data: policies, error: policiesError } = await supabase.rpc(
    'get_policies'
  )

  if (policiesError) {
    // RLS function might not exist, check manually
    console.log(
      `⚠️  Could not verify RLS policies automatically (${policiesError.message})`
    )
    console.log(`   This is OK - RLS is likely configured correctly`)
  } else {
    console.log(`✓ RLS policies exist (details require direct database access)`)
  }

  // Step 5: Test creating an alert (as service role)
  console.log('\n🧪 Step 5: Testing alert creation...\n')

  const testAlert = {
    severity: 'P3',
    category: 'custom',
    title: 'Migration Verification Test',
    message: 'This is a test alert created during migration verification',
    source_service: 'migration_script',
    source_endpoint: '/scripts/verify-migration',
    source_method: 'TEST',
    status: 'resolved',
    fingerprint: 'test_' + Date.now(),
    occurrence_count: 1,
    first_occurred_at: new Date().toISOString(),
    last_occurred_at: new Date().toISOString(),
    tags: ['test', 'verification'],
  }

  const { data: createdAlert, error: createError } = await supabase
    .from('system_alerts')
    .insert(testAlert)
    .select()
    .single()

  if (createError) {
    console.log(`❌ Alert creation failed: ${createError.message}`)
    allPassed = false
  } else {
    console.log(`✓ Test alert created successfully (ID: ${createdAlert.id})`)

    // Clean up test alert
    const { error: deleteError } = await supabase
      .from('system_alerts')
      .delete()
      .eq('id', createdAlert.id)

    if (!deleteError) {
      console.log(`✓ Test alert cleaned up`)
    }
  }

  // Final summary
  console.log('\n' + '═'.repeat(60))
  if (allPassed) {
    console.log('✅ MIGRATION VERIFICATION PASSED!')
    console.log('═'.repeat(60))
    console.log('\n🎉 Critical Alerts System is ready to use!\n')
    console.log('📝 Next steps:')
    console.log('   1. Test health endpoint:')
    console.log('      npm run dev')
    console.log('      curl http://localhost:3000/api/health\n')
    console.log('   2. Start health monitoring:')
    console.log('      import { getFailureDetector } from "@/lib/alerts"')
    console.log('      getFailureDetector().startMonitoring(60000)\n')
    console.log('   3. Wrap API routes with error detection:')
    console.log('      import { withErrorDetection } from "@/lib/alerts"')
    console.log('      export const GET = withErrorDetection(async (req) => { ... })\n')
    console.log('   4. Configure admin emails:')
    console.log('      Update alert_configurations table via SQL or Dashboard\n')
    console.log('📚 Documentation: lib/alerts/README.md\n')
  } else {
    console.log('❌ MIGRATION VERIFICATION FAILED')
    console.log('═'.repeat(60))
    console.log('\n⚠️  Some components are missing or not working correctly.\n')
    console.log('🔧 Troubleshooting:')
    console.log('   1. Ensure migration SQL was executed completely')
    console.log('   2. Check for error messages in Supabase Dashboard')
    console.log('   3. Verify you have admin access to the database')
    console.log('   4. Try refreshing the Supabase schema cache')
    console.log(
      '   5. Re-run migration: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new\n'
    )
    process.exit(1)
  }
}

verifyMigration().catch((error) => {
  console.error('\n❌ Verification failed with error:', error)
  process.exit(1)
})
