# AI Due Diligence — Consolidated Roadmap

Purpose: Merge and de‑duplicate the two prior docs
- docs/ai-due-diligence-feature-ideas.md
- docs/ai-due-diligence-competitive-features.md
into a single, prioritized plan with milestone checklists.

## Prioritized Features (Top 12)

1) AI VDR Index & Auto‑Tagging (Imprima‑class)
- Auto‑categorize uploads into a diligence index; auto‑tag by doc type, clauses, sensitivity.
- Learns from reviewer corrections; RBAC‑aware suggestions.
- Tech: ingestion workers, `lib/ai/rag`, feedback loop table.

2) Multilingual Smart Redaction (GDPR‑grade)
- PII/sensitive entity detection across key EU languages; policy‑based redaction templates; audit trail.
- Target recall ≥ 95% on supported langs; confidence thresholds + review queue.
- Tech: entity pipeline in `lib/intelligent-analysis`, redaction rendering in `lib/pdf`.

3) Contract Intelligence Studio (Trainable Smart Fields)
- Library for CoC, assignment, MFN, termination, auto‑renewal, SLAs, liability caps; quick‑train custom fields.
- Per‑tenant models, evaluation (precision/recall) and drift tracking; strict no‑train default.
- Tech: embeddings + rules, eval store, UI in `data-rooms/[id]/contracts`.

4) Dataroom Q&A Copilot with Citations
- Ask NL questions across the data room; answers are grounded with citations and “open in context”.
- Guardrails for abstention and RBAC‑aware retrieval.
- Tech: `lib/ai/rag`, `lib/research-gpt`, vector store; `components/ai-chat` UX.

5) Red‑Flag Radar (Explainable)
- Financial/Legal/Operational/Cyber/ESG red flags with severity, confidence, and linked evidence.
- Board‑ready “why” with remediation suggestions.
- Tech: `lib/alerts` unified model, citations from chunks; surfaced in dashboard + notifications.

6) Obligations Calendar & Consent Checklist
- Clause mining feeds obligations (renewals, SLAs, liabilities, CoC consents) with owners and reminders.
- Export consent checklist for closing.
- Tech: obligations table + scheduler; UI timeline.

7) Structured Smart Summaries → Word/Excel/JSON
- Extract structured key points from contracts and corporate docs; export to XLSX/Word/JSON.
- Coverage/confidence metrics; quality gates.
- Tech: `lib/pdf`, `react-pdf`/`xlsx` export.

8) Financial & Revenue Quality Suite
- KPI normalization (ARR, NRR, CAC/LTV, GM) + cohort churn, concentration, AR/AP aging anomalies.
- Peer benchmarking vs. sector medians; exportable charts.
- Tech: `lib/benchmarking`, analytics components, workers.

9) ESG Benchmarking Copilot (26+ Categories)
- Analyze ESG disclosures (GHG, privacy, supply chain, ethics, H&S); compute peer benchmarks and sentiment.
- Board‑ready dashboard and PDF.
- Tech: `lib/benchmarking`, sector datasets, `react-pdf`.

10) Risk Heatmap with Explainability
- Multi‑axis risk scoring (Financial, Legal, Operational, Cyber, ESG, Regulatory) with evidence stack.
- Exportable for IC/board packs.
- Tech: `lib/signals`, `lib/alerts`, explainers via `lib/research-gpt`.

11) Confidentiality & Trust Controls
- Tenant isolation, no retention/training by default, privacy budgets, redaction‑before‑embedding, CMK option.
- Optional air‑gapped/on‑prem inference mode.
- Tech: config toggles, encryption helpers, audit tables, worker policy guardrails.

12) Analyst Workflow Manager & Review QA
- Task assignment, batch review, checklists, inter‑annotator agreement (IAA), SLAs; correction‑to‑model loop.
- Quality dashboards.
- Tech: `lib/collaboration`, `lib/realtime`, tasks in `streams`.

## Next Up (Backlog)
- Sector‑Aware Regulatory & Compliance Checker (by sector/region, gaps + templates).
- Integration Fit & Complexity Scoring (culture/process/stack fit, PMI plan).
- Adverse Media, Litigation, Incident Watch (live during diligence window).
- Deal Hypothesis Tracker (evidence‑linked questions with confidence).
- Cross‑Jurisdiction Clause Comparator (variant risk + suggested redlines).

---

## Milestones & Checklists

Phase 1 (Weeks 1–4)
- [ ] Spec: AI VDR Index & Auto‑Tagging (Owner: TBA)
- [ ] Schema: documents, document_tags, model_feedback (Owner: TBA)
- [ ] Worker: ingestion + auto‑index (Owner: TBA)
- [ ] UI: upload + index view (Owner: TBA)
- [ ] Smart Redaction MVP (3–5 langs) + review queue (Owner: TBA)
- [ ] Structured Smart Summaries MVP + XLSX export (Owner: TBA)
- [ ] Red‑Flag Radar MVP (contracts/financials) (Owner: TBA)
- [ ] E2E tests + sample data room fixtures (Owner: TBA)

Phase 2 (Weeks 5–8)
- [ ] Contract Intelligence Studio (core fields) + eval dashboard (Owner: TBA)
- [ ] Obligations Calendar + reminders + export (Owner: TBA)
- [ ] Q&A Copilot with citations + abstention (Owner: TBA)
- [ ] Financial & Revenue Quality Suite (cohorts, concentration) (Owner: TBA)
- [ ] Confidentiality controls (no‑train, isolation, audit logs) (Owner: TBA)

Phase 3 (Weeks 9–12)
- [ ] ESG Benchmarking Copilot + PDF (Owner: TBA)
- [ ] Risk Heatmap with explainers (Owner: TBA)
- [ ] CMK / air‑gapped inference option (Owner: TBA)
- [ ] Quality dashboards (precision/recall, redaction recall) (Owner: TBA)

Success Metrics (targets)
- [ ] ≥90% reduction in VDR structuring time
- [ ] ≥95% redaction recall on benchmark set
- [ ] ≥80% precision on top smart fields (Studio)
- [ ] 50% faster time‑to‑insight for analysts

---

## Links & Traceability
- Ideas: docs/ai-due-diligence-feature-ideas.md
- Competitive: docs/ai-due-diligence-competitive-features.md
- This roadmap: docs/ai-due-diligence-roadmap.md

Notes
- Respect PII/GDPR throughout; maintain auditable prompts/answers and evidence references.
- Use RBAC per data room; ensure isolation in vector stores and logs.
