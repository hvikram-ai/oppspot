-- Irish CRO Cache Table Migration
-- Caches Irish Companies Registration Office API responses
-- Created: 2025-02-10

-- =====================================================
-- 1. Create Irish CRO cache table
-- =====================================================

CREATE TABLE IF NOT EXISTS irish_cro_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_number TEXT NOT NULL UNIQUE,
  company_data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_irish_cro_cache_lookup
ON irish_cro_cache(company_number, expires_at);

-- Index for cache cleanup
CREATE INDEX IF NOT EXISTS idx_irish_cro_cache_expires
ON irish_cro_cache(expires_at)
WHERE expires_at < NOW();

-- Comments
COMMENT ON TABLE irish_cro_cache IS 'Caches Irish CRO API responses to reduce API calls';
COMMENT ON COLUMN irish_cro_cache.company_number IS 'Irish company registration number';
COMMENT ON COLUMN irish_cro_cache.company_data IS 'Full CRO API response';
COMMENT ON COLUMN irish_cro_cache.expires_at IS 'Cache expiry timestamp (30 days from fetch)';

-- =====================================================
-- 2. Create Irish CRO API usage tracking table
-- =====================================================

CREATE TABLE IF NOT EXISTS irish_cro_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  company_number TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for usage analytics
CREATE INDEX IF NOT EXISTS idx_irish_cro_api_usage_date
ON irish_cro_api_usage(created_at DESC);

-- Index for error tracking
CREATE INDEX IF NOT EXISTS idx_irish_cro_api_usage_errors
ON irish_cro_api_usage(response_status)
WHERE response_status >= 400;

COMMENT ON TABLE irish_cro_api_usage IS 'Tracks Irish CRO API calls for monitoring';
COMMENT ON COLUMN irish_cro_api_usage.cache_hit IS 'TRUE if response served from cache';

-- =====================================================
-- 3. Create updated_at trigger for cache table
-- =====================================================

CREATE OR REPLACE FUNCTION update_irish_cro_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_irish_cro_cache_updated_at
BEFORE UPDATE ON irish_cro_cache
FOR EACH ROW
EXECUTE FUNCTION update_irish_cro_cache_updated_at();

-- =====================================================
-- 4. Enable RLS
-- =====================================================

ALTER TABLE irish_cro_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for Irish CRO cache"
ON irish_cro_cache
FOR SELECT
TO authenticated
USING (true);

ALTER TABLE irish_cro_api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read access for Irish CRO API usage stats"
ON irish_cro_api_usage
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

GRANT SELECT ON irish_cro_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON irish_cro_cache TO service_role;

GRANT SELECT ON irish_cro_api_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON irish_cro_api_usage TO service_role;
