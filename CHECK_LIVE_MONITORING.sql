-- ============================================================================
-- LIVE MONITORING DATABASE VERIFICATION SCRIPT
-- ============================================================================
-- Run this in Supabase SQL Editor to check what's missing
-- URL: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new
-- ============================================================================

\echo '🔍 Checking database objects for live monitoring...'
\echo ''

-- Check 1: Verify RBAC Functions Exist
\echo '1️⃣ CHECKING RBAC FUNCTIONS...'
SELECT
  routine_name,
  CASE
    WHEN routine_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_permissions', 'has_permission')
ORDER BY routine_name;

-- Check 2: Verify Tables Exist
\echo '2️⃣ CHECKING REQUIRED TABLES...'
SELECT
  table_name,
  CASE
    WHEN table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('team_activities', 'ai_digest', 'profiles', 'organizations')
ORDER BY table_name;

-- Check 3: Test Function Execution
\echo '3️⃣ TESTING FUNCTION EXECUTION...'
DO $$
BEGIN
  PERFORM get_user_permissions('00000000-0000-0000-0000-000000000000'::uuid);
  RAISE NOTICE '✅ get_user_permissions() is EXECUTABLE';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ get_user_permissions() FAILED: %', SQLERRM;
END
$$;

-- Check 4: Verify RLS is Enabled
\echo '4️⃣ CHECKING ROW LEVEL SECURITY...'
SELECT
  tablename as table_name,
  CASE
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '⚠️  DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('team_activities', 'ai_digest')
ORDER BY tablename;

-- Check 5: Count RLS Policies
\echo '5️⃣ CHECKING RLS POLICIES...'
SELECT
  tablename as table_name,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ HAS POLICIES'
    ELSE '⚠️  NO POLICIES'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('team_activities', 'ai_digest')
GROUP BY tablename
ORDER BY tablename;

-- Check 6: Verify Indexes Exist
\echo '6️⃣ CHECKING PERFORMANCE INDEXES...'
SELECT
  tablename as table_name,
  indexname as index_name,
  '✅ EXISTS' as status
FROM pg_indexes
WHERE schemaname = 'public'
AND (indexname LIKE '%team_activities%' OR indexname LIKE '%ai_digest%')
ORDER BY tablename, indexname;

-- Check 7: Test ai_digest table structure
\echo '7️⃣ CHECKING AI_DIGEST TABLE STRUCTURE...'
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'ai_digest'
ORDER BY ordinal_position;

-- Check 8: Test team_activities table structure
\echo '8️⃣ CHECKING TEAM_ACTIVITIES TABLE STRUCTURE...'
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'team_activities'
ORDER BY ordinal_position;

-- ============================================================================
-- SUMMARY
-- ============================================================================
\echo ''
\echo '📊 VERIFICATION COMPLETE'
\echo ''
\echo 'If you see any ❌ MISSING or errors above:'
\echo '1. Run COMPLETE_FIX.sql to create all missing objects'
\echo '2. Clear browser cache and restart dev server'
\echo '3. Hard refresh (Ctrl+Shift+R) the application'
\echo ''
-- ============================================================================
