-- ============================================
-- STREAM SETUP WORKFLOW - MIGRATION
-- Migration: 20251031000003_stream_workflow.sql
-- Feature: Stream Setup Workflow with Goal-Oriented Configuration
-- Description: Business profiles, goal templates, and enhanced streams
-- ============================================

-- ============================================
-- 1. BUSINESS PROFILES TABLE (Org-Scoped)
-- ============================================

CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  website_url TEXT NOT NULL,

  -- AI-Extracted Data (FR-007: 11 fields)
  industry TEXT,
  description TEXT,
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  location TEXT,
  revenue_range TEXT CHECK (revenue_range IN ('$0-1M', '$1-10M', '$10-50M', '$50-100M', '$100M+')),
  tech_stack TEXT[] DEFAULT '{}',
  products_services TEXT[] DEFAULT '{}',
  target_markets TEXT[] DEFAULT '{}',
  key_differentiators TEXT[] DEFAULT '{}',
  employee_count INTEGER,

  -- Manual Overrides (FR-010: user can edit)
  manual_edits JSONB DEFAULT '{}',

  -- Analysis Metadata (FR-008: progress tracking)
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
  analysis_metadata JSONB DEFAULT '{}',
  analysis_started_at TIMESTAMPTZ,
  analysis_completed_at TIMESTAMPTZ,

  -- Ownership
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints (FR-011: org-scoped uniqueness)
  UNIQUE(org_id, website_url),
  UNIQUE(org_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_profiles_org_id ON business_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_status ON business_profiles(analysis_status) WHERE analysis_status != 'completed';
CREATE INDEX IF NOT EXISTS idx_business_profiles_created_by ON business_profiles(created_by);

-- Comments
COMMENT ON TABLE business_profiles IS 'Org-scoped business profiles for search personalization (FR-011)';
COMMENT ON COLUMN business_profiles.tech_stack IS 'Technologies used by user''s company (extracted from website)';
COMMENT ON COLUMN business_profiles.target_markets IS 'Industries/markets the user''s company serves';
COMMENT ON COLUMN business_profiles.manual_edits IS 'JSONB tracking user modifications: {field_name: {original: value, edited: value, edited_at: timestamp}}';
COMMENT ON COLUMN business_profiles.analysis_metadata IS 'AI analysis results: {model: string, tokens_used: number, analysis_time_ms: number, error_message: string}';

-- ============================================
-- 2. RLS POLICIES FOR BUSINESS PROFILES
-- ============================================

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view profiles in their org (FR-011, FR-012)
CREATE POLICY "Users can view profiles in their org"
  ON business_profiles FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- Users can create profiles for their org (FR-007)
CREATE POLICY "Users can create profiles for their org"
  ON business_profiles FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- Users can update profiles in their org (FR-010)
CREATE POLICY "Users can update profiles in their org"
  ON business_profiles FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- Users can delete profiles they created or org admins can delete any
CREATE POLICY "Users can delete profiles they created"
  ON business_profiles FOR DELETE
  USING (
    created_by = auth.uid()
    OR org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role = 'org_admin'
    )
  );

-- ============================================
-- 3. GOAL TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS goal_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('acquisition', 'expansion', 'research')),
  icon TEXT,

  -- Defaults (merged with user input during stream creation)
  default_criteria JSONB DEFAULT '{}',
  default_metrics JSONB DEFAULT '{}',
  default_success_criteria JSONB DEFAULT '{}',

  -- Suggested Workflow
  suggested_stages JSONB DEFAULT '[]',
  suggested_agents JSONB DEFAULT '[]',

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if table already exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_templates' AND column_name = 'is_active') THEN
    ALTER TABLE goal_templates ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_templates' AND column_name = 'use_count') THEN
    ALTER TABLE goal_templates ADD COLUMN use_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_templates' AND column_name = 'display_order') THEN
    ALTER TABLE goal_templates ADD COLUMN display_order INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_templates' AND column_name = 'suggested_stages') THEN
    ALTER TABLE goal_templates ADD COLUMN suggested_stages JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_templates' AND column_name = 'suggested_agents') THEN
    ALTER TABLE goal_templates ADD COLUMN suggested_agents JSONB DEFAULT '[]';
  END IF;
END $$;

-- Index (now safe to create after ensuring column exists)
CREATE INDEX IF NOT EXISTS idx_goal_templates_category ON goal_templates(category) WHERE is_active = true;

-- Comments
COMMENT ON TABLE goal_templates IS 'Predefined goal types for stream creation (FR-002: 7 types)';
COMMENT ON COLUMN goal_templates.use_count IS 'Analytics: tracks popularity of goal types';
COMMENT ON COLUMN goal_templates.suggested_stages IS 'Custom workflow stages for this goal type';
COMMENT ON COLUMN goal_templates.suggested_agents IS 'AI agents to auto-assign: [{agent_type, role, order, config}]';

-- ============================================
-- 4. SEED GOAL TEMPLATES (FR-002: 7 types)
-- ============================================

INSERT INTO goal_templates (id, name, description, category, icon, display_order, default_criteria, default_metrics) VALUES
  (
    'due_diligence',
    'Conduct Due Diligence',
    'Deep analysis of specific acquisition target',
    'acquisition',
    '🔍',
    1,
    '{"focus": "deep_analysis", "target_type": "specific_company"}',
    '{"reports_to_generate": 3, "areas_to_analyze": ["financials", "operations", "legal", "technology"]}'
  ),
  (
    'discover_companies',
    'Discover Companies',
    'Find and qualify potential acquisition targets',
    'expansion',
    '🎯',
    2,
    '{"focus": "discovery", "target_type": "multiple_companies"}',
    '{"companies_to_find": 50, "min_quality_score": 4.0}'
  ),
  (
    'market_research',
    'Market Research',
    'Analyze market trends and competitive landscape',
    'research',
    '📊',
    3,
    '{"focus": "market_analysis", "scope": "industry_wide"}',
    '{"markets_to_analyze": 3, "trends_to_identify": 10}'
  ),
  (
    'competitive_analysis',
    'Competitive Analysis',
    'Compare competitors and identify differentiation',
    'research',
    '⚔️',
    4,
    '{"focus": "competitor_analysis", "comparison_type": "head_to_head"}',
    '{"competitors_to_analyze": 5, "dimensions": ["pricing", "features", "market_share"]}'
  ),
  (
    'territory_expansion',
    'Territory Expansion',
    'Explore new geographic or vertical markets',
    'expansion',
    '🌍',
    5,
    '{"focus": "geographic_expansion", "target_type": "new_markets"}',
    '{"territories_to_explore": 3, "companies_per_territory": 20}'
  ),
  (
    'investment_pipeline',
    'Investment Pipeline',
    'Build and manage deal flow pipeline',
    'acquisition',
    '💼',
    6,
    '{"focus": "pipeline_management", "target_type": "multiple_deals"}',
    '{"pipeline_target": 30, "qualified_deals": 10, "closed_deals": 2}'
  ),
  (
    'partnership_opportunities',
    'Partnership Opportunities',
    'Identify strategic partnership candidates',
    'expansion',
    '🤝',
    7,
    '{"focus": "partnership", "partnership_type": "strategic"}',
    '{"partners_to_identify": 15, "partnership_models": ["integration", "reseller", "joint_venture"]}'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. ENHANCE STREAMS TABLE
-- ============================================

-- Add business_profile_id column to streams (FR-018: personalization)
ALTER TABLE streams
  ADD COLUMN IF NOT EXISTS business_profile_id UUID REFERENCES business_profiles(id) ON DELETE SET NULL;

-- Index for queries joining streams with profiles
CREATE INDEX IF NOT EXISTS idx_streams_business_profile_id ON streams(business_profile_id);

-- Comment
COMMENT ON COLUMN streams.business_profile_id IS 'Links stream to business profile for personalization (FR-018)';

-- ============================================
-- 6. UPDATE EXISTING RLS POLICIES (if needed)
-- ============================================

-- Verify stream_items RLS allows all asset types
-- Note: stream_items already supports all required types from migration 20250130000001
-- Types: company, search_query, list, note, ai_research, opportunity, stakeholder, task, file, link
-- Extended via content JSONB: insights, data_rooms, hypotheses (FR-014, FR-017)

-- ============================================
-- 7. TRIGGER: UPDATE updated_at ON business_profiles
-- ============================================

CREATE OR REPLACE FUNCTION update_business_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_business_profiles_updated_at
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_business_profiles_updated_at();

-- ============================================
-- 8. TRIGGER: UPDATE updated_at ON goal_templates
-- ============================================

CREATE OR REPLACE FUNCTION update_goal_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_goal_templates_updated_at
  BEFORE UPDATE ON goal_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_templates_updated_at();

-- ============================================
-- 9. HELPER FUNCTION: Check if profile is in use
-- ============================================

CREATE OR REPLACE FUNCTION is_profile_in_use(profile_id UUID)
RETURNS TABLE (
  in_use BOOLEAN,
  active_stream_count INTEGER,
  stream_ids UUID[],
  stream_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) > 0 AS in_use,
    COUNT(*)::INTEGER AS active_stream_count,
    ARRAY_AGG(s.id) AS stream_ids,
    ARRAY_AGG(s.name) AS stream_names
  FROM streams s
  WHERE s.business_profile_id = profile_id
    AND s.status = 'active';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_profile_in_use IS 'Check if a business profile is currently used by active streams (prevents deletion)';

-- ============================================
-- 10. VALIDATION QUERIES (for testing)
-- ============================================

-- Verify business_profiles table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'business_profiles'
  ) THEN
    RAISE NOTICE 'SUCCESS: business_profiles table created';
  ELSE
    RAISE EXCEPTION 'FAILED: business_profiles table not found';
  END IF;
END $$;

-- Verify goal_templates seeded
DO $$
DECLARE
  template_count INTEGER;
  new_templates INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count FROM goal_templates;

  -- Count how many of our 7 templates exist
  SELECT COUNT(*) INTO new_templates FROM goal_templates
  WHERE id IN ('due_diligence', 'discover_companies', 'market_research',
               'competitive_analysis', 'territory_expansion', 'investment_pipeline',
               'partnership_opportunities');

  IF new_templates >= 7 THEN
    RAISE NOTICE 'SUCCESS: All 7 required goal templates exist (total templates: %)', template_count;
  ELSE
    RAISE NOTICE 'WARNING: Only % of 7 required templates found (total templates: %)', new_templates, template_count;
  END IF;
END $$;

-- Verify streams.business_profile_id column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'streams'
    AND column_name = 'business_profile_id'
  ) THEN
    RAISE NOTICE 'SUCCESS: streams.business_profile_id column added';
  ELSE
    RAISE EXCEPTION 'FAILED: streams.business_profile_id column not found';
  END IF;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Summary of changes:
-- 1. Created business_profiles table with RLS policies
-- 2. Created goal_templates table with 7 seeded templates
-- 3. Added business_profile_id to streams table
-- 4. Created indexes for query performance
-- 5. Added triggers for updated_at timestamps
-- 6. Added helper function for profile deletion checks
-- 7. Validated all changes with inline tests

-- Next steps:
-- - Run: npx supabase db push (T002)
-- - Generate types: npx supabase gen types typescript --local (T003)
-- - Verify seed data: SELECT * FROM goal_templates ORDER BY display_order (T004)
