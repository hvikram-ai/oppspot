-- ================================================================
-- Competitive Intelligence Dashboard - Database Schema (FIXED ORDER)
-- ================================================================
-- Fixed version: Creates tables in correct dependency order
-- ================================================================

-- ================================================================
-- 1. COMPETITOR COMPANIES TABLE (NO DEPENDENCIES)
-- ================================================================

CREATE TABLE IF NOT EXISTS competitor_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  industry VARCHAR(100),
  company_size_band VARCHAR(50),
  headquarters_location VARCHAR(255),
  founded_year INT,
  employee_count_estimate INT,
  revenue_estimate NUMERIC(15,2),
  funding_total NUMERIC(15,2),
  primary_product VARCHAR(255),
  product_description TEXT,
  target_customer_segment VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, website)
);

CREATE INDEX IF NOT EXISTS idx_competitor_companies_name ON competitor_companies(name);
CREATE INDEX IF NOT EXISTS idx_competitor_companies_website ON competitor_companies(website);
CREATE INDEX IF NOT EXISTS idx_competitor_companies_business_id ON competitor_companies(business_id);

ALTER TABLE competitor_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users view competitors" ON competitor_companies;
CREATE POLICY "Authenticated users view competitors"
  ON competitor_companies FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users create competitors" ON competitor_companies;
CREATE POLICY "Authenticated users create competitors"
  ON competitor_companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ================================================================
-- 2. COMPETITIVE ANALYSES TABLE (NO DEPENDENCIES YET)
-- ================================================================

CREATE TABLE IF NOT EXISTS competitive_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  target_company_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  target_company_name VARCHAR(255) NOT NULL,
  target_company_website VARCHAR(500),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  market_segment VARCHAR(100),
  geography VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  deal_status VARCHAR(20) DEFAULT 'active'
    CHECK (deal_status IN ('active', 'closed_acquired', 'closed_passed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  last_refreshed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  auto_archive_at TIMESTAMPTZ,
  competitor_count INT DEFAULT 0,
  avg_feature_parity_score NUMERIC(5,2),
  overall_moat_score NUMERIC(5,2),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comp_analyses_created_by ON competitive_analyses(created_by)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comp_analyses_org ON competitive_analyses(organization_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comp_analyses_status ON competitive_analyses(status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comp_analyses_last_viewed ON competitive_analyses(last_viewed_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_competitive_analyses_updated_at ON competitive_analyses;
CREATE TRIGGER update_competitive_analyses_updated_at
  BEFORE UPDATE ON competitive_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE competitive_analyses ENABLE ROW LEVEL SECURITY;

-- Temporarily create simple RLS - we'll update after access_grants table exists
DROP POLICY IF EXISTS "Users view own analyses temp" ON competitive_analyses;
CREATE POLICY "Users view own analyses temp"
  ON competitive_analyses FOR SELECT
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users create analyses" ON competitive_analyses;
CREATE POLICY "Users create analyses"
  ON competitive_analyses FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Owners update analyses" ON competitive_analyses;
CREATE POLICY "Owners update analyses"
  ON competitive_analyses FOR UPDATE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Owners delete analyses" ON competitive_analyses;
CREATE POLICY "Owners delete analyses"
  ON competitive_analyses FOR DELETE
  USING (created_by = auth.uid());

-- ================================================================
-- 3. ANALYSIS ACCESS GRANTS (DEPENDS ON competitive_analyses)
-- ================================================================

CREATE TABLE IF NOT EXISTS analysis_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level VARCHAR(10) NOT NULL DEFAULT 'view'
    CHECK (access_level IN ('view', 'edit')),
  granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invitation_method VARCHAR(20) CHECK (invitation_method IN ('email', 'user_selection')),
  invitation_email VARCHAR(255),
  UNIQUE(analysis_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_access_grants_analysis ON analysis_access_grants(analysis_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_user ON analysis_access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_revoked ON analysis_access_grants(revoked_at) WHERE revoked_at IS NULL;

ALTER TABLE analysis_access_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their own grants" ON analysis_access_grants;
CREATE POLICY "Users view their own grants"
  ON analysis_access_grants FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM competitive_analyses
            WHERE id = analysis_access_grants.analysis_id
              AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Owners manage grants" ON analysis_access_grants;
CREATE POLICY "Owners manage grants"
  ON analysis_access_grants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = analysis_access_grants.analysis_id
        AND created_by = auth.uid()
    )
  );

-- ================================================================
-- NOW UPDATE competitive_analyses RLS TO INCLUDE SHARED ACCESS
-- ================================================================

DROP POLICY IF EXISTS "Users view own analyses temp" ON competitive_analyses;
DROP POLICY IF EXISTS "Users view own or shared analyses" ON competitive_analyses;
CREATE POLICY "Users view own or shared analyses"
  ON competitive_analyses FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM analysis_access_grants
      WHERE analysis_id = competitive_analyses.id
        AND user_id = auth.uid()
        AND revoked_at IS NULL
    )
  );

-- Continue with remaining tables...
-- (I'll create the rest in the next message to keep it manageable)
