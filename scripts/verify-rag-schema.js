/**
 * Verify RAG Schema
 * Check if RAG columns and tables exist
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSchema() {
  console.log('🔍 Verifying RAG database schema...\n')

  try {
    // Try to select RAG columns from profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('id, rag_enabled, rag_auto_index, rag_indexed_at, rag_indexed_count')
      .limit(1)

    if (error) {
      console.log('❌ RAG columns missing in profiles table')
      console.log('   Error:', error.message)
      return false
    }

    console.log('✅ RAG preference columns exist in profiles')

    // Try to query rag_query_logs table
    const { data: logs, error: logsError } = await supabase
      .from('rag_query_logs')
      .select('id')
      .limit(1)

    if (logsError) {
      console.log('❌ rag_query_logs table missing')
      console.log('   Error:', logsError.message)
      return false
    }

    console.log('✅ rag_query_logs table exists')
    console.log('\n' + '='.repeat(60))
    console.log('✅ All RAG schema migrations applied successfully!')
    console.log('='.repeat(60))
    return true

  } catch (err) {
    console.error('❌ Schema check failed:', err.message)
    return false
  }
}

checkSchema().then(success => {
  if (!success) {
    console.log('\n📝 Manual Migration Required:')
    console.log('\n1. Open Supabase SQL Editor:')
    console.log('   https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new')
    console.log('\n2. Copy and execute this SQL:\n')
    console.log('-'.repeat(60))
    console.log(fs.readFileSync('supabase/migrations/20251026000001_add_rag_preferences.sql', 'utf8'))
    console.log('-'.repeat(60))
    console.log('\n3. Then execute:\n')
    console.log('-'.repeat(60))
    console.log(fs.readFileSync('supabase/migrations/20251026000002_create_rag_query_logs.sql', 'utf8'))
    console.log('-'.repeat(60))
  }
  process.exit(success ? 0 : 1)
})
