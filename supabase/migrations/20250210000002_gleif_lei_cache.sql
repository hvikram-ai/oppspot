-- GLEIF LEI Cache Table Migration
-- Caches GLEIF (Global Legal Entity Identifier Foundation) API responses
-- Created: 2025-02-10

-- =====================================================
-- 1. Create GLEIF LEI cache table
-- =====================================================

CREATE TABLE IF NOT EXISTS gleif_lei_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lei TEXT NOT NULL UNIQUE,
  lei_data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '60 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_gleif_lei_cache_lookup
ON gleif_lei_cache(lei, expires_at);

-- Index for cache cleanup
CREATE INDEX IF NOT EXISTS idx_gleif_lei_cache_expires
ON gleif_lei_cache(expires_at)
WHERE expires_at < NOW();

-- Comments
COMMENT ON TABLE gleif_lei_cache IS 'Caches GLEIF LEI API responses (60-day TTL)';
COMMENT ON COLUMN gleif_lei_cache.lei IS 'Legal Entity Identifier (20-character alphanumeric)';
COMMENT ON COLUMN gleif_lei_cache.lei_data IS 'Full GLEIF API response';
COMMENT ON COLUMN gleif_lei_cache.expires_at IS 'Cache expiry timestamp (60 days from fetch)';

-- =====================================================
-- 2. Create GLEIF API usage tracking table
-- =====================================================

CREATE TABLE IF NOT EXISTS gleif_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  lei TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for usage analytics
CREATE INDEX IF NOT EXISTS idx_gleif_api_usage_date
ON gleif_api_usage(created_at DESC);

-- Index for error tracking
CREATE INDEX IF NOT EXISTS idx_gleif_api_usage_errors
ON gleif_api_usage(response_status)
WHERE response_status >= 400;

COMMENT ON TABLE gleif_api_usage IS 'Tracks GLEIF API calls for monitoring';
COMMENT ON COLUMN gleif_api_usage.cache_hit IS 'TRUE if response served from cache';

-- =====================================================
-- 3. Create updated_at trigger for cache table
-- =====================================================

CREATE OR REPLACE FUNCTION update_gleif_lei_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gleif_lei_cache_updated_at
BEFORE UPDATE ON gleif_lei_cache
FOR EACH ROW
EXECUTE FUNCTION update_gleif_lei_cache_updated_at();

-- =====================================================
-- 4. Enable RLS
-- =====================================================

ALTER TABLE gleif_lei_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for GLEIF LEI cache"
ON gleif_lei_cache
FOR SELECT
TO authenticated
USING (true);

ALTER TABLE gleif_api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read access for GLEIF API usage stats"
ON gleif_api_usage
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

GRANT SELECT ON gleif_lei_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON gleif_lei_cache TO service_role;

GRANT SELECT ON gleif_api_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON gleif_api_usage TO service_role;
