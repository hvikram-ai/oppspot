-- ============================================
-- TECH STACK DUE DILIGENCE FEATURE
-- ============================================
-- Description: AI-powered technology stack verification
-- Author: Claude Code
-- Created: 2025-11-11
-- Version: 1.0.0
--
-- This migration creates tables for automated tech stack analysis,
-- including technology detection, risk assessment, and findings generation.
--
-- Features:
-- - Automatic technology detection from documents
-- - AI/GPT wrapper verification
-- - Risk scoring and recommendations
-- - Evidence-based findings with citations
-- ============================================

-- ============================================
-- 1. CREATE ENUMS
-- ============================================

-- Risk levels for overall analysis
CREATE TYPE tech_risk_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Analysis status
CREATE TYPE tech_analysis_status AS ENUM ('pending', 'analyzing', 'completed', 'failed');

-- Technology categories
CREATE TYPE tech_category AS ENUM (
  'frontend',          -- React, Vue, Angular
  'backend',           -- Node.js, Python, Java
  'database',          -- PostgreSQL, MongoDB, Redis
  'infrastructure',    -- AWS, GCP, Kubernetes
  'devops',            -- Docker, GitHub Actions, Jenkins
  'ml_ai',             -- TensorFlow, PyTorch, OpenAI
  'security',          -- Auth0, OAuth, encryption
  'testing',           -- Jest, Pytest, Cypress
  'monitoring',        -- DataDog, Sentry, Prometheus
  'other'
);

-- AI authenticity classification
CREATE TYPE tech_authenticity AS ENUM (
  'proprietary',       -- Custom-built AI models
  'wrapper',           -- GPT API wrapper
  'hybrid',            -- Mix of custom + third-party
  'third_party',       -- Pure third-party service
  'unknown'
);

-- Finding types
CREATE TYPE tech_finding_type AS ENUM (
  'red_flag',          -- Critical issue
  'risk',              -- Potential problem
  'opportunity',       -- Improvement opportunity
  'strength',          -- Positive finding
  'recommendation'     -- Actionable suggestion
);

-- Finding severity
CREATE TYPE tech_finding_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');

-- ============================================
-- 2. CREATE MAIN TABLES
-- ============================================

-- Main analysis table
CREATE TABLE tech_stack_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_room_id UUID NOT NULL REFERENCES data_rooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Analysis metadata
  title TEXT NOT NULL,
  description TEXT,
  status tech_analysis_status NOT NULL DEFAULT 'pending',

  -- Aggregate scores (denormalized for performance)
  technologies_identified INTEGER NOT NULL DEFAULT 0,
  risk_level tech_risk_level,
  modernization_score INTEGER CHECK (modernization_score >= 0 AND modernization_score <= 100),
  ai_authenticity_score INTEGER CHECK (ai_authenticity_score >= 0 AND ai_authenticity_score <= 100),
  technical_debt_score INTEGER CHECK (technical_debt_score >= 0 AND technical_debt_score <= 100),

  -- Category counts (denormalized)
  frontend_count INTEGER NOT NULL DEFAULT 0,
  backend_count INTEGER NOT NULL DEFAULT 0,
  database_count INTEGER NOT NULL DEFAULT 0,
  infrastructure_count INTEGER NOT NULL DEFAULT 0,
  ai_ml_count INTEGER NOT NULL DEFAULT 0,

  -- AI analysis metadata
  ai_model TEXT,
  analysis_time_ms INTEGER,
  documents_analyzed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,

  -- Tags and metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_analyzed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Individual technologies detected
CREATE TABLE tech_stack_technologies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES tech_stack_analyses(id) ON DELETE CASCADE,

  -- Technology details
  name TEXT NOT NULL,
  category tech_category NOT NULL,
  version TEXT,
  authenticity tech_authenticity,

  -- Confidence and risk
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  is_outdated BOOLEAN NOT NULL DEFAULT false,
  is_deprecated BOOLEAN NOT NULL DEFAULT false,

  -- Evidence (source attribution)
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  source_page_number INTEGER,
  excerpt_text TEXT CHECK (LENGTH(excerpt_text) <= 500),
  chunk_id UUID,

  -- AI reasoning
  ai_reasoning TEXT,
  ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),

  -- License and security
  license_type TEXT,
  has_security_issues BOOLEAN NOT NULL DEFAULT false,
  security_details TEXT,

  -- Manual verification
  manual_note TEXT,
  manually_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Findings (red flags, risks, recommendations)
CREATE TABLE tech_stack_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES tech_stack_analyses(id) ON DELETE CASCADE,

  -- Finding details
  finding_type tech_finding_type NOT NULL,
  severity tech_finding_severity NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Related technologies
  related_technology_ids UUID[] DEFAULT '{}',

  -- Evidence
  evidence_text TEXT,
  source_documents UUID[] DEFAULT '{}',

  -- Impact assessment
  impact_description TEXT,
  mitigation_steps TEXT[],
  estimated_cost_to_fix TEXT,

  -- Status tracking
  is_addressed BOOLEAN NOT NULL DEFAULT false,
  addressed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  addressed_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tech stack comparisons (for comparing multiple companies)
CREATE TABLE tech_stack_comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Comparison metadata
  title TEXT NOT NULL,
  description TEXT,
  analysis_ids UUID[] NOT NULL CHECK (array_length(analysis_ids, 1) >= 2),

  -- Comparison results
  comparison_matrix JSONB,
  strengths_weaknesses JSONB,
  recommendations TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. CREATE INDEXES
-- ============================================

-- tech_stack_analyses indexes
CREATE INDEX idx_tech_stack_analyses_data_room ON tech_stack_analyses(data_room_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tech_stack_analyses_created_by ON tech_stack_analyses(created_by);
CREATE INDEX idx_tech_stack_analyses_status ON tech_stack_analyses(status);
CREATE INDEX idx_tech_stack_analyses_risk ON tech_stack_analyses(risk_level) WHERE risk_level IS NOT NULL;
CREATE INDEX idx_tech_stack_analyses_created_at ON tech_stack_analyses(created_at DESC);

-- tech_stack_technologies indexes
CREATE INDEX idx_tech_stack_technologies_analysis ON tech_stack_technologies(analysis_id);
CREATE INDEX idx_tech_stack_technologies_category ON tech_stack_technologies(category);
CREATE INDEX idx_tech_stack_technologies_authenticity ON tech_stack_technologies(authenticity) WHERE authenticity IS NOT NULL;
CREATE INDEX idx_tech_stack_technologies_document ON tech_stack_technologies(source_document_id) WHERE source_document_id IS NOT NULL;
CREATE INDEX idx_tech_stack_technologies_risk ON tech_stack_technologies(risk_score DESC) WHERE risk_score IS NOT NULL;
CREATE INDEX idx_tech_stack_technologies_outdated ON tech_stack_technologies(is_outdated) WHERE is_outdated = true;

-- Unique constraint: prevent duplicate technology detections
CREATE UNIQUE INDEX idx_tech_stack_technologies_unique
ON tech_stack_technologies(analysis_id, LOWER(name), category, COALESCE(version, ''));

-- tech_stack_findings indexes
CREATE INDEX idx_tech_stack_findings_analysis ON tech_stack_findings(analysis_id);
CREATE INDEX idx_tech_stack_findings_type ON tech_stack_findings(finding_type);
CREATE INDEX idx_tech_stack_findings_severity ON tech_stack_findings(severity);
CREATE INDEX idx_tech_stack_findings_unaddressed ON tech_stack_findings(is_addressed) WHERE is_addressed = false;
CREATE INDEX idx_tech_stack_findings_created_at ON tech_stack_findings(created_at DESC);

-- tech_stack_comparisons indexes
CREATE INDEX idx_tech_stack_comparisons_created_by ON tech_stack_comparisons(created_by);
CREATE INDEX idx_tech_stack_comparisons_created_at ON tech_stack_comparisons(created_at DESC);

-- ============================================
-- 4. CREATE TRIGGERS AND FUNCTIONS
-- ============================================

-- Function: Update technology counts when technologies are added/removed
CREATE OR REPLACE FUNCTION update_tech_stack_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_analysis_id UUID;
BEGIN
  v_analysis_id := COALESCE(NEW.analysis_id, OLD.analysis_id);

  UPDATE tech_stack_analyses
  SET
    technologies_identified = (
      SELECT COUNT(*) FROM tech_stack_technologies
      WHERE analysis_id = v_analysis_id
    ),
    frontend_count = (
      SELECT COUNT(*) FROM tech_stack_technologies
      WHERE analysis_id = v_analysis_id AND category = 'frontend'
    ),
    backend_count = (
      SELECT COUNT(*) FROM tech_stack_technologies
      WHERE analysis_id = v_analysis_id AND category = 'backend'
    ),
    database_count = (
      SELECT COUNT(*) FROM tech_stack_technologies
      WHERE analysis_id = v_analysis_id AND category = 'database'
    ),
    infrastructure_count = (
      SELECT COUNT(*) FROM tech_stack_technologies
      WHERE analysis_id = v_analysis_id AND category = 'infrastructure'
    ),
    ai_ml_count = (
      SELECT COUNT(*) FROM tech_stack_technologies
      WHERE analysis_id = v_analysis_id AND category = 'ml_ai'
    ),
    updated_at = NOW()
  WHERE id = v_analysis_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update counts on technology changes
CREATE TRIGGER trigger_update_tech_stack_counts
AFTER INSERT OR DELETE OR UPDATE OF category ON tech_stack_technologies
FOR EACH ROW EXECUTE FUNCTION update_tech_stack_counts();

-- Function: Calculate aggregate risk level and scores
CREATE OR REPLACE FUNCTION calculate_tech_stack_scores()
RETURNS TRIGGER AS $$
DECLARE
  v_analysis_id UUID;
  v_avg_risk NUMERIC;
  v_critical_count INTEGER;
  v_high_count INTEGER;
  v_wrapper_count INTEGER;
  v_proprietary_count INTEGER;
  v_total_ai_count INTEGER;
  v_outdated_count INTEGER;
  v_total_count INTEGER;
BEGIN
  v_analysis_id := COALESCE(NEW.analysis_id, OLD.analysis_id);

  -- Calculate risk metrics
  SELECT
    COALESCE(AVG(risk_score), 0),
    COUNT(*) FILTER (WHERE risk_score >= 75),
    COUNT(*) FILTER (WHERE risk_score >= 50 AND risk_score < 75),
    COUNT(*) FILTER (WHERE authenticity = 'wrapper' AND category = 'ml_ai'),
    COUNT(*) FILTER (WHERE authenticity = 'proprietary' AND category = 'ml_ai'),
    COUNT(*) FILTER (WHERE category = 'ml_ai'),
    COUNT(*) FILTER (WHERE is_outdated = true),
    COUNT(*)
  INTO
    v_avg_risk,
    v_critical_count,
    v_high_count,
    v_wrapper_count,
    v_proprietary_count,
    v_total_ai_count,
    v_outdated_count,
    v_total_count
  FROM tech_stack_technologies
  WHERE analysis_id = v_analysis_id;

  -- Update analysis with calculated scores
  UPDATE tech_stack_analyses
  SET
    -- Risk level based on critical/high risk technologies
    risk_level = CASE
      WHEN v_critical_count > 0 THEN 'critical'::tech_risk_level
      WHEN v_high_count > 2 THEN 'high'::tech_risk_level
      WHEN v_high_count > 0 OR v_avg_risk >= 40 THEN 'medium'::tech_risk_level
      ELSE 'low'::tech_risk_level
    END,

    -- AI Authenticity Score (0-100)
    -- 100 = all proprietary, 0 = all wrappers
    ai_authenticity_score = CASE
      WHEN v_total_ai_count = 0 THEN NULL
      WHEN v_proprietary_count = v_total_ai_count THEN 100
      WHEN v_wrapper_count = v_total_ai_count THEN 0
      ELSE ROUND((v_proprietary_count::NUMERIC / v_total_ai_count::NUMERIC) * 100)::INTEGER
    END,

    -- Technical Debt Score (0-100)
    -- Higher = more debt (outdated tech, high risk)
    technical_debt_score = CASE
      WHEN v_total_count = 0 THEN 0
      ELSE LEAST(
        ROUND(
          (v_avg_risk * 0.6) +
          ((v_outdated_count::NUMERIC / v_total_count::NUMERIC) * 40)
        )::INTEGER,
        100
      )
    END,

    -- Modernization Score (0-100)
    -- Inverse of technical debt
    modernization_score = CASE
      WHEN v_total_count = 0 THEN NULL
      ELSE 100 - LEAST(
        ROUND(
          (v_avg_risk * 0.6) +
          ((v_outdated_count::NUMERIC / v_total_count::NUMERIC) * 40)
        )::INTEGER,
        100
      )
    END,

    updated_at = NOW()
  WHERE id = v_analysis_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Recalculate scores when technology risk changes
CREATE TRIGGER trigger_calculate_tech_stack_scores
AFTER INSERT OR UPDATE OF risk_score, authenticity, is_outdated ON tech_stack_technologies
FOR EACH ROW EXECUTE FUNCTION calculate_tech_stack_scores();

-- Trigger: Also recalculate on delete
CREATE TRIGGER trigger_calculate_tech_stack_scores_delete
AFTER DELETE ON tech_stack_technologies
FOR EACH ROW EXECUTE FUNCTION calculate_tech_stack_scores();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tech_stack_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: Auto-update updated_at
CREATE TRIGGER trigger_tech_stack_analyses_updated_at
BEFORE UPDATE ON tech_stack_analyses
FOR EACH ROW EXECUTE FUNCTION update_tech_stack_updated_at();

CREATE TRIGGER trigger_tech_stack_technologies_updated_at
BEFORE UPDATE ON tech_stack_technologies
FOR EACH ROW EXECUTE FUNCTION update_tech_stack_updated_at();

CREATE TRIGGER trigger_tech_stack_findings_updated_at
BEFORE UPDATE ON tech_stack_findings
FOR EACH ROW EXECUTE FUNCTION update_tech_stack_updated_at();

CREATE TRIGGER trigger_tech_stack_comparisons_updated_at
BEFORE UPDATE ON tech_stack_comparisons
FOR EACH ROW EXECUTE FUNCTION update_tech_stack_updated_at();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tech_stack_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_stack_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_stack_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_stack_comparisons ENABLE ROW LEVEL SECURITY;

-- Policies for tech_stack_analyses (inherit from data_rooms)
CREATE POLICY tech_stack_analyses_select ON tech_stack_analyses
FOR SELECT USING (
  data_room_id IN (
    SELECT id FROM data_rooms WHERE user_id = auth.uid()
    UNION
    SELECT data_room_id FROM data_room_access
    WHERE user_id = auth.uid()
    AND revoked_at IS NULL
    AND expires_at > NOW()
  )
);

CREATE POLICY tech_stack_analyses_insert ON tech_stack_analyses
FOR INSERT WITH CHECK (
  data_room_id IN (
    SELECT id FROM data_rooms WHERE user_id = auth.uid()
    UNION
    SELECT data_room_id FROM data_room_access
    WHERE user_id = auth.uid()
    AND permission_level IN ('owner', 'editor')
    AND revoked_at IS NULL
    AND expires_at > NOW()
  )
  AND created_by = auth.uid()
);

CREATE POLICY tech_stack_analyses_update ON tech_stack_analyses
FOR UPDATE USING (
  data_room_id IN (
    SELECT id FROM data_rooms WHERE user_id = auth.uid()
    UNION
    SELECT data_room_id FROM data_room_access
    WHERE user_id = auth.uid()
    AND permission_level IN ('owner', 'editor')
    AND revoked_at IS NULL
    AND expires_at > NOW()
  )
);

CREATE POLICY tech_stack_analyses_delete ON tech_stack_analyses
FOR DELETE USING (
  data_room_id IN (
    SELECT id FROM data_rooms WHERE user_id = auth.uid()
  )
);

-- Policies for tech_stack_technologies (inherit from analyses)
CREATE POLICY tech_stack_technologies_select ON tech_stack_technologies
FOR SELECT USING (
  analysis_id IN (SELECT id FROM tech_stack_analyses)
);

CREATE POLICY tech_stack_technologies_insert ON tech_stack_technologies
FOR INSERT WITH CHECK (
  analysis_id IN (SELECT id FROM tech_stack_analyses)
);

CREATE POLICY tech_stack_technologies_update ON tech_stack_technologies
FOR UPDATE USING (
  analysis_id IN (SELECT id FROM tech_stack_analyses)
);

CREATE POLICY tech_stack_technologies_delete ON tech_stack_technologies
FOR DELETE USING (
  analysis_id IN (SELECT id FROM tech_stack_analyses)
);

-- Policies for tech_stack_findings (inherit from analyses)
CREATE POLICY tech_stack_findings_select ON tech_stack_findings
FOR SELECT USING (
  analysis_id IN (SELECT id FROM tech_stack_analyses)
);

CREATE POLICY tech_stack_findings_insert ON tech_stack_findings
FOR INSERT WITH CHECK (
  analysis_id IN (SELECT id FROM tech_stack_analyses)
);

CREATE POLICY tech_stack_findings_update ON tech_stack_findings
FOR UPDATE USING (
  analysis_id IN (SELECT id FROM tech_stack_analyses)
);

CREATE POLICY tech_stack_findings_delete ON tech_stack_findings
FOR DELETE USING (
  analysis_id IN (SELECT id FROM tech_stack_analyses)
);

-- Policies for tech_stack_comparisons
CREATE POLICY tech_stack_comparisons_select ON tech_stack_comparisons
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY tech_stack_comparisons_insert ON tech_stack_comparisons
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY tech_stack_comparisons_update ON tech_stack_comparisons
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY tech_stack_comparisons_delete ON tech_stack_comparisons
FOR DELETE USING (created_by = auth.uid());

-- ============================================
-- 6. GRANTS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON tech_stack_analyses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tech_stack_technologies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tech_stack_findings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tech_stack_comparisons TO authenticated;

-- ============================================
-- 7. COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE tech_stack_analyses IS 'Main tech stack analysis entity with aggregate scores';
COMMENT ON TABLE tech_stack_technologies IS 'Individual technologies detected with evidence and risk scores';
COMMENT ON TABLE tech_stack_findings IS 'Red flags, risks, opportunities, and recommendations';
COMMENT ON TABLE tech_stack_comparisons IS 'Cross-company tech stack comparisons';

COMMENT ON COLUMN tech_stack_analyses.modernization_score IS 'Score 0-100: How modern/up-to-date is the stack';
COMMENT ON COLUMN tech_stack_analyses.ai_authenticity_score IS 'Score 0-100: Proprietary AI (100) vs GPT wrapper (0)';
COMMENT ON COLUMN tech_stack_analyses.technical_debt_score IS 'Score 0-100: Higher = more technical debt';

COMMENT ON COLUMN tech_stack_technologies.authenticity IS 'Classification of AI technology: proprietary, wrapper, hybrid, third_party, unknown';
COMMENT ON COLUMN tech_stack_technologies.confidence_score IS 'AI confidence in detection (0-1)';
COMMENT ON COLUMN tech_stack_technologies.risk_score IS 'Risk score 0-100 based on age, security, deprecation';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
