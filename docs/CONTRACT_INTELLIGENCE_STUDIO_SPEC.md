# Contract Intelligence Studio (Trainable Smart Fields) — Implementation Spec

Objectives
- Extract and normalize key legal clauses and parameters from contracts: CoC (change of control), assignment, MFN, termination, auto‑renewal, SLAs, liability caps.
- Allow users to quickly train custom smart fields per tenant with a small number of labeled examples.
- Provide evaluation (precision/recall/F1), versioning, and drift tracking; strict no‑train default with tenant‑level opt‑in.
- Integrate with: pgvector (Supabase), `document_chunks` (from Data Room Q&A), `lib/pdf`, `lib/ai/rag`, `lib/research-gpt`, workers, and UI under `data-rooms/[id]/contracts`.

Scope (v1)
- Supported inputs: PDF/DOCX converted to text with page mapping. Start with PDFs via `pdf-parse`.
- Prebuilt library of smart fields (listed above) with rule+embedding hybrid extractors.
- Per‑tenant custom fields with minimal training (few‑shot + regex seeds), evaluated against tenant‑labeled data.

Non‑Goals (v1)
- Automated redlines or legal advice. We focus on extraction and normalization with evidence.
- Neural fine‑tuning on private data (use prompt/embedding approaches first). Optional later: LoRA with strict isolation.

Architecture
- Ingestion → Page text → Chunking (with page + offsets) → Hybrid extraction per field (rules + semantic retrieval + LLM extraction) → Normalization → Evidence links → Storage.
- Training loop for custom fields: label chunks/spans → store annotations → compile regex/keyword seeds + few‑shot prompts → evaluate → version and publish.

Key Modules (fit to repo)
- Extractors: `lib/pdf` (text), `lib/ai/rag` (semantic retrieval), new `lib/contracts/extractors/*` (rule+LLM), `lib/contracts/normalizers.ts`.
- Studio services: `lib/contracts/studio-service.ts` (CRUD fields/versions, run extraction, evaluate, drift monitor).
- UI: `app/data-rooms/[id]/contracts` with components under `components/contracts/studio/*` (field library, labeler, evaluator, run status).
- Workers: `workers/contracts/*` for background extraction, evaluations, and drift checks.

Supabase Schema (proposed)
- Tables include: contract_fields, contract_field_versions, contract_documents, contract_extractions, contract_annotations, contract_evaluations, contract_drift_events.
- Indexes: by document/field/confidence; versions by status.
- RLS: tenant isolation (`org_id`) and data room membership; strict no‑train default unless tenant opt‑in.

Hybrid Extraction Strategy (per field)
- Rules: curated regex/patterns/lexicons for clause headers and canonical phrases.
- Semantic: retrieve top‑K chunks via embeddings; apply LLM extractor with structured JSON schema.
- Normalization: parse caps, durations, booleans; canonical units.
- Output: normalized `value_json` with citation (doc/page/chunk/start/end) and confidence.

Prebuilt System Fields (v1)
- coc_required; assignment_restrictions; mfn_present; termination_for_convenience; auto_renewal; sla_uptime_pct/sla_credits; liability_cap.

Custom Field Training (Tenant)
- Labeling UI: highlight spans, assign field, optional normalized value.
- Compile: derive regex seeds + keyphrases + few‑shot prompt; save `extractor_config`.
- Evaluate: train/holdout split; compute precision/recall/F1; store history; publish when threshold met.

Drift Tracking
- Sample recent docs, compare metrics to baseline; write drift events; notify owners.

Explainability & Evidence
- Store `match_text` and offsets; UI highlight; tooltip with matched rule/keyphrase + semantic score.

APIs (App Router)
- List fields, run extraction, create/train/publish custom fields, upsert annotations, fetch evaluations.

UI/UX
- Tabs: Library | Label | Run | Evaluate | Drift. Batch run view with filters; evaluator charts; drift sparklines.

Workers
- contracts-extract-worker; contracts-eval-worker; contracts-drift-worker.

Performance Targets
- Batch: 50 docs/200 pages × 8 fields < 20s; single‑doc interactive < 2s.

Testing
- Unit (regex/normalizers/metrics), Integration (offsets/evidence), E2E (label→train→publish→run).

Starter SQL is provided in a follow‑up section (separate block) for migrations.

Starter SQL (excerpt)
```sql
create table if not exists public.contract_fields (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  key text not null,
  title text not null,
  description text,
  scope text not null check (scope in ('system','tenant')),
  enabled boolean default true,
  unique (org_id, key)
);

create table if not exists public.contract_field_versions (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.contract_fields(id) on delete cascade,
  version text not null,
  status text not null check (status in ('draft','active','deprecated')),
  extractor_config jsonb,
  eval_metrics jsonb,
  created_at timestamptz default now(),
  unique (field_id, version)
);

create table if not exists public.contract_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  field_id uuid not null references public.contract_fields(id) on delete cascade,
  field_version_id uuid not null references public.contract_field_versions(id) on delete cascade,
  page_number int not null,
  chunk_index int,
  match_text text,
  start_char int,
  end_char int,
  value_json jsonb,
  confidence numeric,
  created_at timestamptz default now()
);

create table if not exists public.contract_annotations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number int not null,
  start_char int not null,
  end_char int not null,
  text text,
  field_id uuid references public.contract_fields(id) on delete set null,
  label text,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.contract_evaluations (
  id uuid primary key default gen_random_uuid(),
  field_version_id uuid not null references public.contract_field_versions(id) on delete cascade,
  dataset_key text,
  precision numeric,
  recall numeric,
  f1 numeric,
  support int,
  run_at timestamptz default now(),
  confusion jsonb
);

create table if not exists public.contract_drift_events (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.contract_fields(id) on delete cascade,
  observed_at timestamptz default now(),
  metric_key text,
  prev_value numeric,
  new_value numeric,
  delta numeric,
  severity text check (severity in ('low','medium','high')),
  context jsonb
);
```
