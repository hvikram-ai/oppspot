-- OpenCorporates Integration Migration
-- Adds fields and tables for global company registry data from OpenCorporates API
-- Created: 2025-02-10

-- =====================================================
-- 1. Add OpenCorporates-specific fields to businesses table
-- =====================================================

-- Jurisdiction and unique identifier
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS oc_jurisdiction_code TEXT,
ADD COLUMN IF NOT EXISTS oc_uid TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS oc_last_updated TIMESTAMPTZ;

-- Full OpenCorporates API response (for reference and future-proofing)
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS oc_data JSONB;

-- Additional company data from OpenCorporates
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS previous_names JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS beneficial_owners JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS registry_url TEXT;

-- Update data_sources JSONB to track OpenCorporates as a source
COMMENT ON COLUMN businesses.oc_jurisdiction_code IS 'OpenCorporates jurisdiction code (e.g., "gb", "ie", "us_de")';
COMMENT ON COLUMN businesses.oc_uid IS 'OpenCorporates universal identifier (globally unique)';
COMMENT ON COLUMN businesses.oc_data IS 'Full OpenCorporates API response for reference';
COMMENT ON COLUMN businesses.oc_last_updated IS 'Timestamp of last OpenCorporates data fetch';
COMMENT ON COLUMN businesses.previous_names IS 'Array of previous company names with dates';
COMMENT ON COLUMN businesses.beneficial_owners IS 'Array of ultimate beneficial owners';
COMMENT ON COLUMN businesses.registry_url IS 'URL to official company registry';

-- =====================================================
-- 2. Create indexes for OpenCorporates lookups
-- =====================================================

-- Index for jurisdiction-based queries
CREATE INDEX IF NOT EXISTS idx_businesses_oc_jurisdiction
ON businesses(oc_jurisdiction_code)
WHERE oc_jurisdiction_code IS NOT NULL;

-- Index for OpenCorporates UID lookups
CREATE INDEX IF NOT EXISTS idx_businesses_oc_uid
ON businesses(oc_uid)
WHERE oc_uid IS NOT NULL;

-- Composite index for jurisdiction + status queries
CREATE INDEX IF NOT EXISTS idx_businesses_jurisdiction_status
ON businesses(oc_jurisdiction_code, company_status)
WHERE oc_jurisdiction_code IS NOT NULL;

-- Index for cache expiry checks
CREATE INDEX IF NOT EXISTS idx_businesses_cache_expires
ON businesses(cache_expires_at)
WHERE cache_expires_at IS NOT NULL;

-- =====================================================
-- 3. Create OpenCorporates cache table
-- =====================================================

CREATE TABLE IF NOT EXISTS opencorporates_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code TEXT NOT NULL,
  company_number TEXT NOT NULL,
  company_data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one cache entry per company
  UNIQUE(jurisdiction_code, company_number)
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_oc_cache_lookup
ON opencorporates_cache(jurisdiction_code, company_number, expires_at);

-- Index for cache cleanup (delete expired entries)
CREATE INDEX IF NOT EXISTS idx_oc_cache_expires
ON opencorporates_cache(expires_at)
WHERE expires_at < NOW();

-- Comments
COMMENT ON TABLE opencorporates_cache IS 'Caches OpenCorporates API responses to reduce API calls';
COMMENT ON COLUMN opencorporates_cache.jurisdiction_code IS 'OpenCorporates jurisdiction code';
COMMENT ON COLUMN opencorporates_cache.company_number IS 'Registry-specific company number';
COMMENT ON COLUMN opencorporates_cache.company_data IS 'Full OpenCorporates API response';
COMMENT ON COLUMN opencorporates_cache.expires_at IS 'Cache expiry timestamp (30 days from fetch)';

-- =====================================================
-- 4. Create API usage tracking table
-- =====================================================

CREATE TABLE IF NOT EXISTS opencorporates_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  jurisdiction_code TEXT,
  company_number TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for usage analytics
CREATE INDEX IF NOT EXISTS idx_oc_api_usage_date
ON opencorporates_api_usage(created_at DESC);

-- Index for error tracking
CREATE INDEX IF NOT EXISTS idx_oc_api_usage_errors
ON opencorporates_api_usage(response_status)
WHERE response_status >= 400;

COMMENT ON TABLE opencorporates_api_usage IS 'Tracks OpenCorporates API calls for rate limiting and monitoring';
COMMENT ON COLUMN opencorporates_api_usage.cache_hit IS 'TRUE if response served from cache';
COMMENT ON COLUMN opencorporates_api_usage.response_time_ms IS 'API response time in milliseconds';

-- =====================================================
-- 5. Create function to get API usage stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_opencorporates_usage_stats(
  time_period INTERVAL DEFAULT INTERVAL '1 month'
)
RETURNS TABLE (
  total_requests BIGINT,
  cache_hits BIGINT,
  cache_hit_rate NUMERIC,
  avg_response_time_ms NUMERIC,
  error_count BIGINT,
  error_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_requests,
    COUNT(*) FILTER (WHERE cache_hit = TRUE)::BIGINT AS cache_hits,
    ROUND(
      (COUNT(*) FILTER (WHERE cache_hit = TRUE)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS cache_hit_rate,
    ROUND(AVG(response_time_ms)::NUMERIC, 2) AS avg_response_time_ms,
    COUNT(*) FILTER (WHERE response_status >= 400)::BIGINT AS error_count,
    ROUND(
      (COUNT(*) FILTER (WHERE response_status >= 400)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS error_rate
  FROM opencorporates_api_usage
  WHERE created_at >= NOW() - time_period;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_opencorporates_usage_stats IS 'Returns OpenCorporates API usage statistics for monitoring';

-- =====================================================
-- 6. Create function to clean expired cache
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_opencorporates_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM opencorporates_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_opencorporates_cache IS 'Deletes expired cache entries, returns count of deleted rows';

-- =====================================================
-- 7. Enable Row Level Security (RLS) on new tables
-- =====================================================

-- Enable RLS on cache table (read-only for authenticated users)
ALTER TABLE opencorporates_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for OpenCorporates cache"
ON opencorporates_cache
FOR SELECT
TO authenticated
USING (true);

-- Enable RLS on API usage table (admin only)
ALTER TABLE opencorporates_api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read access for API usage stats"
ON opencorporates_api_usage
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- =====================================================
-- 8. Create updated_at trigger for cache table
-- =====================================================

CREATE OR REPLACE FUNCTION update_opencorporates_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_opencorporates_cache_updated_at
BEFORE UPDATE ON opencorporates_cache
FOR EACH ROW
EXECUTE FUNCTION update_opencorporates_cache_updated_at();

-- =====================================================
-- 9. Grant permissions
-- =====================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant table permissions
GRANT SELECT ON opencorporates_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON opencorporates_cache TO service_role;

GRANT SELECT ON opencorporates_api_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON opencorporates_api_usage TO service_role;

-- Grant function execution
GRANT EXECUTE ON FUNCTION get_opencorporates_usage_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_opencorporates_cache TO service_role;

-- =====================================================
-- Migration complete
-- =====================================================
