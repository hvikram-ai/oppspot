# AI Due Diligence — Competitive Feature Plan

Source signals: Public descriptions of Kira.ai (contract analysis, smart fields, confidentiality), Imprima AI (AI VDR index, smart summaries, multilingual smart redaction), and Diligent (ESG LLM benchmarking). This plan proposes 10 features to match and leapfrog those capabilities within oppSpot.

## 1) Contract Intelligence Studio (Trainable Smart Fields)
- Match Kira “smart fields” with a built‑in library (CoC, assignment, MFN, termination, auto‑renewal, SLAs, exclusivity, indemnity, liability caps).
- Quick‑train custom fields from a few examples (“quick study”), with evaluation (precision/recall) and drift tracking.
- Differential privacy‑style learning modes: org‑private, tenant‑shared, global opt‑in; strict “no-train” mode by default.
- Tech fit: `lib/pdf`, embeddings + rule hybrids, per‑tenant models + eval store; UI in `data-rooms/[id]/contracts`.

## 2) AI‑Powered VDR Index & Auto‑Tagging
- Match Imprima’s AI VDR Index: auto‑categorize uploads into a diligence index and auto‑tag by doc type, clause types, sensitivity.
- Incremental learning: improves from reviewer corrections; RBAC‑aware suggestions.
- Tech fit: ingest workers + `lib/ai/rag`, queue in `lib/queue`, feedback loop table for corrections.

## 3) Multilingual Smart Redaction (GDPR‑Grade)
- Match/extend Imprima Smart Redaction with multi‑language PII/sensitive entity detection (names, emails, IBANs, trade secrets) and policy‑based redaction templates.
- Review queue with confidence thresholds, batch approve, audit logs; target recall ≥ 95% on supported languages.
- Tech fit: `lib/intelligent-analysis` entity pipeline, redaction rendering in `lib/pdf`, evidence logs in `alerts_audit`.

## 4) Structured Smart Summaries → Word/Excel/JSON
- Match Smart Summaries: extract structured key data points from contracts, corporate docs, policies; export to Excel/Word and JSON for downstream use.
- Coverage tracking (what fields populated, confidence) and quality gates.
- Tech fit: `lib/pdf` structure extraction + `react-pdf`/`xlsx` export, coverage metrics table.

## 5) ESG Benchmarking Copilot (26+ Categories)
- Match Diligent: analyze sustainability/ESG reports across 26+ categories (GHG, privacy, supply chain, ethics, H&S) and compute peer benchmarks.
- ESG sentiment and disclosure completeness; board‑ready dashboards and PDF.
- Tech fit: `lib/benchmarking`, `lib/research-gpt`, sector datasets; UI `components/analytics/esg-*`.

## 6) Red‑Flag Radar with Explainable Evidence
- Auto‑surface Financial/Legal/Operational/Cyber/ESG red flags with severity, confidence, and citations (page/snippet links).
- Board‑ready “Why” explanations and remediation suggestions.
- Tech fit: `lib/alerts` unified model, citations from RAG chunks; surfaced in dashboards and emails/slack.

## 7) Obligations Calendar & Consent Checklist
- Clause mining feeds an obligations timeline (renewals, SLAs, liabilities, CoC consents) with owners, due dates, and auto‑reminders.
- Export consent checklist for closing; track status.
- Tech fit: obligations table + events scheduler, `components/data-room/obligations` UI.

## 8) Confidentiality & Trust Controls (Beyond Competitors)
- Strict “no retention/no training” default; tenant data isolation; customer‑managed keys (CMK); optional on‑prem/air‑gapped inference.
- Privacy budgets and redaction before embedding; comprehensive audit trails for regulators.
- Tech fit: config in `lib/config`, encryption helpers, audit tables, policy guardrails in workers.

## 9) Analyst Workflow Manager & Review QA
- Workflow akin to Kira’s manager: task assignment, batch review, inter‑annotator agreement (IAA), SLAs, and checklists.
- Correction‑to‑model loop with quality dashboards.
- Tech fit: `lib/collaboration`, `lib/realtime`, task entities in `streams`, quality reports.

## 10) Cross‑Jurisdiction Clause Comparator
- Compare clause variants across contracts/languages/jurisdictions; flag risky deviations and propose safer alternate language.
- Similarity search for precedent language; export redlines and rationale.
- Tech fit: embeddings per clause, comparator service, UI diff viewer.

---

## Differentiators vs. Kira / Imprima / Diligent
- Grounded answers with clickable citations across all features (trust and auditability).
- Hybrid detection (rules + LLM) with measurable quality (precision/recall by field); visible to users.
- Air‑gapped/tenant‑isolated processing, privacy budgets, CMK — enterprise‑grade controls.
- Tight integration with oppSpot modules (Signals, Data Rooms, Streams, Research GPT) and UK/IE data sources.

## Rollout Plan (90 Days)
- Phase 1 (Weeks 1–4): VDR Index, Smart Redaction (top 5 languages), Structured Summaries, Red‑Flag Radar MVP.
- Phase 2 (Weeks 5–8): Contract Intelligence Studio (core smart fields), Obligations Calendar, Workflow Manager.
- Phase 3 (Weeks 9–12): ESG Copilot, Cross‑Jurisdiction Comparator, privacy/CMK options, quality dashboards.

## Implementation Notes
- New tables: `documents`, `document_tags`, `extractions`, `obligations`, `redactions`, `esg_metrics`, `alerts_audit`, `model_feedback`.
- Workers: ingestion, OCR, vectorization, extraction, redaction, benchmarking, alerts.
- Guardrails: RBAC per data room, PII scrubbing before embeddings, audit of prompts/answers.

## Success Metrics
- 90%+ reduction in VDR structuring time; ≥95% redaction recall on benchmarks; ≥80% precision on top smart fields; time‑to‑insight cut by 50%.

