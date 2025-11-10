/**
 * Enable Supabase Realtime for Live Monitoring
 *
 * Run this SQL script in Supabase SQL Editor to enable real-time updates
 * for the Live Monitoring dashboard.
 *
 * Dashboard: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz
 * Navigate to: SQL Editor → New Query → Paste this script → Run
 */

-- =====================================================
-- STEP 1: Enable Realtime Replication for Tables
-- =====================================================

-- Note: This may need to be done via Supabase Dashboard UI
-- Go to: Database → Replication → Enable for each table

-- Verify replication is enabled:
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
AND tablename IN (
  'streams',
  'acquisition_scans',
  'signal_alerts',
  'agent_executions',
  'notifications',
  'stream_notifications'
);

-- =====================================================
-- STEP 2: Verify Tables Exist
-- =====================================================

DO $$
DECLARE
  missing_tables TEXT[];
BEGIN
  SELECT ARRAY_AGG(t)
  INTO missing_tables
  FROM (
    VALUES
      ('streams'),
      ('acquisition_scans'),
      ('signal_alerts'),
      ('agent_executions'),
      ('notifications'),
      ('stream_notifications'),
      ('stream_members'),
      ('profiles'),
      ('organizations')
  ) AS required(t)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = required.t
  );

  IF missing_tables IS NOT NULL THEN
    RAISE NOTICE 'Missing tables: %', missing_tables;
    RAISE NOTICE 'Please run migrations or create these tables first';
  ELSE
    RAISE NOTICE 'All required tables exist ✓';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Enable RLS and Add SELECT Policies
-- =====================================================

-- Streams: Users can view streams they are members of
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view streams they are members of" ON streams;
CREATE POLICY "Users can view streams they are members of"
ON streams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM stream_members
    WHERE stream_members.stream_id = streams.id
    AND stream_members.user_id = auth.uid()
  )
  OR
  created_by = auth.uid()
);

-- Signal Alerts: Users can view their own alerts
ALTER TABLE signal_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own signal alerts" ON signal_alerts;
CREATE POLICY "Users can view their own signal alerts"
ON signal_alerts FOR SELECT
USING (user_id = auth.uid());

-- Notifications: Users can view their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

-- Agent Executions: Users can view executions for their streams
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view agent executions for their streams" ON agent_executions;
CREATE POLICY "Users can view agent executions for their streams"
ON agent_executions FOR SELECT
USING (
  stream_id IS NULL
  OR EXISTS (
    SELECT 1 FROM stream_members
    WHERE stream_members.stream_id = agent_executions.stream_id
    AND stream_members.user_id = auth.uid()
  )
);

-- Acquisition Scans: Users can view their own scans
ALTER TABLE acquisition_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own scans" ON acquisition_scans;
CREATE POLICY "Users can view their own scans"
ON acquisition_scans FOR SELECT
USING (user_id = auth.uid());

-- =====================================================
-- STEP 4: Verify Profiles Have org_id
-- =====================================================

-- Check if org_id column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'org_id'
  ) THEN
    RAISE NOTICE 'Adding org_id column to profiles table...';

    -- Add org_id column if missing
    ALTER TABLE profiles ADD COLUMN org_id UUID REFERENCES organizations(id);

    -- Optional: Set default org for existing users
    -- UPDATE profiles SET org_id = (SELECT id FROM organizations LIMIT 1)
    -- WHERE org_id IS NULL;

    RAISE NOTICE 'org_id column added to profiles ✓';
  ELSE
    RAISE NOTICE 'org_id column already exists in profiles ✓';
  END IF;
END $$;

-- Check users without org_id
SELECT
  COUNT(*) as users_without_org,
  ARRAY_AGG(email) as emails
FROM profiles
WHERE org_id IS NULL;

-- =====================================================
-- STEP 5: Create Test Data (Optional)
-- =====================================================

-- Uncomment to create test data for monitoring

/*
-- Create test organization
INSERT INTO organizations (id, name, created_at)
VALUES (gen_random_uuid(), 'Test Organization', now())
ON CONFLICT DO NOTHING;

-- Create test stream
INSERT INTO streams (
  id,
  org_id,
  name,
  description,
  stream_type,
  status,
  goal_status,
  current_progress,
  created_by,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM organizations LIMIT 1),
  'Test Stream for Monitoring',
  'Real-time monitoring test stream',
  'project',
  'active',
  'in_progress',
  jsonb_build_object(
    'completed', 3,
    'total', 10,
    'percentage', 30,
    'last_updated', now()
  ),
  auth.uid(),
  now(),
  now()
)
ON CONFLICT DO NOTHING;

-- Add current user as stream member
INSERT INTO stream_members (
  id,
  stream_id,
  user_id,
  role,
  joined_at
)
SELECT
  gen_random_uuid(),
  s.id,
  auth.uid(),
  'owner',
  now()
FROM streams s
WHERE s.name = 'Test Stream for Monitoring'
AND NOT EXISTS (
  SELECT 1 FROM stream_members
  WHERE stream_id = s.id
  AND user_id = auth.uid()
);

-- Create test signal alert
INSERT INTO signal_alerts (
  id,
  user_id,
  signal_id,
  business_id,
  business_name,
  signal_type,
  priority,
  created_at
)
VALUES (
  gen_random_uuid(),
  auth.uid(),
  gen_random_uuid(),
  gen_random_uuid(),
  'Acme Corporation',
  'funding_event',
  'high',
  now()
)
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- STEP 6: Verify Configuration
-- =====================================================

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'streams',
  'acquisition_scans',
  'signal_alerts',
  'agent_executions',
  'notifications'
)
ORDER BY tablename, policyname;

-- Check realtime publications
SELECT
  schemaname,
  tablename,
  'Realtime Enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Realtime Configuration Complete!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Go to Supabase Dashboard → Database → Replication';
  RAISE NOTICE '2. Enable Realtime for these tables:';
  RAISE NOTICE '   - streams';
  RAISE NOTICE '   - acquisition_scans';
  RAISE NOTICE '   - signal_alerts';
  RAISE NOTICE '   - agent_executions';
  RAISE NOTICE '   - notifications';
  RAISE NOTICE '';
  RAISE NOTICE '3. Navigate to /monitoring in your app';
  RAISE NOTICE '4. Check connection status indicators';
  RAISE NOTICE '5. Test by updating a stream or creating an alert';
  RAISE NOTICE '';
  RAISE NOTICE 'Troubleshooting: See LIVE_MONITORING_DIAGNOSTIC.md';
  RAISE NOTICE '==============================================';
END $$;
