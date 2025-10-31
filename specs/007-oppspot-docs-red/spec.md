# Feature Specification: Red Flag Radar (Explainable Risk Detection)

**Feature Branch**: `007-oppspot-docs-red`
**Created**: 2025-10-29
**Status**: Draft
**Input**: User description: "/oppspot/docs/RED_FLAG_RADAR_SPEC.md"

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Input file contains comprehensive implementation spec
2. Extract key concepts from description
   ’ Identified: risk detection, evidence linking, explainability, multi-category flags
3. For each unclear aspect:
   ’ Marked with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   ’ User flows defined for analyst and board member personas
5. Generate Functional Requirements
   ’ All requirements are testable and derived from spec
6. Identify Key Entities (if data involved)
   ’ Entities defined for flags, evidence, runs, actions
7. Run Review Checklist
   ’ [NEEDS CLARIFICATION] markers present for ambiguous areas
8. Return: SUCCESS (spec ready for planning after clarifications)
```

---

## ¡ Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
As a **due diligence analyst or investment committee member**, I need to **automatically detect and track financial, legal, operational, cyber, and ESG risks** across companies and data rooms so that I can **identify critical issues early, understand their root causes through concrete evidence, and prioritize remediation actions with confidence**.

### Acceptance Scenarios

1. **Given** I'm viewing a company dashboard with recent data updates, **When** I navigate to the Red Flag Radar section, **Then** I see a list of detected risks categorized by Financial, Legal, Operational, Cyber, and ESG with severity indicators (Critical, High, Medium, Low) and confidence scores.

2. **Given** a new critical financial risk is detected (e.g., revenue concentration above 80% with top 3 customers), **When** the detection system runs, **Then** I receive a priority notification with a link to the flag, its evidence, and a concise explanation of why it matters.

3. **Given** I'm reviewing a specific red flag, **When** I open the flag detail view, **Then** I see a comprehensive breakdown including: category, severity, confidence score, detection date, status, concrete evidence links (documents, KPIs, alerts, news), a plain-language explanation of the risk, and suggested remediation actions.

4. **Given** I've reviewed a flag and determined it's a false positive, **When** I change its status to "False Positive" and add a note, **Then** the system records my action with timestamp and stops sending alerts for this flag, while maintaining the audit trail.

5. **Given** I need to present findings to the board, **When** I export the Red Flag Radar report to PDF, **Then** I receive a board-ready document with summary metrics, flags grouped by category and severity, explanations, evidence references, and remediation recommendations.

6. **Given** a medium-severity flag has escalated to high-severity, **When** the detection system runs again with updated data, **Then** I receive a notification about the severity increase and the system maintains the history of status changes.

7. **Given** I'm filtering flags by category and status, **When** I select "Legal" and "Open", **Then** the system displays only open legal risks with counts per severity level and allows me to bulk-assign owners or change statuses.

8. **Given** I click on a document evidence link from a flag, **When** the link references a specific page or text chunk, **Then** the system opens the document viewer navigated to that exact location with highlighting.

### Edge Cases

- **What happens when detection runs on incomplete data?** The system should mark the run as "partial" status, flag which detectors succeeded/failed, and show confidence scores reflecting data quality limitations.

- **How does the system handle duplicate or overlapping flags?** The system consolidates flags using fingerprinting (category + normalized title + key attributes), merges evidence, and keeps the most severe instance while logging the deduplication.

- **What happens when evidence sources become unavailable?** The flag and its explanation remain visible, but evidence links show as "Source unavailable" with timestamps indicating when they were last accessible.

- **How does the system handle very large data sets (e.g., 10,000+ documents)?** [NEEDS CLARIFICATION: Performance expectations for extreme scale - should detection be incremental/streaming, or is batch processing with progress indicators acceptable?]

- **What happens when AI classification contradicts rule-based detection?** [NEEDS CLARIFICATION: Conflict resolution strategy - does human review get triggered, or does one source take precedence?]

- **How are multi-language documents handled?** [NEEDS CLARIFICATION: Language support scope - English only, or multi-language detection with translation?]

---

## Requirements

### Functional Requirements

**Detection & Classification**
- **FR-001**: System MUST detect financial red flags including revenue concentration (top 3 customers), negative net revenue retention, accounts receivable aging over 60 days, and days sales outstanding above target thresholds.
- **FR-002**: System MUST detect legal red flags including change-of-control/assignment consent requirements, most-favored-nation clauses, and termination-for-convenience risks in contracts.
- **FR-003**: System MUST detect operational red flags including SLA breach rates, backlog aging, and single-supplier dependencies.
- **FR-004**: System MUST detect cyber security red flags including historical security incidents, missing security policies, and exposed CVEs relevant to the technology stack.
- **FR-005**: System MUST detect ESG red flags including disclosure gaps on material topics, negative sentiment in news, and missing emissions data.
- **FR-006**: System MUST classify each red flag with a category (Financial, Legal, Operational, Cyber, ESG), severity level (Critical, High, Medium, Low), and confidence score (0-1).
- **FR-007**: System MUST support detection for both company entities and data room entities.

**Evidence & Explainability**
- **FR-008**: System MUST link every red flag to concrete evidence including document references (with page numbers and chunk indices), alerts, signals, KPI snapshots, and news items.
- **FR-009**: System MUST provide a plain-language explanation for each flag describing why it matters and what the key risks are.
- **FR-010**: System MUST provide remediation suggestions for each flag with timeframe recommendations.
- **FR-011**: System MUST allow users to click on evidence links and navigate directly to the source document at the specific page or text chunk referenced.
- **FR-012**: Evidence previews MUST be truncated and scrubbed of personally identifiable information (PII).

**Status & Lifecycle Management**
- **FR-013**: System MUST track red flag status through states: Open, Reviewing, Mitigating, Resolved, and False Positive.
- **FR-014**: Users MUST be able to change flag status, assign owners, add notes, snooze notifications, and record remediation actions.
- **FR-015**: System MUST maintain a complete audit trail of all status changes and actions with actor identification and timestamps.
- **FR-016**: System MUST detect when a flag's severity increases and trigger notifications for escalations.
- **FR-017**: System MUST deduplicate and consolidate overlapping flags using fingerprinting based on category, normalized title, and key attributes.

**Notifications & Alerts**
- **FR-018**: System MUST send priority notifications when new Critical or High severity flags are detected.
- **FR-019**: System MUST send notifications when existing flags increase in severity.
- **FR-020**: System MUST map flag severity to alert priority levels [NEEDS CLARIFICATION: Confirm mapping - Critical’P1, High’P2, Medium’P3, Low’no alert?].
- **FR-021**: System MUST support optional daily digest emails/notifications summarizing flags per entity [NEEDS CLARIFICATION: Digest frequency and format preferences?].

**Viewing & Filtering**
- **FR-022**: Users MUST be able to view a list of all red flags for an entity with filters for category, severity, and status.
- **FR-023**: System MUST display flag counts per category with visual indicators (chips/badges).
- **FR-024**: Users MUST be able to search flags by title or description text.
- **FR-025**: Users MUST be able to sort flags by severity, confidence, or last updated date.
- **FR-026**: System MUST provide a detail view for each flag showing full explanation, all evidence, action history, and remediation suggestions.

**Export & Reporting**
- **FR-027**: Users MUST be able to export red flags to PDF format with board-ready formatting including summary page and per-category sections.
- **FR-028**: Users MUST be able to export red flags to CSV format with all flag attributes in tabular form.
- **FR-029**: PDF exports MUST include flag explanations, top evidence references, and remediation recommendations.
- **FR-030**: Users MUST be able to select which flags to include in exports (all, filtered subset, or specific selections).

**Detection Execution**
- **FR-031**: System MUST support manual triggering of detection runs for a specific entity (requires editor/admin permissions).
- **FR-032**: System MUST track detection runs with start time, finish time, detector version, status (success/partial/error), and statistics.
- **FR-033**: System MUST use both rule-based and AI-assisted detection methods to identify flags.
- **FR-034**: System MUST complete detection runs for 12 months of data and 5,000 documents in under 10 seconds [NEEDS CLARIFICATION: Is this a hard requirement or a target? What's acceptable performance for larger data sets?].

**Access Control**
- **FR-035**: System MUST enforce role-based access control where viewers can read flags, editors can change status/assign owners, and admins can trigger detection runs.
- **FR-036**: System MUST restrict flag visibility based on company organization membership or data room membership.
- **FR-037**: System MUST allow analysts to override AI-generated severity or confidence scores with manual overrides tracked in the audit trail.

**Data Management**
- **FR-038**: System MUST retain flag history including resolved and false positive flags for audit purposes [NEEDS CLARIFICATION: How long should flag history be retained?].
- **FR-039**: When evidence sources are deleted, the system MUST preserve flag and evidence metadata while marking sources as unavailable.

### Key Entities

- **Red Flag Run**: Represents a single execution of the detection system for a specific entity. Tracks which detectors ran, when, version information, outcome statistics, and success/partial/error status. Provides audit trail for detection executions.

- **Red Flag**: The core risk entity representing a detected issue. Contains category (Financial, Legal, Operational, Cyber, ESG), severity (Critical, High, Medium, Low), confidence score (0-1), title, description, status (Open, Reviewing, Mitigating, Resolved, False Positive), timestamps (first detected, last updated), fingerprint for deduplication, and metadata including explanations. Links to a detection run and to the entity (company or data room) it affects.

- **Red Flag Evidence**: Supporting proof for a flag. Links to source materials including documents (with page/chunk references), alerts, signals, KPI snapshots, and news items. Contains evidence type, source identifier, title, preview text, citation data (for document location), importance score, and relevance score. Multiple evidence items can support a single flag.

- **Red Flag Action**: Audit trail entry for human interactions with flags. Records action type (assign, note, status change, snooze, remediation), actor (user who took action), payload (action details), and timestamp. Provides complete history of flag lifecycle.

- **Entity (Company or Data Room)**: The subject being analyzed for red flags. A company represents a business being tracked for opportunities/intelligence; a data room represents a collection of due diligence documents. Red flags are always associated with one entity.

- **Evidence Source**: The underlying data being analyzed - documents with text chunks, alerts from monitoring systems, signals from integrations, KPI metrics from analytics, and news articles. These are referenced by evidence records but exist independently.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

**Outstanding Clarifications:**
1. Performance expectations for extreme scale (10,000+ documents) - incremental vs. batch processing
2. Conflict resolution when AI and rule-based detection disagree
3. Language support scope for document analysis
4. Alert severity mapping confirmation (Critical’P1, High’P2, etc.)
5. Digest notification frequency and format preferences
6. Performance requirements - hard constraint vs. target for 10s detection time
7. Flag history retention policy duration

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (pending clarifications)

---
