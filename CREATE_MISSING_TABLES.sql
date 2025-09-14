-- ============================================
-- CREATE ALL MISSING TABLES FOR OPPSPOT
-- Run this in Supabase SQL Editor
-- ============================================

-- ==========================================
-- 1. LOCATIONS TABLE (for businesses)
-- ==========================================
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    region TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'UK',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_headquarters BOOLEAN DEFAULT false,
    location_type TEXT CHECK (location_type IN ('headquarters', 'branch', 'warehouse', 'retail', 'office', 'factory', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_business_id ON locations(business_id);
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations(latitude, longitude);

-- ==========================================
-- 2. BUSINESS LISTS & SAVED BUSINESSES
-- ==========================================

-- Business lists for organizing saved businesses
CREATE TABLE IF NOT EXISTS business_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'folder',
    is_public BOOLEAN DEFAULT false,
    share_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_lists_user_id ON business_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_business_lists_is_public ON business_lists(is_public);

-- Saved businesses (bookmarks)
CREATE TABLE IF NOT EXISTS saved_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    list_id UUID REFERENCES business_lists(id) ON DELETE SET NULL,
    notes TEXT,
    tags TEXT[],
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_businesses_user_id ON saved_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_businesses_business_id ON saved_businesses(business_id);

-- ==========================================
-- 3. OPP SCAN WORKFLOW TABLES
-- ==========================================

-- Main acquisition scan table
CREATE TABLE IF NOT EXISTS acquisition_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Workflow metadata
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN (
        'configuring',
        'scanning',
        'analyzing',
        'completed',
        'failed',
        'paused'
    )) DEFAULT 'configuring',
    
    -- Configuration
    config JSONB NOT NULL DEFAULT '{}',
    selected_industries JSONB,
    market_maturity TEXT[],
    selected_regions JSONB,
    regulatory_requirements JSONB,
    cross_border_considerations JSONB,
    required_capabilities JSONB,
    strategic_objectives JSONB,
    synergy_requirements JSONB,
    data_sources TEXT[] DEFAULT ARRAY[
        'companies_house',
        'financial_data',
        'digital_footprint',
        'patents_ip',
        'news_media'
    ],
    scan_depth TEXT DEFAULT 'comprehensive' CHECK (scan_depth IN ('basic', 'detailed', 'comprehensive')),
    
    -- Progress tracking
    progress_percentage INTEGER DEFAULT 0,
    current_step TEXT DEFAULT 'industry_selection',
    targets_identified INTEGER DEFAULT 0,
    targets_analyzed INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_acquisition_scans_user_id ON acquisition_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_scans_org_id ON acquisition_scans(org_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_scans_status ON acquisition_scans(status);

-- Acquisition targets identified by scans
CREATE TABLE IF NOT EXISTS acquisition_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES acquisition_scans(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    
    -- Company info
    company_name TEXT NOT NULL,
    companies_house_number TEXT,
    website TEXT,
    industry_codes TEXT[],
    business_description TEXT,
    
    -- Scoring
    match_score DECIMAL(5,2),
    synergy_score DECIMAL(5,2),
    financial_score DECIMAL(5,2),
    overall_score DECIMAL(5,2),
    
    -- Analysis
    strengths JSONB,
    weaknesses JSONB,
    opportunities JSONB,
    risks JSONB,
    
    -- Status
    status TEXT DEFAULT 'identified' CHECK (status IN (
        'identified',
        'analyzing',
        'qualified',
        'shortlisted',
        'rejected',
        'contacted'
    )),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acquisition_targets_scan_id ON acquisition_targets(scan_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_targets_status ON acquisition_targets(status);

-- ==========================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ==========================================

-- Locations RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to locations" ON locations
    FOR SELECT
    USING (true);

-- Business Lists RLS
ALTER TABLE business_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lists" ON business_lists
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public lists are readable" ON business_lists
    FOR SELECT
    USING (is_public = true);

-- Saved Businesses RLS
ALTER TABLE saved_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved businesses" ON saved_businesses
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Acquisition Scans RLS
ALTER TABLE acquisition_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scans" ON acquisition_scans
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Acquisition Targets RLS
ALTER TABLE acquisition_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view targets from their scans" ON acquisition_targets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM acquisition_scans
            WHERE acquisition_scans.id = acquisition_targets.scan_id
            AND acquisition_scans.user_id = auth.uid()
        )
    );

-- ==========================================
-- 5. GRANT PERMISSIONS
-- ==========================================

GRANT ALL ON locations TO authenticated;
GRANT ALL ON business_lists TO authenticated;
GRANT ALL ON saved_businesses TO authenticated;
GRANT ALL ON acquisition_scans TO authenticated;
GRANT ALL ON acquisition_targets TO authenticated;

-- ==========================================
-- VERIFICATION
-- ==========================================
-- After running this, verify tables exist:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'locations',
    'business_lists', 
    'saved_businesses',
    'acquisition_scans',
    'acquisition_targets'
)
ORDER BY table_name;