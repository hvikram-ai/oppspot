# Data Model: Financial & Revenue Quality Analytics

**Feature**: Financial & Revenue Quality Analytics
**Version**: 1.0
**Last Updated**: 2025-10-30

---

## Overview

This data model supports SaaS financial KPI tracking, revenue quality analysis, cohort retention, and benchmarking. All entities enforce single currency per company with ARR-based size bands for peer comparison.

**Key Design Principles**:
- Single currency per company (enforced at validation layer)
- Numeric types for currency (no floating point)
- Idempotent ingestion via external_ref + checksum
- Row-level security (RLS) for organization data isolation
- Precomputed snapshots for <5s recalculation performance
- Indexed for fast date range queries and aggregations

---

## Entity Relationship Diagram (ERD)

```
companies (existing)
    |
    +-- reporting_currency (VARCHAR(3), ISO 4217)
    |
    +--[1:N]-- financial_roles
    |             |-- user_id (FK -> auth.users)
    |             |-- role (editor | admin)
    |
    +--[1:N]-- customers
    |             |
    |             +--[1:N]-- subscriptions
    |             |             |
    |             |             +--[used by]-- kpi_snapshots
    |             |             +--[used by]-- cohort_metrics
    |             |
    |             +--[1:N]-- invoices
    |                         |
    |                         +--[1:N]-- payments
    |                         +--[used by]-- ar_ap_aging
    |
    +--[1:N]-- cogs_entries
    |             |
    |             +--[used by]-- kpi_snapshots (gross_margin calc)
    |
    +--[1:N]-- sales_marketing_costs
    |             |
    |             +--[used by]-- kpi_snapshots (CAC calc)
    |
    +--[1:N]-- kpi_snapshots
    |             |
    |             +--[used by]-- anomalies
    |             +--[compared to]-- benchmarks_sector_medians
    |
    +--[1:N]-- cohort_metrics
    |
    +--[1:N]-- revenue_concentration
    |
    +--[1:N]-- ar_ap_aging
    |
    +--[1:N]-- anomalies

benchmarks_sector_medians (global reference data)
    |-- sector (matches companies.sector)
    |-- size_band (<$1M | $1M-$10M | $10M-$50M | $50M+)
```

---

## Entity Definitions

### 1. customers

Businesses or individuals subscribing to the company's services.

**Table Name**: `customers`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique customer record identifier |
| `company_id` | UUID | NOT NULL, FK -> companies(id) ON DELETE CASCADE | Company being analyzed |
| `external_ref` | VARCHAR(255) | NOT NULL | Customer identifier from source system (e.g., CRM ID) |
| `name` | VARCHAR(500) | NOT NULL | Customer display name |
| `acquisition_date` | DATE | NOT NULL | Date of first subscription (cohort assignment) |
| `status` | TEXT | NOT NULL, CHECK IN ('active', 'churned', 'reactivated') | Current customer state |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record last updated timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_customers_company_external_ref
  ON customers(company_id, external_ref);

CREATE INDEX idx_customers_company_acquisition
  ON customers(company_id, acquisition_date);
```

**RLS Policy**:
```sql
-- Users can only access customers for companies in their organization
CREATE POLICY customers_org_access ON customers
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );
```

**Validation Rules**:
- `external_ref` must be unique within company_id
- `acquisition_date` cannot be in the future
- `name` cannot be empty string

---

### 2. subscriptions

Recurring revenue arrangements with customers.

**Table Name**: `subscriptions`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique subscription record identifier |
| `company_id` | UUID | NOT NULL, FK -> companies(id) ON DELETE CASCADE | Company being analyzed |
| `customer_id` | UUID | NOT NULL, FK -> customers(id) ON DELETE CASCADE | Customer holding subscription |
| `external_ref` | VARCHAR(255) | NOT NULL | Subscription ID from source system |
| `plan_name` | VARCHAR(255) | NOT NULL | Subscription plan/tier name |
| `start_date` | DATE | NOT NULL | Subscription start date |
| `end_date` | DATE | NULL | Subscription end date (NULL = active) |
| `mrr` | NUMERIC(15, 2) | NOT NULL, CHECK (mrr >= 0) | Monthly recurring revenue amount |
| `currency` | VARCHAR(3) | NOT NULL | ISO 4217 currency code (must match company.reporting_currency) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active subscription flag |
| `checksum` | VARCHAR(64) | NOT NULL | SHA-256 hash of row data (idempotency) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record last updated timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_subscriptions_company_external_ref
  ON subscriptions(company_id, external_ref);

CREATE INDEX idx_subscriptions_company_dates
  ON subscriptions(company_id, start_date, end_date);

CREATE INDEX idx_subscriptions_customer
  ON subscriptions(customer_id);

CREATE INDEX idx_subscriptions_checksum
  ON subscriptions(company_id, checksum);
```

**RLS Policy**:
```sql
-- Read: Org members can view
CREATE POLICY subscriptions_read ON subscriptions
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

-- Write: Financial Editors/Admins only
CREATE POLICY subscriptions_write ON subscriptions
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM financial_roles
      WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
    )
  );
```

**Validation Rules**:
- `currency` must match `companies.reporting_currency`
- `end_date` must be >= `start_date` if not NULL
- `mrr` must be positive
- `checksum` prevents duplicate imports (external_ref + checksum uniqueness)

**Checksum Calculation**:
```typescript
import crypto from 'crypto';

function calculateChecksum(row: SubscriptionRow): string {
  const data = `${row.external_ref}|${row.start_date}|${row.end_date}|${row.mrr}|${row.currency}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}
```

---

### 3. invoices

Billing documents for customer payment requests.

**Table Name**: `invoices`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique invoice record identifier |
| `company_id` | UUID | NOT NULL, FK -> companies(id) ON DELETE CASCADE | Company being analyzed |
| `customer_id` | UUID | NOT NULL, FK -> customers(id) ON DELETE CASCADE | Customer billed |
| `external_ref` | VARCHAR(255) | NOT NULL | Invoice number from source system |
| `issued_at` | DATE | NOT NULL | Invoice issue date |
| `due_at` | DATE | NOT NULL | Payment due date |
| `amount` | NUMERIC(15, 2) | NOT NULL, CHECK (amount > 0) | Invoice total amount |
| `currency` | VARCHAR(3) | NOT NULL | ISO 4217 currency code |
| `status` | TEXT | NOT NULL, CHECK IN ('open', 'paid', 'void', 'uncollectible') | Invoice payment status |
| `checksum` | VARCHAR(64) | NOT NULL | SHA-256 hash for idempotency |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record last updated timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_invoices_company_external_ref
  ON invoices(company_id, external_ref);

CREATE INDEX idx_invoices_company_issued
  ON invoices(company_id, issued_at);

CREATE INDEX idx_invoices_customer
  ON invoices(customer_id);

CREATE INDEX idx_invoices_status
  ON invoices(company_id, status, due_at);
```

**RLS Policy**:
```sql
CREATE POLICY invoices_org_access ON invoices
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY invoices_write ON invoices
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM financial_roles
      WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
    )
  );
```

**Validation Rules**:
- `currency` must match `companies.reporting_currency`
- `due_at` must be >= `issued_at`
- `amount` must be positive
- Cannot transition from 'paid' to 'open' (invalid state change)

---

### 4. payments

Recorded payments received against invoices.

**Table Name**: `payments`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique payment record identifier |
| `company_id` | UUID | NOT NULL, FK -> companies(id) ON DELETE CASCADE | Company being analyzed |
| `invoice_id` | UUID | NOT NULL, FK -> invoices(id) ON DELETE CASCADE | Invoice paid |
| `external_ref` | VARCHAR(255) | NOT NULL | Payment reference from source system |
| `paid_at` | DATE | NOT NULL | Payment received date |
| `amount` | NUMERIC(15, 2) | NOT NULL, CHECK (amount > 0) | Payment amount |
| `currency` | VARCHAR(3) | NOT NULL | ISO 4217 currency code |
| `payment_method` | TEXT | NULL | Payment method (credit_card, wire_transfer, ach, check, etc.) |
| `checksum` | VARCHAR(64) | NOT NULL | SHA-256 hash for idempotency |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_payments_company_external_ref
  ON payments(company_id, external_ref);

CREATE INDEX idx_payments_invoice
  ON payments(invoice_id);

CREATE INDEX idx_payments_company_date
  ON payments(company_id, paid_at);
```

**RLS Policy**:
```sql
CREATE POLICY payments_org_access ON payments
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY payments_write ON payments
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM financial_roles
      WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
    )
  );
```

**Validation Rules**:
- `currency` must match `companies.reporting_currency`
- `amount` cannot exceed invoice.amount (validated at application layer)
- `paid_at` should be >= invoice.issued_at (warning if before)

---

### 5. cogs_entries

Cost of goods sold expenses incurred in delivering service.

**Table Name**: `cogs_entries`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique COGS entry identifier |
| `company_id` | UUID | NOT NULL, FK -> companies(id) ON DELETE CASCADE | Company being analyzed |
| `external_ref` | VARCHAR(255) | NOT NULL | COGS entry reference from source system |
| `occurred_at` | DATE | NOT NULL | Date expense incurred |
| `amount` | NUMERIC(15, 2) | NOT NULL, CHECK (amount > 0) | Expense amount |
| `currency` | VARCHAR(3) | NOT NULL | ISO 4217 currency code |
| `category` | TEXT | NULL | Expense category (hosting, apis, licenses, etc.) |
| `checksum` | VARCHAR(64) | NOT NULL | SHA-256 hash for idempotency |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_cogs_company_external_ref
  ON cogs_entries(company_id, external_ref);

CREATE INDEX idx_cogs_company_date
  ON cogs_entries(company_id, occurred_at);
```

**RLS Policy**:
```sql
CREATE POLICY cogs_org_access ON cogs_entries
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY cogs_write ON cogs_entries
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM financial_roles
      WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
    )
  );
```

**Validation Rules**:
- `currency` must match `companies.reporting_currency`
- `amount` must be positive
- `occurred_at` cannot be in the future

---

### 6. sales_marketing_costs

Customer acquisition costs (CAC) for sales and marketing activities.

**Table Name**: `sales_marketing_costs`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique cost entry identifier |
| `company_id` | UUID | NOT NULL, FK -> companies(id) ON DELETE CASCADE | Company being analyzed |
| `external_ref` | VARCHAR(255) | NOT NULL | Cost entry reference from source system |
| `occurred_at` | DATE | NOT NULL | Date expense incurred |
| `amount` | NUMERIC(15, 2) | NOT NULL, CHECK (amount > 0) | Expense amount |
| `currency` | VARCHAR(3) | NOT NULL | ISO 4217 currency code |
| `channel` | TEXT | NULL | Marketing channel (google_ads, sales_salaries, events, etc.) |
| `checksum` | VARCHAR(64) | NOT NULL | SHA-256 hash for idempotency |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_sales_marketing_company_external_ref
  ON sales_marketing_costs(company_id, external_ref);

CREATE INDEX idx_sales_marketing_company_date
  ON sales_marketing_costs(company_id, occurred_at);
```

**RLS Policy**:
```sql
CREATE POLICY sales_marketing_org_access ON sales_marketing_costs
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY sales_marketing_write ON sales_marketing_costs
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM financial_roles
      WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
    )
  );
```

**Validation Rules**:
- `currency` must match `companies.reporting_currency`
- `amount` must be positive
- `occurred_at` cannot be in the future

---

### 7. kpi_snapshots

Precomputed monthly financial metrics for a company.

**Table Name**: `kpi_snapshots`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique snapshot identifier |
| `company_id` | UUID | NOT NULL, FK -> companies(id) ON DELETE CASCADE | Company being analyzed |
| `period_date` | DATE | NOT NULL | Last day of month (e.g., 2024-01-31) |
| `arr` | NUMERIC(15, 2) | NOT NULL, CHECK (arr >= 0) | Annual Recurring Revenue |
| `mrr` | NUMERIC(15, 2) | NOT NULL, CHECK (mrr >= 0) | Monthly Recurring Revenue |
| `grr` | NUMERIC(5, 2) | NULL, CHECK (grr >= 0 AND grr <= 100) | Gross Revenue Retention (%) |
| `nrr` | NUMERIC(5, 2) | NULL, CHECK (nrr >= 0 AND nrr <= 200) | Net Revenue Retention (%) |
| `cac` | NUMERIC(15, 2) | NULL, CHECK (cac >= 0) | Customer Acquisition Cost |
| `ltv` | NUMERIC(15, 2) | NULL, CHECK (ltv >= 0) | Customer Lifetime Value |
| `gross_margin` | NUMERIC(5, 2) | NULL, CHECK (gross_margin >= -100 AND gross_margin <= 100) | Gross Margin (%) |
| `arpu` | NUMERIC(15, 2) | NULL, CHECK (arpu >= 0) | Average Revenue Per User |
| `churn_rate` | NUMERIC(5, 2) | NULL, CHECK (churn_rate >= 0 AND churn_rate <= 100) | Logo Churn Rate (%) |
| `expansion_rate` | NUMERIC(5, 2) | NULL, CHECK (expansion_rate >= 0) | Expansion MRR Rate (%) |
| `contraction_rate` | NUMERIC(5, 2) | NULL, CHECK (contraction_rate >= 0 AND contraction_rate <= 100) | Contraction MRR Rate (%) |
| `new_customers` | INTEGER | NULL, CHECK (new_customers >= 0) | New customers acquired in period |
| `churned_customers` | INTEGER | NULL, CHECK (churned_customers >= 0) | Customers churned in period |
| `total_customers` | INTEGER | NULL, CHECK (total_customers >= 0) | Active customers at period end |
| `calculated_at` | TIMESTAMPTZ | DEFAULT NOW() | Timestamp of calculation |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_kpi_snapshots_company_period
  ON kpi_snapshots(company_id, period_date DESC);

CREATE INDEX idx_kpi_snapshots_calculated
  ON kpi_snapshots(company_id, calculated_at);
```

**RLS Policy**:
```sql
CREATE POLICY kpi_snapshots_org_access ON kpi_snapshots
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );
```

**Validation Rules**:
- `period_date` must be last day of month
- NRR can exceed 100% (expansion > churn)
- Gross margin can be negative (indicates loss)
- NULL values indicate insufficient data to calculate metric

**Calculation Notes**:
```
ARR = MRR × 12
GRR = (Starting MRR - Churn MRR) / Starting MRR × 100
NRR = (Starting MRR - Churn MRR + Expansion MRR - Contraction MRR) / Starting MRR × 100
CAC = Total Sales & Marketing Costs / New Customers Acquired
LTV = ARPU / Churn Rate × Gross Margin
```

---

### 8. cohort_metrics

Customer retention data by acquisition cohort over time.

**Table Name**: `cohort_metrics`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique cohort metric identifier |
| `company_id` | UUID | NOT NULL, FK -> companies(id) ON DELETE CASCADE | Company being analyzed |
| `cohort_month` | DATE | NOT NULL | First day of cohort month (e.g., 2024-01-01) |
| `period_month` | DATE | NOT NULL | First day of analysis month (e.g., 2024-06-01) |
| `months_since_acquisition` | INTEGER | NOT NULL, CHECK (months_since_acquisition >= 0) | Months elapsed since cohort_month |
| `retained_customers` | INTEGER | NOT NULL, CHECK (retained_customers >= 0) | Customers still active from cohort |
| `churned_customers` | INTEGER | NOT NULL, CHECK (churned_customers >= 0) | Customers churned from cohort |
| `retention_rate` | NUMERIC(5, 2) | NOT NULL, CHECK (retention_rate >= 0 AND retention_rate <= 100) | Logo retention (%) |
| `revenue_retained` | NUMERIC(15, 2) | NOT NULL, CHECK (revenue_retained >= 0) | MRR retained from cohort |
| `revenue_retention_rate` | NUMERIC(5, 2) | NOT NULL, CHECK (revenue_retention_rate >= 0 AND revenue_retention_rate <= 200) | Revenue retention (%) can exceed 100% with expansion |
| `calculated_at` | TIMESTAMPTZ | DEFAULT NOW() | Timestamp of calculation |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_cohort_metrics_company_cohort_period
  ON cohort_metrics(company_id, cohort_month, period_month);

CREATE INDEX idx_cohort_metrics_company_cohort
  ON cohort_metrics(company_id, cohort_month);
```

**RLS Policy**:
```sql
CREATE POLICY cohort_metrics_org_access ON cohort_metrics
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );
```

**Validation Rules**:
- `period_month` must be >= `cohort_month`
- `months_since_acquisition` = MONTHS_BETWEEN(period_month, cohort_month)
- `retained_customers + churned_customers` = initial cohort size

**Calculation Example**:
```
Cohort: January 2024 (100 customers, $50,000 MRR)
Period: July 2024 (6 months later)
Retained: 85 customers, $55,000 MRR (expansion from upgrades)

retention_rate = 85 / 100 × 100 = 85%
revenue_retention_rate = 55,000 / 50,000 × 100 = 110%
```

---

### 9. revenue_concentration

Customer dependency risk metrics at a point in time.

**Table Name**: `revenue_concentration`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique concentration record identifier |
| `company_id` | UUID | NOT NULL, FK -> companies(id) ON DELETE CASCADE | Company being analyzed |
| `period_date` | DATE | NOT NULL | Last day of month (e.g., 2024-01-31) |
| `total_mrr` | NUMERIC(15, 2) | NOT NULL, CHECK (total_mrr >= 0) | Total MRR for period |
| `top_1_customer_mrr` | NUMERIC(15, 2) | NOT NULL, CHECK (top_1_customer_mrr >= 0) | Largest customer MRR |
| `top_1_customer_pct` | NUMERIC(5, 2) | NOT NULL, CHECK (top_1_customer_pct >= 0 AND top_1_customer_pct <= 100) | % of total from top customer |
| `top_3_customers_pct` | NUMERIC(5, 2) | NOT NULL, CHECK (top_3_customers_pct >= 0 AND top_3_customers_pct <= 100) | % of total from top 3 |
| `top_5_customers_pct` | NUMERIC(5, 2) | NOT NULL, CHECK (top_5_customers_pct >= 0 AND top_5_customers_pct <= 100) | % of total from top 5 |
| `top_10_customers_pct` | NUMERIC(5, 2) | NOT NULL, CHECK (top_10_customers_pct >= 0 AND top_10_customers_pct <= 100) | % of total from top 10 |
| `concentration_index` | NUMERIC(8, 2) | NOT NULL, CHECK (concentration_index >= 0 AND concentration_index <= 10000) | Herfindahl-Hirschman Index (HHI) |
| `risk_flag` | BOOLEAN | NOT NULL, DEFAULT false | True if top customer >25% of revenue |
| `calculated_at` | TIMESTAMPTZ | DEFAULT NOW() | Timestamp of calculation |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_revenue_concentration_company_period
  ON revenue_concentration(company_id, period_date DESC);

CREATE INDEX idx_revenue_concentration_risk
  ON revenue_concentration(company_id, risk_flag) WHERE risk_flag = true;
```

**RLS Policy**:
```sql
CREATE POLICY revenue_concentration_org_access ON revenue_concentration
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );
```

**Validation Rules**:
- `risk_flag` set to TRUE if `top_1_customer_pct` > 25% (FR-016)
- HHI calculation: Σ(customer_mrr / total_mrr)² × 10,000
- HHI interpretation: <1500 = low concentration, 1500-2500 = moderate, >2500 = high

**HHI Calculation Example**:
```
Company with 5 customers:
Customer A: $50k (50%)
Customer B: $30k (30%)
Customer C: $10k (10%)
Customer D: $5k (5%)
Customer E: $5k (5%)

HHI = (50² + 30² + 10² + 5² + 5²) × 1 = 3550 (high concentration)
risk_flag = true (top customer >25%)
```

---

### 10. ar_ap_aging

Accounts receivable/payable aging snapshot for collection efficiency.

**Table Name**: `ar_ap_aging`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique aging record identifier |
| `company_id` | UUID | NOT NULL, FK -> companies(id) ON DELETE CASCADE | Company being analyzed |
| `snapshot_date` | DATE | NOT NULL | Date of aging analysis |
| `ar_0_30_days` | NUMERIC(15, 2) | NOT NULL, CHECK (ar_0_30_days >= 0) | AR outstanding 0-30 days |
| `ar_31_60_days` | NUMERIC(15, 2) | NOT NULL, CHECK (ar_31_60_days >= 0) | AR outstanding 31-60 days |
| `ar_61_90_days` | NUMERIC(15, 2) | NOT NULL, CHECK (ar_61_90_days >= 0) | AR outstanding 61-90 days |
| `ar_90_plus_days` | NUMERIC(15, 2) | NOT NULL, CHECK (ar_90_plus_days >= 0) | AR outstanding 90+ days |
| `total_ar` | NUMERIC(15, 2) | NOT NULL, CHECK (total_ar >= 0) | Total accounts receivable |
| `dso` | NUMERIC(8, 2) | NULL, CHECK (dso >= 0) | Days Sales Outstanding |
| `ap_0_30_days` | NUMERIC(15, 2) | NULL, CHECK (ap_0_30_days >= 0) | AP outstanding 0-30 days |
| `ap_31_60_days` | NUMERIC(15, 2) | NULL, CHECK (ap_31_60_days >= 0) | AP outstanding 31-60 days |
| `ap_61_90_days` | NUMERIC(15, 2) | NULL, CHECK (ap_61_90_days >= 0) | AP outstanding 61-90 days |
| `ap_90_plus_days` | NUMERIC(15, 2) | NULL, CHECK (ap_90_plus_days >= 0) | AP outstanding 90+ days |
| `total_ap` | NUMERIC(15, 2) | NULL, CHECK (total_ap >= 0) | Total accounts payable |
| `dpo` | NUMERIC(8, 2) | NULL, CHECK (dpo >= 0) | Days Payables Outstanding |
| `calculated_at` | TIMESTAMPTZ | DEFAULT NOW() | Timestamp of calculation |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_ar_ap_aging_company_snapshot
  ON ar_ap_aging(company_id, snapshot_date DESC);
```

**RLS Policy**:
```sql
CREATE POLICY ar_ap_aging_org_access ON ar_ap_aging
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );
```

**Validation Rules**:
- `total_ar` = sum of all AR buckets
- `total_ap` = sum of all AP buckets (if provided)
- AP fields are optional (NULL if no payable data uploaded)

**DSO Calculation**:
```
DSO = (Total AR / Revenue Last 90 Days) × 90
```

**DPO Calculation**:
```
DPO = (Total AP / COGS Last 90 Days) × 90
```

---

### 11. anomalies

Detected unusual patterns or risk indicators in financial metrics.

**Table Name**: `anomalies`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique anomaly identifier |
| `company_id` | UUID | NOT NULL, FK -> companies(id) ON DELETE CASCADE | Company being analyzed |
| `detected_at` | TIMESTAMPTZ | DEFAULT NOW() | Timestamp anomaly was detected |
| `period_date` | DATE | NOT NULL | Period where anomaly occurred |
| `anomaly_type` | TEXT | NOT NULL, CHECK IN ('concentration_risk', 'ar_aging_spike', 'churn_spike', 'nrr_drop', 'margin_decline') | Type of anomaly |
| `severity` | TEXT | NOT NULL, CHECK IN ('low', 'medium', 'high') | Anomaly severity level |
| `metric_name` | VARCHAR(100) | NOT NULL | Affected metric (e.g., 'top_1_customer_pct', 'ar_90_plus_days') |
| `previous_value` | NUMERIC(15, 2) | NULL | Metric value before anomaly |
| `current_value` | NUMERIC(15, 2) | NOT NULL | Metric value at anomaly |
| `threshold_value` | NUMERIC(15, 2) | NOT NULL | Threshold that triggered flag |
| `description` | TEXT | NOT NULL | Human-readable anomaly explanation |
| `is_acknowledged` | BOOLEAN | DEFAULT false | User has seen and acknowledged |
| `acknowledged_by` | UUID | NULL, FK -> auth.users(id) | User who acknowledged |
| `acknowledged_at` | TIMESTAMPTZ | NULL | Acknowledgment timestamp |

**Indexes**:
```sql
CREATE INDEX idx_anomalies_company_period
  ON anomalies(company_id, period_date DESC);

CREATE INDEX idx_anomalies_unacknowledged
  ON anomalies(company_id, is_acknowledged) WHERE is_acknowledged = false;

CREATE INDEX idx_anomalies_severity
  ON anomalies(company_id, severity, detected_at DESC);
```

**RLS Policy**:
```sql
CREATE POLICY anomalies_org_access ON anomalies
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

CREATE POLICY anomalies_acknowledge ON anomalies
  FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  )
  WITH CHECK (
    acknowledged_by = auth.uid()
  );
```

**Validation Rules**:
- `acknowledged_at` must be NULL if `is_acknowledged` is false
- `acknowledged_by` must be NULL if `is_acknowledged` is false
- `current_value` must exceed `threshold_value` to trigger

**Anomaly Detection Rules** (from research.md):

| Anomaly Type | Threshold | Severity Assignment |
|--------------|-----------|---------------------|
| `concentration_risk` | Top customer >25% revenue | Low: 25-30%, Medium: 30-40%, High: >40% |
| `ar_aging_spike` | 90+ days AR increases >50% MoM | Medium: 50-100%, High: >100% |
| `churn_spike` | Churn rate >2× previous period | Medium: 2-3×, High: >3× |
| `nrr_drop` | NRR drops >10% MoM | Medium: 10-20%, High: >20% |
| `margin_decline` | Gross margin drops >15% MoM | Medium: 15-25%, High: >25% |

---

### 12. benchmarks_sector_medians

Industry benchmark data for peer comparison (global reference table).

**Table Name**: `benchmarks_sector_medians`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique benchmark record identifier |
| `sector` | VARCHAR(255) | NOT NULL | Industry sector (matches companies.sector) |
| `size_band` | TEXT | NOT NULL, CHECK IN ('<$1M', '$1M-$10M', '$10M-$50M', '$50M+') | ARR-based company size band |
| `metric_key` | VARCHAR(100) | NOT NULL | Metric name (e.g., 'nrr', 'gross_margin', 'cac', 'ltv_cac_ratio', 'arr_growth') |
| `p25_value` | NUMERIC(15, 2) | NOT NULL | 25th percentile value |
| `p50_value` | NUMERIC(15, 2) | NOT NULL | 50th percentile (median) |
| `p75_value` | NUMERIC(15, 2) | NOT NULL | 75th percentile value |
| `sample_size` | INTEGER | NOT NULL, CHECK (sample_size > 0) | Number of companies in benchmark |
| `data_source` | TEXT | NOT NULL | Source of benchmark data (e.g., 'OpenView Benchmarks 2024') |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_benchmarks_sector_size_metric
  ON benchmarks_sector_medians(sector, size_band, metric_key);

CREATE INDEX idx_benchmarks_sector
  ON benchmarks_sector_medians(sector);
```

**RLS Policy**:
```sql
-- Public read access (benchmarks are global reference data)
CREATE POLICY benchmarks_public_read ON benchmarks_sector_medians
  FOR SELECT
  USING (true);

-- Only admins can insert/update benchmarks
CREATE POLICY benchmarks_admin_write ON benchmarks_sector_medians
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM financial_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

**Validation Rules**:
- `p25_value` < `p50_value` < `p75_value` (percentile ordering)
- `sample_size` minimum of 10 companies for statistical significance
- `sector` must match valid sector values from companies table

**Example Benchmark Data**:
```
Sector: Software/SaaS
Size Band: $1M-$10M
Metric: nrr
p25: 95%
p50: 108%
p75: 120%
Sample Size: 247
Data Source: OpenView SaaS Benchmarks 2024
```

---

### 13. financial_roles

User permission assignments for financial data management.

**Table Name**: `financial_roles`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique role assignment identifier |
| `user_id` | UUID | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE | User granted role |
| `company_id` | UUID | NOT NULL, FK -> companies(id) ON DELETE CASCADE | Company role applies to |
| `role` | TEXT | NOT NULL, CHECK IN ('editor', 'admin') | Role type |
| `granted_at` | TIMESTAMPTZ | DEFAULT NOW() | Role grant timestamp |
| `granted_by` | UUID | NULL, FK -> auth.users(id) | User who granted role (NULL for initial setup) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_financial_roles_user_company_role
  ON financial_roles(user_id, company_id, role);

CREATE INDEX idx_financial_roles_lookup
  ON financial_roles(company_id, user_id, role);
```

**RLS Policy**:
```sql
-- Users can see roles for companies in their org
CREATE POLICY financial_roles_read ON financial_roles
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE org_id = current_user_org()
    )
  );

-- Only admins can grant/revoke roles
CREATE POLICY financial_roles_admin ON financial_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM financial_roles fr
      WHERE fr.user_id = auth.uid()
        AND fr.company_id = financial_roles.company_id
        AND fr.role = 'admin'
    )
  );
```

**Validation Rules**:
- User can have at most one role per company (enforced by unique constraint)
- Admin role grants all Editor permissions (superset)
- Cannot revoke own admin role if last admin (validated at application layer)

**Role Permissions Matrix**:

| Action | Viewer (Default) | Editor | Admin |
|--------|------------------|--------|-------|
| View metrics/reports | ✓ | ✓ | ✓ |
| Export PDF/CSV | ✓ | ✓ | ✓ |
| Upload CSV data | ✗ | ✓ | ✓ |
| Trigger recalculation | ✗ | ✓ | ✓ |
| Delete uploaded data | ✗ | ✗ | ✓ |
| Grant/revoke roles | ✗ | ✗ | ✓ |

---

## Extension: companies Table Modification

The existing `companies` table requires one new field to support single-currency enforcement.

### Schema Addition

```sql
-- Add reporting_currency to existing companies table
ALTER TABLE companies
  ADD COLUMN reporting_currency VARCHAR(3) DEFAULT 'USD' CHECK (LENGTH(reporting_currency) = 3);

-- Add index for currency lookups
CREATE INDEX idx_companies_reporting_currency
  ON companies(reporting_currency);

-- Add comment
COMMENT ON COLUMN companies.reporting_currency IS 'ISO 4217 currency code for all financial data (enforced at upload)';
```

**Migration Notes**:
- Existing companies default to 'USD' (can be updated later)
- All CSV uploads validated against this field
- Currency codes: USD, GBP, EUR, CAD, AUD, etc. (ISO 4217 standard)

---

## Performance Considerations

### Query Optimization Strategies

**1. Aggregation Queries**:
```sql
-- Efficient monthly MRR calculation using indexes
EXPLAIN ANALYZE
SELECT
  date_trunc('month', start_date) AS month,
  SUM(mrr) AS total_mrr
FROM subscriptions
WHERE company_id = $1
  AND start_date <= $2
  AND (end_date IS NULL OR end_date >= $2)
GROUP BY month;

-- Expected: Index Scan on idx_subscriptions_company_dates
-- Target: <100ms for 10k subscriptions
```

**2. Cohort Grid Retrieval**:
```sql
-- Fetch 24 months × 24 cohorts (576 cells) in single query
SELECT
  cohort_month,
  period_month,
  retention_rate,
  revenue_retention_rate
FROM cohort_metrics
WHERE company_id = $1
  AND cohort_month >= $2
  AND period_month >= $2
ORDER BY cohort_month, period_month;

-- Expected: Index Scan on idx_cohort_metrics_company_cohort
-- Target: <300ms
```

**3. Benchmark Lookup**:
```sql
-- Single index lookup for sector/size/metric combination
SELECT p25_value, p50_value, p75_value
FROM benchmarks_sector_medians
WHERE sector = $1
  AND size_band = $2
  AND metric_key = $3;

-- Expected: Unique Index Scan on idx_benchmarks_sector_size_metric
-- Target: <10ms
```

### Indexing Strategy Summary

Total indexes created: **23 indexes** across 13 tables

**Most Critical for Performance**:
1. `idx_subscriptions_company_dates` - Date range queries for MRR/ARR
2. `idx_kpi_snapshots_company_period` - Fast snapshot retrieval
3. `idx_cohort_metrics_company_cohort` - Cohort grid queries
4. `idx_benchmarks_sector_size_metric` - Instant benchmark lookups

### Caching Strategy

**Supabase Query Caching**:
- Enabled by default for identical queries
- Cache TTL: 60 seconds (configurable)
- Effective for dashboard reads (kpi_snapshots, cohort_metrics)

**Application-Level Caching**:
- React Query for client-side caching (5 minutes stale time)
- Revalidate on data upload or manual recalculation

---

## Data Volume Estimates

### Expected Row Counts (per company, 24 months)

| Table | Rows/Month | 24 Months | Notes |
|-------|------------|-----------|-------|
| customers | 50 | 1,200 | New customers per month |
| subscriptions | 100 | 2,400 | Multiple subscriptions per customer |
| invoices | 100 | 2,400 | Monthly billing |
| payments | 100 | 2,400 | One payment per invoice (typically) |
| cogs_entries | 10 | 240 | Monthly aggregated COGS |
| sales_marketing_costs | 20 | 480 | Weekly expense entries |
| kpi_snapshots | 1 | 24 | One per month |
| cohort_metrics | 24 | 576 | 24 cohorts × 24 periods (triangular) |
| revenue_concentration | 1 | 24 | One per month |
| ar_ap_aging | 1 | 24 | One per month |
| anomalies | 2 | 48 | Occasional anomalies |

**Total**: ~10,000 rows per company for 24 months (excluding benchmark data)

**Database Size**: ~5MB per company (24 months) assuming typical text/numeric data

---

## Idempotency & Data Integrity

### Checksum-Based Deduplication

All source data tables (subscriptions, invoices, payments, cogs_entries, sales_marketing_costs) use SHA-256 checksums to prevent duplicate imports.

**Implementation Pattern**:
```typescript
// Calculate checksum from key fields
const checksum = crypto
  .createHash('sha256')
  .update(`${row.external_ref}|${row.date}|${row.amount}|${row.currency}`)
  .digest('hex');

// Upsert with checksum
await supabase
  .from('subscriptions')
  .upsert({
    company_id,
    external_ref: row.external_ref,
    // ... other fields
    checksum
  }, {
    onConflict: 'company_id,checksum'
  });
```

### Recalculation Idempotency

All computed tables (kpi_snapshots, cohort_metrics, revenue_concentration, ar_ap_aging) use UPSERT operations with unique constraints on (company_id, period_date).

**Effect**: Recalculating the same period multiple times produces identical results without duplicates.

---

## GDPR & Data Retention

### Data Deletion Cascade

All tables use `ON DELETE CASCADE` for company_id foreign keys:
- Deleting a company removes all associated financial data
- Deleting a customer removes subscriptions and invoices

### Audit Trail

`granted_by` and `granted_at` fields in `financial_roles` table provide audit trail for permission changes.

### Data Export

Users can export all financial data via:
- CSV export (raw data tables)
- PDF export (formatted reports)

Supports GDPR data portability requirements (FR-022).

---

## Summary

This data model supports:
- ✅ Single currency enforcement per company
- ✅ Precomputed snapshots for <5s recalculation
- ✅ Idempotent data ingestion (checksum-based)
- ✅ Row-level security for organization data isolation
- ✅ ARR-based size bands for dynamic benchmarking
- ✅ Granular permission model (Editor/Admin roles)
- ✅ Performance targets: <300ms reads, <5s recalculations
- ✅ Anomaly detection with configurable thresholds

**Total Tables**: 13 (11 new + 1 extended + 1 existing reference)
**Total Indexes**: 23
**RLS Policies**: 15

Ready for Phase 2: Contract definitions and implementation planning.
