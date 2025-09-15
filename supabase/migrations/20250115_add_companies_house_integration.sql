-- ============================================
-- Companies House Integration
-- ============================================
-- Adds fields and functionality for caching Companies House API data
-- This enables intelligent caching and data enrichment from multiple sources

-- ============================================
-- 1. Add Companies House specific columns to businesses table
-- ============================================

-- Company registration number (unique identifier at Companies House)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS company_number TEXT UNIQUE;

-- Company status (active, dissolved, liquidation, receivership, etc.)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS company_status TEXT;

-- Date company was incorporated
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS incorporation_date DATE;

-- Type of company (ltd, plc, llp, charity, etc.)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS company_type TEXT;

-- Standard Industrial Classification codes
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS sic_codes TEXT[];

-- Registered office address (official address at Companies House)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS registered_office_address JSONB;

-- Company officers (directors, secretaries, etc.)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS officers JSONB DEFAULT '[]'::jsonb;

-- Recent filing history
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS filing_history JSONB DEFAULT '[]'::jsonb;

-- Financial accounts data
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS accounts JSONB DEFAULT '{}'::jsonb;

-- Charges/mortgages on the company
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS charges JSONB DEFAULT '[]'::jsonb;

-- Raw Companies House API response (for reference)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS companies_house_data JSONB;

-- Last time Companies House data was fetched
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS companies_house_last_updated TIMESTAMPTZ;

-- Track which data sources have been used for this business
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS data_sources JSONB DEFAULT '{}'::jsonb;

-- Cache expiry timestamp
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS cache_expires_at TIMESTAMPTZ;

-- ============================================
-- 2. Create indexes for performance
-- ============================================

-- Index for company number lookups
CREATE INDEX IF NOT EXISTS idx_businesses_company_number 
ON businesses(company_number) 
WHERE company_number IS NOT NULL;

-- Index for company status filtering
CREATE INDEX IF NOT EXISTS idx_businesses_company_status 
ON businesses(company_status) 
WHERE company_status IS NOT NULL;

-- Index for incorporation date range queries
CREATE INDEX IF NOT EXISTS idx_businesses_incorporation_date 
ON businesses(incorporation_date) 
WHERE incorporation_date IS NOT NULL;

-- Index for SIC codes (GIN index for array)
CREATE INDEX IF NOT EXISTS idx_businesses_sic_codes 
ON businesses USING gin(sic_codes) 
WHERE sic_codes IS NOT NULL;

-- Index for cache expiry
CREATE INDEX IF NOT EXISTS idx_businesses_cache_expires 
ON businesses(cache_expires_at) 
WHERE cache_expires_at IS NOT NULL;

-- Composite index for cache lookups
CREATE INDEX IF NOT EXISTS idx_businesses_cache_lookup 
ON businesses(company_number, cache_expires_at) 
WHERE company_number IS NOT NULL;

-- ============================================
-- 3. Create companies_house_cache table for API responses
-- ============================================

CREATE TABLE IF NOT EXISTS companies_house_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_number TEXT NOT NULL UNIQUE,
    endpoint TEXT NOT NULL, -- 'profile', 'officers', 'filing-history', etc.
    response_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_ch_cache_lookup 
ON companies_house_cache(company_number, endpoint, expires_at);

-- ============================================
-- 4. Create function to check if cache is valid
-- ============================================

CREATE OR REPLACE FUNCTION is_companies_house_cache_valid(
    p_company_number TEXT,
    p_cache_ttl_hours INTEGER DEFAULT 24
) RETURNS BOOLEAN AS $$
DECLARE
    v_last_updated TIMESTAMPTZ;
BEGIN
    SELECT companies_house_last_updated INTO v_last_updated
    FROM businesses
    WHERE company_number = p_company_number;
    
    IF v_last_updated IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if cache is still valid based on TTL
    RETURN (NOW() - v_last_updated) < (p_cache_ttl_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Create function to merge Companies House data
-- ============================================

CREATE OR REPLACE FUNCTION merge_companies_house_data(
    p_business_id UUID,
    p_company_data JSONB
) RETURNS VOID AS $$
BEGIN
    UPDATE businesses
    SET 
        company_number = p_company_data->>'company_number',
        company_status = p_company_data->>'company_status',
        incorporation_date = (p_company_data->>'date_of_incorporation')::DATE,
        company_type = p_company_data->>'type',
        sic_codes = ARRAY(SELECT jsonb_array_elements_text(p_company_data->'sic_codes')),
        registered_office_address = p_company_data->'registered_office_address',
        companies_house_data = p_company_data,
        companies_house_last_updated = NOW(),
        cache_expires_at = NOW() + INTERVAL '24 hours',
        data_sources = jsonb_set(
            COALESCE(data_sources, '{}'::jsonb),
            '{companies_house}',
            jsonb_build_object(
                'last_updated', NOW(),
                'version', p_company_data->>'etag'
            )
        ),
        updated_at = NOW()
    WHERE id = p_business_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Create view for enriched business data
-- ============================================

CREATE OR REPLACE VIEW enriched_businesses AS
SELECT 
    b.*,
    -- Calculate data completeness score
    (
        CASE WHEN b.name IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN b.description IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN b.company_number IS NOT NULL THEN 2 ELSE 0 END +
        CASE WHEN b.website IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN b.phone_numbers IS NOT NULL AND jsonb_array_length(b.phone_numbers) > 0 THEN 1 ELSE 0 END +
        CASE WHEN b.emails IS NOT NULL AND jsonb_array_length(b.emails) > 0 THEN 1 ELSE 0 END +
        CASE WHEN b.address IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN b.categories IS NOT NULL AND array_length(b.categories, 1) > 0 THEN 1 ELSE 0 END
    ) * 100.0 / 9 AS data_completeness_score,
    -- Check if Companies House data needs refresh
    CASE 
        WHEN b.companies_house_last_updated IS NULL THEN TRUE
        WHEN b.cache_expires_at < NOW() THEN TRUE
        ELSE FALSE
    END AS needs_companies_house_refresh,
    -- List active data sources
    ARRAY(SELECT jsonb_object_keys(b.data_sources)) AS active_data_sources
FROM businesses b;

-- ============================================
-- 7. Create audit table for API calls
-- ============================================

CREATE TABLE IF NOT EXISTS api_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_name TEXT NOT NULL, -- 'companies_house', 'google_places', etc.
    endpoint TEXT NOT NULL,
    request_params JSONB,
    response_status INTEGER,
    response_data JSONB,
    error_message TEXT,
    user_id UUID REFERENCES auth.users(id),
    business_id UUID REFERENCES businesses(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_api_audit_api_name 
ON api_audit_log(api_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_audit_business 
ON api_audit_log(business_id) 
WHERE business_id IS NOT NULL;

-- ============================================
-- 8. RLS Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE companies_house_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_audit_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read cached Companies House data
CREATE POLICY "Authenticated users can read companies house cache" 
ON companies_house_cache FOR SELECT 
TO authenticated 
USING (true);

-- Only system/admin can write to cache
CREATE POLICY "System can manage companies house cache" 
ON companies_house_cache FOR ALL 
TO service_role 
USING (true);

-- Authenticated users can read their own API audit logs
CREATE POLICY "Users can read own api audit logs" 
ON api_audit_log FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR user_id IS NULL);

-- ============================================
-- 9. Grants
-- ============================================

GRANT SELECT ON enriched_businesses TO authenticated;
GRANT SELECT ON companies_house_cache TO authenticated;
GRANT SELECT ON api_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION is_companies_house_cache_valid TO authenticated;

-- ============================================
-- 10. Comments for documentation
-- ============================================

COMMENT ON COLUMN businesses.company_number IS 'UK Companies House registration number';
COMMENT ON COLUMN businesses.company_status IS 'Current status at Companies House (active, dissolved, etc.)';
COMMENT ON COLUMN businesses.incorporation_date IS 'Date the company was incorporated';
COMMENT ON COLUMN businesses.company_type IS 'Type of company (ltd, plc, llp, etc.)';
COMMENT ON COLUMN businesses.sic_codes IS 'Standard Industrial Classification codes';
COMMENT ON COLUMN businesses.registered_office_address IS 'Official registered address at Companies House';
COMMENT ON COLUMN businesses.officers IS 'Current and resigned company officers';
COMMENT ON COLUMN businesses.filing_history IS 'Recent filing history from Companies House';
COMMENT ON COLUMN businesses.accounts IS 'Financial accounts information';
COMMENT ON COLUMN businesses.charges IS 'Charges and mortgages on the company';
COMMENT ON COLUMN businesses.companies_house_data IS 'Raw API response from Companies House';
COMMENT ON COLUMN businesses.companies_house_last_updated IS 'Last time Companies House data was fetched';
COMMENT ON COLUMN businesses.data_sources IS 'Track which APIs have provided data for this business';
COMMENT ON COLUMN businesses.cache_expires_at IS 'When the cached data should be considered stale';

COMMENT ON TABLE companies_house_cache IS 'Cache table for Companies House API responses';
COMMENT ON TABLE api_audit_log IS 'Audit log for all external API calls';
COMMENT ON VIEW enriched_businesses IS 'Business data with calculated metrics and data source information';