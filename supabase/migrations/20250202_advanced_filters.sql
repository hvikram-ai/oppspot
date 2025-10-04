-- ============================================
-- Advanced Filters System
-- ============================================
-- Adds comprehensive filter-friendly columns to businesses table
-- Supporting 11 filter categories from SourceScrub spec

-- ============================================
-- 1. Add Size & Growth Columns
-- ============================================
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS employee_count INTEGER,
ADD COLUMN IF NOT EXISTS employee_range TEXT CHECK (employee_range IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001+')),
ADD COLUMN IF NOT EXISTS employee_growth_3mo DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS employee_growth_6mo DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS employee_growth_12mo DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS revenue_estimated DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS revenue_verified DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS revenue_currency TEXT DEFAULT 'GBP',
ADD COLUMN IF NOT EXISTS revenue_year INTEGER;

-- ============================================
-- 2. Add Funding Columns
-- ============================================
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS funding_total_raised DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS funding_latest_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS funding_latest_round TEXT,
ADD COLUMN IF NOT EXISTS funding_latest_date DATE,
ADD COLUMN IF NOT EXISTS funding_currency TEXT DEFAULT 'GBP',
ADD COLUMN IF NOT EXISTS investors TEXT[],
ADD COLUMN IF NOT EXISTS latest_valuation DECIMAL(15,2);

-- ============================================
-- 3. Add Market Presence Columns
-- ============================================
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS job_openings_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS web_page_views INTEGER,
ADD COLUMN IF NOT EXISTS web_traffic_rank INTEGER,
ADD COLUMN IF NOT EXISTS web_traffic_rank_change_pct DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS web_traffic_rank_change_abs INTEGER,
ADD COLUMN IF NOT EXISTS sources_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS conference_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS top_list_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS buyers_guide_count INTEGER DEFAULT 0;

-- ============================================
-- 4. Add Firmographics Columns
-- ============================================
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS founded_year INTEGER,
ADD COLUMN IF NOT EXISTS ownership_type TEXT,
ADD COLUMN IF NOT EXISTS products_services TEXT[],
ADD COLUMN IF NOT EXISTS end_markets TEXT[],
ADD COLUMN IF NOT EXISTS naics_codes TEXT[],
ADD COLUMN IF NOT EXISTS growth_intent DECIMAL(5,2);

-- ============================================
-- 5. Add Workflow Columns
-- ============================================
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS custom_score INTEGER CHECK (custom_score >= 0 AND custom_score <= 100),
ADD COLUMN IF NOT EXISTS profile_owner_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS last_contacted_date DATE,
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS crm_sync_status TEXT CHECK (crm_sync_status IN ('synced', 'not_synced', 'pending', 'failed'));

-- ============================================
-- 6. Add Options/Status Columns
-- ============================================
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS is_profile_plus BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS has_contact_info BOOLEAN DEFAULT false;

-- ============================================
-- 7. Create Indexes for Filter Performance
-- ============================================

-- Size filters
CREATE INDEX IF NOT EXISTS idx_businesses_employee_count
ON businesses(employee_count)
WHERE employee_count IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_employee_range
ON businesses(employee_range)
WHERE employee_range IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_revenue
ON businesses(revenue_estimated)
WHERE revenue_estimated IS NOT NULL;

-- Growth filters
CREATE INDEX IF NOT EXISTS idx_businesses_employee_growth_3mo
ON businesses(employee_growth_3mo)
WHERE employee_growth_3mo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_employee_growth_12mo
ON businesses(employee_growth_12mo)
WHERE employee_growth_12mo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_job_openings
ON businesses(job_openings_count)
WHERE job_openings_count > 0;

-- Funding filters
CREATE INDEX IF NOT EXISTS idx_businesses_funding_total
ON businesses(funding_total_raised)
WHERE funding_total_raised IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_funding_latest
ON businesses(funding_latest_amount, funding_latest_date)
WHERE funding_latest_amount IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_funding_round
ON businesses(funding_latest_round)
WHERE funding_latest_round IS NOT NULL;

-- Firmographics filters
CREATE INDEX IF NOT EXISTS idx_businesses_founded_year
ON businesses(founded_year)
WHERE founded_year IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_ownership
ON businesses(ownership_type)
WHERE ownership_type IS NOT NULL;

-- Market presence filters
CREATE INDEX IF NOT EXISTS idx_businesses_web_traffic
ON businesses(web_traffic_rank)
WHERE web_traffic_rank IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_sources_count
ON businesses(sources_count)
WHERE sources_count > 0;

CREATE INDEX IF NOT EXISTS idx_businesses_conference_count
ON businesses(conference_count)
WHERE conference_count > 0;

-- Workflow filters
CREATE INDEX IF NOT EXISTS idx_businesses_custom_score
ON businesses(custom_score)
WHERE custom_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_profile_owner
ON businesses(profile_owner_id)
WHERE profile_owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_last_contacted
ON businesses(last_contacted_date)
WHERE last_contacted_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_priority
ON businesses(priority)
WHERE priority IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_crm_sync
ON businesses(crm_sync_status)
WHERE crm_sync_status IS NOT NULL;

-- Options filters
CREATE INDEX IF NOT EXISTS idx_businesses_active
ON businesses(is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_businesses_profile_plus
ON businesses(is_profile_plus)
WHERE is_profile_plus = true;

CREATE INDEX IF NOT EXISTS idx_businesses_has_contact
ON businesses(has_contact_info)
WHERE has_contact_info = true;

-- GIN indexes for array columns
CREATE INDEX IF NOT EXISTS idx_businesses_investors
ON businesses USING gin(investors)
WHERE investors IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_products
ON businesses USING gin(products_services)
WHERE products_services IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_markets
ON businesses USING gin(end_markets)
WHERE end_markets IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_naics
ON businesses USING gin(naics_codes)
WHERE naics_codes IS NOT NULL;

-- ============================================
-- 8. Create Function to Auto-Calculate Employee Range
-- ============================================
CREATE OR REPLACE FUNCTION calculate_employee_range(employee_count INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE
        WHEN employee_count IS NULL THEN NULL
        WHEN employee_count BETWEEN 1 AND 10 THEN '1-10'
        WHEN employee_count BETWEEN 11 AND 50 THEN '11-50'
        WHEN employee_count BETWEEN 51 AND 200 THEN '51-200'
        WHEN employee_count BETWEEN 201 AND 500 THEN '201-500'
        WHEN employee_count BETWEEN 501 AND 1000 THEN '501-1000'
        WHEN employee_count BETWEEN 1001 AND 5000 THEN '1001-5000'
        ELSE '5001+'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 9. Create Trigger to Auto-Update Employee Range
-- ============================================
CREATE OR REPLACE FUNCTION trigger_update_employee_range()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.employee_count IS NOT NULL THEN
        NEW.employee_range := calculate_employee_range(NEW.employee_count);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_range_on_change
BEFORE INSERT OR UPDATE OF employee_count ON businesses
FOR EACH ROW
EXECUTE FUNCTION trigger_update_employee_range();

-- ============================================
-- 10. Create Function to Update Contact Info Status
-- ============================================
CREATE OR REPLACE FUNCTION update_has_contact_info()
RETURNS TRIGGER AS $$
BEGIN
    NEW.has_contact_info := (
        (NEW.emails IS NOT NULL AND jsonb_array_length(NEW.emails) > 0) OR
        (NEW.phone_numbers IS NOT NULL AND jsonb_array_length(NEW.phone_numbers) > 0)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_info_status
BEFORE INSERT OR UPDATE OF emails, phone_numbers ON businesses
FOR EACH ROW
EXECUTE FUNCTION update_has_contact_info();

-- ============================================
-- 11. Create Materialized View for Filter Options
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS filter_options AS
SELECT
    -- Industries
    ARRAY_AGG(DISTINCT unnested_cat) FILTER (WHERE unnested_cat IS NOT NULL) as available_industries,
    -- Ownership types
    ARRAY_AGG(DISTINCT ownership_type) FILTER (WHERE ownership_type IS NOT NULL) as available_ownership_types,
    -- Funding rounds
    ARRAY_AGG(DISTINCT funding_latest_round) FILTER (WHERE funding_latest_round IS NOT NULL) as available_funding_rounds,
    -- Investors
    ARRAY_AGG(DISTINCT unnested_investor) FILTER (WHERE unnested_investor IS NOT NULL) as available_investors,
    -- Products/Services
    ARRAY_AGG(DISTINCT unnested_product) FILTER (WHERE unnested_product IS NOT NULL) as available_products,
    -- End Markets
    ARRAY_AGG(DISTINCT unnested_market) FILTER (WHERE unnested_market IS NOT NULL) as available_end_markets,
    -- Ranges
    MIN(employee_count) as min_employee_count,
    MAX(employee_count) as max_employee_count,
    MIN(revenue_estimated) as min_revenue,
    MAX(revenue_estimated) as max_revenue,
    MIN(funding_total_raised) as min_funding,
    MAX(funding_total_raised) as max_funding,
    MIN(founded_year) as min_founded_year,
    MAX(founded_year) as max_founded_year
FROM businesses
LEFT JOIN LATERAL unnest(categories) AS unnested_cat ON true
LEFT JOIN LATERAL unnest(investors) AS unnested_investor ON true
LEFT JOIN LATERAL unnest(products_services) AS unnested_product ON true
LEFT JOIN LATERAL unnest(end_markets) AS unnested_market ON true;

CREATE UNIQUE INDEX ON filter_options ((1));

-- Function to refresh filter options
CREATE OR REPLACE FUNCTION refresh_filter_options()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY filter_options;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 12. Create View for Enhanced Business Search
-- ============================================
CREATE OR REPLACE VIEW searchable_businesses AS
SELECT
    b.*,
    -- Calculated fields
    calculate_employee_range(b.employee_count) as computed_employee_range,
    -- Tags count
    (SELECT COUNT(*) FROM business_tags bt WHERE bt.business_id = b.id) as tags_count,
    -- Lists count
    (SELECT COUNT(DISTINCT list_id) FROM list_companies lc WHERE lc.business_id = b.id) as lists_count,
    -- Search text (for full-text search)
    to_tsvector('english',
        COALESCE(b.name, '') || ' ' ||
        COALESCE(b.description, '') || ' ' ||
        COALESCE(array_to_string(b.categories, ' '), '') || ' ' ||
        COALESCE(array_to_string(b.products_services, ' '), '')
    ) as search_vector
FROM businesses b;

COMMENT ON VIEW searchable_businesses IS 'Enhanced view of businesses with calculated fields for search and filtering';

-- ============================================
-- 13. Comments for Documentation
-- ============================================
COMMENT ON COLUMN businesses.employee_count IS 'Current number of employees';
COMMENT ON COLUMN businesses.employee_range IS 'Employee count range (auto-calculated)';
COMMENT ON COLUMN businesses.employee_growth_3mo IS '3-month employee growth percentage';
COMMENT ON COLUMN businesses.employee_growth_6mo IS '6-month employee growth percentage';
COMMENT ON COLUMN businesses.employee_growth_12mo IS '12-month employee growth percentage';
COMMENT ON COLUMN businesses.revenue_estimated IS 'Estimated revenue (ML-predicted)';
COMMENT ON COLUMN businesses.revenue_verified IS 'Verified revenue from official filings';
COMMENT ON COLUMN businesses.funding_total_raised IS 'Total funding raised across all rounds';
COMMENT ON COLUMN businesses.funding_latest_round IS 'Latest funding round type (Seed, Series A, B, C, etc.)';
COMMENT ON COLUMN businesses.investors IS 'Array of investor names';
COMMENT ON COLUMN businesses.job_openings_count IS 'Number of currently open positions';
COMMENT ON COLUMN businesses.web_traffic_rank IS 'Global web traffic ranking (lower is better)';
COMMENT ON COLUMN businesses.sources_count IS 'Total appearances in conferences, lists, and buyers guides';
COMMENT ON COLUMN businesses.founded_year IS 'Year the company was founded';
COMMENT ON COLUMN businesses.ownership_type IS 'Company ownership structure (Private, Public, VC-backed, etc.)';
COMMENT ON COLUMN businesses.products_services IS 'Array of products and services offered';
COMMENT ON COLUMN businesses.end_markets IS 'Array of end markets served';
COMMENT ON COLUMN businesses.custom_score IS 'User-defined score (0-100)';
COMMENT ON COLUMN businesses.profile_owner_id IS 'User who owns this company profile';
COMMENT ON COLUMN businesses.priority IS 'Deal priority level';
COMMENT ON COLUMN businesses.crm_sync_status IS 'CRM synchronization status';
COMMENT ON COLUMN businesses.is_profile_plus IS 'Premium profile with enhanced data';
COMMENT ON COLUMN businesses.is_active IS 'Company is currently active (not dissolved)';
COMMENT ON COLUMN businesses.has_contact_info IS 'Has at least one email or phone number (auto-calculated)';

-- ============================================
-- 14. Grants
-- ============================================
GRANT SELECT ON searchable_businesses TO authenticated;
GRANT SELECT ON filter_options TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_employee_range TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_filter_options TO service_role;
