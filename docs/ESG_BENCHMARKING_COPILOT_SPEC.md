# ESG Benchmarking Copilot — Implementation Spec

Objectives
- Analyze ESG disclosures across 26+ categories (E, S, G) and compute peer benchmarks by sector/size/region.
- Generate category scores, trends, and sentiment; provide grounded citations to source disclosures.
- Deliver a board‑ready dashboard and exportable PDF report with insights and gaps.
- Integrate with: `lib/benchmarking`, sector datasets, Supabase (pg/pgvector), and `@react-pdf/renderer` for exports.

Scope (v1)
- Company‑scoped ESG analytics; inputs are uploaded ESG/sustainability reports and related policies, plus public data (optional sentiment).
- Benchmarks via curated reference dataset (percentiles by sector/size/region); no live regulator submissions.

Non‑Goals (v1)
- Full GHG verification or third‑party assurance; we summarize disclosures, trends, and peer comparisons with citations.
- Real‑time ingestion from all external feeds; periodic refresh is acceptable.

ESG Categories (26+)
Environmental (E)
- GHG Scope 1, Scope 2, Scope 3
- Energy consumption/intensity, Renewable share
- Water withdrawal/use, Waste generation/recycling
- Pollution/emissions beyond GHG (NOx/SOx/PM), Biodiversity/land use

Social (S)
- Labor practices (turnover, training hours), DEI (gender/URM mix), Health & Safety (TRIR/LTIFR)
- Customer privacy/data protection incidents, Product responsibility/safety
- Supply chain management (audits, modern slavery), Community impact

Governance (G)
- Board composition/independence/tenure, Executive compensation ESG linkage
- Ethics/anti‑corruption, Whistleblowing/compliance incidents
- Shareholder rights, ESG governance (committee, policies), Risk management

Architecture
- Ingestion → Disclosure extraction (structured fields + citations) → Metric normalization → Benchmark comparison → Category scoring → Sentiment/trends → Dashboard/PDF.
- Use pgvector to ground Q&A/extractions where helpful; citations must link to page/chunk in source docs.

Data Model (Supabase)
- Tables
  - `esg_templates` (system template for categories/metrics)
    - id uuid pk, key text unique, title text, description text, version text, active boolean
  - `esg_metrics` (normalized values per company/period/category/metric)
    - id uuid pk, company_id uuid, period_year int, category text, metric_key text, value_numeric numeric, value_text text, unit text, source text, citation jsonb, confidence numeric, created_at timestamptz
  - `esg_benchmarks` (reference percentiles)
    - id uuid pk, sector text, size_band text, region text, metric_key text, p10 numeric, p25 numeric, p50 numeric, p75 numeric, p90 numeric, updated_at timestamptz
  - `esg_scores` (computed category and overall scores)
    - id uuid pk, company_id uuid, period_year int, category text, score numeric, level text check (level in ('lagging','par','leading')), details jsonb, computed_at timestamptz
  - `esg_disclosures` (extracted statements with citations)
    - id uuid pk, company_id uuid, document_id uuid, page_number int, chunk_index int, category text, metric_key text, excerpt text, normalized_value jsonb, confidence numeric, created_at timestamptz
  - `esg_sentiment` (news/PR sentiment summary)
    - id uuid pk, company_id uuid, period_year int, source text, label text check (label in ('positive','neutral','negative')), score numeric, title text, url text, excerpt text, created_at timestamptz
  - `esg_reports` (export runs)
    - id uuid pk, company_id uuid, period_year int, template_version text, started_at timestamptz, finished_at timestamptz, status text check (status in ('queued','running','success','error')), filename text, meta jsonb

- Indexes
  - `esg_metrics (company_id, period_year, category, metric_key)`
  - `esg_scores (company_id, period_year, category)`
  - `esg_benchmarks (sector, size_band, region, metric_key)`

- RLS
  - ENABLE RLS; `esg_*` tables readable to users in the company’s org; write restricted to editors/admins.

Extraction & Normalization
- Reuse `document_chunks` and/or `contract_extractions` where applicable for policy statements.
- For numeric metrics (e.g., tCO2e, kWh, TRIR), parse units and normalize to canonical units.
- For categorical/policy metrics (e.g., ESG governance committee present), produce boolean/enum.
- Persist citations with doc/page/chunk for transparency.

Scoring & Benchmarking
- For each metric, compute percentile vs. benchmarks (sector/size/region match with fallbacks).
- Category score = weighted composite of relevant metrics (weights in `esg_templates` or `esg_scores.details.weights`).
- Leveling: ‘leading’ (>= p75), ‘par’ (p25–p75), ‘lagging’ (< p25), with metric‑specific exceptions.
- Overall ESG score optional in v1; dashboard focuses on category tiles and trends.

Sentiment & Trends
- Optional worker pulls recent public items (news/PR) and classifies sentiment; aggregate by year/quarter.
- Display sparkline and top items; allow disabling in privacy‑sensitive contexts.

APIs (App Router)
- `GET /api/companies/[id]/esg/summary?year=YYYY`
  - Returns category scores, metric highlights, benchmark deltas, sentiment summary.
- `GET /api/companies/[id]/esg/metrics?year=YYYY`
  - Returns normalized metric table with citations and benchmarks.
- `POST /api/companies/[id]/esg/recompute?year=YYYY` (editor/admin)
  - Re-runs extraction → normalization → scoring.
- `GET /api/companies/[id]/esg/report?year=YYYY`
  - Generates/returns board PDF report (see Exports).

Workers
- `esg-extract-worker`: extract disclosures → `esg_disclosures`, map to `esg_metrics`.
- `esg-score-worker`: compute `esg_scores` from metrics and benchmarks.
- `esg-sentiment-worker` (optional): fetch/classify external items → `esg_sentiment`.
- `esg-report-worker`: render PDF using `@react-pdf/renderer` and save to storage.

Dashboard (UI/UX)
- Page: `app/companies/[id]/esg`
- Components
  - Category tiles (E/S/G with subcategory chips) showing score/level and benchmark position.
  - Percentile bars (you vs. peers) per key metric; tooltips with definitions.
  - Trend lines by year for selected metrics.
  - Sentiment card with sparkline and items (if enabled).
  - Evidence panel: click a metric to view citations and excerpts; open in context (doc viewer).
  - Export button to generate PDF.

Exports (Board‑Ready PDF)
- Sections: cover → executive summary → category pages (score, key metrics, benchmark bars) → disclosures with citations → sentiment (optional) → glossary.
- Include assumptions: sector/size mapping, data sources, normalization rules.
- Use `@react-pdf/renderer`; store artifact in object storage; link from `esg_reports`.

Performance Targets
- Recompute for 1 year and 50–100 disclosures in < 5s; PDF generation < 10s.
- API summary read < 300ms (cached `esg_scores` + highlights).

Testing
- Unit: metric parsers/unit normalization; percentile and leveling logic.
- Integration: extraction on fixtures → metrics → benchmarks → scores; verify citations.
- E2E: dashboard rendering, drill into evidence, export PDF and verify sections.

Starter SQL (excerpt)
```sql
create table if not exists public.esg_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text,
  version text,
  active boolean default true
);

create table if not exists public.esg_metrics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  period_year int not null,
  category text not null,
  metric_key text not null,
  value_numeric numeric,
  value_text text,
  unit text,
  source text,
  citation jsonb,
  confidence numeric,
  created_at timestamptz default now()
);

create table if not exists public.esg_benchmarks (
  id uuid primary key default gen_random_uuid(),
  sector text not null,
  size_band text,
  region text,
  metric_key text not null,
  p10 numeric,
  p25 numeric,
  p50 numeric,
  p75 numeric,
  p90 numeric,
  updated_at timestamptz default now()
);

create table if not exists public.esg_scores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  period_year int not null,
  category text not null,
  score numeric not null,
  level text not null check (level in ('lagging','par','leading')),
  details jsonb,
  computed_at timestamptz default now()
);

create table if not exists public.esg_disclosures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  document_id uuid references public.documents(id) on delete set null,
  page_number int,
  chunk_index int,
  category text,
  metric_key text,
  excerpt text,
  normalized_value jsonb,
  confidence numeric,
  created_at timestamptz default now()
);

create table if not exists public.esg_sentiment (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  period_year int not null,
  source text,
  label text check (label in ('positive','neutral','negative')),
  score numeric,
  title text,
  url text,
  excerpt text,
  created_at timestamptz default now()
);

create table if not exists public.esg_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  period_year int not null,
  template_version text,
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text check (status in ('queued','running','success','error')),
  filename text,
  meta jsonb
);
```

Security & Privacy
- RBAC via company org; redact PII in excerpts where unnecessary; signed URLs for PDF assets.
- Assumptions and caveats must be visible in dashboard and report.

Open Questions
- Sector mapping source of truth (our `companies` table vs. external classifier)?
- Do we support TCFD/CSRD tag sets out of the gate (template variants)?
- Should sentiment be opt‑in per tenant due to privacy/compliance concerns?

