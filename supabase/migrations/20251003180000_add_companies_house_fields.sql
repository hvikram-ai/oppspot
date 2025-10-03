-- ============================================
-- Add Companies House specific fields to businesses table
-- Migration: 20251003180000_add_companies_house_fields.sql
-- ============================================

-- Add Companies House fields
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS company_number TEXT,
ADD COLUMN IF NOT EXISTS company_status TEXT,
ADD COLUMN IF NOT EXISTS company_type TEXT,
ADD COLUMN IF NOT EXISTS incorporation_date DATE,
ADD COLUMN IF NOT EXISTS dissolution_date DATE,
ADD COLUMN IF NOT EXISTS sic_codes TEXT[],
ADD COLUMN IF NOT EXISTS accounts_next_due DATE,
ADD COLUMN IF NOT EXISTS confirmation_statement_next_due DATE,
ADD COLUMN IF NOT EXISTS registered_office_address JSONB,
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS last_companies_house_update TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS companies_house_url TEXT;

-- Create unique index on company_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_company_number
ON businesses(company_number)
WHERE company_number IS NOT NULL;

-- Create index on company_status for filtering
CREATE INDEX IF NOT EXISTS idx_businesses_company_status
ON businesses(company_status)
WHERE company_status IS NOT NULL;

-- Create index on sic_codes for filtering
CREATE INDEX IF NOT EXISTS idx_businesses_sic_codes
ON businesses USING GIN(sic_codes)
WHERE sic_codes IS NOT NULL;

-- Create index on incorporation_date
CREATE INDEX IF NOT EXISTS idx_businesses_incorporation_date
ON businesses(incorporation_date)
WHERE incorporation_date IS NOT NULL;

-- Add comments
COMMENT ON COLUMN businesses.company_number IS 'Companies House company number (e.g., 12345678)';
COMMENT ON COLUMN businesses.company_status IS 'active, dissolved, liquidation, etc.';
COMMENT ON COLUMN businesses.company_type IS 'ltd, plc, llp, etc.';
COMMENT ON COLUMN businesses.sic_codes IS 'Standard Industrial Classification codes';
COMMENT ON COLUMN businesses.data_source IS 'Source of company data: manual, companies_house, api_import';
COMMENT ON COLUMN businesses.companies_house_url IS 'Direct link to Companies House profile';
