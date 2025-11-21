-- ================================================================
-- ITONICS Showcase Stream
-- Created: 2025-11-22
-- Purpose: Public showcase stream for capability demonstration
-- ================================================================

-- ================================================================
-- 1. ADD PUBLIC STREAM SUPPORT
-- ================================================================

-- Add is_public column to streams table
ALTER TABLE streams ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS is_showcase BOOLEAN DEFAULT false;

-- Create index for public streams
CREATE INDEX IF NOT EXISTS idx_streams_public ON streams(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_streams_showcase ON streams(is_showcase) WHERE is_showcase = true;

-- Update RLS policy to allow viewing public/showcase streams
DROP POLICY IF EXISTS "Users view member streams" ON streams;
CREATE POLICY "Users view member or public streams" ON streams
  FOR SELECT USING (
    -- Members can see their streams
    id IN (SELECT stream_id FROM stream_members WHERE user_id = auth.uid())
    OR
    -- Anyone can see public/showcase streams
    is_public = true
    OR
    is_showcase = true
  );

-- Update stream items policy to allow viewing public stream items
DROP POLICY IF EXISTS "Members view stream items" ON stream_items;
CREATE POLICY "Members or public view stream items" ON stream_items
  FOR SELECT USING (
    -- Members can see items in their streams
    stream_id IN (SELECT stream_id FROM stream_members WHERE user_id = auth.uid())
    OR
    -- Anyone can see items in public/showcase streams
    stream_id IN (SELECT id FROM streams WHERE is_public = true OR is_showcase = true)
  );

-- ================================================================
-- 2. REMOVE EXISTING ITONICS STREAMS (if any)
-- ================================================================

-- Delete any existing Itonics streams (case-insensitive)
DELETE FROM streams WHERE LOWER(name) = 'itonics';

-- ================================================================
-- 3. CREATE ITONICS SHOWCASE STREAM
-- ================================================================

-- Note: This requires an org_id. We'll use a system/demo org
-- First, ensure we have a system org for showcase content

-- Create or get demo organization
INSERT INTO organizations (id, name, slug, org_type, status)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'OppSpot Showcase',
  'oppspot-showcase',
  'enterprise',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Get a system user ID (first admin user) or create one
DO $$
DECLARE
  system_user_id UUID;
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  itonics_stream_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
BEGIN
  -- Try to get an existing admin user
  SELECT id INTO system_user_id
  FROM auth.users
  LIMIT 1;

  -- If no users exist yet, we'll set system_user_id to a placeholder
  -- It will be updated when the first user accesses the system
  IF system_user_id IS NULL THEN
    system_user_id := '00000000-0000-0000-0000-000000000003'::uuid;
  END IF;

  -- Create ITONICS showcase stream
  INSERT INTO streams (
    id,
    org_id,
    name,
    description,
    emoji,
    color,
    stream_type,
    is_public,
    is_showcase,
    status,
    created_by,
    created_at,
    updated_at,
    metadata
  )
  VALUES (
    itonics_stream_id,
    demo_org_id,
    'ITONICS',
    'Showcase competitive intelligence dashboard tracking ITONICS vs top competitors in the innovation management space. Demonstrates real-time monitoring, trend analysis, and AI-powered insights.',
    '🛡️',
    '#2563eb',
    'research',
    true,  -- Public
    true,  -- Showcase
    'active',
    system_user_id,
    NOW(),
    NOW(),
    jsonb_build_object(
      'showcase', true,
      'category', 'competitive_intelligence',
      'target_company', 'ITONICS',
      'competitors', jsonb_build_array(
        'Miro',
        'Microsoft Whiteboard',
        'Mural',
        'Lucidspark',
        'FigJam',
        'Stormboard',
        'Conceptboard',
        'Padlet'
      ),
      'features', jsonb_build_array(
        'Real-time competitive monitoring',
        'Automated weekly refresh',
        'Trend analysis & visualizations',
        'Custom alert rules',
        'In-app notifications',
        'Email alerts',
        'Platform threat detection'
      )
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    emoji = EXCLUDED.emoji,
    color = EXCLUDED.color,
    is_public = EXCLUDED.is_public,
    is_showcase = EXCLUDED.is_showcase,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

  RAISE NOTICE 'ITONICS showcase stream created with ID: %', itonics_stream_id;
END $$;

-- ================================================================
-- 4. ADD SAMPLE ITEMS TO ITONICS STREAM
-- ================================================================

-- Add link to competitive intelligence dashboard
INSERT INTO stream_items (
  stream_id,
  item_type,
  title,
  description,
  content,
  stage_id,
  priority,
  tags,
  added_by,
  position,
  metadata,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'link',
  'ITONICS Competitive Intelligence Dashboard',
  'Live dashboard tracking ITONICS vs 8 competitors with real-time updates, trend analysis, and custom alerts',
  jsonb_build_object(
    'url', '/competitive-intelligence/itonics',
    'link_type', 'internal'
  ),
  'research',
  'high',
  ARRAY['competitive-intelligence', 'dashboard', 'real-time'],
  (SELECT id FROM auth.users LIMIT 1),
  1,
  jsonb_build_object(
    'showcase_priority', 1,
    'feature_highlight', 'Primary showcase item'
  ),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Add note describing capabilities
INSERT INTO stream_items (
  stream_id,
  item_type,
  title,
  description,
  content,
  stage_id,
  priority,
  tags,
  added_by,
  position,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'note',
  'Competitive Intelligence Capabilities',
  'Key features demonstrated in this showcase',
  jsonb_build_object(
    'content', E'# ITONICS Competitive Intelligence\n\n## Real-Time Monitoring\n- Live WebSocket updates\n- Automatic data refresh\n- Activity feed with change tracking\n\n## Trend Analysis\n- Moat strength trends over time\n- Feature parity evolution\n- Pricing trend tracking\n- Feature velocity metrics\n\n## Alert System\n- Configurable alert rules\n- In-app notification center\n- Email notifications\n- Webhook integrations (Slack/Teams)\n\n## Platform Threat Detection\n- Identifies platform competitors (Microsoft, Miro, FigJam)\n- Monitors competitive positioning\n- Threat level tracking (High/Medium/Low)\n\n## Automated Insights\n- Weekly cron job for data refresh\n- Change detection algorithms\n- Historical snapshot comparison\n- AI-powered analysis'
  ),
  'research',
  'medium',
  ARRAY['capabilities', 'features', 'documentation'],
  (SELECT id FROM auth.users LIMIT 1),
  2,
  NOW()
)
ON CONFLICT DO NOTHING;

-- ================================================================
-- 5. CREATE ACTIVITY LOG ENTRY
-- ================================================================

INSERT INTO stream_activities (
  stream_id,
  user_id,
  activity_type,
  description,
  is_system,
  importance,
  metadata,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  (SELECT id FROM auth.users LIMIT 1),
  'stream_created',
  'ITONICS showcase stream created for capability demonstration',
  true,
  'high',
  jsonb_build_object(
    'showcase', true,
    'public', true,
    'category', 'competitive_intelligence'
  ),
  NOW()
)
ON CONFLICT DO NOTHING;

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON COLUMN streams.is_public IS 'Public streams visible to all authenticated users';
COMMENT ON COLUMN streams.is_showcase IS 'Showcase streams for product demonstrations';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ ITONICS showcase stream created successfully!';
  RAISE NOTICE 'Stream ID: 00000000-0000-0000-0000-000000000002';
  RAISE NOTICE 'Access: Available to all authenticated users';
  RAISE NOTICE 'Dashboard: /competitive-intelligence/itonics';
END $$;
