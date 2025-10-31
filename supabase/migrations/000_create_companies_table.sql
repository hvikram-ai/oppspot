-- ============================================
-- Base Companies Table Creation
-- ============================================
-- This migration creates the foundational companies table
-- that other migrations depend on (e.g., financial analytics)

-- Create companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    registration_number TEXT UNIQUE,
    sector TEXT,
    website TEXT,
    description TEXT,
    employee_count INTEGER,
    annual_revenue NUMERIC(15, 2),
    founded_date DATE,
    address JSONB,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_org_id ON companies(org_id);
CREATE INDEX IF NOT EXISTS idx_companies_registration_number ON companies(registration_number);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
    -- Allow users to view companies in their organization
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'companies'
        AND policyname = 'Users can view companies in their org'
    ) THEN
        CREATE POLICY "Users can view companies in their org" ON companies
            FOR SELECT
            USING (
                org_id IN (
                    SELECT org_id FROM profiles WHERE id = auth.uid()
                )
            );
    END IF;

    -- Allow users to insert companies in their organization
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'companies'
        AND policyname = 'Users can insert companies in their org'
    ) THEN
        CREATE POLICY "Users can insert companies in their org" ON companies
            FOR INSERT
            WITH CHECK (
                org_id IN (
                    SELECT org_id FROM profiles WHERE id = auth.uid()
                )
            );
    END IF;

    -- Allow users to update companies in their organization
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'companies'
        AND policyname = 'Users can update companies in their org'
    ) THEN
        CREATE POLICY "Users can update companies in their org" ON companies
            FOR UPDATE
            USING (
                org_id IN (
                    SELECT org_id FROM profiles WHERE id = auth.uid()
                )
            );
    END IF;
END $$;

-- Grants
GRANT SELECT, INSERT, UPDATE ON companies TO authenticated;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
