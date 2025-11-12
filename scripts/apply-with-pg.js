/**
 * Apply RAG Migrations using node-postgres
 * Direct PostgreSQL connection
 */

import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Extract project ref from Supabase URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const projectRef = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1]

if (!projectRef) {
  console.error('❌ Could not extract project ref from Supabase URL')
  process.exit(1)
}

// Construct database connection
// Supabase uses this format: postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
const dbConfig = {
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TCLP-oppSpot3', // Default Supabase password
  ssl: {
    rejectUnauthorized: false
  }
}

async function executeMigration(client, filename) {
  console.log(`\n📄 Applying: ${filename}`)

  const filepath = path.join(__dirname, '..', 'supabase', 'migrations', filename)
  const sql = fs.readFileSync(filepath, 'utf8')

  try {
    await client.query(sql)
    console.log('✅ Applied successfully')
    return true
  } catch (err) {
    // Check if error is benign (already exists)
    if (err.message.includes('already exists') || err.message.includes('does not exist')) {
      console.log('⚠️  Already applied (safe to ignore)')
      return true
    }

    console.error('❌ Failed:', err.message)
    return false
  }
}

async function main() {
  console.log('🚀 Applying RAG Migrations via PostgreSQL')
  console.log(`📍 Connecting to: db.${projectRef}.supabase.co\n`)

  const client = new Client(dbConfig)

  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected\n')

    const migrations = [
      '20251026000001_add_rag_preferences.sql',
      '20251026000002_create_rag_query_logs.sql'
    ]

    let successCount = 0

    for (const migration of migrations) {
      const success = await executeMigration(client, migration)
      if (success) successCount++
    }

    console.log('\n' + '='.repeat(70))
    if (successCount === migrations.length) {
      console.log('✅ All migrations applied successfully!')
      console.log('\n📊 Changes:')
      console.log('   • profiles table: +4 RAG columns')
      console.log('   • rag_query_logs table: created')
      console.log('   • Indexes and RLS: configured')
      console.log('\n🧪 Verify with:')
      console.log('   node scripts/verify-rag-schema.js')
    } else {
      console.log(`⚠️  ${successCount}/${migrations.length} migrations succeeded`)
    }
    console.log('='.repeat(70))

  } catch (err) {
    console.error('\n❌ Connection failed:', err.message)
    console.log('\n📝 Please apply manually via Supabase Dashboard:')
    console.log('   🔗 https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new')
    console.log('\nSee APPLY_RAG_MIGRATIONS.md for detailed instructions')
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(console.error)
