-- ResearchGPT™ Safe Migration (Idempotent)
-- Checks for existing objects before creating
-- Run this instead if you get "already exists" errors

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS (Create only if not exists)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM (
    'pending',
    'generating',
    'complete',
    'partial',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE section_type AS ENUM (
    'snapshot',
    'buying_signals',
    'decision_makers',
    'revenue_signals',
    'recommended_approach',
    'sources'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE confidence_level AS ENUM ('high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
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
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS research_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_number TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  sections_complete INTEGER NOT NULL DEFAULT 0 CHECK (sections_complete >= 0 AND sections_complete <= 6),
  total_sources INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ,
  cached_until TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES research_reports(id) ON DELETE CASCADE,
  section_type section_type NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence confidence_level NOT NULL DEFAULT 'medium',
  sources_count INTEGER NOT NULL DEFAULT 0,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  generation_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_id, section_type)
);

CREATE TABLE IF NOT EXISTS research_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES research_reports(id) ON DELETE CASCADE,
  section_type section_type,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  published_date TIMESTAMPTZ,
  accessed_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_type source_type NOT NULL,
  reliability_score DECIMAL(3,2) CHECK (reliability_score >= 0 AND reliability_score <= 1),
  domain TEXT,
  content_snippet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_research_quotas (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  researches_used INTEGER NOT NULL DEFAULT 0 CHECK (researches_used >= 0),
  researches_limit INTEGER NOT NULL DEFAULT 100,
  tier TEXT NOT NULL DEFAULT 'standard',
  notification_90_percent_sent BOOLEAN NOT NULL DEFAULT FALSE,
  notification_100_percent_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES (Create only if not exists)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_research_reports_user_id ON research_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_company_id ON research_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_status ON research_reports(status);
CREATE INDEX IF NOT EXISTS idx_research_reports_cached_until ON research_reports(cached_until);
CREATE INDEX IF NOT EXISTS idx_research_reports_user_company ON research_reports(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_gdpr_cleanup ON research_reports(generated_at);

CREATE INDEX IF NOT EXISTS idx_research_sections_report_id ON research_sections(report_id);
CREATE INDEX IF NOT EXISTS idx_research_sections_type_expires ON research_sections(section_type, expires_at);
CREATE INDEX IF NOT EXISTS idx_research_sections_confidence ON research_sections(confidence);

CREATE INDEX IF NOT EXISTS idx_research_sources_report_id ON research_sources(report_id);
CREATE INDEX IF NOT EXISTS idx_research_sources_domain ON research_sources(domain);
CREATE INDEX IF NOT EXISTS idx_research_sources_type ON research_sources(source_type);

CREATE INDEX IF NOT EXISTS idx_user_research_quotas_period ON user_research_quotas(period_start, period_end);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_research_quotas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own research reports" ON research_reports;
DROP POLICY IF EXISTS "Users can create own research reports" ON research_reports;
DROP POLICY IF EXISTS "Users can update own research reports" ON research_reports;
DROP POLICY IF EXISTS "Users can delete own research reports" ON research_reports;

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

-- Research sections policies
DROP POLICY IF EXISTS "Users can view sections of own reports" ON research_sections;
DROP POLICY IF EXISTS "Users can insert sections for own reports" ON research_sections;
DROP POLICY IF EXISTS "Users can update sections of own reports" ON research_sections;

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

-- Research sources policies
DROP POLICY IF EXISTS "Users can view sources of own reports" ON research_sources;
DROP POLICY IF EXISTS "Users can insert sources for own reports" ON research_sources;

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

-- User quotas policies
DROP POLICY IF EXISTS "Users can view own quota" ON user_research_quotas;
DROP POLICY IF EXISTS "Users can update own quota" ON user_research_quotas;
DROP POLICY IF EXISTS "System can insert quotas" ON user_research_quotas;

CREATE POLICY "Users can view own quota"
  ON user_research_quotas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own quota"
  ON user_research_quotas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert quotas"
  ON user_research_quotas FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_section_expiration(p_section_type section_type)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  CASE p_section_type
    WHEN 'snapshot' THEN
      RETURN NOW() + INTERVAL '7 days';
    ELSE
      RETURN NOW() + INTERVAL '6 hours';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION check_research_quota(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_quota RECORD;
  v_current_period_start TIMESTAMPTZ;
  v_current_period_end TIMESTAMPTZ;
BEGIN
  v_current_period_start := DATE_TRUNC('month', NOW());
  v_current_period_end := v_current_period_start + INTERVAL '1 month';

  SELECT * INTO v_quota
  FROM user_research_quotas
  WHERE user_id = p_user_id;

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

  RETURN v_quota.researches_used < v_quota.researches_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_research_quota(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_research_quotas
  SET researches_used = researches_used + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

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

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_research_reports_updated_at ON research_reports;
CREATE TRIGGER update_research_reports_updated_at
  BEFORE UPDATE ON research_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_research_sections_updated_at ON research_sections;
CREATE TRIGGER update_research_sections_updated_at
  BEFORE UPDATE ON research_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_research_quotas_updated_at ON user_research_quotas;
CREATE TRIGGER update_user_research_quotas_updated_at
  BEFORE UPDATE ON user_research_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION set_section_expiration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := calculate_section_expiration(NEW.section_type);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_research_section_expiration ON research_sections;
CREATE TRIGGER set_research_section_expiration
  BEFORE INSERT ON research_sections
  FOR EACH ROW
  EXECUTE FUNCTION set_section_expiration();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

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
    RAISE NOTICE 'ResearchGPT schema partially complete: %/4 tables found', v_table_count;
  END IF;
END $$;
