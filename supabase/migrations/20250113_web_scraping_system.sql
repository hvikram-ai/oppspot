/**
 * Web Scraping System Database Schema
 * Stores scraping jobs, scraped data, and configurations
 */

-- =====================================================
-- SCRAPING JOBS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_identifier TEXT, -- Website URL, Companies House number, or LinkedIn URL
  providers TEXT[] NOT NULL DEFAULT '{}', -- Array of provider names
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rate_limited')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scraping_jobs_user_id ON scraping_jobs(user_id);
CREATE INDEX idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX idx_scraping_jobs_priority ON scraping_jobs(priority);
CREATE INDEX idx_scraping_jobs_company_name ON scraping_jobs(company_name);
CREATE INDEX idx_scraping_jobs_created_at ON scraping_jobs(created_at DESC);

-- =====================================================
-- SCRAPED DATA TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraped_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES scraping_jobs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('companies_house', 'website', 'linkedin', 'crunchbase', 'google_news', 'angellist')),
  data_type TEXT NOT NULL, -- 'company_profile', 'financials', 'team', 'news', 'tech_stack', etc.
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_data JSONB DEFAULT '{}'::jsonb,
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  source_url TEXT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scraped_data_job_id ON scraped_data(job_id);
CREATE INDEX idx_scraped_data_provider ON scraped_data(provider);
CREATE INDEX idx_scraped_data_data_type ON scraped_data(data_type);
CREATE INDEX idx_scraped_data_scraped_at ON scraped_data(scraped_at DESC);

-- =====================================================
-- SCRAPING CONFIGURATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraping_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT UNIQUE NOT NULL CHECK (provider IN ('companies_house', 'website', 'linkedin', 'crunchbase', 'google_news', 'angellist')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 10,
  timeout_ms INTEGER NOT NULL DEFAULT 30000,
  retry_attempts INTEGER NOT NULL DEFAULT 3,
  priority INTEGER NOT NULL DEFAULT 100, -- Lower = higher priority
  requires_auth BOOLEAN NOT NULL DEFAULT false,
  api_key TEXT, -- Encrypted API key if required
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default configurations
INSERT INTO scraping_configs (provider, enabled, rate_limit_per_minute, timeout_ms, retry_attempts, priority, requires_auth) VALUES
  ('companies_house', true, 60, 10000, 3, 10, true),
  ('website', true, 20, 30000, 2, 20, false),
  ('linkedin', false, 5, 30000, 2, 30, false), -- Disabled by default (requires auth)
  ('crunchbase', false, 10, 20000, 3, 40, true), -- Disabled by default (requires API key)
  ('google_news', true, 30, 15000, 2, 50, false),
  ('angellist', false, 10, 20000, 2, 60, false) -- Disabled by default
ON CONFLICT (provider) DO NOTHING;

-- =====================================================
-- ENRICHED BUSINESSES TABLE
-- =====================================================
-- Add scraping-related columns to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS enriched_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS scraping_confidence INTEGER DEFAULT 0 CHECK (scraping_confidence >= 0 AND scraping_confidence <= 100);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS data_sources TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_businesses_last_scraped_at ON businesses(last_scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_scraping_confidence ON businesses(scraping_confidence DESC);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_configs ENABLE ROW LEVEL SECURITY;

-- Scraping Jobs Policies
CREATE POLICY "Users can view their own scraping jobs"
  ON scraping_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scraping jobs"
  ON scraping_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scraping jobs"
  ON scraping_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scraping jobs"
  ON scraping_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Scraped Data Policies
CREATE POLICY "Users can view scraped data from their jobs"
  ON scraped_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scraping_jobs
      WHERE scraping_jobs.id = scraped_data.job_id
      AND scraping_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert scraped data"
  ON scraped_data FOR INSERT
  WITH CHECK (true);

-- Scraping Configs Policies (Read-only for users)
CREATE POLICY "Anyone can view scraping configs"
  ON scraping_configs FOR SELECT
  USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update scraping job status
CREATE OR REPLACE FUNCTION update_scraping_job_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Set completed_at when status changes to completed or failed
  IF NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed') THEN
    NEW.completed_at = NOW();
  END IF;

  -- Set started_at when status changes to in_progress
  IF NEW.status = 'in_progress' AND OLD.status = 'pending' THEN
    NEW.started_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scraping_job_status
  BEFORE UPDATE ON scraping_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_scraping_job_status();

-- Function to calculate overall scraping confidence for a job
CREATE OR REPLACE FUNCTION calculate_scraping_confidence(job_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  avg_confidence NUMERIC;
BEGIN
  SELECT
    CASE
      WHEN AVG(CASE confidence
        WHEN 'high' THEN 100
        WHEN 'medium' THEN 60
        WHEN 'low' THEN 30
      END) IS NULL THEN 0
      ELSE AVG(CASE confidence
        WHEN 'high' THEN 100
        WHEN 'medium' THEN 60
        WHEN 'low' THEN 30
      END)
    END
  INTO avg_confidence
  FROM scraped_data
  WHERE job_id = job_id_param;

  RETURN COALESCE(avg_confidence::INTEGER, 0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ACTIVITY LOGGING
-- =====================================================

-- Log scraping job creation
CREATE OR REPLACE FUNCTION log_scraping_job_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (
      actor_id,
      actor_email,
      action,
      details,
      ip_address
    ) VALUES (
      NEW.user_id,
      (SELECT email FROM auth.users WHERE id = NEW.user_id),
      'create_scraping_job',
      jsonb_build_object(
        'job_id', NEW.id,
        'company_name', NEW.company_name,
        'providers', NEW.providers,
        'priority', NEW.priority
      ),
      NULL
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO activity_logs (
      actor_id,
      actor_email,
      action,
      details,
      ip_address
    ) VALUES (
      NEW.user_id,
      (SELECT email FROM auth.users WHERE id = NEW.user_id),
      'complete_scraping_job',
      jsonb_build_object(
        'job_id', NEW.id,
        'company_name', NEW.company_name,
        'providers', NEW.providers,
        'duration_ms', EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000
      ),
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_scraping_job_activity
  AFTER INSERT OR UPDATE ON scraping_jobs
  FOR EACH ROW
  EXECUTE FUNCTION log_scraping_job_activity();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE scraping_jobs IS 'Web scraping jobs for enriching company data';
COMMENT ON TABLE scraped_data IS 'Raw and normalized data scraped from various providers';
COMMENT ON TABLE scraping_configs IS 'Configuration for different scraping providers';
COMMENT ON COLUMN businesses.enriched_data IS 'AI-normalized company data from scraping';
COMMENT ON COLUMN businesses.last_scraped_at IS 'Last time company data was scraped';
COMMENT ON COLUMN businesses.scraping_confidence IS 'Confidence score (0-100) of scraped data';
COMMENT ON COLUMN businesses.data_sources IS 'Array of providers that contributed data';
