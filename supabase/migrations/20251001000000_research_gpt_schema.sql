-- ResearchGPT™ Database Schema Migration
-- Feature: Deep Company Intelligence in 30 seconds
-- Created: 2025-10-01
-- Tables: research_reports, research_sections, research_sources, user_research_quotas

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Report status lifecycle
CREATE TYPE report_status AS ENUM (
  'pending',      -- Queued for generation
  'generating',   -- Currently being generated
  'complete',     -- All 6 sections complete
  'partial',      -- Some sections failed
  'failed'        -- All sections failed
);

-- Section types (6 mandatory sections)
CREATE TYPE section_type AS ENUM (
  'snapshot',            -- Company fundamentals
  'buying_signals',      -- Hiring, expansion, funding signals
  'decision_makers',     -- Key people
  'revenue_signals',     -- Financial performance
  'recommended_approach', -- AI-generated outreach strategy
  'sources'              -- Source verification
);

-- Confidence levels for data quality
CREATE TYPE confidence_level AS ENUM ('high', 'medium', 'low');

-- Source types for attribution
CREATE TYPE source_type AS ENUM (
  'companies_house',
  'press_release',
  'news_article',
  'company_website',
  'job_posting',
  'linkedin',
  'financial_filing',
  'industry_report',
  'social_media'
);

-- ============================================================================
-- TABLE: research_reports
-- ============================================================================

CREATE TABLE research_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_number TEXT,

  -- Status tracking
  status report_status NOT NULL DEFAULT 'pending',
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Progress tracking
  sections_complete INTEGER NOT NULL DEFAULT 0 CHECK (sections_complete >= 0 AND sections_complete <= 6),
  total_sources INTEGER NOT NULL DEFAULT 0,

  -- Caching
  generated_at TIMESTAMPTZ,
  cached_until TIMESTAMPTZ,

  -- Metadata (JSONB for flexibility)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_research_reports_user_id ON research_reports(user_id);
CREATE INDEX idx_research_reports_company_id ON research_reports(company_id);
CREATE INDEX idx_research_reports_status ON research_reports(status);
CREATE INDEX idx_research_reports_cached_until ON research_reports(cached_until);
CREATE INDEX idx_research_reports_user_company ON research_reports(user_id, company_id);

-- RLS Policies
ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own research reports"
  ON research_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own research reports"
  ON research_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own research reports"
  ON research_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own research reports"
  ON research_reports FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: research_sections
-- ============================================================================

CREATE TABLE research_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES research_reports(id) ON DELETE CASCADE,
  section_type section_type NOT NULL,

  -- Content (JSONB for flexible schema per section type)
  content JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Quality metrics
  confidence confidence_level NOT NULL DEFAULT 'medium',
  sources_count INTEGER NOT NULL DEFAULT 0,

  -- Caching (differential TTL: 7d for snapshot, 6h for signals)
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Performance tracking
  generation_time_ms INTEGER,

  -- Error handling
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one section per type per report
  UNIQUE(report_id, section_type)
);

-- Indexes
CREATE INDEX idx_research_sections_report_id ON research_sections(report_id);
CREATE INDEX idx_research_sections_type_expires ON research_sections(section_type, expires_at);
CREATE INDEX idx_research_sections_confidence ON research_sections(confidence);

-- RLS Policies (inherit from research_reports)
ALTER TABLE research_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sections of own reports"
  ON research_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM research_reports
      WHERE research_reports.id = research_sections.report_id
      AND research_reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sections for own reports"
  ON research_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM research_reports
      WHERE research_reports.id = research_sections.report_id
      AND research_reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sections of own reports"
  ON research_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM research_reports
      WHERE research_reports.id = research_sections.report_id
      AND research_reports.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TABLE: research_sources
-- ============================================================================

CREATE TABLE research_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES research_reports(id) ON DELETE CASCADE,
  section_type section_type, -- NULL if source used in multiple sections

  -- Source details
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  published_date TIMESTAMPTZ,
  accessed_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Source classification
  source_type source_type NOT NULL,
  reliability_score DECIMAL(3,2) CHECK (reliability_score >= 0 AND reliability_score <= 1),

  -- Metadata
  domain TEXT,
  content_snippet TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_research_sources_report_id ON research_sources(report_id);
CREATE INDEX idx_research_sources_domain ON research_sources(domain);
CREATE INDEX idx_research_sources_type ON research_sources(source_type);

-- RLS Policies
ALTER TABLE research_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sources of own reports"
  ON research_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM research_reports
      WHERE research_reports.id = research_sources.report_id
      AND research_reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sources for own reports"
  ON research_sources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM research_reports
      WHERE research_reports.id = research_sources.report_id
      AND research_reports.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TABLE: user_research_quotas
-- ============================================================================

CREATE TABLE user_research_quotas (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Quota period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Usage tracking
  researches_used INTEGER NOT NULL DEFAULT 0 CHECK (researches_used >= 0),
  researches_limit INTEGER NOT NULL DEFAULT 100,

  -- Tier (for future pricing)
  tier TEXT NOT NULL DEFAULT 'standard',

  -- Notification tracking (FR-041b)
  notification_90_percent_sent BOOLEAN NOT NULL DEFAULT FALSE,
  notification_100_percent_sent BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_research_quotas_period ON user_research_quotas(period_start, period_end);

-- RLS Policies
ALTER TABLE user_research_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quota"
  ON user_research_quotas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own quota"
  ON user_research_quotas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert quotas"
  ON user_research_quotas FOR INSERT
  WITH CHECK (true); -- Allow system to create quota rows

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate cache expiration based on section type
CREATE OR REPLACE FUNCTION calculate_section_expiration(p_section_type section_type)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  CASE p_section_type
    WHEN 'snapshot' THEN
      -- 7 days for static company data
      RETURN NOW() + INTERVAL '7 days';
    ELSE
      -- 6 hours for dynamic signals
      RETURN NOW() + INTERVAL '6 hours';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check and enforce quota
CREATE OR REPLACE FUNCTION check_research_quota(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_quota RECORD;
  v_current_period_start TIMESTAMPTZ;
  v_current_period_end TIMESTAMPTZ;
BEGIN
  -- Calculate current monthly period
  v_current_period_start := DATE_TRUNC('month', NOW());
  v_current_period_end := v_current_period_start + INTERVAL '1 month';

  -- Get or create quota for current period
  SELECT * INTO v_quota
  FROM user_research_quotas
  WHERE user_id = p_user_id;

  -- If no quota exists, create one
  IF v_quota IS NULL THEN
    INSERT INTO user_research_quotas (
      user_id,
      period_start,
      period_end,
      researches_used,
      researches_limit
    ) VALUES (
      p_user_id,
      v_current_period_start,
      v_current_period_end,
      0,
      100
    );
    RETURN TRUE;
  END IF;

  -- Check if we need to reset for new period
  IF NOW() >= v_quota.period_end THEN
    UPDATE user_research_quotas
    SET period_start = v_current_period_start,
        period_end = v_current_period_end,
        researches_used = 0,
        notification_90_percent_sent = FALSE,
        notification_100_percent_sent = FALSE,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN TRUE;
  END IF;

  -- Check if under quota
  RETURN v_quota.researches_used < v_quota.researches_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to increment quota usage
CREATE OR REPLACE FUNCTION increment_research_quota(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_research_quotas
  SET researches_used = researches_used + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- If no row exists, create it and set to 1
  IF NOT FOUND THEN
    INSERT INTO user_research_quotas (
      user_id,
      period_start,
      period_end,
      researches_used,
      researches_limit
    ) VALUES (
      p_user_id,
      DATE_TRUNC('month', NOW()),
      DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
      1,
      100
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on research_reports
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_research_reports_updated_at
  BEFORE UPDATE ON research_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_sections_updated_at
  BEFORE UPDATE ON research_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_research_quotas_updated_at
  BEFORE UPDATE ON user_research_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-set section expiration on insert
CREATE OR REPLACE FUNCTION set_section_expiration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := calculate_section_expiration(NEW.section_type);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_research_section_expiration
  BEFORE INSERT ON research_sections
  FOR EACH ROW
  EXECUTE FUNCTION set_section_expiration();

-- ============================================================================
-- INDEXES FOR GDPR COMPLIANCE
-- ============================================================================

-- Index for 6-month anonymization cleanup (NFR-008)
-- Note: No WHERE clause with NOW() as it's not immutable
-- Instead, query will filter at runtime
CREATE INDEX idx_research_reports_gdpr_cleanup
  ON research_reports(generated_at);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE research_reports IS 'AI-generated company research reports with 6 sections';
COMMENT ON TABLE research_sections IS 'Individual sections of research reports with differential caching';
COMMENT ON TABLE research_sources IS 'Source attribution for GDPR compliance and verification';
COMMENT ON TABLE user_research_quotas IS 'Monthly research quota tracking (100/month standard tier)';

COMMENT ON COLUMN research_reports.confidence_score IS 'Overall report quality (0-1)';
COMMENT ON COLUMN research_reports.sections_complete IS 'Number of sections successfully generated (0-6)';
COMMENT ON COLUMN research_reports.cached_until IS 'Overall report cache expiration';
COMMENT ON COLUMN research_sections.expires_at IS 'Section-specific cache expiration (7d for snapshot, 6h for signals)';
COMMENT ON COLUMN research_sources.reliability_score IS 'Source reliability (0-1): companies_house=1.0, social_media=0.3';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables created
DO $$
DECLARE
  v_table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('research_reports', 'research_sections', 'research_sources', 'user_research_quotas');

  IF v_table_count = 4 THEN
    RAISE NOTICE 'ResearchGPT schema migration completed successfully: 4/4 tables created';
  ELSE
    RAISE EXCEPTION 'Schema migration incomplete: only % tables created', v_table_count;
  END IF;
END $$;
