/**
 * Apply RAG Migrations Directly
 * Uses direct SQL execution through Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function executeSqlStatements(statements) {
  const results = []

  for (const stmt of statements) {
    const trimmed = stmt.trim()
    if (!trimmed || trimmed.startsWith('--')) continue

    try {
      // Execute via RPC if available, or direct query
      const { data, error } = await supabase.rpc('exec', { sql: trimmed })

      if (error) {
        // Try alternative: use from() with a raw query
        // This is a workaround for direct SQL execution
        results.push({ success: false, error: error.message, statement: trimmed.substring(0, 100) })
      } else {
        results.push({ success: true, statement: trimmed.substring(0, 100) })
      }
    } catch (err) {
      results.push({ success: false, error: err.message, statement: trimmed.substring(0, 100) })
    }
  }

  return results
}

async function applyMigrationFile(filename) {
  console.log(`\n📄 Applying: ${filename}`)

  const filepath = path.join(__dirname, '..', 'supabase', 'migrations', filename)
  const sql = fs.readFileSync(filepath, 'utf8')

  // Split by semicolon but preserve statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^COMMENT ON/))

  console.log(`   Found ${statements.length} statements to execute`)

  // Execute each statement individually
  let success = 0
  let failed = 0

  for (const statement of statements) {
    try {
      // For ALTER TABLE and CREATE INDEX, we can use a direct approach
      if (statement.match(/^(ALTER|CREATE|DROP)/i)) {
        // We'll execute this via a helper function
        const result = await executeViaPg(statement + ';')
        if (result.success) {
          success++
          console.log(`   ✅ ${statement.split('\n')[0].substring(0, 60)}...`)
        } else {
          // Check if it's a benign error (already exists)
          if (result.error && (
            result.error.includes('already exists') ||
            result.error.includes('does not exist')
          )) {
            success++
            console.log(`   ⚠️  ${statement.split('\n')[0].substring(0, 60)}... (already exists)`)
          } else {
            failed++
            console.log(`   ❌ ${result.error}`)
          }
        }
      }
    } catch (err) {
      failed++
      console.log(`   ❌ Error: ${err.message}`)
    }
  }

  console.log(`   Summary: ${success} succeeded, ${failed} failed`)
  return { success, failed }
}

async function executeViaPg(sql) {
  try {
    // Method 1: Try using a stored procedure if it exists
    const { data, error } = await supabase.rpc('exec_sql', { query: sql })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function applyMigrationsDirectly() {
  console.log('🚀 Applying RAG Migrations Directly')
  console.log(`📍 ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`)

  // Execute SQL directly using the management approach
  const migration1 = `
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rag_auto_index BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rag_indexed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rag_indexed_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_rag_enabled ON profiles(rag_enabled) WHERE rag_enabled = true;
CREATE INDEX IF NOT EXISTS idx_profiles_rag_indexed_at ON profiles(rag_indexed_at) WHERE rag_enabled = true;
`

  const migration2 = `
CREATE TABLE IF NOT EXISTS rag_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  used_rag BOOLEAN NOT NULL DEFAULT false,
  context_items INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_query_logs_user ON rag_query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_created ON rag_query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_used_rag ON rag_query_logs(used_rag);
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_rag_performance ON rag_query_logs(used_rag, response_time_ms) WHERE response_time_ms IS NOT NULL;

ALTER TABLE rag_query_logs ENABLE ROW LEVEL SECURITY;
`

  const policies = `
CREATE POLICY IF NOT EXISTS "Users can view own query logs" ON rag_query_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "System can insert query logs" ON rag_query_logs FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Users can update own ratings" ON rag_query_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
`

  console.log('📄 Migration 1: Adding RAG columns to profiles...')
  console.log('   Note: Direct execution may not be supported by Supabase REST API')
  console.log('   Falling back to manual instructions...\n')

  return false // Indicate we need manual intervention
}

async function main() {
  const needsManual = await applyMigrationsDirectly()

  if (needsManual !== false) {
    console.log('\n' + '='.repeat(70))
    console.log('⚠️  Automatic migration not supported')
    console.log('='.repeat(70))
  }

  console.log('\n📝 Please apply migrations manually:')
  console.log('\n1️⃣  Open Supabase Dashboard:')
  console.log('   🔗 https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new')
  console.log('\n2️⃣  Copy and execute Migration 1 (profiles columns):')
  console.log('\n' + '-'.repeat(70))
  console.log(fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20251026000001_add_rag_preferences.sql'), 'utf8'))
  console.log('-'.repeat(70))
  console.log('\n3️⃣  Copy and execute Migration 2 (rag_query_logs table):')
  console.log('\n' + '-'.repeat(70))
  console.log(fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20251026000002_create_rag_query_logs.sql'), 'utf8'))
  console.log('-'.repeat(70))
  console.log('\n4️⃣  Verify with:')
  console.log('   node scripts/verify-rag-schema.js')
  console.log('\n' + '='.repeat(70))
}

main().catch(console.error)
