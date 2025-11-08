-- Structured Smart Summaries - Database Schema
-- Extracts structured key points from contracts and corporate documents
-- with quality gates, confidence scoring, and multi-format exports

-- =====================================================
-- TABLES
-- =====================================================

-- Summary Templates: Define extraction schemas for document types
CREATE TABLE IF NOT EXISTS public.summary_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  doc_type TEXT, -- 'contract', 'corporate_profile', 'policy', etc.
  version TEXT DEFAULT '1.0',
  active BOOLEAN DEFAULT TRUE,
  required_coverage NUMERIC DEFAULT 0.85, -- minimum coverage for quality gate
  min_confidence NUMERIC DEFAULT 0.75, -- minimum average confidence
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, key),
  CHECK (required_coverage >= 0 AND required_coverage <= 1),
  CHECK (min_confidence >= 0 AND min_confidence <= 1)
);

-- Summary Fields: Individual fields within a template
CREATE TABLE IF NOT EXISTS public.summary_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.summary_templates(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL CHECK (field_type IN ('string', 'number', 'boolean', 'date', 'enum', 'richtext', 'json', 'currency', 'duration')),
  required BOOLEAN DEFAULT FALSE,
  source_hint TEXT, -- hint for where to find this field
  normalizer JSONB, -- normalization rules (currency format, date format, enum values, etc.)
  validation JSONB, -- validation rules (min, max, pattern, etc.)
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (template_id, key)
);

-- Summary Runs: Extraction job tracking
CREATE TABLE IF NOT EXISTS public.summary_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.summary_templates(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'success', 'partial', 'error')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  coverage NUMERIC, -- percentage of required fields filled
  avg_confidence NUMERIC, -- average confidence across all fields
  quality_pass BOOLEAN,
  details JSONB, -- additional metadata (error messages, stats, etc.)
  created_by UUID REFERENCES auth.users(id),
  CHECK (coverage >= 0 AND coverage <= 1),
  CHECK (avg_confidence >= 0 AND avg_confidence <= 1)
);

-- Document Summaries: Extraction results
CREATE TABLE IF NOT EXISTS public.document_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.summary_runs(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.summary_templates(id) ON DELETE CASCADE,
  coverage NUMERIC NOT NULL,
  avg_confidence NUMERIC NOT NULL,
  quality_pass BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (coverage >= 0 AND coverage <= 1),
  CHECK (avg_confidence >= 0 AND avg_confidence <= 1)
);

-- Summary Field Values: Extracted data for each field
CREATE TABLE IF NOT EXISTS public.summary_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id UUID NOT NULL REFERENCES public.document_summaries(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.summary_fields(id) ON DELETE CASCADE,
  value_json JSONB, -- the extracted value (can be string, number, array, object)
  raw_value TEXT, -- original extracted text before normalization
  confidence NUMERIC NOT NULL, -- 0-1 confidence score
  evidence JSONB, -- citation evidence (text excerpt, reasoning)
  page_number INT,
  chunk_index INT,
  start_char INT,
  end_char INT,
  extraction_method TEXT, -- 'reuse', 'llm', 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (confidence >= 0 AND confidence <= 1),
  UNIQUE (summary_id, field_id)
);

-- Summary Quality Issues: Problems detected during extraction
CREATE TABLE IF NOT EXISTS public.summary_quality_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.summary_runs(id) ON DELETE CASCADE,
  field_key TEXT,
  issue TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  context JSONB, -- additional context (field value, expected value, etc.)
  remediation TEXT, -- suggestion for fixing the issue
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_summary_runs_document_started
  ON public.summary_runs(document_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_summary_runs_status
  ON public.summary_runs(status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_summaries_document_template
  ON public.document_summaries(document_id, template_id);

CREATE INDEX IF NOT EXISTS idx_document_summaries_created
  ON public.document_summaries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_summary_field_values_summary
  ON public.summary_field_values(summary_id, field_id);

CREATE INDEX IF NOT EXISTS idx_summary_field_values_confidence
  ON public.summary_field_values(confidence);

CREATE INDEX IF NOT EXISTS idx_summary_quality_issues_run_severity
  ON public.summary_quality_issues(run_id, severity);

CREATE INDEX IF NOT EXISTS idx_summary_templates_org_active
  ON public.summary_templates(org_id, active) WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_summary_fields_template_order
  ON public.summary_fields(template_id, order_index);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.summary_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summary_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summary_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summary_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summary_quality_issues ENABLE ROW LEVEL SECURITY;

-- Templates: System templates (org_id IS NULL) are readable by all authenticated users
-- Org templates are only visible to members of that org
CREATE POLICY "Templates readable by org members or system templates"
  ON public.summary_templates FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      org_id IS NULL -- system template
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.org_id = summary_templates.org_id
      )
    )
  );

CREATE POLICY "Templates insertable by org admins"
  ON public.summary_templates FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND org_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = summary_templates.org_id
      AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Templates updatable by org admins"
  ON public.summary_templates FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND org_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = summary_templates.org_id
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Fields: Inherit access from templates
CREATE POLICY "Fields readable if template readable"
  ON public.summary_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.summary_templates t
      WHERE t.id = summary_fields.template_id
      AND (
        auth.uid() IS NOT NULL AND (
          t.org_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.org_id = t.org_id
          )
        )
      )
    )
  );

-- Runs: Access via data room membership
CREATE POLICY "Runs readable if document accessible"
  ON public.summary_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.data_room_access dra ON dra.data_room_id = d.data_room_id
      WHERE d.id = summary_runs.document_id
      AND dra.user_id = auth.uid()
    )
  );

CREATE POLICY "Runs insertable if document accessible"
  ON public.summary_runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.data_room_access dra ON dra.data_room_id = d.data_room_id
      WHERE d.id = summary_runs.document_id
      AND dra.user_id = auth.uid()
      AND dra.role IN ('owner', 'editor')
    )
  );

-- Summaries: Access via data room membership
CREATE POLICY "Summaries readable if document accessible"
  ON public.document_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.data_room_access dra ON dra.data_room_id = d.data_room_id
      WHERE d.id = document_summaries.document_id
      AND dra.user_id = auth.uid()
    )
  );

CREATE POLICY "Summaries insertable if document accessible"
  ON public.document_summaries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.data_room_access dra ON dra.data_room_id = d.data_room_id
      WHERE d.id = document_summaries.document_id
      AND dra.user_id = auth.uid()
      AND dra.role IN ('owner', 'editor')
    )
  );

-- Field Values: Access via summary
CREATE POLICY "Field values readable if summary accessible"
  ON public.summary_field_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.document_summaries ds
      JOIN public.documents d ON d.id = ds.document_id
      JOIN public.data_room_access dra ON dra.data_room_id = d.data_room_id
      WHERE ds.id = summary_field_values.summary_id
      AND dra.user_id = auth.uid()
    )
  );

CREATE POLICY "Field values insertable if summary accessible"
  ON public.summary_field_values FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.document_summaries ds
      JOIN public.documents d ON d.id = ds.document_id
      JOIN public.data_room_access dra ON dra.data_room_id = d.data_room_id
      WHERE ds.id = summary_field_values.summary_id
      AND dra.user_id = auth.uid()
      AND dra.role IN ('owner', 'editor')
    )
  );

-- Quality Issues: Access via run
CREATE POLICY "Quality issues readable if run accessible"
  ON public.summary_quality_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.summary_runs sr
      JOIN public.documents d ON d.id = sr.document_id
      JOIN public.data_room_access dra ON dra.data_room_id = d.data_room_id
      WHERE sr.id = summary_quality_issues.run_id
      AND dra.user_id = auth.uid()
    )
  );

CREATE POLICY "Quality issues insertable if run accessible"
  ON public.summary_quality_issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.summary_runs sr
      JOIN public.documents d ON d.id = sr.document_id
      JOIN public.data_room_access dra ON dra.data_room_id = d.data_room_id
      WHERE sr.id = summary_quality_issues.run_id
      AND dra.user_id = auth.uid()
      AND dra.role IN ('owner', 'editor')
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to calculate coverage and confidence for a summary
CREATE OR REPLACE FUNCTION public.calculate_summary_metrics(summary_id_param UUID)
RETURNS TABLE(coverage NUMERIC, avg_confidence NUMERIC, quality_pass BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_id_var UUID;
  required_coverage_var NUMERIC;
  min_confidence_var NUMERIC;
  total_required INT;
  filled_required INT;
  coverage_var NUMERIC;
  avg_confidence_var NUMERIC;
  quality_pass_var BOOLEAN;
BEGIN
  -- Get template settings
  SELECT ds.template_id, st.required_coverage, st.min_confidence
  INTO template_id_var, required_coverage_var, min_confidence_var
  FROM public.document_summaries ds
  JOIN public.summary_templates st ON st.id = ds.template_id
  WHERE ds.id = summary_id_param;

  -- Count required fields
  SELECT COUNT(*)
  INTO total_required
  FROM public.summary_fields sf
  WHERE sf.template_id = template_id_var
  AND sf.required = TRUE;

  -- Count filled required fields
  SELECT COUNT(*)
  INTO filled_required
  FROM public.summary_field_values sfv
  JOIN public.summary_fields sf ON sf.id = sfv.field_id
  WHERE sfv.summary_id = summary_id_param
  AND sf.required = TRUE
  AND sfv.value_json IS NOT NULL;

  -- Calculate coverage
  IF total_required > 0 THEN
    coverage_var := filled_required::NUMERIC / total_required::NUMERIC;
  ELSE
    coverage_var := 1.0;
  END IF;

  -- Calculate average confidence
  SELECT COALESCE(AVG(sfv.confidence), 0)
  INTO avg_confidence_var
  FROM public.summary_field_values sfv
  WHERE sfv.summary_id = summary_id_param;

  -- Determine quality pass
  quality_pass_var := (
    coverage_var >= required_coverage_var
    AND avg_confidence_var >= min_confidence_var
  );

  RETURN QUERY SELECT coverage_var, avg_confidence_var, quality_pass_var;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp on template changes
CREATE OR REPLACE FUNCTION public.update_summary_template_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_summary_template_timestamp_trigger
  BEFORE UPDATE ON public.summary_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_summary_template_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.summary_templates IS 'Templates defining extraction schemas for different document types';
COMMENT ON TABLE public.summary_fields IS 'Individual fields within a summary template';
COMMENT ON TABLE public.summary_runs IS 'Extraction job tracking with status and quality metrics';
COMMENT ON TABLE public.document_summaries IS 'Completed summary extractions with quality scores';
COMMENT ON TABLE public.summary_field_values IS 'Extracted values for each field with confidence and evidence';
COMMENT ON TABLE public.summary_quality_issues IS 'Quality problems detected during extraction';

COMMENT ON COLUMN public.summary_templates.org_id IS 'NULL for system templates, org_id for custom templates';
COMMENT ON COLUMN public.summary_fields.normalizer IS 'JSON config for value normalization (currency, dates, etc.)';
COMMENT ON COLUMN public.summary_field_values.value_json IS 'Normalized extracted value in JSONB format';
COMMENT ON COLUMN public.summary_field_values.confidence IS 'Confidence score 0-1 from extraction model';
COMMENT ON COLUMN public.summary_quality_issues.severity IS 'low, medium, or high severity issue';
