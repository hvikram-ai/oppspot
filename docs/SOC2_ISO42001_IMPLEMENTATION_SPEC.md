# SOC 2 + ISO/IEC 42001 — Implementation Specification (oppspot)

Objectives
- Achieve SOC 2 Type II and align to ISO/IEC 42001 (AI Management System) for trustworthy AI operations.
- Operationalize controls with code, automation, and evidence capture inside this repo and Supabase.
- Minimize lift by leveraging existing RBAC, RLS, analytics, workers, and logging patterns.

Scope and Assumptions
- Product scope: oppSpot web app (Next.js), APIs (App Router), workers, Supabase (Postgres, Auth, RLS, Storage), LLM integrations (OpenRouter), optional Pinecone.
- Trust Services Criteria (TSC): Security (common), Availability, Confidentiality as in-scope; Integrity/Privacy optionally phased.
- ISO/IEC 42001: AIMS across model lifecycle (policy→risk→design→build→use→monitor→improve) for all AI features (RAG, scoring, radar, studio, copilot).

Program Setup (Governance)
- Roles
  - Security Lead (CISO), AI Governance Lead, Data Protection Officer (DPO), SRE Lead, Eng Managers.
- Committees
  - Security & Compliance Council (monthly), AI Risk Review Board (bi‑weekly), Change Advisory Board (CAB, weekly).
- Artifacts
  - Policies (see below), Risk Register, AI Risk Register, Asset Inventory, Vendor Inventory, DPA/DTIA, Incident Runbooks, BCP/DR, Model Cards.

Policies to Author (store in `docs/policies/`)
- Information Security Policy, Access Control, Acceptable Use, SDLC/Secure Coding, Change Management, Vulnerability Management, Incident Response, Business Continuity/DR, Vendor Risk, Data Classification & Handling, Encryption & Key Management, Logging & Monitoring, Backup & Restore, Data Retention/Deletion, Privacy (GDPR/PII), AI Governance Policy (ISO 42001), AI Data Governance, AI Risk Management, AI Transparency & Human Oversight.

Control Automation (By Domain)
- Identity & Access Management (SOC2-CC6, CC7)
  - Enforce SSO and MFA for console/GitHub/Vercel; use least privilege roles; quarterly access reviews.
  - App RBAC already present (`lib/rbac`); ensure org scoping for all sensitive endpoints; enable session timeouts and device revocation.
- Authorization/RLS
  - Supabase RLS policies in tables containing user/org data. Add RLS tests and a `scripts/check-rls-status.sql` report (exists) to evidence reviews.
- Secrets & Keys (CC6.1)
  - Centralize secrets in Vercel/Supabase; prohibit secrets in repo; rotate quarterly; enable audit on access. Add `scripts/scan-secrets.ts` to CI.
- Logging & Monitoring (CC7)
  - Centralize structured logs for: auth, access, admin actions, data exports, model calls, errors.
  - Retain ≥ 1 year. Build export endpoints for audit evidence.
- Change Management (CC8)
  - PR reviews required, protected branches, semantic commits, tagged releases. CAB notes stored in `docs/change-log/`.
- Secure SDLC (CC7.2, CC8.1)
  - Add SAST/Dependency scanning in CI; pre-commit hooks; Playwright suites as functional controls. Security sign‑off checklist for prod releases.
- Vulnerability Management (CC7.3)
  - Monthly scans; severity SLAs (P1: 7d, P2: 30d, P3: 90d); patch tracking in issues; evidence from CI reports.
- Incident Response (CC7.4)
  - 24/7 on‑call rotation; runbooks in `docs/runbooks/`; comms templates; postmortem template; quarterly table‑top tests.
- Availability & DR (A1)
  - RTO/RPO targets; nightly backups; quarterly restore tests; DR runbook; health checks and uptime reports.
- Data Handling & Privacy
  - Data classification; retention rules; user deletion pipeline; subject access requests; export redaction.
- Vendor Risk
  - Vendor inventory (Supabase, Vercel, OpenRouter, Pinecone); DPAs; SOC/ISO attestations; annual reviews.

ISO/IEC 42001 (AI‑Specific) Controls
- AIMS Scope & Policy
  - Publish AI Governance Policy: purpose, scope, roles, lifecycle, safeguards, transparency.
- AI Risk Management
  - AI Risk Register with likelihood/impact; risks (bias, hallucination, privacy, toxicity, IP, prompt injection, data poisoning, model drift); treatments + owners.
- Data Governance for AI
  - Dataset inventory, lineage, consent, PII minimization, retention; prompt/content filtering; training data provenance (note: no‑train defaults).
- Model Lifecycle
  - Model inventory (IDs, versions, prompts, providers), change control gates (design review, eval metrics, red‑team results), approval records.
- Testing & Evaluation
  - Safety and performance test suites (accuracy, bias, jailbreak, toxicity); acceptance thresholds; periodic re‑evaluation schedule.
- Deployment & Monitoring
  - Telemetry: prompt/completion tokens, latency, refusal/abstention rate, citation coverage, guardrail triggers; drift/safety monitoring.
- Human Oversight & Transparency
  - Human‑in‑the‑loop for material decisions; user notices (AI‑assisted); explainability (citations) already designed.
- Incident Management for AI
  - AI incident taxonomy; containment steps (disable/scale back); notification matrix; lessons learned into model/prompt updates.

Database Additions (for Evidence & Controls)
- Create the following (starter SQL snippets below):
  - `audit_logs` (actor, action, resource, metadata)
  - `access_logs` (user/org, route, ip, ua, result)
  - `data_exports` (who/what/when, scope)
  - `llm_usage` (org, feature, model, prompt_tokens, completion_tokens, latency_ms, cost_estimate)
  - `model_registry` (model_id, provider, version, prompt_template_hash, status)
  - `model_evaluations` (model_id, suite, metrics json, passed boolean, run_at)
  - `ai_risks` (risk_id, category, severity, owner, status, review_at)
  - `vendor_inventory` (name, service, data_categories, iso/soc status, dpa)

Starter SQL (excerpt)
```sql
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  org_id uuid,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb,
  created_at timestamptz default now()
);
create index if not exists audit_logs_org_idx on public.audit_logs(org_id, created_at desc);

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  org_id uuid,
  route text,
  ip inet,
  user_agent text,
  outcome text,
  created_at timestamptz default now()
);

create table if not exists public.llm_usage (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  feature text,
  model text,
  prompt_tokens int,
  completion_tokens int,
  latency_ms int,
  cost_estimate numeric,
  created_at timestamptz default now()
);

create table if not exists public.model_registry (
  id uuid primary key default gen_random_uuid(),
  model_id text,
  provider text,
  version text,
  prompt_template_hash text,
  status text check (status in ('draft','approved','deprecated','retired')),
  created_at timestamptz default now()
);

create table if not exists public.model_evaluations (
  id uuid primary key default gen_random_uuid(),
  model_registry_id uuid references public.model_registry(id) on delete cascade,
  suite text,
  metrics jsonb,
  passed boolean,
  run_at timestamptz default now()
);

create table if not exists public.ai_risks (
  id uuid primary key default gen_random_uuid(),
  title text,
  category text,
  severity text,
  owner_id uuid,
  status text,
  details jsonb,
  review_at timestamptz
);

create table if not exists public.vendor_inventory (
  id uuid primary key default gen_random_uuid(),
  name text,
  service text,
  data_categories text[],
  iso_status text,
  soc2_status text,
  dpa boolean,
  last_reviewed_at timestamptz
);
```

App/Repo Changes
- Middleware
  - Add request logging (`access_logs`), admin/action logging (`audit_logs`), export logging (`data_exports`).
- LLM Wrapper
  - Centralize LLM calls; log to `llm_usage`; attach model_id/version; enforce guardrails (PII scrub, context caps, rate limits).
- Model Registry
  - Define config for approved models/prompts; require an approval reference to deploy.
- CI/CD
  - Add SAST, dep scans, secret scans; artifact retention of reports; gate releases on critical issues.
- Backups/DR
  - Automate snapshot + restore tests; store evidence in `docs/dr-tests/`.

Evidence and Audits (What Auditors Will Ask)
- Access review exports (quarterly) → queries over IAM and `audit_logs`.
- Change management evidence → GitHub PR history and CAB notes.
- Incident drills → postmortems in `docs/incidents/` and runbook screenshots.
- Vulnerability scans → CI reports and ticket links with remediation dates.
- DR tests → restore logs and success timestamps.
- AI evals → `model_evaluations` with pass/fail and thresholds; `model_registry` approval records.
- AI risk reviews → `ai_risks` records with owners and review cadence.

Roadmap (90–120 days)
- Phase 1 (Weeks 1–4): Policies, roles, tables, logging middleware, LLM wrapper, CI scans, vendor inventory seeded.
- Phase 2 (Weeks 5–8): Risk registers (security + AI), model registry + eval suite, access review pipeline, DR test automation.
- Phase 3 (Weeks 9–12): Incident drills, availability SLOs + dashboards, AI monitoring (drift/safety), auditor evidence scripts.
- Phase 4 (Weeks 13–16): Type I audit readiness (design), start Type II observation window (90 days), ISO 42001 internal audit.

Acceptance Criteria (Exit)
- All policies approved and published; employees trained (LMS proof).
- Controls implemented and evidenced; queries/export scripts in `scripts/security/*` produce auditor‑ready CSV/JSON.
- At least one successful DR restore test in the last quarter; incident drill completed in last 90 days.
- Model registry and evaluation gates enforced for any AI deployment; monitoring dashboards active.

References
- SOC 2 Trust Services Criteria (AICPA); ISO/IEC 42001:2023.
- NIST AI RMF 1.0 and ISO/IEC 23894 as guidance for AI risk.

