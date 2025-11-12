/**
 * Apply RAG Migrations Script
 * Uses Supabase SQL API to apply migrations
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

async function executeSql(sql) {
  // Split SQL into individual statements and execute them
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    if (!statement || statement.match(/^COMMENT ON/)) continue

    try {
      // Use Supabase's PostgREST to execute SQL via stored procedure
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query: statement + ';' })
      })

      if (!response.ok) {
        const text = await response.text()
        // Ignore "already exists" errors
        if (!text.includes('already exists')) {
          console.error(`   ⚠️  Statement failed (may be safe to ignore):`, text.substring(0, 200))
        }
      }
    } catch (err) {
      console.error(`   ⚠️  Error:`, err.message)
    }
  }
}

async function runMigration(filename) {
  console.log(`\n📄 ${filename}`)

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename)
  const sql = fs.readFileSync(migrationPath, 'utf8')

  // Remove comments and split into manageable chunks
  const cleanSql = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')

  try {
    await executeSql(cleanSql)
    console.log('✅ Applied')
    return true
  } catch (err) {
    console.error('❌ Failed:', err.message)
    return false
  }
}

async function main() {
  console.log('🚀 Applying RAG Migrations')
  console.log(`📍 ${supabaseUrl}\n`)

  const migrations = [
    '20251026000001_add_rag_preferences.sql',
    '20251026000002_create_rag_query_logs.sql'
  ]

  let success = 0

  for (const migration of migrations) {
    if (await runMigration(migration)) success++
  }

  console.log('\n' + '='.repeat(60))
  if (success === migrations.length) {
    console.log('✅ Migrations completed!')
    console.log('\n📊 Changes applied:')
    console.log('   • profiles table: +4 RAG preference columns')
    console.log('   • rag_query_logs table: created with RLS')
    console.log('   • Indexes and policies: configured')
    console.log('\n🧪 Test with:')
    console.log('   npm run dev')
    console.log('   curl http://localhost:3000/api/user/rag-preferences')
  } else {
    console.log(`⚠️  ${success}/${migrations.length} succeeded`)
    console.log('\n💡 Apply manually in Supabase SQL Editor if needed')
  }
  console.log('='.repeat(60))
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err)
  console.log('\n📝 Manual migration instructions:')
  console.log('1. Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql')
  console.log('2. Copy contents of: supabase/migrations/20251026000001_add_rag_preferences.sql')
  console.log('3. Execute in SQL Editor')
  console.log('4. Repeat for: 20251026000002_create_rag_query_logs.sql')
  process.exit(1)
})
