-- SEC EDGAR Cache Table Migration
-- Caches SEC EDGAR API responses for US public companies
-- Created: 2025-02-10

-- =====================================================
-- 1. Create SEC EDGAR cache table
-- =====================================================

CREATE TABLE IF NOT EXISTS sec_edgar_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cik TEXT NOT NULL UNIQUE,
  company_data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_sec_edgar_cache_lookup
ON sec_edgar_cache(cik, expires_at);

-- Index for cache cleanup
CREATE INDEX IF NOT EXISTS idx_sec_edgar_cache_expires
ON sec_edgar_cache(expires_at)
WHERE expires_at < NOW();

-- Comments
COMMENT ON TABLE sec_edgar_cache IS 'Caches SEC EDGAR API responses (7-day TTL)';
COMMENT ON COLUMN sec_edgar_cache.cik IS 'SEC Central Index Key (10-digit padded)';
COMMENT ON COLUMN sec_edgar_cache.company_data IS 'Full SEC EDGAR submissions data';
COMMENT ON COLUMN sec_edgar_cache.expires_at IS 'Cache expiry timestamp (7 days from fetch)';

-- =====================================================
-- 2. Create SEC EDGAR API usage tracking table
-- =====================================================

CREATE TABLE IF NOT EXISTS sec_edgar_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  cik TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for usage analytics
CREATE INDEX IF NOT EXISTS idx_sec_edgar_api_usage_date
ON sec_edgar_api_usage(created_at DESC);

-- Index for error tracking
CREATE INDEX IF NOT EXISTS idx_sec_edgar_api_usage_errors
ON sec_edgar_api_usage(response_status)
WHERE response_status >= 400;

COMMENT ON TABLE sec_edgar_api_usage IS 'Tracks SEC EDGAR API calls for monitoring';
COMMENT ON COLUMN sec_edgar_api_usage.cache_hit IS 'TRUE if response served from cache';

-- =====================================================
-- 3. Create updated_at trigger for cache table
-- =====================================================

CREATE OR REPLACE FUNCTION update_sec_edgar_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sec_edgar_cache_updated_at
BEFORE UPDATE ON sec_edgar_cache
FOR EACH ROW
EXECUTE FUNCTION update_sec_edgar_cache_updated_at();

-- =====================================================
-- 4. Enable RLS
-- =====================================================

ALTER TABLE sec_edgar_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for SEC EDGAR cache"
ON sec_edgar_cache
FOR SELECT
TO authenticated
USING (true);

ALTER TABLE sec_edgar_api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read access for SEC EDGAR API usage stats"
ON sec_edgar_api_usage
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
-- 5. Grant permissions
-- =====================================================

GRANT SELECT ON sec_edgar_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sec_edgar_cache TO service_role;

GRANT SELECT ON sec_edgar_api_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sec_edgar_api_usage TO service_role;
