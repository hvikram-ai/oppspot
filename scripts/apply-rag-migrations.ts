/**
 * Apply RAG Migrations Script
 * Applies database migrations for RAG feature using Supabase client
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration(filename: string) {
  console.log(`\n📄 Applying: ${filename}`)

  const migrationPath = join(process.cwd(), 'supabase', 'migrations', filename)
  const sql = readFileSync(migrationPath, 'utf8')

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // Try direct execution if RPC fails
      console.log('   Trying direct execution...')
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: sql })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
    }

    console.log('✅ Migration applied successfully')
    return true
  } catch (err) {
    console.error('❌ Migration failed:', err)
    console.error('\n📋 SQL Content:')
    console.error(sql.substring(0, 500) + '...')
    return false
  }
}

async function main() {
  console.log('🚀 Starting RAG database migrations...')
  console.log(`📍 Target: ${supabaseUrl}`)

  const migrations = [
    '20251026000001_add_rag_preferences.sql',
    '20251026000002_create_rag_query_logs.sql'
  ]

  let successCount = 0

  for (const migration of migrations) {
    const success = await runMigration(migration)
    if (success) successCount++
  }

  console.log('\n' + '='.repeat(50))
  if (successCount === migrations.length) {
    console.log('✅ All migrations applied successfully!')
    console.log('\n📊 Summary:')
    console.log('  • Added RAG preference columns to profiles table')
    console.log('  • Created rag_query_logs table for analytics')
    console.log('  • Set up indexes and RLS policies')
    console.log('\n🎯 Next steps:')
    console.log('  1. Test the RAG preferences API: GET /api/user/rag-preferences')
    console.log('  2. Follow the testing guide: docs/PHASE_2_TESTING.md')
    console.log('  3. Add indexing triggers to your APIs')
  } else {
    console.log(`⚠️  ${successCount}/${migrations.length} migrations succeeded`)
    console.log('\nYou may need to apply failed migrations manually through Supabase SQL Editor:')
    console.log(`${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql`)
  }
  console.log('='.repeat(50))
}

main().catch(console.error)
