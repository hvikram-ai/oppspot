/**
 * Script to apply the RLS fix migration directly to the database
 * Run with: npx tsx scripts/apply-rls-fix.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('📝 Reading migration file...')

  const migrationPath = join(process.cwd(), 'supabase/migrations/20251029120000_clean_rls_final.sql')
  const sql = readFileSync(migrationPath, 'utf-8')

  console.log('🔄 Applying RLS fix migration')
  console.log('   File:', migrationPath)
  console.log('   Size:', sql.length, 'characters')
  console.log()

  // Since Supabase doesn't support executing raw SQL via the client,
  // we'll output instructions for manual execution
  console.log('⚠️  Unfortunately, Supabase client cannot execute raw DDL SQL.')
  console.log('    You need to apply this migration manually via:')
  console.log()
  console.log('    1. Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/editor')
  console.log('    2. Click "New query"')
  console.log('    3. Copy the SQL from:', migrationPath)
  console.log('    4. Paste and run it')
  console.log()
  console.log('    OR use psql directly:')
  console.log()
  console.log('    psql "postgresql://postgres:[password]@db.fuqdbewftdthbjfcecrz.supabase.co:5432/postgres" -f', migrationPath)
  console.log()
}

applyMigration()
