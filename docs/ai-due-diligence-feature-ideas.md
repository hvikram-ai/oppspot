# AI for Due Diligence — Feature Proposals

Context: Inspired by leading practices for applying AI to M&A due diligence (e.g., public guides on AI‑assisted diligence) and tailored to oppSpot’s current capabilities (App Router, RBAC, Data Rooms, Research GPT, Signals, Workers, Supabase).

Goal: Ship differentiating features that compress diligence timelines, improve risk detection, and provide traceable, cited answers that increase buyer confidence.

## 1) AI Red‑Flag Detector for Data Rooms
- What: Scan uploaded diligence artifacts (financials, contracts, HR, compliance docs, policies) to auto‑surface issues: covenant breaches, churn spikes, adverse terms, control/assignment clauses, pending litigation, policy gaps.
- Why: Reduces manual triage time; provides an auditable, prioritized issues list with severity and confidence.
- How (MVP):
  - Ingest PDFs/CSVs into vectors with metadata; run rule+LLM hybrid checks; emit `alerts.*` with severity and owners.
  - UI: “Red Flags” tab in `data-rooms/[id]` with filters (type, severity), links to source pages, and citations.
  - Tech: `lib/pdf`, `lib/alerts`, `lib/ai/rag`, workers queue for async extraction; store findings in `alerts` table.

## 2) Dataroom Q&A Copilot with Grounded Citations
- What: Ask natural‑language questions across the entire data room; answers include exact citations, page snippets, and confidence.
- Why: Trust via verifiable grounding; speeds up analyst workflows.
- How:
  - RAG over vectorized docs per data room; streaming answers; “open in context” jumps to page/section.
  - Guardrails: hallucinaton checks, answer abstention if unsupported, RBAC‑aware retrieval.
  - Tech: `lib/ai/rag`, `lib/research-gpt`, Supabase vectors/Pinecone, signed object URLs, `components/ai-chat` UX.

## 3) KPI Normalization & Peer Benchmarking
- What: Normalize target KPIs (ARR, NRR, CAC, LTV, GM, cohort churn, revenue concentration) and benchmark vs. industry peers and historic medians.
- Why: Quantifies quality of revenue and efficiency quickly; highlights anomalies.
- How:
  - Parse financial exports; compute standardized KPIs; compare with sector medians (Companies House + internal reference sets).
  - UI: Benchmark charts with traffic‑light deltas; exportable PDF.
  - Tech: `lib/benchmarking`, `lib/companies-house`, charts in `components/analytics`.

## 4) Multi‑Axis Risk Heatmap with Explainability
- What: Score Financial, Legal, Operational, Cyber, ESG, and Regulatory risk; generate an explainer “why this score” with links to evidence.
- Why: Board‑ready summary with drill‑downs; defensible rationale.
- How:
  - Feature extractors per axis; calibrate weights; expose “evidence stack” (alerts, metrics, citations).
  - UI: Heatmap grid + side panel explanations; export to PDF.
  - Tech: `lib/signals`, `lib/alerts`, `lib/research-gpt` for explanations.

## 5) Customer & Revenue Quality Analyzer
- What: Assess revenue durability: cohort analysis, logo/customer concentration, top‑X exposure, renewal timing, discounting, collections latency.
- Why: Early detection of fragility; supports valuation haircuts or confirmatory asks.
- How:
  - CSV/ERP exports ingestion; cohort engine; concentration metrics; anomaly detection on AR/AP aging.
  - UI: Cohort heatmaps, concentration radar, “What changed last 12m?” insights.
  - Tech: `lib/qualification`, `lib/analytics`, background processing in workers.

## 6) Contract Clause Mining & Obligations Timeline
- What: Extract and track critical clauses across contracts: change‑of‑control (CoC), assignment, MFN, termination, SLAs, auto‑renewals. Build an obligations calendar.
- Why: Reduces legal review cycles; prevents missed CoC consents and renewal pitfalls.
- How:
  - Clause classifiers + regex hybrids; obligations emitted as events with due dates and owners.
  - UI: Contracts table with clause badges + obligations timeline; export consent checklist.
  - Tech: `lib/pdf`, `lib/alerts`, `lib/events`, embeddings for clause similarity.

## 7) Sector‑Aware Regulatory & Compliance Checker
- What: Identify likely approvals/filings and compliance gaps by sector and region (KYC/AML hints, data residency, certifications), with template request lists.
- Why: Prevents late‑stage surprises; speeds regulatory workstreams.
- How:
  - Rule base + LLM prompt library per sector; generate tailored regulatory checklist; map to evidence in data room.
  - UI: “Regulatory Readiness” with status (met/partial/gap), owners, next steps.
  - Tech: `lib/intelligent-analysis`, sector taxonomy, checklist tables, alert hooks.

## 8) Integration Fit & Complexity Scoring
- What: Score cultural/organizational/process/tech fit; estimate integration complexity and risk; propose a 90‑day PMI plan.
- Why: Surfaces post‑close risk early; differentiates beyond standard diligence tools.
- How:
  - Signals from org charts, stack inventory, process docs; similarity to acquirer profile; LLM to synthesize plan with task owners.
  - UI: Fit scorecards + suggested PMI roadmap; export tasks to CSV/Jira.
  - Tech: `lib/research-gpt`, `lib/agents/workflow-builder`, tasks in `streams`.

## 9) Adverse Media, Litigation, and Incident Watch
- What: Continuous watch for negative news, lawsuits, security incidents, product recalls, and social sentiment during the diligence window.
- Why: Real‑time risk monitoring; early alerting to deal‑breaker events.
- How:
  - Ingest news/APIs; classify sentiment/severity; deduplicate; push to Alerts and Command Center.
  - UI: “Live Watch” feed with filters and mute rules; severity escalations via email/slack.
  - Tech: `lib/signals`, `lib/alerts`, `app/api/.../webhooks`, worker schedulers.

## 10) Deal Hypothesis Tracker with Evidence & Confidence
- What: Maintain explicit diligence hypotheses/questions, attach evidence and citations, and track confidence/owner/next step.
- Why: Creates a defensible narrative; aligns team; avoids duplicate work.
- How:
  - Simple “Hypotheses” entity linked to data room docs, alerts, analytics, and comments; LLM suggests confirming/contradicting evidence.
  - UI: Kanban (Open → Investigating → Supported/Refuted); export to investment memo.
  - Tech: `lib/collaboration`, `lib/realtime` presence, memo generator with `react-pdf`.

---

## Rollout Plan (90 Days)
- Phase 1 (Weeks 1–4): Q&A Copilot, Red‑Flag Detector (contracts/financials), KPI Normalization. Ship dashboards and PDF exports.
- Phase 2 (Weeks 5–8): Clause Mining, Risk Heatmap, Customer/Revenue Analyzer, Adverse Media Watch.
- Phase 3 (Weeks 9–12): Regulatory Checker, Integration Fit Scoring, Hypothesis Tracker + memo generator.

## Competitive Edges
- Grounded answers with citations and RBAC‑aware retrieval.
- Hybrid detection (rules + LLM) for reliability and speed.
- Opinionated, board‑ready outputs (risk heatmap, obligations timeline, PMI plan, memo).
- Tight integration with existing oppSpot modules (Signals, Data Rooms, Streams, Research GPT, Alerts, Workers).

## Dependencies & Notes
- Ensure vectorization pipeline is robust for PDFs/spreadsheets; consider structured extraction paths for CSV/XLSX.
- Add tables: `alerts`, `obligations`, `hypotheses`, `benchmarks`, plus embeddings if not already configured per data room.
- Respect PII/GDPR; maintain audit logs for prompts/answers and evidence references.

