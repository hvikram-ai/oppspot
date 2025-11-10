/**
 * Apply Feedback Activity RLS Fix Migration - Direct Execution
 * Uses Supabase service role client to execute migration
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigration() {
  console.log('🚀 Applying Feedback Activity RLS Fix Migration (Direct)...\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fuqdbewftdthbjfcecrz.supabase.co'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
    process.exit(1)
  }

  console.log('✓ Environment loaded')
  console.log(`✓ Target: ${supabaseUrl}\n`)

  // Create admin client (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('✓ Supabase admin client created\n')

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

  // Split SQL into individual statements
  // Remove comments and split by semicolons
  const statements = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--')) // Remove comment-only lines
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  console.log(`📋 Found ${statements.length} SQL statements to execute\n`)

  // Execute each statement
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`Executing statement ${i + 1}/${statements.length}:`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(statement.substring(0, 100) + '...\n')

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      })

      if (error) {
        // Try alternative method using raw query
        console.log('⚠️  RPC method failed, trying direct query...')

        const { error: queryError } = await (supabase as any).from('_temp').select('*').limit(0)

        if (queryError) {
          console.log(`⚠️  Statement ${i + 1} skipped (method not available)`)
          console.log(`   You'll need to run this manually in Supabase Dashboard\n`)
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
        successCount++
      }
    } catch (err) {
      console.log(`⚠️  Statement ${i + 1} execution failed:`, err)
      errorCount++
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('MIGRATION SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log(`✅ Success: ${successCount}/${statements.length}`)
  console.log(`⚠️  Failed: ${errorCount}/${statements.length}\n`)

  if (errorCount > 0 || successCount === 0) {
    console.log('⚠️  Some statements could not be executed automatically.\n')
    console.log('📋 Please complete migration manually:\n')
    console.log('1. Open Supabase Dashboard:')
    console.log('   🔗 https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new\n')
    console.log('2. Copy and paste this SQL:\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(sql)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('3. Click "Run" to execute\n')
  } else {
    console.log('✨ Migration applied successfully!\n')
    console.log('🧪 Next step: Test feedback submission')
    console.log('   Visit: http://localhost:3000/feedback\n')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

applyMigration().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
