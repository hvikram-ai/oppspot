-- Enrichment System Tables
-- Creates tables for storing enrichment data and job tracking

-- Table for storing enriched company data
CREATE TABLE IF NOT EXISTS enrichment_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'linkedin', 'website_analysis', etc.
  data_type TEXT NOT NULL, -- 'company_profile', 'website_profile', etc.
  enriched_data JSONB NOT NULL,
  enriched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT enrichment_data_company_source_unique UNIQUE (company_id, source, data_type)
);

CREATE INDEX IF NOT EXISTS idx_enrichment_data_company_id ON enrichment_data(company_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_data_source ON enrichment_data(source);
CREATE INDEX IF NOT EXISTS idx_enrichment_data_enriched_at ON enrichment_data(enriched_at DESC);

-- Table for tracking enrichment jobs
CREATE TABLE IF NOT EXISTS enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_ids UUID[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  enrichment_types TEXT[] NOT NULL, -- ['linkedin', 'website', 'all']
  progress JSONB NOT NULL DEFAULT '{"total": 0, "completed": 0, "failed": 0}',
  results JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_org_id ON enrichment_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status ON enrichment_jobs(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_created_at ON enrichment_jobs(created_at DESC);

-- Update trigger for enrichment_jobs
CREATE OR REPLACE FUNCTION update_enrichment_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enrichment_jobs_updated_at ON enrichment_jobs;
CREATE TRIGGER enrichment_jobs_updated_at
  BEFORE UPDATE ON enrichment_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_enrichment_jobs_updated_at();

-- Add new columns to businesses table for enrichment data (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'businesses' AND column_name = 'technologies') THEN
    ALTER TABLE businesses ADD COLUMN technologies TEXT[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'businesses' AND column_name = 'contact_email') THEN
    ALTER TABLE businesses ADD COLUMN contact_email TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'businesses' AND column_name = 'contact_phone') THEN
    ALTER TABLE businesses ADD COLUMN contact_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'businesses' AND column_name = 'employee_count') THEN
    ALTER TABLE businesses ADD COLUMN employee_count INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'businesses' AND column_name = 'linkedin_url') THEN
    ALTER TABLE businesses ADD COLUMN linkedin_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'businesses' AND column_name = 'industry') THEN
    ALTER TABLE businesses ADD COLUMN industry TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'businesses' AND column_name = 'headquarters') THEN
    ALTER TABLE businesses ADD COLUMN headquarters TEXT;
  END IF;
END $$;

-- RLS Policies for enrichment_data
ALTER TABLE enrichment_data ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view enrichment data (businesses are shared)
DROP POLICY IF EXISTS "Authenticated users can view enrichment data" ON enrichment_data;
CREATE POLICY "Authenticated users can view enrichment data" ON enrichment_data
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert enrichment data" ON enrichment_data;
CREATE POLICY "System can insert enrichment data" ON enrichment_data
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can update enrichment data" ON enrichment_data;
CREATE POLICY "System can update enrichment data" ON enrichment_data
  FOR UPDATE
  USING (true);

-- RLS Policies for enrichment_jobs
ALTER TABLE enrichment_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org's enrichment jobs" ON enrichment_jobs;
CREATE POLICY "Users can view their org's enrichment jobs" ON enrichment_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = enrichment_jobs.org_id
    )
  );

DROP POLICY IF EXISTS "Users can create enrichment jobs for their org" ON enrichment_jobs;
CREATE POLICY "Users can create enrichment jobs for their org" ON enrichment_jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = enrichment_jobs.org_id
    )
  );

DROP POLICY IF EXISTS "System can update enrichment jobs" ON enrichment_jobs;
CREATE POLICY "System can update enrichment jobs" ON enrichment_jobs
  FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can delete their org's enrichment jobs" ON enrichment_jobs;
CREATE POLICY "Users can delete their org's enrichment jobs" ON enrichment_jobs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = enrichment_jobs.org_id
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON enrichment_data TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON enrichment_jobs TO authenticated;

-- Comments
COMMENT ON TABLE enrichment_data IS 'Stores enriched company data from various sources';
COMMENT ON TABLE enrichment_jobs IS 'Tracks enrichment jobs and their progress';
COMMENT ON COLUMN enrichment_data.source IS 'Source of enrichment: linkedin, website_analysis, etc.';
COMMENT ON COLUMN enrichment_data.data_type IS 'Type of data: company_profile, website_profile, etc.';
COMMENT ON COLUMN enrichment_jobs.status IS 'Job status: pending, running, completed, failed';
COMMENT ON COLUMN enrichment_jobs.enrichment_types IS 'Types of enrichment to perform: linkedin, website, all';
