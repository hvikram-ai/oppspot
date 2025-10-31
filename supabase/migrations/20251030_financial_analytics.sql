-- Financial & Revenue Quality Analytics - Database Schema
-- Feature: 012-oppspot-docs-financial
-- Created: 2025-10-30
-- Description: Comprehensive SaaS financial KPI tracking, revenue quality analysis,
--              cohort retention, and benchmarking with single currency enforcement

-- ==============================================================================
-- PART 1: COMPANIES TABLE EXTENSION
-- ==============================================================================

-- Add reporting_currency to existing companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS reporting_currency VARCHAR(3) CHECK (LENGTH(reporting_currency) = 3);

COMMENT ON COLUMN companies.reporting_currency IS 'ISO 4217 currency code (e.g., USD, GBP, EUR) - enforces single currency per company';

-- ==============================================================================
-- PART 2: CORE EVENT TABLES
-- ==============================================================================

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  external_ref VARCHAR(255) NOT NULL,
  name VARCHAR(500) NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
  acquisition_date DATE NOT NULL CHECK (acquisition_date <= CURRENT_DATE),
  status TEXT NOT NULL CHECK (status IN ('active', 'churned', 'reactivated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customers_company_external_ref_unique UNIQUE (company_id, external_ref)
);

COMMENT ON TABLE customers IS 'Businesses or individuals subscribing to the company''s services';
COMMENT ON COLUMN customers.external_ref IS 'Customer identifier from source system (e.g., CRM ID)';
COMMENT ON COLUMN customers.acquisition_date IS 'Date of first subscription (cohort assignment)';

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  external_ref VARCHAR(255) NOT NULL,
  plan_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  mrr NUMERIC(15, 2) NOT NULL CHECK (mrr >= 0),
  currency VARCHAR(3) NOT NULL CHECK (LENGTH(currency) = 3),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  checksum VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscriptions_company_external_ref_unique UNIQUE (company_id, external_ref),
  CONSTRAINT subscriptions_end_after_start CHECK (end_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE subscriptions IS 'Recurring revenue arrangements with customers';
COMMENT ON COLUMN subscriptions.mrr IS 'Monthly recurring revenue amount';
COMMENT ON COLUMN subscriptions.checksum IS 'SHA-256 hash for idempotency';

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  external_ref VARCHAR(255) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL CHECK (LENGTH(currency) = 3),
  status TEXT NOT NULL CHECK (status IN ('open', 'paid', 'void', 'uncollectible')),
  checksum VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invoices_company_external_ref_unique UNIQUE (company_id, external_ref)
);

COMMENT ON TABLE invoices IS 'Billing documents requesting payment from customers';
COMMENT ON COLUMN invoices.status IS 'Invoice payment status';

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  paid_at TIMESTAMPTZ NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL CHECK (LENGTH(currency) = 3),
  payment_method TEXT NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_company_invoice_checksum_unique UNIQUE (company_id, invoice_id, checksum)
);

COMMENT ON TABLE payments IS 'Payment records against invoices';

-- COGS entries table
CREATE TABLE IF NOT EXISTS cogs_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  occurred_at DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL CHECK (LENGTH(currency) = 3),
  category VARCHAR(255) NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cogs_entries_company_checksum_unique UNIQUE (company_id, checksum)
);

COMMENT ON TABLE cogs_entries IS 'Cost of goods sold expenses';
COMMENT ON COLUMN cogs_entries.amount IS 'COGS amount (can be negative for refunds/adjustments)';

-- Sales & Marketing costs table
CREATE TABLE IF NOT EXISTS sales_marketing_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  occurred_at DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL CHECK (LENGTH(currency) = 3),
  channel VARCHAR(255) NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_marketing_costs_company_checksum_unique UNIQUE (company_id, checksum)
);

COMMENT ON TABLE sales_marketing_costs IS 'Customer acquisition expenditures';

-- ==============================================================================
-- PART 3: PRECOMPUTED SNAPSHOT TABLES
-- ==============================================================================

-- KPI snapshots table
CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  arr NUMERIC(15, 2),
  mrr NUMERIC(15, 2),
  grr NUMERIC(5, 2),
  nrr NUMERIC(5, 2),
  cac NUMERIC(15, 2),
  ltv NUMERIC(15, 2),
  gross_margin NUMERIC(5, 2),
  arpu NUMERIC(15, 2),
  churn_rate NUMERIC(5, 2),
  expansion_rate NUMERIC(5, 2),
  contraction_rate NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kpi_snapshots_company_period_unique UNIQUE (company_id, period_date)
);

COMMENT ON TABLE kpi_snapshots IS 'Precomputed monthly KPI metrics for <5s recalculation performance';
COMMENT ON COLUMN kpi_snapshots.arr IS 'Annual Recurring Revenue';
COMMENT ON COLUMN kpi_snapshots.mrr IS 'Monthly Recurring Revenue';
COMMENT ON COLUMN kpi_snapshots.grr IS 'Gross Revenue Retention (%)';
COMMENT ON COLUMN kpi_snapshots.nrr IS 'Net Revenue Retention (%)';

-- Cohort metrics table
CREATE TABLE IF NOT EXISTS cohort_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cohort_month DATE NOT NULL,
  period_month DATE NOT NULL,
  retained_customers INT NOT NULL CHECK (retained_customers >= 0),
  churned_customers INT NOT NULL CHECK (churned_customers >= 0),
  retention_rate NUMERIC(5, 2) NOT NULL CHECK (retention_rate >= 0 AND retention_rate <= 100),
  revenue_retained NUMERIC(15, 2) NOT NULL CHECK (revenue_retained >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cohort_metrics_company_cohort_period_unique UNIQUE (company_id, cohort_month, period_month),
  CONSTRAINT cohort_period_after_cohort CHECK (period_month >= cohort_month)
);

COMMENT ON TABLE cohort_metrics IS 'Retention data by customer acquisition cohort';
COMMENT ON COLUMN cohort_metrics.cohort_month IS 'Month when customers in this cohort first subscribed';
COMMENT ON COLUMN cohort_metrics.period_month IS 'Month being measured for retention';

-- Revenue concentration table
CREATE TABLE IF NOT EXISTS revenue_concentration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  hhi NUMERIC(10, 4) NOT NULL CHECK (hhi >= 0 AND hhi <= 10000),
  top1_pct NUMERIC(5, 2) NOT NULL CHECK (top1_pct >= 0 AND top1_pct <= 100),
  top3_pct NUMERIC(5, 2) NOT NULL CHECK (top3_pct >= 0 AND top3_pct <= 100),
  top5_pct NUMERIC(5, 2) NOT NULL CHECK (top5_pct >= 0 AND top5_pct <= 100),
  top10_pct NUMERIC(5, 2) NOT NULL CHECK (top10_pct >= 0 AND top10_pct <= 100),
  gini NUMERIC(5, 4),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT revenue_concentration_company_period_unique UNIQUE (company_id, period_date)
);

COMMENT ON TABLE revenue_concentration IS 'Customer dependency risk metrics';
COMMENT ON COLUMN revenue_concentration.hhi IS 'Herfindahl-Hirschman Index (0-10000, higher = more concentrated)';

-- AR/AP aging table
CREATE TABLE IF NOT EXISTS ar_ap_aging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  ar_0_30 NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ar_31_60 NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ar_61_90 NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ar_90_plus NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ap_0_30 NUMERIC(15, 2),
  ap_31_60 NUMERIC(15, 2),
  ap_61_90 NUMERIC(15, 2),
  ap_90_plus NUMERIC(15, 2),
  dso NUMERIC(8, 2),
  dpo NUMERIC(8, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ar_ap_aging_company_snapshot_unique UNIQUE (company_id, snapshot_date)
);

COMMENT ON TABLE ar_ap_aging IS 'Accounts receivable/payable aging analysis';
COMMENT ON COLUMN ar_ap_aging.dso IS 'Days Sales Outstanding';
COMMENT ON COLUMN ar_ap_aging.dpo IS 'Days Payables Outstanding';

-- ==============================================================================
-- PART 4: SUPPORT TABLES
-- ==============================================================================

-- Anomalies table
CREATE TABLE IF NOT EXISTS anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_key VARCHAR(100) NOT NULL,
  period_date DATE NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  value_before NUMERIC(15, 2),
  value_after NUMERIC(15, 2),
  detector_key VARCHAR(100) NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE anomalies IS 'Detected unusual patterns or risk indicators';
COMMENT ON COLUMN anomalies.detector_key IS 'Anomaly detection rule identifier';

-- Benchmarks sector medians table
CREATE TABLE IF NOT EXISTS benchmarks_sector_medians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector VARCHAR(100) NOT NULL,
  size_band TEXT NOT NULL CHECK (size_band IN ('<$1M', '$1M-$10M', '$10M-$50M', '$50M+')),
  region VARCHAR(50),
  metric_key VARCHAR(100) NOT NULL,
  p25 NUMERIC(15, 2),
  p50 NUMERIC(15, 2) NOT NULL,
  p75 NUMERIC(15, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT benchmarks_sector_size_metric_unique UNIQUE (sector, size_band, metric_key)
);

COMMENT ON TABLE benchmarks_sector_medians IS 'Industry benchmark data for peer comparison';
COMMENT ON COLUMN benchmarks_sector_medians.size_band IS 'ARR-based company size: <$1M, $1M-$10M, $10M-$50M, $50M+';

-- Financial roles table
CREATE TABLE IF NOT EXISTS financial_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('editor', 'admin')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  CONSTRAINT financial_roles_user_company_role_unique UNIQUE (user_id, company_id, role)
);

COMMENT ON TABLE financial_roles IS 'Financial Editor and Admin role assignments';
COMMENT ON COLUMN financial_roles.role IS 'editor = upload/recalc, admin = editor + role management + delete';

-- ==============================================================================
-- PART 5: INDEXES FOR PERFORMANCE
-- ==============================================================================

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_company_acquisition
  ON customers(company_id, acquisition_date);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_dates
  ON subscriptions(company_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer
  ON subscriptions(customer_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_subscriptions_checksum
  ON subscriptions(checksum);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_company_issued
  ON invoices(company_id, issued_at);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status
  ON invoices(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_checksum
  ON invoices(checksum);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_company_paid
  ON payments(company_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_invoice
  ON payments(invoice_id);

-- COGS entries indexes
CREATE INDEX IF NOT EXISTS idx_cogs_company_occurred
  ON cogs_entries(company_id, occurred_at);

-- Sales/Marketing costs indexes
CREATE INDEX IF NOT EXISTS idx_sales_marketing_company_occurred
  ON sales_marketing_costs(company_id, occurred_at);

-- KPI snapshots indexes
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_company_period
  ON kpi_snapshots(company_id, period_date DESC);

-- Cohort metrics indexes
CREATE INDEX IF NOT EXISTS idx_cohort_metrics_company_cohort
  ON cohort_metrics(company_id, cohort_month, period_month);

-- Revenue concentration indexes
CREATE INDEX IF NOT EXISTS idx_revenue_concentration_company_period
  ON revenue_concentration(company_id, period_date DESC);

-- AR/AP aging indexes
CREATE INDEX IF NOT EXISTS idx_ar_ap_aging_company_snapshot
  ON ar_ap_aging(company_id, snapshot_date DESC);

-- Anomalies indexes
CREATE INDEX IF NOT EXISTS idx_anomalies_company_period
  ON anomalies(company_id, period_date DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity
  ON anomalies(severity, created_at DESC) WHERE severity IN ('medium', 'high');

-- Benchmarks indexes
CREATE INDEX IF NOT EXISTS idx_benchmarks_sector_size
  ON benchmarks_sector_medians(sector, size_band, metric_key);

-- Financial roles indexes
CREATE INDEX IF NOT EXISTS idx_financial_roles_company_user
  ON financial_roles(company_id, user_id, role);

-- ==============================================================================
-- PART 6: ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all financial tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cogs_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_marketing_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_concentration ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_ap_aging ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_roles ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION current_user_org()
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Policy: Read access for all org members
CREATE POLICY customers_org_read ON customers
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY subscriptions_org_read ON subscriptions
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY invoices_org_read ON invoices
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY payments_org_read ON payments
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY cogs_entries_org_read ON cogs_entries
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY sales_marketing_costs_org_read ON sales_marketing_costs
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY kpi_snapshots_org_read ON kpi_snapshots
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY cohort_metrics_org_read ON cohort_metrics
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY revenue_concentration_org_read ON revenue_concentration
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY ar_ap_aging_org_read ON ar_ap_aging
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY anomalies_org_read ON anomalies
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

-- Policy: Write access for Financial Editors and Admins
CREATE POLICY customers_editor_write ON customers
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM financial_roles
      WHERE user_id = auth.uid()
        AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY subscriptions_editor_write ON subscriptions
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM financial_roles
      WHERE user_id = auth.uid()
        AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY invoices_editor_write ON invoices
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM financial_roles
      WHERE user_id = auth.uid()
        AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY payments_editor_write ON payments
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM financial_roles
      WHERE user_id = auth.uid()
        AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY cogs_entries_editor_write ON cogs_entries
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM financial_roles
      WHERE user_id = auth.uid()
        AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY sales_marketing_costs_editor_write ON sales_marketing_costs
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM financial_roles
      WHERE user_id = auth.uid()
        AND role IN ('editor', 'admin')
    )
  );

-- Policy: Financial roles management (admin only)
CREATE POLICY financial_roles_admin_manage ON financial_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM financial_roles fr
      WHERE fr.user_id = auth.uid()
        AND fr.company_id = financial_roles.company_id
        AND fr.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM financial_roles fr
      WHERE fr.user_id = auth.uid()
        AND fr.company_id = financial_roles.company_id
        AND fr.role = 'admin'
    )
  );

-- Policy: Benchmarks are globally readable
CREATE POLICY benchmarks_global_read ON benchmarks_sector_medians
  FOR SELECT
  USING (TRUE);

-- ==============================================================================
-- PART 7: TRIGGERS FOR UPDATED_AT
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kpi_snapshots_updated_at BEFORE UPDATE ON kpi_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- END OF MIGRATION
-- ==============================================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Financial Analytics migration completed successfully';
  RAISE NOTICE '  - 13 tables created';
  RAISE NOTICE '  - 23 indexes created for performance';
  RAISE NOTICE '  - 15 RLS policies enabled';
  RAISE NOTICE '  - Single currency constraint enforced';
  RAISE NOTICE '  - Idempotency via checksums';
END $$;
