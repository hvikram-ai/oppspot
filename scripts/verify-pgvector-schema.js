/**
 * Verify pgvector Schema
 * Check if user_context_vectors table exists and is configured correctly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifySchema() {
  console.log('🔍 Verifying pgvector schema for RAG...\n')

  try {
    // Test 1: Check user_context_vectors table exists
    console.log('1️⃣  Checking user_context_vectors table...')
    const { data: vectors, error: vectorsError } = await supabase
      .from('user_context_vectors')
      .select('id')
      .limit(1)

    if (vectorsError) {
      console.log('   ❌ Table missing:', vectorsError.message)
      return false
    }
    console.log('   ✅ Table exists')

    // Test 2: Check find_similar_user_context function
    console.log('\n2️⃣  Checking find_similar_user_context function...')
    try {
      const { error: funcError } = await supabase.rpc('find_similar_user_context', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_query_embedding: Array(1536).fill(0),
        p_match_count: 1
      })

      // Function exists if we get a result or a valid error (not "function does not exist")
      if (funcError && funcError.message.includes('does not exist')) {
        console.log('   ❌ Function missing')
        return false
      }
      console.log('   ✅ Function exists')
    } catch (err) {
      console.log('   ❌ Function test failed:', err.message)
      return false
    }

    // Test 3: Check user_context_coverage view
    console.log('\n3️⃣  Checking user_context_coverage view...')
    const { data: coverage, error: coverageError } = await supabase
      .from('user_context_coverage')
      .select('*')
      .limit(1)

    if (coverageError) {
      console.log('   ❌ View missing:', coverageError.message)
      return false
    }
    console.log('   ✅ View exists')
    if (coverage && coverage[0]) {
      console.log(`   📊 Users with context: ${coverage[0].users_with_context || 0}`)
      console.log(`   📊 Total vectors: ${coverage[0].total_vectors || 0}`)
    }

    // Test 4: Check RAG preference columns in profiles
    console.log('\n4️⃣  Checking RAG columns in profiles table...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, rag_enabled, rag_auto_index, rag_indexed_at, rag_indexed_count')
      .limit(1)

    if (profileError) {
      console.log('   ❌ RAG columns missing:', profileError.message)
      return false
    }
    console.log('   ✅ RAG columns exist')

    console.log('\n' + '='.repeat(70))
    console.log('✅ All pgvector schema migrations applied successfully!')
    console.log('='.repeat(70))
    console.log('\n🎯 Next Steps:')
    console.log('   1. Start dev server: npm run dev')
    console.log('   2. Test health check: curl http://localhost:3000/api/rag/health')
    console.log('   3. Index user data: POST /api/rag/index')
    console.log('   4. Test RAG queries: POST /api/search/semantic with use_rag=true')
    console.log()
    return true

  } catch (err) {
    console.error('\n❌ Schema verification failed:', err.message)
    return false
  }
}

verifySchema().then(success => {
  if (!success) {
    console.log('\n📝 Migration Required:')
    console.log('   1. See: APPLY_PGVECTOR_MIGRATION.md')
    console.log('   2. SQL file: supabase/migrations/20251026000003_create_user_context_vectors.sql')
    console.log('   3. Dashboard: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new')
  }
  process.exit(success ? 0 : 1)
})
