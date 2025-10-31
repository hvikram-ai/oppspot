# Structured Smart Summaries — Implementation Spec

Objectives
- Extract structured key points from contracts and corporate documents and present them in a consistent schema.
- Export to multiple formats: JSON (API/automation), Excel (.xlsx) for tabular review, and Word (.docx) for narrative packs.
- Track coverage and confidence per field; enforce quality gates before export.
- Integrate with existing ingestion and clause extraction pipelines.

Scope (v1)
- Document-level summaries for: Master Service Agreements, Order Forms, NDAs, Policies, and high-level Corporate Profile docs.
- Field-level structure for contracts (e.g., parties, effective/term, auto-renewal, termination, fees/billing, SLA, liability cap, MFN, assignment, governing law, notices) and corporate docs (e.g., company overview, products, leadership, locations, certifications, ESG highlights).
- Quality gates: required fields coverage threshold, minimum average confidence.

Non-Goals (v1)
- Full legal drafting or redlining; this is extraction + normalization + export.
- OCR for image-only PDFs (can land in v2).

Dependencies & Fit
- Ingestion, chunking, and pgvector from Dataroom Q&A pipeline: `public.documents`, `public.document_chunks`.
- Contract field extractors from Studio: `contract_extractions` as inputs where available.
- Libraries: `pdf-parse` (text), `xlsx` (Excel), `docx` (Word) or `docxtemplater`, JSON export via API. Optional `@react-pdf/renderer` for PDF as a later extension.

Architecture
- Document → Retrieve prior structured extractions (if any) + semantic retrieval for missing fields → Field-wise normalization → Quality evaluation → Persist summary → Exports.
- Deterministic first (use `contract_extractions`), then fill gaps via LLM extractors with strict schemas and citations.

Data Model (Supabase)
- Tables
  - `summary_templates`
    - id uuid pk, org_id uuid NULL (NULL = system template), key text unique within org, title text, description text,
      doc_type text, version text, active boolean, created_at timestamptz
  - `summary_fields`
    - id uuid pk, template_id uuid fk -> summary_templates(id) on delete cascade,
      key text, title text, description text, field_type text check (field_type in ('string','number','boolean','date','enum','richtext','json')),
      required boolean default false, source_hint text, normalizer jsonb, order_index int, unique (template_id, key)
  - `summary_runs`
    - id uuid pk, document_id uuid fk -> documents(id) on delete cascade, template_id uuid, status text check (status in ('queued','running','success','partial','error')),
      started_at timestamptz, finished_at timestamptz, coverage numeric, avg_confidence numeric, quality_pass boolean, details jsonb
  - `document_summaries`
    - id uuid pk, run_id uuid fk -> summary_runs(id) on delete cascade, document_id uuid, template_id uuid, created_at timestamptz,
      coverage numeric, avg_confidence numeric, quality_pass boolean
  - `summary_field_values`
    - id uuid pk, summary_id uuid fk -> document_summaries(id) on delete cascade, field_id uuid fk -> summary_fields(id),
      value_json jsonb, confidence numeric, evidence jsonb, page_number int, chunk_index int, start_char int, end_char int
  - `summary_quality_issues`
    - id uuid pk, run_id uuid fk -> summary_runs(id) on delete cascade, field_key text, issue text, severity text check (severity in ('low','medium','high')),
      context jsonb

- Indexes
  - `summary_runs (document_id, started_at desc)`
  - `document_summaries (document_id, template_id)`
  - `summary_field_values (summary_id, field_id)`

- RLS
  - ENABLE RLS across new tables; visibility through `documents.data_room_id` membership and org scoping for templates.

Extraction Strategy
- Step 1 (Reuse): Pull values from `contract_extractions` by mapping summary field keys to field_ids (when applicable).
- Step 2 (Fill Gaps): For missing required fields, run LLM extraction on top‑K retrieved chunks with a strict JSON schema per field.
- Step 3 (Normalization): Apply field normalizers (currency detection/standardization, durations, booleans, enums, dates).
- Step 4 (Confidence): Combine source confidence (from extractor) with retrieval score; compute per-field confidence and average.
- Step 5 (Quality): Compute coverage = fields with valid values / required fields; check coverage and avg_confidence against thresholds.

Quality Gates
- Gate A: coverage >= required_coverage (e.g., 0.85 for required fields).
- Gate B: avg_confidence >= min_confidence (e.g., 0.75).
- Gate C: no high-severity quality issues (e.g., conflicting evidence, invalid normalized values).
- Persist flags in `summary_quality_issues` with remediation hints.

Templates
- System templates for common contract and corporate doc types.
- Tenant-custom templates (optional v1): allow orgs to add/remove fields and define enums; stored with org_id.

APIs (App Router)
- `POST /api/data-rooms/[roomId]/documents/[docId]/summary/run`
  - body: { templateKey?: string, force?: boolean }
  - returns: { runId }
- `GET /api/data-rooms/[roomId]/documents/[docId]/summary`
  - returns latest `document_summaries` + `summary_field_values` + `summary_quality_issues` and template metadata
- `GET /api/data-rooms/[roomId]/documents/[docId]/summary/export?format=xlsx|docx|json`
  - returns export file/JSON
- `GET /api/org/summary-templates`
  - list templates (system + tenant)

Workers
- `summary-runner`: orchestrates Steps 1–5; writes runs, summaries, values, issues; emits notifications if gate fails.

Exports
- JSON: canonical `document_summaries` + `summary_field_values` dump.
- Excel (.xlsx): one sheet per summary or columns per field; include confidence and coverage; use `xlsx` npm.
- Word (.docx): narrative using a docx template; populate fields and a coverage/confidence table; use `docx`/`docxtemplater`.

UI/UX
- In `app/data-rooms/[id]/documents/[docId]`, add a “Summary” tab showing:
  - Coverage and average confidence badges; gate status (pass/fail) with reasons.
  - Field grid: label, value, confidence, evidence chips (click → open in context page/chunk highlight).
  - Actions: Re-run, Export (JSON/XLSX/DOCX), Choose Template.

Performance Targets
- Typical 30–50 page contract: < 5s summary run when reusing prior extractions; < 10s when filling gaps via LLM.

Testing
- Unit: normalizers (currency, durations), coverage/confidence math, schema validation for values.
- Integration: map from `contract_extractions` to summaries; gap-fill on synthetic fixtures; exports formatting.
- E2E: run summary on fixture, verify gate behavior, download Excel/Word, validate values and confidence columns.

Starter SQL (excerpt)
```sql
create table if not exists public.summary_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  key text not null,
  title text not null,
  description text,
  doc_type text,
  version text,
  active boolean default true,
  created_at timestamptz default now(),
  unique (org_id, key)
);

create table if not exists public.summary_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.summary_templates(id) on delete cascade,
  key text not null,
  title text not null,
  description text,
  field_type text not null check (field_type in ('string','number','boolean','date','enum','richtext','json')),
  required boolean default false,
  source_hint text,
  normalizer jsonb,
  order_index int,
  unique (template_id, key)
);

create table if not exists public.summary_runs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  template_id uuid not null references public.summary_templates(id) on delete cascade,
  status text not null check (status in ('queued','running','success','partial','error')),
  started_at timestamptz default now(),
  finished_at timestamptz,
  coverage numeric,
  avg_confidence numeric,
  quality_pass boolean,
  details jsonb
);

create table if not exists public.document_summaries (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.summary_runs(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  template_id uuid not null references public.summary_templates(id) on delete cascade,
  created_at timestamptz default now(),
  coverage numeric,
  avg_confidence numeric,
  quality_pass boolean
);

create table if not exists public.summary_field_values (
  id uuid primary key default gen_random_uuid(),
  summary_id uuid not null references public.document_summaries(id) on delete cascade,
  field_id uuid not null references public.summary_fields(id) on delete cascade,
  value_json jsonb,
  confidence numeric,
  evidence jsonb,
  page_number int,
  chunk_index int,
  start_char int,
  end_char int
);

create table if not exists public.summary_quality_issues (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.summary_runs(id) on delete cascade,
  field_key text,
  issue text,
  severity text not null check (severity in ('low','medium','high')),
  context jsonb
);
```

Security & Privacy
- RBAC: document membership via data room; template org ownership; system templates read-only for tenants.
- PII: redact sensitive tokens in LLM prompts when not necessary; limit evidence previews length.

Open Questions
- Template editing for tenants in v1 or v2?
- Required fields vs. soft-required with warnings; per-template thresholds configurable?
- Reconciliation workflow (approve/override values) before export—include as optional v1.1.

