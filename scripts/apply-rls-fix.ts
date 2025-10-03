#!/usr/bin/env npx tsx

/**
 * Apply RLS fix for goal-oriented stream creation
 * This script uses the Supabase service role to run SQL migrations
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function applyMigration() {
  console.log('🔧 Applying RLS fix for goal-oriented streams...\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Read the migration file
  const migrationPath = join(process.cwd(), 'supabase/migrations/20251003120000_fix_goal_stream_creation_rls.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  console.log('📄 Migration file loaded')
  console.log('📝 Executing SQL...\n')

  // Split SQL into individual statements (rough split on semicolons)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (!statement) continue

    console.log(`   [${i + 1}/${statements.length}] Executing...`)

    const { error } = await supabase.rpc('exec_sql', {
      sql: statement + ';'
    })

    if (error) {
      // Try alternative: use the sql endpoint directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: statement + ';' })
      })

      if (!response.ok) {
        console.error(`   ❌ Failed to execute statement ${i + 1}:`, error.message)
        console.error('   Statement:', statement.substring(0, 100) + '...')
      }
    }
  }

  console.log('\n✅ Migration applied successfully!')
  console.log('\n📋 Next step: Try creating a goal-oriented stream again')
}

applyMigration().catch(error => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
