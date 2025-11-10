/**
 * Apply Feedback Activity RLS Fix Migration
 * Fixes missing INSERT policy on feedback_activity table
 */

import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigration() {
  console.log('🚀 Applying Feedback Activity RLS Fix Migration...\n')

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
    '20251110000001_fix_feedback_activity_rls.sql'
  )

  console.log('📄 Reading migration SQL...')
  const sql = readFileSync(migrationPath, 'utf-8')
  console.log(`✓ Loaded ${sql.length} characters of SQL\n`)

  console.log('Migration contents:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(sql)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

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
  console.log('   cat supabase/migrations/20251110000001_fix_feedback_activity_rls.sql | pbcopy')
  console.log('   (or manually open the file and copy its contents)\n')

  console.log('3. Paste the SQL into the Supabase SQL Editor\n')

  console.log('4. Click "Run" button (or press Ctrl+Enter)\n')

  console.log('5. Verify success - you should see:')
  console.log('   - "Success. No rows returned" message\n')

  console.log('6. Test feedback submission:')
  console.log('   - Go to http://localhost:3000/feedback')
  console.log('   - Submit a test feedback entry')
  console.log('   - Should succeed without errors\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('METHOD 2: Supabase CLI')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('npm install -g supabase')
  console.log('supabase login')
  console.log('supabase link --project-ref fuqdbewftdthbjfcecrz')
  console.log('supabase db push\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('📝 What this migration fixes:')
  console.log('   - Adds missing INSERT policy for feedback_activity table')
  console.log('   - Grants INSERT permission to authenticated users')
  console.log('   - Allows feedback submission to complete successfully\n')

  console.log('🔍 Root cause:')
  console.log('   - The original migration only had SELECT policy on feedback_activity')
  console.log('   - When users submit feedback, the API tries to log activity')
  console.log('   - RLS blocked the INSERT, causing "Failed to submit feedback" error\n')
}

applyMigration().catch((error) => {
  console.error('Fatal error:', error)
  showManualInstructions()
  process.exit(1)
})
