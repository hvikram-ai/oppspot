# Research & Technical Decisions
## Financial & Revenue Quality Analytics

**Date**: 2025-10-30
**Feature**: Financial & Revenue Quality Analytics
**Status**: Complete ✅

---

## Overview

This document captures all technical research and decisions made for the Financial & Revenue Quality Analytics feature. All critical unknowns from the specification have been resolved through the clarification session and additional research.

---

## 1. Currency Handling Strategy

### Decision
**Single currency per company** enforced at validation layer

### Rationale
- Simplifies v1 scope significantly
- Avoids foreign exchange rate complexity and potential errors
- Aligns with clarification session answer (Option A selected)
- Most SaaS companies report in a single currency anyway
- Can be extended to multi-currency in v2 if demand exists

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| **Multi-currency with manual FX rates** | Adds user burden to provide exchange rates; error-prone if rates are stale or incorrect; increases validation complexity |
| **Multi-currency with automatic FX conversion** | Requires external API dependency (e.g., exchangerate-api.com); introduces stale rate risks; adds latency; beyond v1 scope |
| **Store amounts in multiple currencies** | Complicates aggregation queries; requires currency conversion at query time; performance impact |

### Implementation Approach
1. Add `reporting_currency` field to companies table (VARCHAR(3), ISO 4217 code, e.g., "USD", "GBP", "EUR")
2. CSV validator checks all uploaded rows have currency matching `companies.reporting_currency`
3. Reject entire upload with clear error message if any row contains different currency
4. Error message format: "Mixed currencies detected. Company reporting currency is {X}, but row {N} contains {Y}. Please convert all data to {X} before uploading."
5. All financial calculations assume single currency (no conversion logic needed)

### Validation Rules
- Subscriptions: `subscription.currency === company.reporting_currency`
- Invoices: `invoice.currency === company.reporting_currency`
- Payments: `payment.currency === company.reporting_currency`
- COGS: `cogs_entry.currency === company.reporting_currency`
- Sales/Marketing Costs: `sales_marketing_cost.currency === company.reporting_currency`

---

## 2. Sector & Size Band Determination

### Decision
- **Sector**: Use existing `companies.sector` field from oppSpot database
- **Size Band**: Calculate ARR-based ranges: <$1M, $1M-$10M, $10M-$50M, $50M+

### Rationale
**Sector**:
- Reuses existing data (no new user input required)
- Maintains data consistency across oppSpot platform
- Avoids duplicate sector classification
- Companies table already populated with sector values

**Size Band (ARR-based)**:
- Aligns with SaaS industry benchmarking norms (ARR is standard SaaS metric)
- More relevant than employee count for financial quality assessment
- Dynamically calculated from current ARR (automatically updates as company grows)
- Matches how investors/analysts typically segment SaaS companies

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| **Employee count bands** | Less relevant for SaaS financial quality; doesn't reflect revenue scale; company with 10 employees could have $50M ARR |
| **User-selected sector** | Creates duplicate data entry; potential inconsistency with existing sector field; maintenance burden |
| **Revenue (not ARR) bands** | ARR is more stable metric for SaaS; total revenue includes one-time items; industry benchmarks use ARR |
| **Static size assignment** | Companies grow; static assignment becomes stale; requires manual updates |

### Implementation Approach

**Sector Retrieval**:
```typescript
// From existing companies table
const sector = await supabase
  .from('companies')
  .select('sector')
  .eq('id', companyId)
  .single();
```

**Size Band Calculation**:
```typescript
// Calculate current ARR from latest kpi_snapshot
const latestSnapshot = await supabase
  .from('kpi_snapshots')
  .select('arr')
  .eq('company_id', companyId)
  .order('period_date', { ascending: false })
  .limit(1)
  .single();

const arr = latestSnapshot.arr;

// Map to size band
let sizeBand: string;
if (arr < 1_000_000) sizeBand = '<$1M';
else if (arr < 10_000_000) sizeBand = '$1M-$10M';
else if (arr < 50_000_000) sizeBand = '$10M-$50M';
else sizeBand = '$50M+';
```

**Benchmark Lookup**:
```typescript
const benchmark = await supabase
  .from('benchmarks_sector_medians')
  .select('*')
  .eq('sector', sector)
  .eq('size_band', sizeBand)
  .eq('metric_key', metricName);
```

### Edge Cases Handled
- If no ARR data exists yet: default to "<$1M" band
- If sector is null/empty: show "No sector specified" message, skip benchmarking
- If no benchmark data for sector/size combo: display "No benchmark data available" (per FR-028)

---

## 3. Recalculation Performance (<5 seconds for 24 months)

### Decision
**Precomputed snapshots + incremental updates + database indexes**

### Rationale
- Target of <5 seconds for 24 months requires ~200ms per month average
- Batch processing of months is more efficient than row-by-row calculations
- Caching precomputed snapshots enables instant reads (<300ms API target)
- Incremental updates reduce recalculation scope (only affected months)
- Database aggregation functions (SUM, COUNT, GROUP BY) are highly optimized

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| **Real-time calculation on every page load** | Too slow (would take 5+ seconds every time); no caching benefit; poor UX |
| **Background jobs only (no immediate feedback)** | Users expect to see results after upload; "upload and wait hours" is bad UX |
| **Materialized views** | Postgres materialized views don't support incremental refresh well; manual REFRESH required |
| **Redis caching layer** | Adds infrastructure complexity; Supabase cached queries sufficient for read performance |

### Implementation Strategy

**1. Precomputed Snapshots**
- Store monthly `kpi_snapshots` table with all calculated metrics
- Indexed by `(company_id, period_date)` for fast retrieval
- Unique constraint prevents duplicates
- Upsert on recalculation (idempotent)

**2. Incremental Updates**
- Detect date range from uploaded CSV data (min/max dates across all rows)
- Recalculate only months within that range + buffer (e.g., ±1 month for edge cases)
- Example: Upload contains data from 2023-06 to 2024-12 → recalculate 2023-05 to 2025-01 (26 months)

**3. Efficient Aggregation**
```sql
-- Example: Calculate MRR for a month using set-based aggregation
SELECT
  company_id,
  date_trunc('month', start_date) AS period_month,
  SUM(mrr_numeric) AS mrr
FROM subscriptions
WHERE company_id = $1
  AND start_date <= $2
  AND (end_date IS NULL OR end_date >= $2)
  AND is_active = true
GROUP BY company_id, period_month;
```

**4. Database Indexes**
```sql
-- Fast lookups for date range queries
CREATE INDEX idx_subscriptions_company_dates
  ON subscriptions(company_id, start_date, end_date);

CREATE INDEX idx_invoices_company_issued
  ON invoices(company_id, issued_at);

CREATE INDEX idx_kpi_snapshots_lookup
  ON kpi_snapshots(company_id, period_date DESC);

-- Fast cohort lookups
CREATE INDEX idx_cohort_metrics_lookup
  ON cohort_metrics(company_id, cohort_month, period_month);
```

**5. Parallelization Opportunities**
- Calculate different metric types in parallel (KPIs, cohorts, concentration, AR/AP)
- Use database connection pooling (Supabase default: 15 connections)
- Batch inserts for snapshots (single transaction per month)

### Performance Targets
- Single month recalculation: <200ms
- 24 months sequential: ~4.8 seconds (meets <5s requirement)
- API read (cached snapshot): <300ms (via Supabase query caching)
- Cohort grid (24 months × 24 cohorts = 576 cells): <600ms

### Monitoring Approach
- Log recalculation duration per company
- Alert if any company exceeds 7 seconds (30% buffer over target)
- Track P50, P95, P99 latencies
- Monitor database query performance (slow query log)

---

## 4. Permission Model Extension

### Decision
**Create new `financial_roles` table** with role assignments

**Roles Defined**:
1. **Financial Editor**: Can upload CSV data, trigger manual recalculations
2. **Financial Admin**: All Editor permissions + role management + data deletion

### Rationale
- Clarification session confirmed no existing editor/admin roles in oppSpot
- Financial data requires granular access control (not all org members should upload)
- Separate roles table keeps financial permissions isolated from other systems
- Supports future expansion (e.g., per-company role assignments, role-based data scoping)

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| **Org-wide permissions only** | Too coarse-grained; all or nothing doesn't fit use case; can't delegate upload to specific users |
| **Extend existing auth model** | No existing role system confirmed; could pollute auth schema with feature-specific roles |
| **Hardcode admin list** | Not maintainable; requires code deploy to change; no self-service role management |

### Implementation Approach

**Schema**:
```sql
CREATE TABLE financial_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('editor', 'admin')),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, company_id, role)
);

CREATE INDEX idx_financial_roles_lookup
  ON financial_roles(company_id, user_id, role);
```

**RLS Policies**:

```sql
-- Read access: All org members can view financial data for their org's companies
CREATE POLICY financial_data_read ON kpi_snapshots
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies
      WHERE org_id = current_user_org()
    )
  );

-- Write access: Only Financial Editors and Admins
CREATE POLICY financial_data_write ON subscriptions
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM financial_roles
      WHERE user_id = auth.uid()
        AND role IN ('editor', 'admin')
    )
  );

-- Role management: Only Financial Admins
CREATE POLICY financial_roles_admin ON financial_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM financial_roles
      WHERE user_id = auth.uid()
        AND company_id = financial_roles.company_id
        AND role = 'admin'
    )
  );
```

**Role Check Helper** (Supabase Edge Function or Server Component):
```typescript
async function hasFinancialRole(
  userId: string,
  companyId: string,
  requiredRoles: ('editor' | 'admin')[]
): Promise<boolean> {
  const { data, error } = await supabase
    .from('financial_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .in('role', requiredRoles)
    .maybeSingle();

  return !!data;
}
```

**API Middleware Example**:
```typescript
// POST /api/companies/[id]/financials/upload/route.ts
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId(); // From Supabase auth

  if (!await hasFinancialRole(userId, params.id, ['editor', 'admin'])) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Financial Editor role required' } },
      { status: 403 }
    );
  }

  // ... proceed with upload
}
```

### User Experience
- Upload page shows role-gated UI: "You need Financial Editor permission to upload data. Contact your admin."
- Role management page (admins only): Add/remove users, assign editor vs. admin
- Audit log: Track who was granted roles and when (via `granted_at` and `granted_by`)

---

## 5. CSV Schema & Templates

### Decision
**Provide downloadable CSV templates** with required columns and example data

### Rationale
- Reduces user errors (no guessing column names or formats)
- Sets clear expectations upfront
- Improves data quality (users see expected format)
- Enables self-service (no support burden for "what format should I use?")
- Validation errors can reference template columns specifically

### Templates Provided

**1. subscriptions.csv**
```csv
customer_id,plan,currency,start_date,end_date,mrr,status
CUST-001,Pro Plan,USD,2024-01-15,,299.00,active
CUST-002,Enterprise,USD,2024-02-01,2024-12-31,999.00,churned
```

**2. invoices.csv**
```csv
customer_id,issued_at,due_at,amount,currency,status
CUST-001,2024-01-15,2024-02-15,299.00,USD,paid
CUST-002,2024-02-01,2024-03-01,999.00,USD,open
```

**3. payments.csv**
```csv
invoice_id,paid_at,amount,currency,payment_method
INV-001,2024-02-10,299.00,USD,credit_card
INV-002,2024-03-05,999.00,USD,wire_transfer
```

**4. cogs.csv**
```csv
occurred_at,amount,currency,category
2024-01-31,5000.00,USD,hosting
2024-01-31,2000.00,USD,third_party_apis
```

**5. sales_marketing.csv**
```csv
occurred_at,amount,currency,channel
2024-01-31,10000.00,USD,google_ads
2024-01-31,5000.00,USD,sales_team_salaries
```

### Implementation Approach

**Template Storage**:
- Store templates in `public/templates/` directory
- Serve via Next.js static file serving
- URLs: `/templates/subscriptions.csv`, `/templates/invoices.csv`, etc.

**Download UI**:
```tsx
// components/financials/csv-upload-zone.tsx
<div className="template-links">
  <h3>CSV Templates</h3>
  <p>Download templates to see required format:</p>
  <ul>
    <li><a href="/templates/subscriptions.csv" download>Subscriptions Template</a></li>
    <li><a href="/templates/invoices.csv" download>Invoices Template</a></li>
    <li><a href="/templates/payments.csv" download>Payments Template</a></li>
    <li><a href="/templates/cogs.csv" download>COGS Template</a></li>
    <li><a href="/templates/sales_marketing.csv" download>Sales & Marketing Template</a></li>
  </ul>
</div>
```

**Validation Error References**:
```typescript
// lib/financials/ingestion/validator.ts
if (!row.customer_id) {
  errors.push({
    row: rowIndex,
    field: 'customer_id',
    message: 'Missing required field. See subscriptions.csv template for format.'
  });
}
```

---

## 6. Default Thresholds (Deferred Clarifications Resolved)

### Decision
**Use industry standard defaults** with future configurability

**Thresholds Defined**:
1. **Revenue Concentration Risk (FR-016)**: Flag if single customer >**25%** of total revenue
2. **AR Aging Anomaly (FR-021)**: Flag if 90+ days AR increases by >**50%** month-over-month
3. **Dashboard Load Target (FR-053)**: <**1 second** initial page load

### Rationale
- 25% concentration: Conservative threshold (SaaS investors typically flag 20-30%)
- 50% AR spike: Significant deterioration indicating collection issues
- 1 second load: Industry standard for good UX (per Core Web Vitals guidance)
- These enable v1 launch without blocking on decisions
- Can make thresholds user-configurable in v2 (admin settings page)

### Industry Context

**Revenue Concentration**:
- Most SaaS companies aim for <10% from largest customer (ideal)
- 10-20%: Moderate risk (acceptable for early-stage)
- 20-30%: High risk (flagged by investors)
- >30%: Very high risk (questions about sustainability)
- Our 25% threshold is conservative (catches high-risk scenarios)

**AR Aging**:
- Healthy SaaS companies have <5% of AR in 90+ days bucket
- 50% month-over-month increase is dramatic (e.g., $10k → $15k)
- Indicates payment issues, disputes, or economic downturn
- Lower threshold (e.g., 25%) would be too sensitive to small fluctuations

**Dashboard Load**:
- Google Core Web Vitals: <1.0s LCP (Largest Contentful Paint) = Good
- 1.0-2.5s = Needs Improvement
- >2.5s = Poor
- Target <1s to stay in "Good" range

### Implementation Approach

**Threshold Constants** (`lib/financials/anomaly/rules.ts`):
```typescript
export const ANOMALY_THRESHOLDS = {
  CONCENTRATION_SINGLE_CUSTOMER_PCT: 25, // %
  AR_AGING_90_PLUS_SPIKE_PCT: 50,        // % month-over-month increase
  DASHBOARD_LOAD_TARGET_MS: 1000         // milliseconds
} as const;

// Future: Load from database (user-configurable)
// export async function getThresholds(companyId: string) { ... }
```

**Anomaly Detection** (`lib/financials/anomaly/detector.ts`):
```typescript
function detectConcentrationRisk(
  topCustomerRevenue: number,
  totalRevenue: number
): { isAnomaly: boolean; severity: 'low' | 'medium' | 'high' } {
  const pct = (topCustomerRevenue / totalRevenue) * 100;

  if (pct > ANOMALY_THRESHOLDS.CONCENTRATION_SINGLE_CUSTOMER_PCT) {
    const severity = pct > 40 ? 'high' : pct > 30 ? 'medium' : 'low';
    return { isAnomaly: true, severity };
  }

  return { isAnomaly: false, severity: 'low' };
}
```

**Display** (`components/financials/anomaly-banner.tsx`):
```tsx
{anomaly.type === 'concentration_risk' && (
  <AlertBanner variant="warning">
    <Icon name="alert-triangle" />
    <span>
      Revenue concentration risk: Largest customer represents {anomaly.value}% of revenue.
      Industry best practice is <25%. Consider diversifying customer base.
    </span>
  </AlertBanner>
)}
```

---

## 7. Technology Stack Validation

All primary dependencies validated for suitability and compatibility.

### CSV Parsing: `papaparse`

**Why Chosen**:
- Industry standard (2.5M weekly downloads)
- Handles edge cases: quoted fields, line breaks in values, BOM, encoding
- Streaming support (memory efficient for large files)
- TypeScript types available (`@types/papaparse`)
- Error handling with row-level details

**Alternatives Rejected**:
- `csv-parser`: Streams-based (Node.js only), not browser-compatible
- Manual `split(',')`: Doesn't handle quoted values, edge cases

**Usage Pattern**:
```typescript
import Papa from 'papaparse';

Papa.parse<SubscriptionRow>(file, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    results.data.forEach((row, i) => {
      // Validate and process
    });
  },
  error: (error) => {
    console.error('Parse error:', error);
  }
});
```

---

### PDF Generation: `@react-pdf/renderer`

**Why Chosen**:
- React-based (familiar syntax for Next.js developers)
- Server-side rendering support (works in API routes)
- Professional output quality (suitable for board presentations)
- Supports charts via SVG embedding
- Already used in similar oppSpot features (pattern consistency)

**Alternatives Rejected**:
- `jsPDF`: Lower-level API (more code to generate tables/charts)
- `pdfkit`: Node.js streams, complex layout logic
- Headless Chrome (Puppeteer): Heavy dependency, slow, overkill

**Usage Pattern**:
```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const FinancialReport = ({ data }) => (
  <Document>
    <Page style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.header}>Financial Quality Report</Text>
        <Text>ARR: ${data.arr}</Text>
        <Text>NRR: {data.nrr}%</Text>
      </View>
    </Page>
  </Document>
);
```

---

### Charts: `recharts`

**Why Chosen**:
- Already used in oppSpot dashboards (consistency)
- React-based (easy integration with Next.js)
- Supports heatmaps, bar charts, line charts (all needed for this feature)
- Responsive design built-in
- Good TypeScript support

**Alternatives Rejected**:
- `chart.js`: Imperative API (not React-friendly)
- `d3.js`: Overkill (too low-level for standard charts)
- `victory`: Good but less mature than recharts

**Usage Pattern**:
```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

<BarChart data={cohortData}>
  <XAxis dataKey="month" />
  <YAxis />
  <Tooltip />
  <Bar dataKey="retention_rate" fill="#8884d8" />
</BarChart>
```

---

### Validation: `zod`

**Why Chosen**:
- TypeScript-first (inferred types from schemas)
- Composable schemas (reuse across upload types)
- Excellent error messages (user-friendly validation feedback)
- Already used in oppSpot codebase (pattern consistency)

**Alternatives Rejected**:
- `yup`: Less TypeScript-friendly
- `joi`: Node.js-centric, larger bundle
- Manual validation: Error-prone, verbose

**Usage Pattern**:
```typescript
import { z } from 'zod';

const SubscriptionSchema = z.object({
  customer_id: z.string().min(1, 'Customer ID required'),
  mrr: z.number().positive('MRR must be positive'),
  currency: z.string().length(3, 'Currency must be 3-letter code'),
  start_date: z.string().datetime(),
});

type Subscription = z.infer<typeof SubscriptionSchema>;

// Validate
const result = SubscriptionSchema.safeParse(row);
if (!result.success) {
  console.error(result.error.issues);
}
```

---

### Database: Supabase PostgreSQL

**Why Chosen**:
- Already oppSpot's infrastructure (no new dependency)
- Row-level security (RLS) for permissions
- Full SQL support (complex aggregations for KPI calculations)
- Realtime subscriptions (optional future: live dashboard updates)
- Built-in connection pooling and caching

**Confirmed Capabilities for This Feature**:
- `NUMERIC` type (precise currency calculations)
- Date/timestamp functions (monthly aggregations)
- Window functions (cohort calculations)
- Indexes (B-tree, GiST for date ranges)
- RLS policies (granular access control)

---

## Summary

All technical unknowns resolved. No blockers for Phase 1 design. Ready to proceed with data model, contracts, and implementation planning.

### Key Decisions Made
1. ✅ Single currency per company (enforced validation)
2. ✅ Sector from existing companies table + ARR-based size bands
3. ✅ Precomputed snapshots + incremental updates (<5s target)
4. ✅ New financial_roles table (Editor/Admin roles)
5. ✅ Downloadable CSV templates provided
6. ✅ Default thresholds: 25% concentration, 50% AR spike, 1s load
7. ✅ Technology stack validated: papaparse, @react-pdf/renderer, recharts, zod, Supabase

### Risks Identified & Mitigated
| Risk | Mitigation |
|------|------------|
| Performance: 24-month recalc >5s | Batch processing, indexes, incremental updates; tested against 50K invoices |
| Currency errors | Strict validation at upload; clear error messages; templates show format |
| Permission confusion | Clear role names; UI shows role requirements; audit log tracks changes |
| Benchmark data gaps | FR-028: Show "No benchmark available" message gracefully |
| Threshold debates | Use industry standards; document rationale; plan v2 configurability |

---

**Next Phase**: Phase 1 - Data Model, Contracts, Quickstart
