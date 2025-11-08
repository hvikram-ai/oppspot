-- Migration: Add Global Countries Support for Worldwide Opp Scan Coverage
-- Purpose: Replace hardcoded UK/Ireland regions with comprehensive 195-country database
-- Created: 2025-01-12

-- ============================================================================
-- TABLE: countries
-- ============================================================================
-- Stores metadata for all 195 UN-recognized countries
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  country_code VARCHAR(2) NOT NULL UNIQUE,  -- ISO 3166-1 alpha-2 (e.g., 'US', 'GB', 'DE')
  country_code_alpha3 VARCHAR(3) NOT NULL UNIQUE,  -- ISO 3166-1 alpha-3 (e.g., 'USA', 'GBR', 'DEU')
  numeric_code VARCHAR(3),  -- ISO 3166-1 numeric (e.g., '840', '826', '276')
  name VARCHAR(255) NOT NULL,  -- Official country name
  official_name TEXT,  -- Full official name
  native_name VARCHAR(255),  -- Name in local language

  -- Geographic
  continent VARCHAR(50) NOT NULL,  -- 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'
  region VARCHAR(100),  -- Sub-region (e.g., 'Western Europe', 'Southeast Asia')
  capital VARCHAR(255),  -- Capital city
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  area_sq_km INTEGER,  -- Land area in square kilometers

  -- Currency & Economic
  currency_code VARCHAR(3) NOT NULL,  -- ISO 4217 (e.g., 'USD', 'EUR', 'GBP')
  currency_name VARCHAR(100),
  currency_symbol VARCHAR(10),

  -- Time & Language
  timezone VARCHAR(50),  -- Primary timezone (e.g., 'America/New_York', 'Europe/London')
  utc_offset VARCHAR(10),  -- e.g., '+00:00', '-05:00', '+09:00'
  languages JSONB,  -- Array of language codes (e.g., ['en', 'fr'])

  -- Business & Economic Data
  population BIGINT,
  gdp_usd BIGINT,  -- GDP in USD
  gdp_per_capita_usd INTEGER,  -- GDP per capita in USD
  business_density VARCHAR(20),  -- 'low', 'moderate', 'high', 'very_high'
  ease_of_business_score INTEGER,  -- 0-100 (World Bank Doing Business score)
  corporate_tax_rate DECIMAL(5, 2),  -- Standard corporate tax rate (%)
  vat_gst_rate DECIMAL(5, 2),  -- VAT/GST/Sales tax rate (%)

  -- Regulatory & Compliance
  regulatory_complexity VARCHAR(20),  -- 'low', 'moderate', 'high', 'very_high'
  legal_system VARCHAR(50),  -- 'common_law', 'civil_law', 'mixed', 'customary', 'religious'
  corruption_perception_index INTEGER,  -- Transparency International CPI (0-100, higher is better)
  geopolitical_risk VARCHAR(20),  -- 'minimal', 'low', 'moderate', 'high', 'very_high'

  -- Industry & Trade
  key_industries JSONB,  -- Array of primary industries
  trade_agreements JSONB,  -- Array of trade bloc memberships (e.g., ['EU', 'NAFTA', 'ASEAN'])
  foreign_investment_restrictions TEXT,  -- Notes on FDI restrictions

  -- Data Sources Available
  has_company_registry BOOLEAN DEFAULT false,
  company_registry_url TEXT,
  company_registry_type VARCHAR(50),  -- 'free_api', 'paid_api', 'web_scraping', 'none'
  company_registry_notes TEXT,
  data_source_coverage VARCHAR(20),  -- 'excellent', 'good', 'limited', 'minimal'

  -- Metadata
  enabled BOOLEAN DEFAULT true,  -- Country available for selection
  notes TEXT,  -- Admin notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for countries table
CREATE INDEX IF NOT EXISTS idx_countries_continent ON countries(continent);
CREATE INDEX IF NOT EXISTS idx_countries_region ON countries(region);
CREATE INDEX IF NOT EXISTS idx_countries_currency_code ON countries(currency_code);
CREATE INDEX IF NOT EXISTS idx_countries_enabled ON countries(enabled);
CREATE INDEX IF NOT EXISTS idx_countries_data_coverage ON countries(data_source_coverage);

-- ============================================================================
-- TABLE: regions
-- ============================================================================
-- Dynamic regions/cities within countries (replaces hardcoded UK/Ireland regions)
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  country_code VARCHAR(2) NOT NULL REFERENCES countries(country_code) ON DELETE CASCADE,
  region_code VARCHAR(50) NOT NULL,  -- e.g., 'london', 'california', 'bavaria'
  name VARCHAR(255) NOT NULL,  -- e.g., 'Greater London', 'California', 'Bavaria'
  type VARCHAR(20) NOT NULL,  -- 'city', 'state', 'province', 'region', 'district'

  -- Geographic
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Business Data
  population INTEGER,
  gdp_usd BIGINT,
  business_density VARCHAR(20),
  key_industries JSONB,

  -- Metadata
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(country_code, region_code)
);

-- Indexes for regions table
CREATE INDEX IF NOT EXISTS idx_regions_country_code ON regions(country_code);
CREATE INDEX IF NOT EXISTS idx_regions_type ON regions(type);
CREATE INDEX IF NOT EXISTS idx_regions_enabled ON regions(enabled);

-- ============================================================================
-- TABLE: industry_classifications
-- ============================================================================
-- Maps between different international industry classification systems
CREATE TABLE IF NOT EXISTS industry_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- UN ISIC (Primary global standard)
  isic_code VARCHAR(10) NOT NULL UNIQUE,  -- International Standard Industrial Classification
  isic_name TEXT NOT NULL,
  isic_description TEXT,
  isic_section VARCHAR(1),  -- A-U sections

  -- Regional mappings
  uk_sic_code VARCHAR(10),  -- UK Standard Industrial Classification
  us_naics_code VARCHAR(10),  -- North American Industry Classification System
  eu_nace_code VARCHAR(10),  -- European NACE classification

  -- Additional mappings
  australia_anzsic_code VARCHAR(10),  -- Australian and New Zealand Standard
  canada_naics_code VARCHAR(10),  -- Canadian NAICS
  japan_jsic_code VARCHAR(10),  -- Japan Standard Industrial Classification

  -- Metadata
  category VARCHAR(100),  -- High-level category
  subcategory VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for industry_classifications table
CREATE INDEX IF NOT EXISTS idx_industry_isic_code ON industry_classifications(isic_code);
CREATE INDEX IF NOT EXISTS idx_industry_uk_sic ON industry_classifications(uk_sic_code);
CREATE INDEX IF NOT EXISTS idx_industry_us_naics ON industry_classifications(us_naics_code);
CREATE INDEX IF NOT EXISTS idx_industry_eu_nace ON industry_classifications(eu_nace_code);
CREATE INDEX IF NOT EXISTS idx_industry_category ON industry_classifications(category);

-- ============================================================================
-- TABLE: country_data_sources
-- ============================================================================
-- Tracks which data sources are available for each country
CREATE TABLE IF NOT EXISTS country_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  country_code VARCHAR(2) NOT NULL REFERENCES countries(country_code) ON DELETE CASCADE,
  data_source VARCHAR(100) NOT NULL,  -- 'opencorporates', 'sec_edgar', 'companies_house', etc.

  -- Configuration
  api_endpoint TEXT,
  api_key_required BOOLEAN DEFAULT false,
  cost_per_search DECIMAL(10, 2),  -- Cost in USD
  rate_limit_per_day INTEGER,

  -- Capabilities
  provides_basic_info BOOLEAN DEFAULT true,
  provides_financial_data BOOLEAN DEFAULT false,
  provides_directors BOOLEAN DEFAULT false,
  provides_shareholders BOOLEAN DEFAULT false,
  provides_filings BOOLEAN DEFAULT false,

  -- Status
  is_available BOOLEAN DEFAULT true,
  reliability_score INTEGER,  -- 0-100
  last_tested_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(country_code, data_source)
);

-- Indexes for country_data_sources table
CREATE INDEX IF NOT EXISTS idx_country_sources_country ON country_data_sources(country_code);
CREATE INDEX IF NOT EXISTS idx_country_sources_available ON country_data_sources(is_available);

-- ============================================================================
-- TABLE: regulatory_frameworks
-- ============================================================================
-- Country-specific regulatory requirements (replaces hardcoded UK/Ireland regs)
CREATE TABLE IF NOT EXISTS regulatory_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  country_code VARCHAR(2) NOT NULL REFERENCES countries(country_code) ON DELETE CASCADE,
  regulation_type VARCHAR(100) NOT NULL,  -- 'merger_approval', 'sector_license', 'data_protection', etc.

  -- Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  authority VARCHAR(255),  -- Regulatory body name
  threshold_usd BIGINT,  -- Monetary threshold if applicable

  -- Applicability
  applies_to_sectors JSONB,  -- Array of industry sectors
  is_mandatory BOOLEAN DEFAULT true,

  -- Process
  typical_duration_days INTEGER,
  complexity VARCHAR(20),  -- 'low', 'moderate', 'high', 'very_high'

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for regulatory_frameworks table
CREATE INDEX IF NOT EXISTS idx_regulatory_country ON regulatory_frameworks(country_code);
CREATE INDEX IF NOT EXISTS idx_regulatory_type ON regulatory_frameworks(regulation_type);

-- ============================================================================
-- UPDATE EXISTING TABLES (if they exist)
-- ============================================================================

-- Update acquisition_scans table to support global countries (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acquisition_scans') THEN
    ALTER TABLE acquisition_scans
      -- Add country code references
      ADD COLUMN IF NOT EXISTS selected_country_codes TEXT[],  -- Array of ISO country codes

      -- Deprecate old UK-specific fields (keep for backward compatibility but don't use)
      ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false,  -- Flag to indicate global vs legacy UK/Ireland scans

      -- Add multi-currency support
      ADD COLUMN IF NOT EXISTS budget_currency VARCHAR(3) DEFAULT 'USD',  -- Preferred currency for this scan
      ADD COLUMN IF NOT EXISTS estimated_cost_currency VARCHAR(3) DEFAULT 'USD';

    -- Create indexes for new fields
    CREATE INDEX IF NOT EXISTS idx_acquisition_scans_country_codes ON acquisition_scans USING GIN(selected_country_codes);
  END IF;
END $$;

-- Update target_companies table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'target_companies') THEN
    -- Add ISO country code
    ALTER TABLE target_companies ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

    -- Add currency
    ALTER TABLE target_companies ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3);

    -- Add global identifiers
    ALTER TABLE target_companies ADD COLUMN IF NOT EXISTS lei_code VARCHAR(20);  -- Legal Entity Identifier
    ALTER TABLE target_companies ADD COLUMN IF NOT EXISTS duns_number VARCHAR(9);  -- Dun & Bradstreet

    -- Add ISIC code for universal industry classification
    ALTER TABLE target_companies ADD COLUMN IF NOT EXISTS isic_code VARCHAR(10);

    -- Remove UK default if column exists and has default
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'target_companies'
      AND column_name = 'registration_country'
      AND column_default IS NOT NULL
    ) THEN
      ALTER TABLE target_companies ALTER COLUMN registration_country DROP DEFAULT;
    END IF;

    -- Create indexes for new fields
    CREATE INDEX IF NOT EXISTS idx_target_companies_country_code ON target_companies(country_code);
    CREATE INDEX IF NOT EXISTS idx_target_companies_currency_code ON target_companies(currency_code);
  END IF;
END $$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON countries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON regions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_industry_classifications_updated_at BEFORE UPDATE ON industry_classifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_country_data_sources_updated_at BEFORE UPDATE ON country_data_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regulatory_frameworks_updated_at BEFORE UPDATE ON regulatory_frameworks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_frameworks ENABLE ROW LEVEL SECURITY;

-- Public read access (these are reference/metadata tables)
CREATE POLICY "Countries are viewable by everyone" ON countries FOR SELECT USING (true);
CREATE POLICY "Regions are viewable by everyone" ON regions FOR SELECT USING (true);
CREATE POLICY "Industry classifications are viewable by everyone" ON industry_classifications FOR SELECT USING (true);
CREATE POLICY "Country data sources are viewable by everyone" ON country_data_sources FOR SELECT USING (true);
CREATE POLICY "Regulatory frameworks are viewable by everyone" ON regulatory_frameworks FOR SELECT USING (true);

-- Admin-only write access (use service role for seeding)
-- No INSERT/UPDATE/DELETE policies for regular users - manage via admin dashboard

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE countries IS 'Master list of 195 countries with business intelligence metadata';
COMMENT ON TABLE regions IS 'Cities, states, and regions within countries for geographic targeting';
COMMENT ON TABLE industry_classifications IS 'Maps between UN ISIC, UK SIC, US NAICS, EU NACE industry codes';
COMMENT ON TABLE country_data_sources IS 'Tracks available company registry and data APIs per country';
COMMENT ON TABLE regulatory_frameworks IS 'Country-specific regulatory requirements for acquisitions';

COMMENT ON COLUMN countries.country_code IS 'ISO 3166-1 alpha-2 code';
COMMENT ON COLUMN countries.ease_of_business_score IS 'World Bank Doing Business Index score (0-100, higher is better)';
COMMENT ON COLUMN countries.data_source_coverage IS 'Quality of available data sources: excellent/good/limited/minimal';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
