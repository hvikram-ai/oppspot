/**
 * Enable Supabase Realtime for Live Monitoring (CORRECTED)
 *
 * This script enables real-time updates for tables that ACTUALLY EXIST in your database.
 * Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz
 *
 * Navigate to: SQL Editor → New Query → Paste this script → Run
 */

-- =====================================================
-- STEP 1: Verify Which Tables Exist
-- =====================================================

DO $$
DECLARE
  existing_tables TEXT[];
  missing_tables TEXT[];
BEGIN
  -- Check which tables exist
  SELECT ARRAY_AGG(t)
  INTO existing_tables
  FROM (
    VALUES
      ('streams'),
      ('acquisition_scans'),
      ('buying_signals'),
      ('agent_executions'),
      ('notifications'),
      ('stream_notifications'),
      ('stream_members'),
      ('profiles'),
      ('organizations'),
      ('system_alerts')
  ) AS required(t)
  WHERE EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = required.t
  );

  -- Check which are missing
  SELECT ARRAY_AGG(t)
  INTO missing_tables
  FROM (
    VALUES
      ('streams'),
      ('acquisition_scans'),
      ('buying_signals'),
      ('agent_executions'),
      ('notifications'),
      ('stream_notifications')
  ) AS required(t)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = required.t
  );

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Table Status Check';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Existing tables: %', existing_tables;
  IF missing_tables IS NOT NULL THEN
    RAISE NOTICE 'Missing tables: %', missing_tables;
  ELSE
    RAISE NOTICE 'All realtime tables exist ✓';
  END IF;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 2: Check Realtime Publication Status
-- =====================================================

SELECT
  'Currently Enabled for Realtime:' as status,
  STRING_AGG(tablename, ', ') as tables
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
AND tablename IN (
  'streams',
  'acquisition_scans',
  'buying_signals',
  'agent_executions',
  'notifications',
  'stream_notifications',
  'system_alerts'
);

-- =====================================================
-- STEP 3: Enable RLS and Add SELECT Policies
-- =====================================================

-- Streams: Users can view streams they are members of
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'streams') THEN
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

    RAISE NOTICE '✓ streams: RLS policies configured';
  END IF;
END $$;

-- Buying Signals: Users can view signals for companies in their org
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'buying_signals') THEN
    ALTER TABLE buying_signals ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view buying signals in their org" ON buying_signals;
    CREATE POLICY "Users can view buying signals in their org"
    ON buying_signals FOR SELECT
    USING (
      org_id IS NULL
      OR org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    );

    RAISE NOTICE '✓ buying_signals: RLS policies configured';
  END IF;
END $$;

-- Notifications: Users can view their own notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
    CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

    RAISE NOTICE '✓ notifications: RLS policies configured';
  END IF;
END $$;

-- Stream Notifications: Users can view notifications for their streams
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stream_notifications') THEN
    ALTER TABLE stream_notifications ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view stream notifications" ON stream_notifications;
    CREATE POLICY "Users can view stream notifications"
    ON stream_notifications FOR SELECT
    USING (user_id = auth.uid());

    RAISE NOTICE '✓ stream_notifications: RLS policies configured';
  END IF;
END $$;

-- Agent Executions: Users can view executions for their streams
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_executions') THEN
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

    RAISE NOTICE '✓ agent_executions: RLS policies configured';
  END IF;
END $$;

-- Acquisition Scans: Users can view their own scans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acquisition_scans') THEN
    ALTER TABLE acquisition_scans ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own scans" ON acquisition_scans;
    CREATE POLICY "Users can view their own scans"
    ON acquisition_scans FOR SELECT
    USING (
      user_id = auth.uid()
      OR org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    );

    RAISE NOTICE '✓ acquisition_scans: RLS policies configured';
  END IF;
END $$;

-- System Alerts: Users can view their own alerts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_alerts') THEN
    ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own system alerts" ON system_alerts;
    CREATE POLICY "Users can view their own system alerts"
    ON system_alerts FOR SELECT
    USING (
      user_id = auth.uid()
      OR org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    );

    RAISE NOTICE '✓ system_alerts: RLS policies configured';
  END IF;
END $$;

-- =====================================================
-- STEP 4: Verify Profiles Have org_id
-- =====================================================

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

    RAISE NOTICE '✓ org_id column added to profiles';
  ELSE
    RAISE NOTICE '✓ org_id column already exists in profiles';
  END IF;
END $$;

-- Check users without org_id
SELECT
  'Users without org_id:' as status,
  COUNT(*) as count
FROM profiles
WHERE org_id IS NULL;

-- =====================================================
-- STEP 5: Create Test Data (Optional)
-- =====================================================

-- Uncomment to create test data for monitoring

/*
-- Create test stream if you have an org
DO $$
DECLARE
  test_org_id UUID;
  test_stream_id UUID;
BEGIN
  -- Get first org or create one
  SELECT id INTO test_org_id FROM organizations LIMIT 1;

  IF test_org_id IS NULL THEN
    INSERT INTO organizations (id, name, created_at)
    VALUES (gen_random_uuid(), 'Test Organization', now())
    RETURNING id INTO test_org_id;
  END IF;

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
    updated_at,
    emoji,
    color
  )
  VALUES (
    gen_random_uuid(),
    test_org_id,
    'Test Stream for Realtime Monitoring',
    'This stream tests real-time updates',
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
    now(),
    '🎯',
    '#6366f1'
  )
  RETURNING id INTO test_stream_id;

  -- Add current user as stream member
  INSERT INTO stream_members (
    id,
    stream_id,
    user_id,
    role,
    joined_at,
    notification_settings
  )
  VALUES (
    gen_random_uuid(),
    test_stream_id,
    auth.uid(),
    'owner',
    now(),
    jsonb_build_object(
      'new_items', true,
      'status_changes', true,
      'mentions', true,
      'comments', true,
      'daily_digest', false,
      'instant_critical', true
    )
  );

  RAISE NOTICE '✓ Test stream created: %', test_stream_id;
END $$;

-- Create test buying signal
INSERT INTO buying_signals (
  id,
  company_id,
  org_id,
  signal_type,
  signal_strength,
  detected_at,
  status,
  metadata
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM businesses LIMIT 1),
  (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1),
  'job_posting',
  85,
  now(),
  'active',
  jsonb_build_object(
    'title', 'Senior Software Engineer',
    'department', 'Engineering',
    'description', 'Test signal for realtime monitoring'
  )
WHERE EXISTS (SELECT 1 FROM businesses LIMIT 1);
*/

-- =====================================================
-- STEP 6: Verify Configuration
-- =====================================================

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'streams',
  'acquisition_scans',
  'buying_signals',
  'agent_executions',
  'notifications',
  'stream_notifications',
  'system_alerts'
)
ORDER BY tablename, policyname;

-- =====================================================
-- STEP 7: Final Instructions
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'RLS Configuration Complete!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CRITICAL NEXT STEP:';
  RAISE NOTICE 'You MUST enable Realtime via Supabase Dashboard UI:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Go to: Database → Replication';
  RAISE NOTICE '2. Enable Realtime for these tables:';
  RAISE NOTICE '   ✓ streams';
  RAISE NOTICE '   ✓ acquisition_scans';
  RAISE NOTICE '   ✓ buying_signals';
  RAISE NOTICE '   ✓ agent_executions';
  RAISE NOTICE '   ✓ notifications';
  RAISE NOTICE '   ✓ stream_notifications';
  RAISE NOTICE '';
  RAISE NOTICE '3. Click the toggle switch next to each table';
  RAISE NOTICE '4. Wait for "Realtime enabled" confirmation';
  RAISE NOTICE '';
  RAISE NOTICE 'Then test:';
  RAISE NOTICE '1. Navigate to /monitoring in your app';
  RAISE NOTICE '2. Check for green "Connected" indicators';
  RAISE NOTICE '3. Update a stream to see live updates';
  RAISE NOTICE '';
  RAISE NOTICE 'Test SQL:';
  RAISE NOTICE 'UPDATE streams SET updated_at = now()';
  RAISE NOTICE 'WHERE id IN (SELECT id FROM streams LIMIT 1);';
  RAISE NOTICE '';
  RAISE NOTICE 'Troubleshooting: See LIVE_MONITORING_DIAGNOSTIC.md';
  RAISE NOTICE '==============================================';
END $$;
