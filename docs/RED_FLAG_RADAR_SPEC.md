# Red‑Flag Radar (Explainable) — Implementation Spec

Objectives
- Detect and track Financial, Legal, Operational, Cyber, and ESG red flags with severity and confidence.
- Link every flag to concrete evidence (documents, alerts, signals, KPIs) and provide a concise, board‑ready “why” plus remediation.
- Surface in dashboards with notifications; export to PDF for IC/board packs.
- Leverage existing modules: `lib/alerts` (unified alerts), `lib/ai/rag` citations, `lib/research-gpt` explainers.

Scope (v1)
- Entity scope: Company or Data Room (`entity_type in ('company','data_room')`).
- Hybrid detection: rules/heuristics + LLM classification over indexed content.
- Grounded outputs: severity, confidence, category, evidence links, explainer, remediation suggestions.

Non‑Goals (v1)
- Full legal opinion automation; we classify and link evidence, not replace counsel.
- Real‑time streaming per keystroke; batch/threshold triggers are acceptable.

Architecture
- Sources → Detectors (rules + LLM) → Candidate findings → Consolidation/dedup → Persist flags + evidence → Alerts/Notifications → Dashboards/Exports.
- Evidence references resolve to: document pages/chunks, alerts, signals, KPI snapshots.

Key Modules
- Detectors: `lib/alerts` (new detector set under `lib/alerts/detectors/red-flags/*`).
- Evidence & citations: use `document_chunks` from pgvector (see DATAROOM_QA_COPILOT_SPEC) and existing signals/alerts/KPI tables.
- Explainability: `lib/research-gpt` to synthesize short, grounded “why” and remediation suggestions.
- Alerts: `lib/alerts/alert-service.ts` to emit P1/P2 when critical/high flags appear or worsen.
- API: `app/api/(companies|data-rooms)/[id]/red-flags` suite.
- UI: `components/analytics/red-flags` list + filters, detail drawer, export.

Supabase Schema (proposed)
- Tables
  - `red_flag_runs`
    - id uuid pk, entity_type text, entity_id uuid, started_at timestamptz, finished_at timestamptz, detector_version text, stats jsonb, status text ('success','partial','error')
  - `red_flags`
    - id uuid pk, entity_type text, entity_id uuid, category text check (category in ('financial','legal','operational','cyber','esg')),
      title text, description text, severity text check (severity in ('critical','high','medium','low')),
      confidence numeric check (confidence between 0 and 1), status text check (status in ('open','reviewing','mitigating','resolved','false_positive')),
      first_detected_at timestamptz, last_updated_at timestamptz, run_id uuid fk -> red_flag_runs(id), fingerprint text, meta jsonb
  - `red_flag_evidence`
    - id uuid pk, flag_id uuid fk -> red_flags(id) on delete cascade, evidence_type text check (evidence_type in ('document','alert','signal','kpi','news')),
      source_id uuid, title text, preview text, citation jsonb, importance numeric, score numeric, url text, page_number int, chunk_index int, created_at timestamptz
  - `red_flag_actions`
    - id uuid pk, flag_id uuid fk -> red_flags(id) on delete cascade, action_type text check (action_type in ('assign','note','status_change','snooze','remediation')),
      actor_id uuid, payload jsonb, created_at timestamptz

- Indexes
  - `red_flags (entity_type, entity_id, category, severity, status)`
  - `red_flag_evidence (flag_id, evidence_type)`

- RLS pattern
  - ENABLE RLS on all tables; policies based on company org membership or data‑room membership.

Detection Sources (examples)
- Financial: revenue concentration above threshold (top 3 > X%), sustained negative NRR, AR aging > 60d rising, DSO>target.
- Legal: change‑of‑control/assignment consents required, MFN presence in key customer contracts, termination for convenience risk.
- Operational: SLA breach rates elevated, backlog aging, single‑supplier dependency.
- Cyber: historical incidents, missing security policies, exposed CVEs relevant to tech stack.
- ESG: disclosure gaps on material topics, negative sentiment news, missing data on emissions.

Detectors
- Rule‑based
  - Read KPI snapshots, concentration, aging, and signals; evaluate thresholds/ratios.
  - Emit candidate flags with raw metrics and references.
- LLM‑assisted
  - Classify clause risk and policy gaps from document chunks; use grounded prompt with citations list.
  - Summarize recurring negative news items into consolidated flags with time windows.

Consolidation & Deduplication
- Fingerprint by (category, normalized title, key attributes); merge candidates that overlap; raise severity if worsening.
- Update `last_updated_at`; keep history via `red_flag_actions`.

Explainability & Remediation
- For each flag, generate a short JSON payload:
  - { why: string, key_evidence: [{evidenceId}], suggested_remediation: string, timeframe: string }
- Rules first (pre‑canned why/remediation for known patterns); LLM fallback using `lib/research-gpt` with provided evidence previews.
- Cache in `red_flags.meta.explainer` with model, timestamp, inputs hash.

Alerts & Notifications
- Map severity → AlertService severity: critical→P1, high→P2, medium→P3.
- Trigger alert on new critical/high or severity increase; include top evidence links.
- Optional email/slack digests with daily summary per entity.

APIs (App Router)
- `GET /api/(companies|data-rooms)/[id]/red-flags?status=open&category=legal,financial`
  - Returns list with pagination: id, category, title, severity, confidence, updated_at, top evidence previews.
- `GET /api/(companies|data-rooms)/[id]/red-flags/[flagId]`
  - Returns full flag, evidence list, explainer JSON, action history.
- `POST /api/(companies|data-rooms)/[id]/red-flags/recompute` (editor/admin)
  - Triggers detectors; creates a run row; upserts flags/evidence; emits alerts.
- `POST /api/(companies|data-rooms)/[id]/red-flags/[flagId]/actions`
  - Body: { action_type, payload }; used for assign, status change, remediation note, snooze.
- `GET /api/(companies|data-rooms)/[id]/red-flags/export`
  - Returns PDF/CSV with current open flags and summaries.

UI/UX
- List view with filters (category, severity, status) and search; chips show counts per category.
- Detail drawer: explanation, metrics, evidence list with citation links (open document viewer at page/chunk), remediation suggestion and owner.
- Bulk actions: assign owner, change status, export.
- Dashboard surfacing: top 3 flags per entity on analytics overview.

Exports
- PDF (board‑ready): summary page + per‑category sections with top flags, explainers, remediation.
- CSV: flattened list of flags with severity, confidence, category, title, links.

Performance Targets
- Recompute run for 12 months of data and 5k documents: < 10s (worker) with parallelized detectors; API reads < 300ms cached.

Testing
- Unit: rule detectors thresholds; fingerprint/dedupe; severity escalation logic.
- Integration: run detectors on fixtures; verify evidence linkage and alert triggers.
- E2E: open list, filter, open detail, click citation to document chunk; export PDF.

Rollout Plan
- Week 1: Schema, rule detectors (financial/operational), list UI (static), API GET.
- Week 2: Legal clause + cyber policy detectors (LLM‑assisted), recompute job, alerts wiring.
- Week 3: Explainability + remediation generation with caching; detail UI; export.
- Week 4: ESG detectors, performance tuning, E2E tests, digests.

Starter SQL (excerpt)
```sql
create table if not exists public.red_flag_runs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('company','data_room')),
  entity_id uuid not null,
  started_at timestamptz default now(),
  finished_at timestamptz,
  detector_version text,
  stats jsonb,
  status text check (status in ('success','partial','error'))
);

create table if not exists public.red_flags (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('company','data_room')),
  entity_id uuid not null,
  category text not null check (category in ('financial','legal','operational','cyber','esg')),
  title text not null,
  description text,
  severity text not null check (severity in ('critical','high','medium','low')),
  confidence numeric check (confidence >= 0 and confidence <= 1),
  status text not null default 'open' check (status in ('open','reviewing','mitigating','resolved','false_positive')),
  first_detected_at timestamptz default now(),
  last_updated_at timestamptz default now(),
  run_id uuid references public.red_flag_runs(id) on delete set null,
  fingerprint text,
  meta jsonb
);

create table if not exists public.red_flag_evidence (
  id uuid primary key default gen_random_uuid(),
  flag_id uuid not null references public.red_flags(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('document','alert','signal','kpi','news')),
  source_id uuid,
  title text,
  preview text,
  citation jsonb,
  importance numeric,
  score numeric,
  url text,
  page_number int,
  chunk_index int,
  created_at timestamptz default now()
);

create table if not exists public.red_flag_actions (
  id uuid primary key default gen_random_uuid(),
  flag_id uuid not null references public.red_flags(id) on delete cascade,
  action_type text not null check (action_type in ('assign','note','status_change','snooze','remediation')),
  actor_id uuid,
  payload jsonb,
  created_at timestamptz default now()
);
```

Guardrails & Security
- RBAC via org/room membership; editors can change status/assign; viewers read‑only.
- PII hygiene in explainers; citation previews truncated and scrubbed.
- Audit: all status changes/notes logged in `red_flag_actions`.

Open Questions
- Severity mapping to AlertService (P0..P3) — we propose critical→P1, high→P2, medium→P3, low→no alert.
- Snooze semantics (duration vs. until condition change) and recurrence of alerts.
- Analyst override of severity/confidence; store overrides in `meta.overrides` with actor/time.

