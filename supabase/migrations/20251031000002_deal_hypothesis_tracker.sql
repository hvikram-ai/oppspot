/**
 * Deal Hypothesis Tracker Migration
 * Enables investment/acquisition hypothesis tracking with AI-powered evidence extraction
 * Created: 2025-10-31
 * Tables: hypotheses, hypothesis_evidence, hypothesis_metrics, hypothesis_validations
 */

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Hypothesis types for different deal scenarios
CREATE TYPE hypothesis_type AS ENUM (
  'revenue_growth',      -- Revenue expansion potential
  'cost_synergy',        -- Cost reduction opportunities
  'market_expansion',    -- Market entry or expansion
  'tech_advantage',      -- Technology/IP value
  'team_quality',        -- Management/team strength
  'competitive_position',-- Market positioning
  'operational_efficiency', -- Process improvements
  'customer_acquisition',-- Growth engine potential
  'custom'               -- User-defined
);

-- Hypothesis lifecycle status
CREATE TYPE hypothesis_status AS ENUM (
  'draft',              -- Being created
  'active',             -- Actively testing
  'validated',          -- Evidence supports hypothesis
  'invalidated',        -- Evidence contradicts hypothesis
  'needs_revision'      -- Requires refinement
);

-- Evidence classification
CREATE TYPE evidence_type AS ENUM (
  'supporting',         -- Supports hypothesis
  'contradicting',      -- Contradicts hypothesis
  'neutral'             -- Neither supports nor contradicts
);

-- Metric validation status
CREATE TYPE metric_status AS ENUM (
  'not_tested',         -- Not yet validated
  'testing',            -- Validation in progress
  'met',                -- Target achieved
  'not_met',            -- Target not achieved
  'partially_met'       -- Partially achieved
);

-- Validation outcome
CREATE TYPE validation_status AS ENUM (
  'pass',               -- Hypothesis validated
  'fail',               -- Hypothesis invalidated
  'inconclusive'        -- Insufficient evidence
);

-- ============================================================================
-- TABLE: hypotheses
-- ============================================================================

CREATE TABLE hypotheses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_room_id UUID NOT NULL REFERENCES data_rooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Hypothesis content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  hypothesis_type hypothesis_type NOT NULL,

  -- Status and confidence
  status hypothesis_status NOT NULL DEFAULT 'draft',
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- Supporting data counts (denormalized for performance)
  evidence_count INTEGER NOT NULL DEFAULT 0,
  supporting_evidence_count INTEGER NOT NULL DEFAULT 0,
  contradicting_evidence_count INTEGER NOT NULL DEFAULT 0,
  metrics_count INTEGER NOT NULL DEFAULT 0,
  metrics_met_count INTEGER NOT NULL DEFAULT 0,

  -- Additional metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_analyzed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_hypotheses_data_room_id ON hypotheses(data_room_id);
CREATE INDEX idx_hypotheses_created_by ON hypotheses(created_by);
CREATE INDEX idx_hypotheses_status ON hypotheses(status);
CREATE INDEX idx_hypotheses_type ON hypotheses(hypothesis_type);
CREATE INDEX idx_hypotheses_confidence ON hypotheses(confidence_score);
CREATE INDEX idx_hypotheses_created_at ON hypotheses(created_at DESC);

-- RLS Policies
ALTER TABLE hypotheses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view hypotheses in accessible data rooms"
  ON hypotheses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = hypotheses.data_room_id
      AND (
        data_rooms.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = data_rooms.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.revoked_at IS NULL
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

CREATE POLICY "Editors can create hypotheses"
  ON hypotheses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = hypotheses.data_room_id
      AND (
        data_rooms.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = data_rooms.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.permission_level IN ('owner', 'editor')
          AND data_room_access.revoked_at IS NULL
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

CREATE POLICY "Editors can update hypotheses"
  ON hypotheses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = hypotheses.data_room_id
      AND (
        data_rooms.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = data_rooms.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.permission_level IN ('owner', 'editor')
          AND data_room_access.revoked_at IS NULL
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

CREATE POLICY "Owners and creators can delete hypotheses"
  ON hypotheses FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = hypotheses.data_room_id
      AND data_rooms.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TABLE: hypothesis_evidence
-- ============================================================================

CREATE TABLE hypothesis_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis_id UUID NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Evidence classification
  evidence_type evidence_type NOT NULL,
  relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100),

  -- Content extraction
  excerpt_text TEXT,
  page_number INTEGER,
  chunk_id UUID, -- References document_chunks from Q&A system if available

  -- AI analysis
  ai_reasoning TEXT,
  ai_model TEXT,
  ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),

  -- Manual annotations
  manual_note TEXT,
  manually_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique evidence per document per hypothesis
  UNIQUE(hypothesis_id, document_id, page_number)
);

-- Indexes
CREATE INDEX idx_hypothesis_evidence_hypothesis_id ON hypothesis_evidence(hypothesis_id);
CREATE INDEX idx_hypothesis_evidence_document_id ON hypothesis_evidence(document_id);
CREATE INDEX idx_hypothesis_evidence_type ON hypothesis_evidence(evidence_type);
CREATE INDEX idx_hypothesis_evidence_relevance ON hypothesis_evidence(relevance_score);
CREATE INDEX idx_hypothesis_evidence_created_at ON hypothesis_evidence(created_at DESC);

-- RLS Policies
ALTER TABLE hypothesis_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evidence in accessible hypotheses"
  ON hypothesis_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hypotheses h
      JOIN data_rooms dr ON h.data_room_id = dr.id
      WHERE h.id = hypothesis_evidence.hypothesis_id
      AND (
        dr.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = dr.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.revoked_at IS NULL
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

CREATE POLICY "Editors can create evidence"
  ON hypothesis_evidence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hypotheses h
      JOIN data_rooms dr ON h.data_room_id = dr.id
      WHERE h.id = hypothesis_evidence.hypothesis_id
      AND (
        dr.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = dr.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.permission_level IN ('owner', 'editor')
          AND data_room_access.revoked_at IS NULL
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

CREATE POLICY "Editors can update evidence"
  ON hypothesis_evidence FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM hypotheses h
      JOIN data_rooms dr ON h.data_room_id = dr.id
      WHERE h.id = hypothesis_evidence.hypothesis_id
      AND (
        dr.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = dr.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.permission_level IN ('owner', 'editor')
          AND data_room_access.revoked_at IS NULL
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

CREATE POLICY "Editors can delete evidence"
  ON hypothesis_evidence FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM hypotheses h
      JOIN data_rooms dr ON h.data_room_id = dr.id
      WHERE h.id = hypothesis_evidence.hypothesis_id
      AND (
        dr.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = dr.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.permission_level IN ('owner', 'editor')
          AND data_room_access.revoked_at IS NULL
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

-- ============================================================================
-- TABLE: hypothesis_metrics
-- ============================================================================

CREATE TABLE hypothesis_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis_id UUID NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,

  -- Metric definition
  metric_name TEXT NOT NULL,
  description TEXT,
  target_value DECIMAL,
  actual_value DECIMAL,
  unit TEXT, -- e.g., "USD", "%", "users", "months"

  -- Status
  status metric_status NOT NULL DEFAULT 'not_tested',

  -- Source tracking
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  source_excerpt TEXT,
  source_page_number INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hypothesis_metrics_hypothesis_id ON hypothesis_metrics(hypothesis_id);
CREATE INDEX idx_hypothesis_metrics_status ON hypothesis_metrics(status);
CREATE INDEX idx_hypothesis_metrics_created_at ON hypothesis_metrics(created_at DESC);

-- RLS Policies
ALTER TABLE hypothesis_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics in accessible hypotheses"
  ON hypothesis_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hypotheses h
      JOIN data_rooms dr ON h.data_room_id = dr.id
      WHERE h.id = hypothesis_metrics.hypothesis_id
      AND (
        dr.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = dr.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.revoked_at IS NULL
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

CREATE POLICY "Editors can manage metrics"
  ON hypothesis_metrics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hypotheses h
      JOIN data_rooms dr ON h.data_room_id = dr.id
      WHERE h.id = hypothesis_metrics.hypothesis_id
      AND (
        dr.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = dr.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.permission_level IN ('owner', 'editor')
          AND data_room_access.revoked_at IS NULL
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

-- ============================================================================
-- TABLE: hypothesis_validations
-- ============================================================================

CREATE TABLE hypothesis_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis_id UUID NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  validated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Validation outcome
  validation_status validation_status NOT NULL,

  -- Details
  notes TEXT,
  confidence_adjustment INTEGER CHECK (confidence_adjustment >= -100 AND confidence_adjustment <= 100),

  -- Supporting data
  evidence_summary TEXT,
  key_findings TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hypothesis_validations_hypothesis_id ON hypothesis_validations(hypothesis_id);
CREATE INDEX idx_hypothesis_validations_validated_by ON hypothesis_validations(validated_by);
CREATE INDEX idx_hypothesis_validations_status ON hypothesis_validations(validation_status);
CREATE INDEX idx_hypothesis_validations_created_at ON hypothesis_validations(created_at DESC);

-- RLS Policies
ALTER TABLE hypothesis_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validations in accessible hypotheses"
  ON hypothesis_validations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hypotheses h
      JOIN data_rooms dr ON h.data_room_id = dr.id
      WHERE h.id = hypothesis_validations.hypothesis_id
      AND (
        dr.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = dr.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.revoked_at IS NULL
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

CREATE POLICY "Editors can create validations"
  ON hypothesis_validations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hypotheses h
      JOIN data_rooms dr ON h.data_room_id = dr.id
      WHERE h.id = hypothesis_validations.hypothesis_id
      AND (
        dr.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = dr.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.permission_level IN ('owner', 'editor')
          AND data_room_access.revoked_at IS NULL
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update hypothesis statistics when evidence is added/updated
CREATE OR REPLACE FUNCTION update_hypothesis_evidence_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE hypotheses
    SET
      evidence_count = (
        SELECT COUNT(*) FROM hypothesis_evidence
        WHERE hypothesis_id = NEW.hypothesis_id
      ),
      supporting_evidence_count = (
        SELECT COUNT(*) FROM hypothesis_evidence
        WHERE hypothesis_id = NEW.hypothesis_id
        AND evidence_type = 'supporting'
      ),
      contradicting_evidence_count = (
        SELECT COUNT(*) FROM hypothesis_evidence
        WHERE hypothesis_id = NEW.hypothesis_id
        AND evidence_type = 'contradicting'
      ),
      updated_at = NOW()
    WHERE id = NEW.hypothesis_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE hypotheses
    SET
      evidence_count = (
        SELECT COUNT(*) FROM hypothesis_evidence
        WHERE hypothesis_id = OLD.hypothesis_id
      ),
      supporting_evidence_count = (
        SELECT COUNT(*) FROM hypothesis_evidence
        WHERE hypothesis_id = OLD.hypothesis_id
        AND evidence_type = 'supporting'
      ),
      contradicting_evidence_count = (
        SELECT COUNT(*) FROM hypothesis_evidence
        WHERE hypothesis_id = OLD.hypothesis_id
        AND evidence_type = 'contradicting'
      ),
      updated_at = NOW()
    WHERE id = OLD.hypothesis_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hypothesis_evidence_counts
  AFTER INSERT OR UPDATE OR DELETE ON hypothesis_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_hypothesis_evidence_counts();

-- Function to update hypothesis metrics statistics
CREATE OR REPLACE FUNCTION update_hypothesis_metrics_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE hypotheses
    SET
      metrics_count = (
        SELECT COUNT(*) FROM hypothesis_metrics
        WHERE hypothesis_id = NEW.hypothesis_id
      ),
      metrics_met_count = (
        SELECT COUNT(*) FROM hypothesis_metrics
        WHERE hypothesis_id = NEW.hypothesis_id
        AND status = 'met'
      ),
      updated_at = NOW()
    WHERE id = NEW.hypothesis_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE hypotheses
    SET
      metrics_count = (
        SELECT COUNT(*) FROM hypothesis_metrics
        WHERE hypothesis_id = OLD.hypothesis_id
      ),
      metrics_met_count = (
        SELECT COUNT(*) FROM hypothesis_metrics
        WHERE hypothesis_id = OLD.hypothesis_id
        AND status = 'met'
      ),
      updated_at = NOW()
    WHERE id = OLD.hypothesis_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hypothesis_metrics_counts
  AFTER INSERT OR UPDATE OR DELETE ON hypothesis_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_hypothesis_metrics_counts();

-- Function to calculate hypothesis confidence score
CREATE OR REPLACE FUNCTION calculate_hypothesis_confidence(
  p_hypothesis_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_total_evidence INTEGER;
  v_supporting_count INTEGER;
  v_avg_relevance DECIMAL;
  v_total_metrics INTEGER;
  v_met_metrics INTEGER;
  v_confidence INTEGER;
BEGIN
  -- Get evidence counts
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE evidence_type = 'supporting'),
    AVG(relevance_score)
  INTO v_total_evidence, v_supporting_count, v_avg_relevance
  FROM hypothesis_evidence
  WHERE hypothesis_id = p_hypothesis_id;

  -- Get metrics counts
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'met')
  INTO v_total_metrics, v_met_metrics
  FROM hypothesis_metrics
  WHERE hypothesis_id = p_hypothesis_id;

  -- Calculate confidence (0-100)
  -- Formula: 50% evidence ratio + 30% relevance + 20% metrics
  IF v_total_evidence = 0 AND v_total_metrics = 0 THEN
    RETURN 0;
  END IF;

  v_confidence := (
    COALESCE(0.5 * (v_supporting_count::DECIMAL / NULLIF(v_total_evidence, 0)), 0) +
    COALESCE(0.3 * (v_avg_relevance / 100), 0) +
    COALESCE(0.2 * (v_met_metrics::DECIMAL / NULLIF(v_total_metrics, 0)), 0)
  ) * 100;

  RETURN LEAST(100, GREATEST(0, v_confidence));
END;
$$ LANGUAGE plpgsql;

-- Function to update hypothesis updated_at timestamp
CREATE OR REPLACE FUNCTION update_hypothesis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hypotheses_updated_at
  BEFORE UPDATE ON hypotheses
  FOR EACH ROW
  EXECUTE FUNCTION update_hypothesis_updated_at();

CREATE TRIGGER trigger_update_hypothesis_evidence_updated_at
  BEFORE UPDATE ON hypothesis_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_hypothesis_updated_at();

CREATE TRIGGER trigger_update_hypothesis_metrics_updated_at
  BEFORE UPDATE ON hypothesis_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_hypothesis_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE hypotheses IS 'Investment/acquisition hypotheses tracked within data rooms';
COMMENT ON TABLE hypothesis_evidence IS 'Document evidence supporting or contradicting hypotheses';
COMMENT ON TABLE hypothesis_metrics IS 'Quantitative metrics for hypothesis validation';
COMMENT ON TABLE hypothesis_validations IS 'Manual validation records with outcomes';

COMMENT ON COLUMN hypotheses.confidence_score IS 'AI-calculated confidence 0-100 based on evidence and metrics';
COMMENT ON COLUMN hypothesis_evidence.relevance_score IS 'AI-calculated relevance 0-100 for this evidence';
COMMENT ON COLUMN hypothesis_evidence.chunk_id IS 'References document_chunks if using Q&A vector search';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables created
DO $$
DECLARE
  v_table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('hypotheses', 'hypothesis_evidence', 'hypothesis_metrics', 'hypothesis_validations');

  IF v_table_count = 4 THEN
    RAISE NOTICE 'Deal Hypothesis Tracker migration completed successfully: 4/4 tables created';
  ELSE
    RAISE EXCEPTION 'Migration incomplete: only % tables created', v_table_count;
  END IF;
END $$;
