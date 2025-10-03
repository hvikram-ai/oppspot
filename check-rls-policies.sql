-- Check current RLS policies on streams table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'streams'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'streams';

-- Check table owner and grants
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'streams'
ORDER BY grantee, privilege_type;
