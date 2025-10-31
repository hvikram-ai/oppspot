# Data Model: M&A Target Prediction Algorithm

**Date**: 2025-10-30
**Status**: Complete
**Purpose**: Define database schema and entity relationships for M&A prediction feature

---

## Database Schema

### 1. `ma_predictions` (Core Prediction Records)

Stores computed M&A predictions for companies.

```sql
CREATE TABLE ma_predictions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Prediction scores
  prediction_score INTEGER NOT NULL CHECK (prediction_score >= 0 AND prediction_score <= 100),
  likelihood_category TEXT NOT NULL CHECK (likelihood_category IN ('Low', 'Medium', 'High', 'Very High')),
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('High', 'Medium', 'Low')),

  -- Versioning
  analysis_version TEXT NOT NULL DEFAULT '1.0',
  algorithm_type TEXT NOT NULL DEFAULT 'hybrid_ai_rule_based',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_last_refreshed TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Performance tracking
  calculation_time_ms INTEGER,

  -- Constraints
  UNIQUE(company_id, is_active) WHERE is_active = TRUE -- Only one active prediction per company
);

-- Indexes
CREATE INDEX idx_ma_predictions_company ON ma_predictions(company_id);
CREATE INDEX idx_ma_predictions_likelihood ON ma_predictions(likelihood_category) WHERE is_active = TRUE;
CREATE INDEX idx_ma_predictions_score ON ma_predictions(prediction_score DESC) WHERE is_active = TRUE;
CREATE INDEX idx_ma_predictions_updated ON ma_predictions(updated_at DESC);

-- RLS Policies
ALTER TABLE ma_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_predictions_select_authenticated"
  ON ma_predictions FOR SELECT
  TO authenticated
  USING (TRUE); -- All authenticated users can view (FR-026)

CREATE POLICY "ma_predictions_insert_service"
  ON ma_predictions FOR INSERT
  TO service_role
  WITH CHECK (TRUE); -- Only service role can create predictions

CREATE POLICY "ma_predictions_update_service"
  ON ma_predictions FOR UPDATE
  TO service_role
  USING (TRUE);
```

---

### 2. `ma_prediction_factors` (Contributing Factors)

Stores the top 5 factors contributing to each prediction.

```sql
CREATE TABLE ma_prediction_factors (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  prediction_id UUID NOT NULL REFERENCES ma_predictions(id) ON DELETE CASCADE,

  -- Factor details
  factor_type TEXT NOT NULL CHECK (factor_type IN ('financial', 'operational', 'market', 'historical')),
  factor_name TEXT NOT NULL, -- e.g., "declining_revenue", "industry_consolidation"
  factor_description TEXT NOT NULL, -- Human-readable explanation
  impact_weight DECIMAL(5,2) NOT NULL CHECK (impact_weight >= 0 AND impact_weight <= 100), -- % contribution
  impact_direction TEXT CHECK (impact_direction IN ('positive', 'negative', 'neutral')),

  -- Supporting data
  supporting_value JSONB, -- Store specific metrics (e.g., {"revenue_decline_pct": -15.3})

  -- Ordering
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 5),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(prediction_id, rank)
);

-- Indexes
CREATE INDEX idx_ma_factors_prediction ON ma_prediction_factors(prediction_id);
CREATE INDEX idx_ma_factors_type ON ma_prediction_factors(factor_type);

-- RLS Policies
ALTER TABLE ma_prediction_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_factors_select_authenticated"
  ON ma_prediction_factors FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "ma_factors_insert_service"
  ON ma_prediction_factors FOR INSERT
  TO service_role
  WITH CHECK (TRUE);
```

---

### 3. `ma_valuation_estimates` (Valuation Ranges)

Stores estimated acquisition price ranges for Medium+ likelihood targets.

```sql
CREATE TABLE ma_valuation_estimates (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  prediction_id UUID NOT NULL REFERENCES ma_predictions(id) ON DELETE CASCADE,

  -- Valuation range
  min_valuation_gbp BIGINT NOT NULL CHECK (min_valuation_gbp > 0),
  max_valuation_gbp BIGINT NOT NULL CHECK (max_valuation_gbp >= min_valuation_gbp),
  currency TEXT NOT NULL DEFAULT 'GBP',

  -- Methodology
  valuation_method TEXT NOT NULL, -- e.g., "revenue_multiple", "ebitda_multiple", "comparable_deals"
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('High', 'Medium', 'Low')),

  -- Assumptions
  key_assumptions JSONB, -- e.g., {"revenue_multiple": 3.5, "industry_avg_multiple": 3.2}

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(prediction_id) -- One valuation per prediction
);

-- Indexes
CREATE INDEX idx_ma_valuations_prediction ON ma_valuation_estimates(prediction_id);

-- RLS Policies
ALTER TABLE ma_valuation_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_valuations_select_authenticated"
  ON ma_valuation_estimates FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "ma_valuations_insert_service"
  ON ma_valuation_estimates FOR INSERT
  TO service_role
  WITH CHECK (TRUE);
```

---

### 4. `ma_acquirer_profiles` (Potential Acquirers)

Stores profiles of potential acquiring companies for High/Very High targets.

```sql
CREATE TABLE ma_acquirer_profiles (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  prediction_id UUID NOT NULL REFERENCES ma_predictions(id) ON DELETE CASCADE,
  potential_acquirer_id UUID REFERENCES businesses(id) ON DELETE SET NULL, -- NULL if generic profile

  -- Acquirer characteristics
  industry_match TEXT NOT NULL, -- e.g., "SIC 62011 - Software Development"
  size_ratio_description TEXT NOT NULL, -- e.g., "5-10x larger by revenue"
  geographic_proximity TEXT NOT NULL, -- e.g., "Same region", "UK-wide", "International"
  strategic_rationale TEXT NOT NULL CHECK (strategic_rationale IN (
    'horizontal_integration',
    'vertical_integration',
    'technology_acquisition',
    'market_expansion',
    'talent_acquisition',
    'other'
  )),
  strategic_rationale_description TEXT NOT NULL, -- Human-readable explanation

  -- Matching scores
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),

  -- Ordering
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 10),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(prediction_id, rank)
);

-- Indexes
CREATE INDEX idx_ma_acquirers_prediction ON ma_acquirer_profiles(prediction_id);
CREATE INDEX idx_ma_acquirers_company ON ma_acquirer_profiles(potential_acquirer_id) WHERE potential_acquirer_id IS NOT NULL;

-- RLS Policies
ALTER TABLE ma_acquirer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_acquirers_select_authenticated"
  ON ma_acquirer_profiles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "ma_acquirers_insert_service"
  ON ma_acquirer_profiles FOR INSERT
  TO service_role
  WITH CHECK (TRUE);
```

---

### 5. `ma_historical_deals` (Historical M&A Transactions)

Reference dataset of past M&A deals for pattern matching.

```sql
CREATE TABLE ma_historical_deals (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Deal parties
  target_company_name TEXT NOT NULL,
  target_company_id UUID REFERENCES businesses(id) ON DELETE SET NULL, -- If in our database
  acquirer_company_name TEXT NOT NULL,
  acquirer_company_id UUID REFERENCES businesses(id) ON DELETE SET NULL,

  -- Deal details
  deal_date DATE NOT NULL,
  deal_value_gbp BIGINT, -- NULL if undisclosed
  deal_type TEXT CHECK (deal_type IN ('acquisition', 'merger', 'asset_purchase', 'other')),

  -- Target characteristics at acquisition
  target_sic_code TEXT,
  target_industry_description TEXT,
  target_employee_count_at_deal INTEGER,
  target_revenue_at_deal_gbp BIGINT,
  target_age_years INTEGER,

  -- Acquirer characteristics
  acquirer_sic_code TEXT,
  acquirer_industry_description TEXT,
  acquirer_size_category TEXT CHECK (acquirer_size_category IN ('SME', 'Mid-Market', 'Enterprise', 'PE_Firm')),

  -- Strategic context
  deal_rationale TEXT CHECK (deal_rationale IN (
    'horizontal_integration',
    'vertical_integration',
    'technology_acquisition',
    'market_expansion',
    'talent_acquisition',
    'distressed_acquisition',
    'other'
  )),
  deal_rationale_notes TEXT,

  -- Data sources
  data_source TEXT NOT NULL, -- e.g., "Companies House", "TechCrunch", "Manual Entry"
  source_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ma_deals_date ON ma_historical_deals(deal_date DESC);
CREATE INDEX idx_ma_deals_target_sic ON ma_historical_deals(target_sic_code);
CREATE INDEX idx_ma_deals_acquirer_sic ON ma_historical_deals(acquirer_sic_code);
CREATE INDEX idx_ma_deals_verified ON ma_historical_deals(verified) WHERE verified = TRUE;

-- RLS Policies
ALTER TABLE ma_historical_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_deals_select_authenticated"
  ON ma_historical_deals FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "ma_deals_insert_admin"
  ON ma_historical_deals FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM profiles WHERE role = 'admin')
  );
```

---

### 6. `ma_prediction_queue` (Real-Time Recalculation Queue)

Queue for companies requiring prediction recalculation.

```sql
CREATE TABLE ma_prediction_queue (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Trigger details
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('data_update', 'manual_request', 'scheduled_batch')),
  trigger_metadata JSONB, -- Store what changed (e.g., {"updated_fields": ["revenue", "employees"]})

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(company_id, status) WHERE status IN ('pending', 'processing') -- Prevent duplicate queued jobs
);

-- Indexes
CREATE INDEX idx_ma_queue_status ON ma_prediction_queue(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_ma_queue_company ON ma_prediction_queue(company_id);

-- RLS Policies
ALTER TABLE ma_prediction_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_queue_select_service"
  ON ma_prediction_queue FOR SELECT
  TO service_role
  USING (TRUE);

CREATE POLICY "ma_queue_insert_service"
  ON ma_prediction_queue FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "ma_queue_update_service"
  ON ma_prediction_queue FOR UPDATE
  TO service_role
  USING (TRUE);
```

---

### 7. `ma_prediction_audit_log` (Compliance Audit Trail)

Immutable audit log of all prediction requests (FR-028).

```sql
CREATE TABLE ma_prediction_audit_log (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request details
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  prediction_id UUID REFERENCES ma_predictions(id) ON DELETE SET NULL,

  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN ('view_prediction', 'export_pdf', 'export_excel', 'export_csv')),
  request_ip TEXT,
  user_agent TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ma_audit_user ON ma_prediction_audit_log(user_id, created_at DESC);
CREATE INDEX idx_ma_audit_company ON ma_prediction_audit_log(company_id, created_at DESC);
CREATE INDEX idx_ma_audit_created ON ma_prediction_audit_log(created_at DESC);

-- RLS Policies (immutable log)
ALTER TABLE ma_prediction_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_audit_insert_service"
  ON ma_prediction_audit_log FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "ma_audit_select_own"
  ON ma_prediction_audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ma_audit_select_admin"
  ON ma_prediction_audit_log FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM profiles WHERE role = 'admin')
  );

-- Prevent updates and deletes
CREATE POLICY "ma_audit_no_update"
  ON ma_prediction_audit_log FOR UPDATE
  TO authenticated
  USING (FALSE);

CREATE POLICY "ma_audit_no_delete"
  ON ma_prediction_audit_log FOR DELETE
  TO authenticated
  USING (FALSE);
```

---

## Entity Relationships

```
businesses (existing)
    ↓
    ├─→ ma_predictions (1:many - historical versions)
    │       ↓
    │       ├─→ ma_prediction_factors (1:5)
    │       ├─→ ma_valuation_estimates (1:1)
    │       └─→ ma_acquirer_profiles (1:many, max 10)
    │
    ├─→ ma_prediction_queue (1:many - recalc requests)
    │
    └─→ ma_prediction_audit_log (1:many - audit trail)

ma_historical_deals (standalone reference data)
    ↓
    ├─→ businesses (target_company_id) [optional FK]
    └─→ businesses (acquirer_company_id) [optional FK]

auth.users (Supabase Auth)
    ↓
    └─→ ma_prediction_audit_log (1:many)
```

---

## TypeScript Type Definitions

```typescript
// lib/types/ma-prediction.ts

export type LikelihoodCategory = 'Low' | 'Medium' | 'High' | 'Very High';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type FactorType = 'financial' | 'operational' | 'market' | 'historical';
export type ImpactDirection = 'positive' | 'negative' | 'neutral';
export type StrategicRationale =
  | 'horizontal_integration'
  | 'vertical_integration'
  | 'technology_acquisition'
  | 'market_expansion'
  | 'talent_acquisition'
  | 'other';

export interface MAPrediction {
  id: string;
  company_id: string;
  prediction_score: number; // 0-100
  likelihood_category: LikelihoodCategory;
  confidence_level: ConfidenceLevel;
  analysis_version: string;
  algorithm_type: string;
  created_at: string;
  updated_at: string;
  data_last_refreshed: string;
  is_active: boolean;
  calculation_time_ms?: number;
}

export interface MAPredictionFactor {
  id: string;
  prediction_id: string;
  factor_type: FactorType;
  factor_name: string;
  factor_description: string;
  impact_weight: number; // 0-100
  impact_direction?: ImpactDirection;
  supporting_value?: Record<string, unknown>;
  rank: number; // 1-5
  created_at: string;
}

export interface MAValuationEstimate {
  id: string;
  prediction_id: string;
  min_valuation_gbp: number;
  max_valuation_gbp: number;
  currency: string;
  valuation_method: string;
  confidence_level: ConfidenceLevel;
  key_assumptions?: Record<string, unknown>;
  created_at: string;
}

export interface MAAcquirerProfile {
  id: string;
  prediction_id: string;
  potential_acquirer_id?: string;
  industry_match: string;
  size_ratio_description: string;
  geographic_proximity: string;
  strategic_rationale: StrategicRationale;
  strategic_rationale_description: string;
  match_score: number; // 0-100
  rank: number; // 1-10
  created_at: string;
}

export interface MAHistoricalDeal {
  id: string;
  target_company_name: string;
  target_company_id?: string;
  acquirer_company_name: string;
  acquirer_company_id?: string;
  deal_date: string;
  deal_value_gbp?: number;
  deal_type?: string;
  target_sic_code?: string;
  target_industry_description?: string;
  deal_rationale?: StrategicRationale;
  deal_rationale_notes?: string;
  data_source: string;
  verified: boolean;
}

// Composite type for full prediction with related data
export interface MAPredictionDetail extends MAPrediction {
  factors: MAPredictionFactor[];
  valuation?: MAValuationEstimate;
  acquirer_profiles: MAAcquirerProfile[];
  company: {
    id: string;
    name: string;
    company_number: string;
    // ...other business fields
  };
}
```

---

## Migration Script

```sql
-- File: supabase/migrations/20251030_ma_predictions.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables in dependency order
-- (Tables 1-7 as defined above)

-- Create trigger for real-time recalculation (research.md #9)
CREATE OR REPLACE FUNCTION trigger_ma_recalculation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if financial fields changed
  IF (OLD.revenue IS DISTINCT FROM NEW.revenue) OR
     (OLD.profitability IS DISTINCT FROM NEW.profitability) OR
     (OLD.employees IS DISTINCT FROM NEW.employees) THEN

    INSERT INTO ma_prediction_queue (company_id, trigger_type, trigger_metadata)
    VALUES (NEW.id, 'data_update', jsonb_build_object(
      'updated_fields', ARRAY[
        CASE WHEN OLD.revenue IS DISTINCT FROM NEW.revenue THEN 'revenue' END,
        CASE WHEN OLD.profitability IS DISTINCT FROM NEW.profitability THEN 'profitability' END,
        CASE WHEN OLD.employees IS DISTINCT FROM NEW.employees THEN 'employees' END
      ]
    ))
    ON CONFLICT (company_id, status) WHERE status IN ('pending', 'processing') DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_update_trigger
AFTER UPDATE ON businesses
FOR EACH ROW
EXECUTE FUNCTION trigger_ma_recalculation();

-- Seed initial historical deals (research.md #6)
-- (Manually curated data to be added in separate seed script)

COMMENT ON TABLE ma_predictions IS 'Core M&A target predictions with scores and categories';
COMMENT ON TABLE ma_prediction_factors IS 'Top 5 contributing factors for each prediction';
COMMENT ON TABLE ma_valuation_estimates IS 'Estimated acquisition price ranges';
COMMENT ON TABLE ma_acquirer_profiles IS 'Potential acquirer company profiles';
COMMENT ON TABLE ma_historical_deals IS 'Reference dataset of past M&A transactions';
COMMENT ON TABLE ma_prediction_queue IS 'Real-time recalculation job queue';
COMMENT ON TABLE ma_prediction_audit_log IS 'Immutable audit trail for compliance';
```

---

**Next Phase**: Generate API contracts (OpenAPI specs) based on this data model.
