/**
 * Apply Migration Directly via Supabase REST API
 * Uses the Supabase Management API to execute SQL
 */

import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigration() {
  console.log('🚀 Applying Critical Alerts System Migration...\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    process.exit(1)
  }

  console.log('✓ Environment loaded')
  console.log(`✓ Target: ${supabaseUrl}\n`)

  // Read migration file
  const migrationPath = join(
    process.cwd(),
    'supabase',
    'migrations',
    '20251022000001_critical_alerts_system.sql'
  )

  console.log('📄 Reading migration SQL...')
  const sql = readFileSync(migrationPath, 'utf-8')
  console.log(`✓ Loaded ${sql.length} characters of SQL\n`)

  // Extract project reference from URL
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
  console.log(`✓ Project Reference: ${projectRef}\n`)

  // Use Supabase's Database API endpoint
  const apiUrl = `${supabaseUrl}/rest/v1/rpc/exec_sql`

  console.log('🔨 Attempting to execute migration via Supabase API...\n')

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ sql }),
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.log(`⚠️  API execution not available (${response.status})`)
      console.log(`   Response: ${responseText}\n`)

      // Try alternative: Split and execute statements one by one
      console.log('🔄 Trying alternative method: Statement-by-statement execution...\n')
      await executeStatementsIndividually(supabaseUrl, supabaseServiceKey, sql)
    } else {
      console.log('✅ Migration executed successfully via API!\n')
      console.log(responseText)
    }
  } catch (error) {
    console.error('❌ API execution failed:', error)
    showManualInstructions()
    process.exit(1)
  }
}

async function executeStatementsIndividually(
  supabaseUrl: string,
  serviceKey: string,
  sql: string
) {
  // This is complex - splitting SQL properly is non-trivial
  // For now, show manual instructions
  console.log('⚠️  Automatic statement splitting is complex for this migration.')
  console.log('   The migration includes functions, triggers, and complex DDL.\n')

  showManualInstructions()
}

function showManualInstructions() {
  console.log('\n📋 Please run migration manually using ONE of these methods:\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('METHOD 1: Supabase Dashboard (RECOMMENDED)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('1. Open your browser and go to:')
  console.log('   🔗 https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new\n')

  console.log('2. In your terminal, copy the migration file:')
  console.log('   cat supabase/migrations/20251022000001_critical_alerts_system.sql | pbcopy')
  console.log('   (or manually select all and copy)\n')

  console.log('3. Paste the SQL into the Supabase SQL Editor\n')

  console.log('4. Click "Run" button (or press Ctrl+Enter)\n')

  console.log('5. Verify success - you should see:')
  console.log('   - No error messages')
  console.log('   - "Success" message\n')

  console.log('6. Run verification script:')
  console.log('   npx tsx scripts/verify-migration.ts\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('METHOD 2: Install Supabase CLI')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('npm install -g supabase')
  console.log('supabase login')
  console.log('supabase link --project-ref fuqdbewftdthbjfcecrz')
  console.log('supabase db push\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

applyMigration().catch((error) => {
  console.error('Fatal error:', error)
  showManualInstructions()
  process.exit(1)
})
