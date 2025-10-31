# Feature Specification: Risk Heatmap with Explainability

**Feature Branch**: `009-oppspot-docs-risk`
**Created**: 2025-10-29
**Status**: Draft
**Input**: User description: "/oppspot/docs/RISK_HEATMAP_SPEC.md"

## Execution Flow (main)
```
1. Parse user description from Input
   � Loaded comprehensive implementation spec for Risk Heatmap
2. Extract key concepts from description
   � Identified: multi-axis risk scoring, evidence traceability, explainability, board pack export
3. For each unclear aspect:
   � [NEEDS CLARIFICATION: Sector-specific axis weights - should these be configurable per industry?]
   � [NEEDS CLARIFICATION: Human override workflow - who can override and what approval process?]
   � [NEEDS CLARIFICATION: Recompute frequency - nightly batch frequency vs. threshold-based triggers?]
4. Fill User Scenarios & Testing section
   � User scenarios defined for risk analysts and executives
5. Generate Functional Requirements
   � All requirements extracted from spec and marked as testable
6. Identify Key Entities
   � Risk axes, models, factors, scores, evidence identified
7. Run Review Checklist
   � WARN "Spec has uncertainties" - 3 clarifications needed
8. Return: SUCCESS (spec ready for planning after clarifications)
```

---

## � Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-29
- Q: When should the system recalculate risk scores? → A: Real-time on data changes
- Q: How long should historical risk scores be retained? → A: 5 years
- Q: Should risk model factor weights be customized by industry sector? → A: Yes, sector-specific weights
- Q: What approval process should apply for analyst overrides? → A: No approval required
- Q: Should old risk model versions be kept for historical comparison? → A: Yes, keep all versions

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A risk analyst needs to assess the overall risk profile of a target company during M&A due diligence. They open the company's risk dashboard and see a heatmap displaying risk scores across six categories: Financial, Legal, Operational, Cyber, ESG, and Regulatory. Each category is color-coded (green to red) based on severity. The analyst clicks on "Financial" to drill down into the specific risk factors, sees supporting evidence with citations back to source documents, and reads an AI-generated explanation of why the financial risk is rated "High". They then export a board-ready PDF report to share with executives.

### Acceptance Scenarios

1. **Given** a company with recent financial alerts and high revenue concentration, **When** the risk analyst views the risk heatmap, **Then** the Financial axis shows a "High" risk level (60-80 score) with color-coded visualization

2. **Given** a risk score has been computed for a company, **When** the analyst clicks on an axis (e.g., "Legal"), **Then** a drill-down panel opens showing:
   - Individual factor scores with their weights
   - Top 3-5 evidence items with citations (document pages, alerts, KPIs)
   - AI-generated summary explaining the risk level
   - Suggested mitigation actions

3. **Given** the analyst has reviewed the risk heatmap, **When** they click "Export Board Pack", **Then** a PDF is generated containing:
   - Cover page with entity name and date
   - Heatmap overview
   - Detailed pages for each axis with factors, evidence, and explanations
   - Filename format: `risk-pack_{entityName}_{yyyy-mm-dd}.pdf`

4. **Given** a significant risk threshold is crossed (e.g., Cyber risk jumps from Medium to Critical), **When** the system recomputes risk scores, **Then** an alert is triggered and sent to relevant stakeholders with context about the change

5. **Given** a user without proper permissions, **When** they attempt to view risk scores for a company, **Then** access is denied and they see an authorization error

6. **Given** an editor wants to trigger risk recalculation after new documents are uploaded, **When** they click "Recompute Risks", **Then** the system processes all risk factors using latest data and updates the heatmap within 2 seconds

7. **Given** an analyst reviews a Financial risk score and believes it's overstated, **When** they override the score from "High" to "Medium" with reason "Recent Q3 results show improved metrics", **Then** the score is updated immediately, displayed with an override indicator, and logged in the audit trail with analyst ID and timestamp

### Edge Cases
- What happens when a risk factor has no supporting evidence available?
  - System should compute score based on available data and clearly mark factors with limited evidence
- How does system handle missing or incomplete data for certain factors?
  - System should use default weights and mark factors as "insufficient data" in the drill-down view
- What if the LLM fails to generate an explanation?
  - System should fall back to showing factor breakdown without the summary explanation
- How are conflicting evidence items (e.g., one signal says high risk, another says low) resolved?
  - System should aggregate using weighted scoring and show all evidence items in drill-down
- What happens when an entity has no risk scores computed yet?
  - Dashboard should show "Not yet analyzed" state with option to trigger first computation
- What if an entity's sector/industry is not specified or no sector-specific model exists?
  - System should use a default universal risk model with balanced weights across all axes
- What happens when an entity's sector changes (e.g., company pivots from SaaS to FinTech)?
  - System should detect sector change and automatically recompute using the new sector-specific model

---

## Requirements *(mandatory)*

### Functional Requirements

**Risk Computation & Scoring**
- **FR-001**: System MUST compute risk scores across six axes: Financial, Legal, Operational, Cyber, ESG, and Regulatory
- **FR-002**: System MUST calculate axis scores using weighted mean of factor subscores, each normalized to 0-100 scale
- **FR-003**: System MUST classify each axis score into one of four levels: Low (0-30), Medium (30-60), High (60-80), Critical (80-100)
- **FR-004**: System MUST support risk computation for both Company entities and Data Room entities
- **FR-005**: System MUST automatically trigger real-time risk score recalculation immediately when new evidence is ingested (documents indexed, alerts created, signals generated, KPIs updated)
- **FR-006**: System MUST complete risk computation for an entity within 2 seconds when processing up to 200 factors
- **FR-007**: System MUST store computation timestamp, model version, and input hash with each risk score for auditability

**Evidence & Traceability**
- **FR-008**: System MUST link each risk factor to supporting evidence items (documents, alerts, signals, KPIs, contract clauses, news)
- **FR-009**: System MUST provide citations that resolve back to source documents with page numbers and chunk indices
- **FR-010**: System MUST rank evidence items by importance and display top 3-5 items per factor
- **FR-011**: System MUST store evidence preview text, titles, and metadata for quick display without full document loading
- **FR-012**: System MUST support clickable links from evidence items to source documents/pages

**Explainability**
- **FR-013**: System MUST generate AI-powered explanations for each axis score using only provided evidence
- **FR-014**: Explanations MUST include: summary paragraph, key risks with titles and reasons, suggested mitigation actions
- **FR-015**: System MUST cite specific evidence IDs within explanations for traceability
- **FR-016**: System MUST cache generated explanations with model identifier and inputs hash to avoid redundant LLM calls
- **FR-017**: System MUST fall back gracefully when LLM explanation generation fails (show factor breakdown only)

**Alerts & Notifications**
- **FR-018**: System MUST trigger alerts when risk scores cross severity thresholds (e.g., Medium to High)
- **FR-019**: Alerts MUST include axis name, old level, new level, score, and link to drill-down view
- **FR-020**: System MUST support configurable alert severity levels (P1 for Critical, P2 for High)

**User Interface**
- **FR-021**: System MUST display risk heatmap as a grid with axes as rows and color-coded severity scale
- **FR-022**: System MUST show score badges and level labels (Low/Medium/High/Critical) for each axis
- **FR-023**: Users MUST be able to click on any axis to open a drill-down panel
- **FR-024**: Drill-down panel MUST show: factor breakdown with weights, evidence list with previews and links, AI explanation summary
- **FR-025**: Users MUST be able to filter risk view by time window (30/90/365 days)
- **FR-026**: Users MUST be able to select different risk model versions from a complete historical archive, enabling comparison of how risk scores would differ under previous model configurations

**Export & Reporting**
- **FR-027**: System MUST allow authorized users to export board pack as PDF
- **FR-028**: Exported PDF MUST include: cover page, heatmap overview, per-axis detailed sections, evidence lists with citations, explanations
- **FR-029**: PDF MUST be generated within 5 seconds for typical entity with 6 axes
- **FR-030**: PDF filename MUST follow format: `risk-pack_{entityName}_{yyyy-mm-dd}.pdf`

**Data Management**
- **FR-031**: System MUST persist risk inputs from multiple sources: signals, alerts, KPIs, document analysis
- **FR-032**: System MUST support configurable factor weights per risk model
- **FR-033**: System MUST support sector-specific risk model configurations where axis and factor weights are customized by industry (e.g., Financial axis weighted higher for FinTech, Operational axis weighted higher for Manufacturing)
- **FR-034**: System MUST allow authorized analysts to override risk scores or severity levels immediately without approval, requiring a text reason for each override, and MUST log all overrides with user ID, timestamp, original value, new value, and reason in an immutable audit trail
- **FR-035**: System MUST retain historical risk scores for 5 years to support trend analysis and audit requirements, with automated archival of older records
- **FR-043**: System MUST preserve all risk model versions indefinitely to enable historical analysis, model comparison, and recalculation of past scores using different model configurations

**Access Control & Security**
- **FR-036**: System MUST restrict risk score viewing to members of the entity's organization or data room
- **FR-037**: System MUST restrict risk recomputation to users with Editor or Admin roles
- **FR-038**: System MUST restrict export functionality to users with Editor or Admin roles
- **FR-039**: System MUST redact PII from AI-generated explanations unless required for context
- **FR-040**: System MUST log all recompute triggers, export actions, and analyst overrides with user ID, timestamp, and action details in an immutable audit log

**Performance & Scalability**
- **FR-041**: System MUST return latest risk scores via API within 300ms including top evidence (with pagination for large evidence sets)
- **FR-042**: System MUST support real-time recomputation triggered by evidence ingestion events, processing affected entities immediately to keep risk scores current

### Key Entities

- **Risk Axis**: Represents a category of risk (Financial, Legal, Operational, Cyber, ESG, Regulatory). Each axis has a unique key, title, and description.

- **Risk Model**: Defines a versioned configuration of how risks are computed. Includes model name, version identifier, active status, and sector/industry targeting. Different models can be created for different sectors (FinTech, Manufacturing, Healthcare, etc.) with customized axis and factor weights that reflect industry-specific risk profiles. All model versions are preserved indefinitely to support historical comparison, model evolution analysis, and "what-if" recalculation of past risk scores under different configurations.

- **Risk Factor**: A specific measurable component within a risk axis (e.g., "Revenue Concentration" under Financial). Has a weight (0-1), aggregation method, and belongs to a specific model and axis.

- **Risk Score**: A computed risk value for an entity-axis combination. Includes numeric score (0-100), severity level (Low/Medium/High/Critical), computation timestamp, and detailed breakdown in JSON format.

- **Risk Input**: Raw data point used in risk calculation. Includes source identifier, key, numeric or text value, units, and collection timestamp. Links back to originating system (signals, alerts, KPIs).

- **Risk Evidence**: Supporting documentation for a risk score. Links to source documents, alerts, signals, or KPIs. Includes preview text, importance ranking, citation data (page numbers, chunk indices), and URLs for drill-through.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved (5 clarifications completed)
- [x] User scenarios defined (7 acceptance scenarios)
- [x] Requirements generated (43 functional requirements)
- [x] Entities identified (6 key entities)
- [x] Review checklist passed

---
