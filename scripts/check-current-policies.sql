-- Check what RLS policies are currently active on collections table

SELECT
  policyname as "Policy Name",
  cmd as "Command",
  qual as "USING Expression",
  with_check as "WITH CHECK Expression"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'collections'
ORDER BY cmd, policyname;
