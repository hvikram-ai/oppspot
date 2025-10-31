# Financial & Revenue Quality Suite — Implementation Spec

Objectives
- Normalize and compute core SaaS/recurring KPIs: ARR, MRR, NRR/GRR, CAC, LTV, Gross Margin (GM).
- Analyze revenue durability: cohort churn/retention, revenue concentration, AR/AP aging anomalies.
- Provide peer benchmarking vs. sector/size medians and exportable, board‑ready charts.
- Integrate with: `lib/benchmarking`, analytics components, background workers, Supabase (pg + RLS).

Scope (v1)
- Company‑scoped analytics (single company view); optional aggregation to data room if needed.
- Ingestion from CSVs/ERP exports (invoices, payments, subscriptions, COGS, S&M costs); minimal connectors first.
- Deterministic KPI math with transparent formulas and assumptions; explainers shown inline.

Non‑Goals (v1)
- Full ETL for all ERP/CRMs; we start with CSV schema + manual upload.
- GAAP compliance reports (we focus on operating KPIs/quality of revenue).

Architecture
- Ingestion (CSV/JSON) → Standardized fact tables → KPI calculators → Snapshots → Charts/Exports.
- Workers compute daily/weekly snapshots and anomaly flags; API serves summaries and series.

Data Model (Supabase)
- Core dimension tables
  - `companies` (existing): id, org_id, sector, employees, region, etc.
  - `customers`: id, company_id, external_ref, name, created_at, meta jsonb.
- Events/facts
  - `subscriptions`: id, company_id, customer_id, plan, currency, start_date, end_date NULL, mrr_numeric, is_active, meta jsonb.
  - `invoices`: id, company_id, customer_id, issued_at, due_at, currency, amount, status ('open','paid','void','uncollectible'), meta jsonb.
  - `payments`: id, company_id, customer_id, invoice_id, paid_at, currency, amount, method, meta jsonb.
  - `cogs_entries`: id, company_id, occurred_at, amount, currency, category, meta jsonb.
  - `sales_marketing_costs`: id, company_id, occurred_at, amount, currency, channel, meta jsonb.
- Derived snapshots
  - `kpi_snapshots`: id, company_id, period_date (month), arr, mrr, grr, nrr, cac, ltv, gm, arpu, churn_rate, expansion_rate, contraction_rate, gross_margins, meta jsonb.
  - `cohort_metrics`: id, company_id, cohort_month, period_month, retained_customers, churned_customers, retention_rate, revenue_retained, notes.
  - `revenue_concentration`: id, company_id, period_date, hhi, top1_pct, top3_pct, top5_pct, top10_pct, gini, notes.
  - `ar_ap_aging`: id, company_id, snapshot_date, ar_0_30, ar_31_60, ar_61_90, ar_90_plus, ap_0_30, ap_31_60, ap_61_90, ap_90_plus, dso, dpo.
  - `anomalies`: id, company_id, metric_key, period_date, severity ('low','medium','high'), message, value_before, value_after, detector_key, meta jsonb.
- Benchmarks
  - `benchmarks_sector_medians`: sector, size_band, region, metric_key, p25, p50, p75, updated_at.

RLS
- ENABLE RLS on all new tables.
- Policy: allow SELECT where `company_id in (select id from companies where org_id = current_user_org())`.
- Only editors/admins can INSERT/UPDATE/DELETE; enforce via org roles.

KPI Definitions (transparent, reproducible)
- MRR: sum of active subscriptions’ normalized monthly amount; ARR = 12 × MRR.
- GRR: (Start MRR − Churn MRR) / Start MRR.
- NRR: (Start MRR + Expansion − Contraction − Churn) / Start MRR.
- CAC: (S&M costs over period) / (new customers acquired in period). Show variant: blended vs. paid only.
- LTV: (ARPU × GM%) / Monthly Churn Rate. Provide guardrails for low churn (cap LTV).
- GM: (Revenue − COGS) / Revenue; compute monthly with smoothing options.
- ARPU: MRR / active customers.

Cohort & Churn
- Cohort by customer acquisition month (first subscription start).
- Retention curve: retained_customers / cohort_size per month.
- Churn rate: logo churn (customers) and revenue churn (MRR) both tracked.
- Store `cohort_metrics` grid for heatmap rendering.

Revenue Concentration
- HHI (Herfindahl‑Hirschman Index): sum of squared revenue shares by customer in period.
- Top‑N concentration: share of revenue from top 1/3/5/10 customers.
- Optional Gini coefficient for inequality of revenue distribution.

AR/AP Aging & Anomalies
- Compute AR buckets from invoices by `issued_at` and `status`; AP via costs if available.
- DSO/DPO: Days Sales/Payables Outstanding using average receivables/payables.
- Anomaly detectors: sudden spike in >60d AR, rising DSO trend, payment reversals.

Peer Benchmarking
- Map `companies.sector` and `employees/size_band`.
- For each metric (ARR growth, NRR, GM, CAC, LTV:CAC), fetch sector medians (p50) and quartiles.
- Produce deltas and traffic‑light assessments; include percentiles if available.
- Cache in `kpi_snapshots.meta.benchmarks` for quick reads.

Workers & Pipelines
- `workers/ingestion`: parse CSVs (subscriptions, invoices, payments, costs) → upsert tables (idempotent via external_ref/checksum).
- `workers/kpi-calculator`: monthly recompute per company; write `kpi_snapshots` and `cohort_metrics`.
- `workers/concentration-detector`: compute HHI/top‑N; write `revenue_concentration` and `anomalies`.
- `workers/ar-ap-aging`: compute aging buckets, DSO/DPO; write `ar_ap_aging` and anomalies.
- `workers/benchmarks-refresh`: load/update `benchmarks_sector_medians` from static/curated dataset.

APIs (App Router)
- `GET /api/companies/[id]/financials/summary?period=YYYY-MM&window=12m`
  - Returns KPI snapshot, trend series for key metrics, and benchmark deltas.
- `GET /api/companies/[id]/financials/cohorts?window=24m`
  - Returns `cohort_metrics` grid.
- `GET /api/companies/[id]/financials/concentration?period=YYYY-MM`
  - Returns HHI, top‑N, customer list with shares (paginated).
- `GET /api/companies/[id]/financials/ar-ap?date=YYYY-MM-DD`
  - Returns aging buckets and DSO/DPO.
- `POST /api/companies/[id]/financials/recompute` (editor/admin)
  - Triggers recompute pipeline for the last N months.
- `GET /api/companies/[id]/financials/export`
  - Returns PDF with charts and commentary (see Exports).

UI/UX
- Page: `app/companies/[id]/analytics` or `app/analytics/financials?company=...`
- Sections
  - KPI Overview: ARR/MRR/NRR/GRR, GM, CAC, LTV, LTV:CAC.
  - NRR Waterfall: Start → Expansion → Contraction → Churn → End.
  - Cohort Heatmap: retention by month.
  - Concentration: top‑N bars + HHI/Gini indicator.
  - AR/AP Aging: buckets table + trend of DSO/DPO.
  - Benchmarks: cards with traffic‑light deltas vs. sector medians.
- Components: `components/analytics/*` (bar/line/heatmap). Export button (PDF) and CSV download for tables.

Exports (Board‑Ready)
- Use `@react-pdf/renderer` to export: executive summary → KPI overview → NRR waterfall → cohorts → concentration → aging → benchmark placement.
- Filename: `fin-quality_{company}_{yyyy-mm}.pdf`.

Performance Targets
- Recompute KPIs for 24 months and 50k invoices in < 5s (worker).
- API summary read < 300ms (cached snapshots), cohort grid < 600ms.

Testing
- Unit: KPI formulas (edge cases), cohort calculations, HHI/percentiles, aging bucket logic.
- Integration: ingest fixtures, recompute, validate snapshots; compare against known examples.
- E2E: render dashboard, export PDF, check benchmark delta badges.

Starter SQL (excerpt)
```sql
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  external_ref text,
  name text not null,
  created_at timestamptz default now(),
  meta jsonb
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  plan text,
  currency text,
  start_date date not null,
  end_date date,
  mrr_numeric numeric,
  is_active boolean default true,
  meta jsonb
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  issued_at timestamptz not null,
  due_at timestamptz,
  currency text,
  amount numeric not null,
  status text check (status in ('open','paid','void','uncollectible')),
  meta jsonb
);

create table if not exists public.kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  period_date date not null,
  arr numeric,
  mrr numeric,
  grr numeric,
  nrr numeric,
  cac numeric,
  ltv numeric,
  gm numeric,
  arpu numeric,
  churn_rate numeric,
  expansion_rate numeric,
  contraction_rate numeric,
  gross_margins numeric,
  meta jsonb,
  unique (company_id, period_date)
);

create table if not exists public.cohort_metrics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  cohort_month date not null,
  period_month date not null,
  retained_customers int,
  churned_customers int,
  retention_rate numeric,
  revenue_retained numeric,
  notes text,
  unique (company_id, cohort_month, period_month)
);

create table if not exists public.revenue_concentration (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  period_date date not null,
  hhi numeric,
  top1_pct numeric,
  top3_pct numeric,
  top5_pct numeric,
  top10_pct numeric,
  gini numeric,
  notes text,
  unique (company_id, period_date)
);

create table if not exists public.ar_ap_aging (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  snapshot_date date not null,
  ar_0_30 numeric,
  ar_31_60 numeric,
  ar_61_90 numeric,
  ar_90_plus numeric,
  ap_0_30 numeric,
  ap_31_60 numeric,
  ap_61_90 numeric,
  ap_90_plus numeric,
  dso numeric,
  dpo numeric,
  unique (company_id, snapshot_date)
);
```

Implementation Notes
- Currency handling: normalize to company reporting currency using FX rates (optional v1: assume single currency).
- Time zones: store timestamps as `timestamptz` and compute by company’s default timezone.
- Idempotency: compute snapshots per period; recompute overwrites the same row (unique constraints).
- Benchmarks: seed initial dataset; allow manual overrides in admin.

