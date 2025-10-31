-- Check if RLS is enabled on collections tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('collections', 'collection_items', 'collection_access')
ORDER BY tablename;

-- Also check how many policies exist
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('collections', 'collection_items', 'collection_access')
GROUP BY tablename
ORDER BY tablename;
