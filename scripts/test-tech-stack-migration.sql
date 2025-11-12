-- ============================================
-- TEST SCRIPT: Tech Stack Analysis Migration
-- ============================================
-- Run this after applying the migration to verify everything works

-- 1. Verify all tables exist
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename LIKE 'tech_stack%'
ORDER BY tablename;

-- 2. Verify all enums exist
SELECT
  t.typname AS enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE 'tech%'
GROUP BY t.typname
ORDER BY t.typname;

-- 3. Verify indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename LIKE 'tech_stack%'
ORDER BY tablename, indexname;

-- 4. Verify triggers
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%tech_stack%'
ORDER BY event_object_table, trigger_name;

-- 5. Verify RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename LIKE 'tech_stack%'
ORDER BY tablename, policyname;

-- 6. Test insert with auto-triggers
-- Note: This requires valid data_room_id and user_id
-- Uncomment and modify IDs to test

/*
-- Insert test analysis
INSERT INTO tech_stack_analyses (
  data_room_id,
  created_by,
  title,
  description
) VALUES (
  'YOUR_DATA_ROOM_ID_HERE',
  'YOUR_USER_ID_HERE',
  'Test Analysis',
  'Testing migration'
) RETURNING *;

-- Insert test technology
INSERT INTO tech_stack_technologies (
  analysis_id,
  name,
  category,
  confidence_score,
  risk_score
) VALUES (
  'ANALYSIS_ID_FROM_ABOVE',
  'React',
  'frontend',
  0.95,
  20
) RETURNING *;

-- Verify counts updated automatically
SELECT
  title,
  technologies_identified,
  frontend_count,
  risk_level,
  modernization_score,
  technical_debt_score
FROM tech_stack_analyses
WHERE id = 'ANALYSIS_ID_FROM_ABOVE';

-- Cleanup
DELETE FROM tech_stack_analyses WHERE title = 'Test Analysis';
*/
