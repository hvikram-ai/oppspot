# Deal Hypothesis Tracker — Implementation Spec

Objectives
- Capture and track explicit deal hypotheses/questions during diligence (e.g., “NRR is resilient due to sticky enterprise contracts”).
- Link hypotheses to evidence with citations (documents/chunks, alerts, signals, KPIs, news) and quantify confidence.
- Provide a Kanban workflow (Open → Investigating → Supported/Refuted → Archived), owners, due dates, and board‑ready memo export.
- Integrate with Data Rooms, Risk Heatmap, Red‑Flag Radar, Structured Summaries, and ESG Copilot.

Scope (v1)
- Entity‑scoped: Company or Data Room (support both via `entity_type` + `entity_id`).
- Evidence‑linked confidence scoring with human overrides; comments and activity timeline.
- LLM assist: suggest candidate evidence and short summaries, grounded with citations from our stores.

Non‑Goals (v1)
- Automated decisioning; analysts remain in control for status/priority/owner.
- Discovery across entire internet; scope to indexed docs, signals, alerts, KPIs, and optional curated news.

Architecture
- Hypothesis CRUD → Evidence association → Confidence computation → Workflow transitions → Memo export.
- Evidence fetched from: `document_chunks` (pgvector), `red_flags`, `risk_evidence`, `kpi_snapshots`, `esg_disclosures`, `signals/alerts`.
- Confidence = weighted combination of: evidence support/contradiction, strength/recency, source reliability, reviewer votes.

Data Model (Supabase)
- Tables
  - `hypotheses`
    - id uuid pk, org_id uuid, entity_type text check (in ('company','data_room')), entity_id uuid,
      title text, question text, type text check (in ('assumption','risk','opportunity','thesis')), priority text check (in ('low','medium','high','critical')),
      status text check (in ('open','investigating','supported','refuted','archived')) default 'open',
      owner_id uuid, due_date date, confidence numeric check (confidence >= 0 and confidence <= 1) default 0.5,
      confidence_rationale text, created_by uuid, created_at timestamptz default now(), updated_at timestamptz default now(),
      meta jsonb
  - `hypothesis_evidence`
    - id uuid pk, hypothesis_id uuid fk -> hypotheses(id) on delete cascade,
      evidence_type text check (in ('document','alert','signal','kpi','news','summary','manual')),
      source_id uuid, title text, preview text, citation jsonb, link text, importance numeric,
      stance text check (in ('supports','contradicts','neutral')) default 'supports',
      score numeric, created_at timestamptz default now()
  - `hypothesis_actions`
    - id uuid pk, hypothesis_id uuid fk -> hypotheses(id) on delete cascade,
      action_type text check (in ('create','edit','status_change','owner_change','add_evidence','remove_evidence','comment','vote','snooze')),
      actor_id uuid, payload jsonb, created_at timestamptz default now()
  - `hypothesis_comments`
    - id uuid pk, hypothesis_id uuid fk -> hypotheses(id) on delete cascade, author_id uuid, body text, created_at timestamptz default now()
  - `hypothesis_votes`
    - id uuid pk, hypothesis_id uuid fk -> hypotheses(id) on delete cascade, voter_id uuid, confidence numeric check (confidence between 0 and 1),
      direction text check (in ('support','refute')),
      created_at timestamptz default now(), unique (hypothesis_id, voter_id)
  - `hypothesis_tags`
    - id uuid pk, hypothesis_id uuid fk -> hypotheses(id) on delete cascade, tag text, created_at timestamptz default now()

- Indexes
  - `hypotheses (org_id, entity_type, entity_id, status, priority)`
  - `hypothesis_evidence (hypothesis_id, stance)`

- RLS
  - ENABLE RLS on all tables; visibility restricted to users in the same org and with access to the entity (company org_id or data room membership).

Confidence Model
- Evidence score per item: base weight × importance × source reliability × recency decay (e.g., exp decay > 12m).
- Hypothesis support score = sum(scores where stance = supports) − sum(scores where stance = contradicts).
- Normalize confidence c in [0,1] via sigmoid on support score; blend with human votes (e.g., 70% evidence, 30% votes),
  and allow owner override (stored in `confidence` with `meta.overrides`).
- Gate for status transitions: supported if c ≥ 0.7 and at least one strong supporting evidence; refuted if c ≤ 0.3 and at least one strong contradicting evidence.

Evidence Linking
- Document: citation includes { document_id, page_number, chunk_index, start_char, end_char } and deep links to viewer.
- Alert/Signal/KPI/News: reference by id with preview; include timestamp.
- Manual: analyst‑authored note with optional file/link.

LLM Assist (Grounded)
- Suggest evidence: given hypothesis, retrieve top‑K chunks and recent alerts/signals; return proposed evidence list with stance.
- Draft rationale: short, grounded “why” summary with citation ids; abstain if insufficient.
- Guardrails: use only provided context; no PII leakage; produce JSON the UI can consume.

APIs (App Router)
- `GET /api/(companies|data-rooms)/[id]/hypotheses?status=open,investigating`
  - List with filters by status/priority/owner/tag; returns summary fields and current confidence.
- `POST /api/(companies|data-rooms)/[id]/hypotheses`
  - Create hypothesis: { title, question, type, priority, owner_id, due_date }
- `GET /api/(companies|data-rooms)/[id]/hypotheses/[hid]`
  - Detail including evidence, comments, votes, actions.
- `PATCH /api/(companies|data-rooms)/[id]/hypotheses/[hid]`
  - Update fields; status transitions enforce gates; record `hypothesis_actions`.
- `POST /api/(companies|data-rooms)/[id]/hypotheses/[hid]/evidence`
  - Add evidence; recompute confidence.
- `DELETE /api/(companies|data-rooms)/[id]/hypotheses/[hid]/evidence/[eid]`
- `POST /api/(companies|data-rooms)/[id]/hypotheses/[hid]/vote`
  - Body: { confidence, direction }
- `POST /api/(companies|data-rooms)/[id]/hypotheses/[hid]/comment`
- `POST /api/(companies|data-rooms)/[id]/hypotheses/[hid]/suggest-evidence`
  - LLM‑assisted; returns proposed evidence with citations and stance.
- `GET /api/(companies|data-rooms)/[id]/hypotheses/export`
  - Export selected to PDF/CSV for IC memo.

UI/UX
- Page: `app/(companies|data-rooms)/[id]/hypotheses` with Kanban columns: Open, Investigating, Supported, Refuted.
- Card: title, type, priority, owner, confidence bar, evidence chips count.
- Detail drawer: full question, current confidence + rationale, evidence list (supports/contradicts tabs), add evidence (search chunks/alerts/KPIs), activity timeline, comments, tags.
- Quick actions: suggest evidence (LLM), change status, assign owner, add tag.
- Filters: tag, owner, priority, category (risk/opportunity), confidence range.

Memo Export (Board‑Ready)
- Use `@react-pdf/renderer` to export a memo: summary table → per hypothesis page (question, confidence, status, evidence stack, rationale, next steps).
- Filename: `hypotheses_{entity}_{yyyy-mm-dd}.pdf`.

Workers
- `hypothesis-confidence-worker`: recompute confidence on evidence/votes changes; write back to `hypotheses`.
- `hypothesis-suggest-worker`: periodically propose new hypotheses based on red flags/ESG gaps/high‑variance KPIs; create as ‘open’ with `meta.source='suggested'`.
- `hypothesis-digest-worker`: daily summary to owners (open/investigating with due dates within 7 days).

Performance Targets
- List view for 100 hypotheses < 300ms (server‑side pagination); confidence recompute < 200ms/hypothesis on average.

Testing
- Unit: confidence math (weights/decay); status gate enforcement; serialization of citations.
- Integration: CRUD + evidence linking + recompute; LLM suggest stubbed with fixtures; export PDF sections.
- E2E: Kanban drag/drop status change; add/remove evidence; vote; export.

Starter SQL (excerpt)
```sql
create table if not exists public.hypotheses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  entity_type text not null check (entity_type in ('company','data_room')),
  entity_id uuid not null,
  title text not null,
  question text,
  type text check (type in ('assumption','risk','opportunity','thesis')),
  priority text check (priority in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','investigating','supported','refuted','archived')),
  owner_id uuid,
  due_date date,
  confidence numeric default 0.5,
  confidence_rationale text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  meta jsonb
);

create table if not exists public.hypothesis_evidence (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references public.hypotheses(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('document','alert','signal','kpi','news','summary','manual')),
  source_id uuid,
  title text,
  preview text,
  citation jsonb,
  link text,
  importance numeric,
  stance text not null default 'supports' check (stance in ('supports','contradicts','neutral')),
  score numeric,
  created_at timestamptz default now()
);

create table if not exists public.hypothesis_actions (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references public.hypotheses(id) on delete cascade,
  action_type text not null check (action_type in ('create','edit','status_change','owner_change','add_evidence','remove_evidence','comment','vote','snooze')),
  actor_id uuid,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists public.hypothesis_comments (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references public.hypotheses(id) on delete cascade,
  author_id uuid,
  body text,
  created_at timestamptz default now()
);

create table if not exists public.hypothesis_votes (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references public.hypotheses(id) on delete cascade,
  voter_id uuid not null,
  confidence numeric not null,
  direction text not null check (direction in ('support','refute')),
  created_at timestamptz default now(),
  unique (hypothesis_id, voter_id)
);

create table if not exists public.hypothesis_tags (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references public.hypotheses(id) on delete cascade,
  tag text not null,
  created_at timestamptz default now()
);
```

Security & Privacy
- RBAC: org‑scoped access; entity membership required (company org or data room member).
- Auditability: actions table records all changes; exports include assumptions and source limits.
- PII hygiene: truncate/scrub previews; signed links for documents.

Open Questions
- Do we auto‑create hypotheses from specific triggers (e.g., new P1 red flag)? Proposed yes via suggest‑worker with low default priority.
- Should we allow linking hypotheses to Risk Heatmap axes? Proposed yes: store relation in `hypotheses.meta.related_axes`.
- Confidence override policy: owner can override ±0.15 with rationale.

