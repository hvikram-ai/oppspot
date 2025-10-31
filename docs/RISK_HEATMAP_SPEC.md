# Risk Heatmap with Explainability — Implementation Spec

Objectives
- Compute multi‑axis risk scores for a target (Financial, Legal, Operational, Cyber, ESG, Regulatory).
- Provide drill‑down evidence ("evidence stack"): metrics, signals, clauses, alerts, and citations back to source documents.
- Export board‑ready packs (PDF) and expose APIs for dashboards.
- Integrate with existing modules: `lib/signals`, `lib/alerts`, `lib/research-gpt` (for explainers), Supabase (pg).

Scope (v1)
- Per‑entity risk: for a Company or a Data Room (select one primary context; support both via `entity_type`+`entity_id`).
- Deterministic scoring core (weighted factors) + optional LLM explanations with citations to evidence.
- Evidence sources: documents/chunks, alerts, signals, KPIs, contract clauses, ESG disclosures.

Non‑Goals (v1)
- Real‑time streaming re‑compute for every change (batch/threshold re‑compute is fine).
- External regulator API submissions.

Architecture
- Data sources → Feature extraction (signals, KPIs, clauses) → Factor scoring → Axis aggregation → Overall risk → Explanations.
- Evidence stored and linked for traceability; citations resolve back to document pages/chunks and alerts/signals.
- Threshold crossings trigger `alerts` and activity logs.

Key Modules
- Scoring engine: `lib/signals` (extend or add `risk-scoring-engine.ts`), `lib/analytics` for KPI normalization.
- Explainability: `lib/research-gpt` orchestrates short, grounded explanations from evidence.
- Alerts: `lib/alerts/alert-service.ts` for threshold crossings and status changes.
- API: `app/api/(risks|companies/[id]/risks|data-rooms/[id]/risks)`.
- UI: `components/analytics/risk-heatmap`, drilldown panel, export button; PDF via `@react-pdf/renderer`.

Supabase Schema (proposed)
- Tables
  - `risk_axes`
    - id uuid pk, key text unique not null (financial|legal|operational|cyber|esg|regulatory), title text, description text
  - `risk_models`
    - id uuid pk, name text, version text, active boolean, created_at timestamptz
  - `risk_factors`
    - id uuid pk, model_id uuid fk -> risk_models, axis_key text fk -> risk_axes.key, key text, title text, description text,
      weight numeric check (weight >= 0 and weight <= 1), aggregation text default 'weighted_mean' -- can be extended
  - `risk_inputs`
    - id uuid pk, entity_type text check (entity_type in ('company','data_room')), entity_id uuid,
      source text, key text, value_numeric numeric, value_text text, unit text, collected_at timestamptz, meta jsonb
  - `risk_scores`
    - id uuid pk, entity_type text, entity_id uuid, model_id uuid fk, axis_key text, score numeric check (score between 0 and 100),
      level text check (level in ('low','medium','high','critical')), computed_at timestamptz, details jsonb
  - `risk_evidence`
    - id uuid pk, score_id uuid fk -> risk_scores(id) on delete cascade, evidence_type text check (evidence_type in ('document','alert','signal','kpi','clause','news')),
      source_id uuid, title text, preview text, importance numeric, citation jsonb, url text, page_number int, chunk_index int, created_at timestamptz

- Indexes
  - `risk_scores (entity_type, entity_id, computed_at desc)`
  - `risk_inputs (entity_type, entity_id, key)`

- RLS (pattern)
  - ENABLE RLS on all tables
  - Policies per `entity_type`: join against organization/team membership (companies table org_id; data rooms membership table)

Factor Library (examples)
- Financial: revenue concentration, top‑X exposure, NRR/NRR trend, GM, AR/AP aging anomalies
- Legal: presence of CoC/assignment consents, MFN clauses, indemnity/limits variance vs baseline
- Operational: churn spikes, SLA breaches, backlog aging, supplier dependency
- Cyber: incident history, CVE exposure (tech stack), policy completeness
- ESG: disclosure completeness, sentiment, material topics coverage, emissions data availability
- Regulatory: required filings/approvals likelihood by sector/region, known ongoing investigations

Scoring Model
- Each factor maps inputs → subscore [0..100]; normalized directionality (higher means higher risk) and capped with floors.
- Axis score = weighted mean of factor subscores with optional caps/ceilings and rules (e.g., if any critical factor > 85, axis >= 80).
- Overall score (optional) = weighted mean of axes; for heatmap we display per‑axis.
- Level bands: 0–30 low, 30–60 medium, 60–80 high, 80–100 critical (configurable per model).
- Store `details` JSON with factor breakdown, weights, and normalization metadata.

Evidence Stack
- For each high‑impact factor, attach top 3–5 evidence items:
  - Documents/pages/chunks (link back to `/data-rooms/[roomId]/documents/[docId]?page=X#chunk-Y`)
  - Alerts (`lib/alerts`) and Signals (`lib/signals`) with timestamps
  - KPIs with time windows; short previews and units
- Persist in `risk_evidence` with `importance` and `citation` payloads.

Explainability (LLM)
- Prompt template (short; deterministic style) to generate one‑paragraph explanation per axis:
  - Inputs: factor breakdown (scores + titles), top evidence previews with citations, time windows
  - Grounding rules: use only provided evidence; abstain if insufficient
  - Output JSON: { axis, summary, key_risks: [ {title, reason, citationIds[]} ], mitigation: string }
- Use `lib/research-gpt` for call orchestration; cache summaries in `risk_scores.details.explainer` with model and hash of inputs.

Computation Triggers
- On new/updated: documents indexed, alerts/signals ingested, KPIs refreshed
- Batch job (worker) recomputes for entities with changes in the last N hours
- Threshold crossings create Alerts:
  - `AlertService.trigger({ severity: 'P1'|'P2', category: 'risk', title, message, context: { axis, score, entity } })`

APIs (App Router)
- `GET /api/(companies|data-rooms)/[id]/risks`
  - Query params: `latest=true`, `model=default`, `axes=financial,legal,...`
  - Returns per‑axis score, level, factor breakdown, top evidence, explainer summary
- `POST /api/(companies|data-rooms)/[id]/risks/recompute`
  - Authz: org admin or editor; triggers recompute job
- `GET /api/(companies|data-rooms)/[id]/risks/export`
  - Returns board pack PDF (see Export)

UI/UX
- Heatmap Grid: axes (rows) × severity color scale; score badges and levels (low/med/high/critical)
- Drill‑Down Drawer: factor breakdown with sliders (weights readonly), evidence list with links and previews, explainer summary
- Filters: time window (30/90/365d), model version
- Export: button → generate PDF (board pack) with heatmap, per‑axis pages, evidence and mitigation summary

Export (Board Pack)
- Use `@react-pdf/renderer` to build: cover → heatmap overview → per‑axis sections (score, level, top factors, evidence list with citations, explainer)
- Filename: `risk-pack_{entity}_{yyyy-mm-dd}.pdf`

Performance Targets
- Compute per entity: < 2s for 200 factors total; cached summaries reused
- API read: < 300ms for latest scores with evidence (server‑side pagination for evidence if large)

Testing
- Unit: factor normalization, axis aggregation, banding logic
- Integration: ingest fixtures (alerts/signals/docs), compute scores, verify evidence linking
- E2E: render heatmap; open drill‑down; export PDF contains expected sections

Rollout Plan
- Week 1: Schema + factor library skeleton + read API + basic heatmap UI (static data)
- Week 2: Ingestion wiring to signals/alerts/KPIs; scoring engine; drill‑down; caching
- Week 3: Explainability via `lib/research-gpt`; threshold alerts; PDF export
- Week 4: Performance tuning; RBAC hardening; E2E tests and fixtures

Starter SQL (excerpt)
```sql
create table if not exists public.risk_axes (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title text not null,
  description text
);

create table if not exists public.risk_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version text not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.risk_factors (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.risk_models(id) on delete cascade,
  axis_key text not null,
  key text not null,
  title text not null,
  description text,
  weight numeric not null default 0.1,
  aggregation text not null default 'weighted_mean'
);

create table if not exists public.risk_scores (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('company','data_room')),
  entity_id uuid not null,
  model_id uuid not null references public.risk_models(id) on delete cascade,
  axis_key text not null,
  score numeric not null,
  level text not null,
  computed_at timestamptz not null default now(),
  details jsonb
);

create table if not exists public.risk_evidence (
  id uuid primary key default gen_random_uuid(),
  score_id uuid not null references public.risk_scores(id) on delete cascade,
  evidence_type text not null,
  source_id uuid,
  title text,
  preview text,
  importance numeric default 0.5,
  citation jsonb,
  url text,
  page_number int,
  chunk_index int,
  created_at timestamptz default now()
);
```

Guardrails & Security
- RBAC: only members of the entity’s org/room can read scores/evidence; only editors/admins can recompute/export
- PII: redact PII from explainers unless strictly needed; citations prefer non‑sensitive previews
- Audit: log recompute triggers and exports; store model version and inputs hash in `risk_scores.details`

Open Questions
- Should axis weights be per sector? (Recommend yes — store in `risk_models` config)
- How to incorporate human overrides? (Allow “analyst adjustments” saved in `risk_scores.details.adjustments` with reason)
- How often to recompute? (Nightly batch + on significant new evidence/alerts)

