/**
 * Apply Feedback Activity RLS Fix Migration - PostgreSQL Direct
 * Uses pg library to connect directly to Supabase Postgres
 */

import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigration() {
  console.log('🚀 Applying Feedback Activity RLS Fix Migration via PostgreSQL...\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fuqdbewftdthbjfcecrz.supabase.co'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
    process.exit(1)
  }

  // Extract project reference from URL
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]

  // Construct direct PostgreSQL connection string
  // Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  const connectionString = `postgresql://postgres.${projectRef}:${supabaseServiceKey}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

  console.log('✓ Environment loaded')
  console.log(`✓ Target: ${supabaseUrl}`)
  console.log(`✓ Project: ${projectRef}\n`)

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

  console.log('🔌 Connecting to PostgreSQL...')

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL!\n')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Executing migration SQL...')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const result = await client.query(sql)

    console.log('✅ Migration executed successfully!\n')
    console.log('Result:', result.command || 'CREATE POLICY')

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('MIGRATION COMPLETE')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log('✨ Feedback activity RLS policies have been fixed!\n')
    console.log('📝 Changes applied:')
    console.log('   ✓ Added INSERT policy for feedback_activity table')
    console.log('   ✓ Granted INSERT permission to authenticated users')
    console.log('   ✓ Added policy documentation\n')

    console.log('🧪 Next step: Test feedback submission')
    console.log('   Visit: http://localhost:3000/feedback')
    console.log('   Submit a test feedback entry')
    console.log('   Should succeed without "Failed to submit feedback" error\n')

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    console.error('\nError details:', error)

    console.log('\n⚠️  PostgreSQL direct connection failed.')
    console.log('📋 Please apply migration manually using Supabase Dashboard:\n')
    console.log('1. Open: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new')
    console.log('2. Copy this SQL:\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(sql)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('3. Paste and click "Run"\n')

    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed\n')
  }
}

applyMigration().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
