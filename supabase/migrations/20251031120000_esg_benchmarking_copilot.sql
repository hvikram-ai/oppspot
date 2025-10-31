/**
 * ESG Benchmarking Copilot Migration
 * Comprehensive ESG (Environmental, Social, Governance) analytics system
 * Created: 2025-10-31
 *
 * Tables: esg_templates, esg_metrics, esg_benchmarks, esg_scores,
 *         esg_disclosures, esg_sentiment, esg_reports
 */

-- ============================================================================
-- ENUMS
-- ============================================================================

-- ESG categories
CREATE TYPE esg_category AS ENUM (
  'environmental',
  'social',
  'governance'
);

-- Performance levels
CREATE TYPE esg_level AS ENUM (
  'lagging',    -- < p25
  'par',        -- p25-p75
  'leading'     -- >= p75
);

-- Report status
CREATE TYPE esg_report_status AS ENUM (
  'queued',
  'running',
  'success',
  'error'
);

-- Sentiment labels
CREATE TYPE esg_sentiment_label AS ENUM (
  'positive',
  'neutral',
  'negative'
);

-- ============================================================================
-- TABLE: esg_templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.esg_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category esg_category NOT NULL,
  subcategory TEXT,
  metric_keys TEXT[] DEFAULT '{}',
  weights JSONB DEFAULT '{}'::jsonb,
  version TEXT NOT NULL DEFAULT '1.0',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.esg_templates IS 'System templates defining ESG categories, metrics, and scoring weights';
COMMENT ON COLUMN public.esg_templates.metric_keys IS 'Array of metric keys belonging to this template';
COMMENT ON COLUMN public.esg_templates.weights IS 'JSON object with metric weights for scoring';

-- ============================================================================
-- TABLE: esg_metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.esg_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL CHECK (period_year >= 2000 AND period_year <= 2100),
  category esg_category NOT NULL,
  subcategory TEXT,
  metric_key TEXT NOT NULL,
  metric_name TEXT NOT NULL,

  -- Value storage (one will be populated based on metric type)
  value_numeric NUMERIC,
  value_text TEXT,
  value_boolean BOOLEAN,
  unit TEXT,

  -- Source tracking
  source TEXT,
  citation JSONB,  -- {document_id, page_number, chunk_index, excerpt}
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),

  -- Benchmarking
  benchmark_percentile NUMERIC,
  benchmark_sector TEXT,
  benchmark_size_band TEXT,
  benchmark_region TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id, period_year, metric_key)
);

COMMENT ON TABLE public.esg_metrics IS 'Normalized ESG metric values per company/period with citations';
COMMENT ON COLUMN public.esg_metrics.citation IS 'Source document reference: {document_id, page_number, chunk_index, excerpt}';

-- ============================================================================
-- TABLE: esg_benchmarks
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.esg_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL,
  sector TEXT NOT NULL,
  size_band TEXT,  -- 'small', 'medium', 'large', 'enterprise'
  region TEXT,     -- 'UK', 'IE', 'EU', 'Global'

  -- Percentile data
  p10 NUMERIC,
  p25 NUMERIC,
  p50 NUMERIC,
  p75 NUMERIC,
  p90 NUMERIC,

  -- Sample metadata
  sample_size INTEGER,
  data_year INTEGER,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(metric_key, sector, size_band, region)
);

COMMENT ON TABLE public.esg_benchmarks IS 'Reference percentiles for ESG metrics by sector/size/region';

-- ============================================================================
-- TABLE: esg_scores
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.esg_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL CHECK (period_year >= 2000 AND period_year <= 2100),
  category esg_category NOT NULL,
  subcategory TEXT,

  -- Scoring
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  level esg_level NOT NULL,

  -- Details and metadata
  details JSONB,  -- {weights, metric_scores, gaps, improvements}
  metrics_count INTEGER DEFAULT 0,
  metrics_with_data INTEGER DEFAULT 0,

  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id, period_year, category, subcategory)
);

COMMENT ON TABLE public.esg_scores IS 'Computed ESG category and subcategory scores';
COMMENT ON COLUMN public.esg_scores.details IS 'Scoring breakdown: weights, metric scores, identified gaps, improvement recommendations';

-- ============================================================================
-- TABLE: esg_disclosures
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.esg_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,

  -- Location in document
  page_number INTEGER,
  chunk_index INTEGER,

  -- Classification
  category esg_category,
  subcategory TEXT,
  metric_key TEXT,

  -- Extracted content
  excerpt TEXT NOT NULL,
  normalized_value JSONB,  -- Parsed/structured value

  -- Quality metrics
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  ai_model TEXT,
  extraction_method TEXT,  -- 'ai', 'manual', 'structured'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.esg_disclosures IS 'Extracted ESG disclosure statements with source citations';

-- ============================================================================
-- TABLE: esg_sentiment
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.esg_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,

  -- Source information
  source TEXT NOT NULL,  -- 'news', 'social_media', 'reports', 'pr'
  source_url TEXT,
  title TEXT,
  excerpt TEXT,

  -- Sentiment analysis
  label esg_sentiment_label NOT NULL,
  score NUMERIC CHECK (score >= -1 AND score <= 1),  -- -1 (negative) to 1 (positive)

  -- ESG relevance
  related_categories esg_category[],
  related_metrics TEXT[],

  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.esg_sentiment IS 'External ESG-related sentiment from news, PR, and social media';

-- ============================================================================
-- TABLE: esg_reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.esg_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,

  -- Report generation
  template_version TEXT NOT NULL,
  status esg_report_status NOT NULL DEFAULT 'queued',

  -- File storage
  filename TEXT,
  storage_path TEXT,
  file_size_bytes BIGINT,

  -- Metadata
  meta JSONB,  -- {sections, metrics_included, benchmark_count, etc.}
  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.esg_reports IS 'ESG PDF report generation tracking';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- esg_templates
CREATE INDEX idx_esg_templates_category ON public.esg_templates(category);
CREATE INDEX idx_esg_templates_active ON public.esg_templates(active);

-- esg_metrics
CREATE INDEX idx_esg_metrics_company_year ON public.esg_metrics(company_id, period_year);
CREATE INDEX idx_esg_metrics_category ON public.esg_metrics(category, subcategory);
CREATE INDEX idx_esg_metrics_metric_key ON public.esg_metrics(metric_key);
CREATE INDEX idx_esg_metrics_created_at ON public.esg_metrics(created_at DESC);

-- esg_benchmarks
CREATE INDEX idx_esg_benchmarks_metric_sector ON public.esg_benchmarks(metric_key, sector);
CREATE INDEX idx_esg_benchmarks_updated_at ON public.esg_benchmarks(updated_at DESC);

-- esg_scores
CREATE INDEX idx_esg_scores_company_year ON public.esg_scores(company_id, period_year);
CREATE INDEX idx_esg_scores_category ON public.esg_scores(category, subcategory);
CREATE INDEX idx_esg_scores_level ON public.esg_scores(level);
CREATE INDEX idx_esg_scores_computed_at ON public.esg_scores(computed_at DESC);

-- esg_disclosures
CREATE INDEX idx_esg_disclosures_company ON public.esg_disclosures(company_id);
CREATE INDEX idx_esg_disclosures_document ON public.esg_disclosures(document_id);
CREATE INDEX idx_esg_disclosures_category ON public.esg_disclosures(category, subcategory);
CREATE INDEX idx_esg_disclosures_metric ON public.esg_disclosures(metric_key);

-- esg_sentiment
CREATE INDEX idx_esg_sentiment_company_year ON public.esg_sentiment(company_id, period_year);
CREATE INDEX idx_esg_sentiment_label ON public.esg_sentiment(label);
CREATE INDEX idx_esg_sentiment_published_at ON public.esg_sentiment(published_at DESC);

-- esg_reports
CREATE INDEX idx_esg_reports_company_year ON public.esg_reports(company_id, period_year);
CREATE INDEX idx_esg_reports_status ON public.esg_reports(status);
CREATE INDEX idx_esg_reports_created_at ON public.esg_reports(created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_esg_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_esg_templates_updated_at
  BEFORE UPDATE ON public.esg_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_esg_updated_at();

CREATE TRIGGER trigger_esg_metrics_updated_at
  BEFORE UPDATE ON public.esg_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_esg_updated_at();

CREATE TRIGGER trigger_esg_disclosures_updated_at
  BEFORE UPDATE ON public.esg_disclosures
  FOR EACH ROW
  EXECUTE FUNCTION update_esg_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.esg_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esg_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esg_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esg_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esg_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esg_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esg_reports ENABLE ROW LEVEL SECURITY;

-- Templates: readable by all authenticated users
CREATE POLICY "ESG templates viewable by authenticated users"
  ON public.esg_templates FOR SELECT
  USING (auth.uid() IS NOT NULL AND active = true);

-- Benchmarks: readable by all authenticated users
CREATE POLICY "ESG benchmarks viewable by authenticated users"
  ON public.esg_benchmarks FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Metrics: users can view metrics for companies they have access to
CREATE POLICY "Users can view ESG metrics for accessible companies"
  ON public.esg_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = esg_metrics.company_id
      -- Add your org-level access check here
    )
  );

-- Scores: users can view scores for accessible companies
CREATE POLICY "Users can view ESG scores for accessible companies"
  ON public.esg_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = esg_scores.company_id
    )
  );

-- Disclosures: users can view disclosures for accessible companies
CREATE POLICY "Users can view ESG disclosures for accessible companies"
  ON public.esg_disclosures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = esg_disclosures.company_id
    )
  );

-- Sentiment: users can view sentiment for accessible companies
CREATE POLICY "Users can view ESG sentiment for accessible companies"
  ON public.esg_sentiment FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = esg_sentiment.company_id
    )
  );

-- Reports: users can view reports for accessible companies
CREATE POLICY "Users can view ESG reports for accessible companies"
  ON public.esg_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = esg_reports.company_id
    )
  );

-- ============================================================================
-- SEED DATA: ESG Templates
-- ============================================================================

INSERT INTO public.esg_templates (key, title, description, category, subcategory, metric_keys, version) VALUES
-- Environmental
('env_ghg_scope1', 'GHG Scope 1 Emissions', 'Direct greenhouse gas emissions from owned or controlled sources', 'environmental', 'Climate & Emissions', ARRAY['ghg_scope1_tco2e', 'ghg_scope1_intensity'], '1.0'),
('env_ghg_scope2', 'GHG Scope 2 Emissions', 'Indirect GHG emissions from purchased electricity, steam, heating and cooling', 'environmental', 'Climate & Emissions', ARRAY['ghg_scope2_tco2e', 'ghg_scope2_intensity'], '1.0'),
('env_ghg_scope3', 'GHG Scope 3 Emissions', 'All other indirect emissions in the value chain', 'environmental', 'Climate & Emissions', ARRAY['ghg_scope3_tco2e', 'ghg_scope3_categories'], '1.0'),
('env_energy', 'Energy Management', 'Total energy consumption and renewable energy usage', 'environmental', 'Energy', ARRAY['energy_consumption_kwh', 'energy_intensity', 'renewable_energy_pct'], '1.0'),
('env_water', 'Water Management', 'Water withdrawal, consumption, and recycling', 'environmental', 'Water', ARRAY['water_withdrawal_m3', 'water_intensity', 'water_recycled_pct'], '1.0'),
('env_waste', 'Waste Management', 'Waste generation, recycling, and diversion from landfill', 'environmental', 'Waste', ARRAY['waste_total_tonnes', 'waste_recycled_pct', 'waste_hazardous_tonnes'], '1.0'),

-- Social
('soc_labor', 'Labor Practices', 'Employee turnover, training, and development', 'social', 'Workforce', ARRAY['employee_turnover_pct', 'training_hours_avg', 'employee_satisfaction'], '1.0'),
('soc_dei', 'Diversity & Inclusion', 'Gender and underrepresented minority representation', 'social', 'Diversity', ARRAY['gender_diversity_pct', 'urm_diversity_pct', 'pay_equity_ratio'], '1.0'),
('soc_health_safety', 'Health & Safety', 'Workplace safety incidents and programs', 'social', 'Health & Safety', ARRAY['trir', 'ltifr', 'safety_training_hours'], '1.0'),
('soc_privacy', 'Data Privacy', 'Customer data protection and privacy incidents', 'social', 'Privacy', ARRAY['data_breaches_count', 'privacy_complaints', 'privacy_training_pct'], '1.0'),
('soc_supply_chain', 'Supply Chain', 'Supplier audits and responsible sourcing', 'social', 'Supply Chain', ARRAY['supplier_audits_count', 'supplier_code_compliance_pct', 'local_suppliers_pct'], '1.0'),

-- Governance
('gov_board', 'Board Composition', 'Board independence, diversity, and tenure', 'governance', 'Board', ARRAY['board_independence_pct', 'board_diversity_pct', 'board_avg_tenure_years'], '1.0'),
('gov_ethics', 'Ethics & Compliance', 'Anti-corruption policies and incidents', 'governance', 'Ethics', ARRAY['ethics_policy_exists', 'corruption_incidents', 'ethics_training_pct'], '1.0'),
('gov_esg_governance', 'ESG Governance', 'ESG committee and oversight structures', 'governance', 'ESG Oversight', ARRAY['esg_committee_exists', 'esg_linked_compensation', 'esg_policy_public'], '1.0')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('esg_templates', 'esg_metrics', 'esg_benchmarks', 'esg_scores',
                     'esg_disclosures', 'esg_sentiment', 'esg_reports');

  IF v_table_count = 7 THEN
    RAISE NOTICE 'ESG Benchmarking Copilot migration completed successfully: 7/7 tables created';
  ELSE
    RAISE EXCEPTION 'Migration incomplete: only % tables created', v_table_count;
  END IF;
END $$;
