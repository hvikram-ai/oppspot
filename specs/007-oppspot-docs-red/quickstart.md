# Quickstart Guide: Red Flag Radar

**Feature**: Red Flag Radar (Explainable Risk Detection)
**Purpose**: Manual validation of functional requirements via integration tests
**Status**: Test scenarios ready for implementation

## Overview

This quickstart guide provides step-by-step integration test scenarios derived from the acceptance criteria in `spec.md`. Each scenario validates a specific user story and can be automated with Playwright E2E tests.

---

## Prerequisites

1. **Test Environment**: Local development server running on `http://localhost:3001`
2. **Test Database**: Seeded with test data:
   - Company: `test-company-001` with recent data updates
   - Data Room: `test-dataroom-001` with uploaded documents
   - User: `analyst@oppspot.test` (editor role)
   - User: `viewer@oppspot.test` (viewer role)
3. **Test Fixtures**:
   - Sample financial data with revenue concentration >80%
   - Sample contract with termination-for-convenience clause
   - Sample KPI data showing SLA breaches

---

## Scenario 1: View Red Flag List with Filters

**User Story**: As an analyst, I want to view a list of detected risks with filters so I can focus on specific categories or severity levels.

### Test Steps

1. **Setup**:
   - Authenticate as `analyst@oppspot.test`
   - Navigate to company dashboard `/companies/test-company-001`

2. **Navigate to Red Flags**:
   ```
   Click: "Risk Assessment" tab
   Wait: Red flag list loads
   ```

3. **Verify List Display**:
   - Assert: Page title = "Red Flag Radar"
   - Assert: Flag cards visible with category badges
   - Assert: Severity indicators (Critical/High/Medium/Low) displayed
   - Assert: Summary counts show: { total, by_category, by_severity, by_status }

4. **Apply Category Filter**:
   ```
   Click: "Financial" category chip
   Wait: List refreshes
   Assert: All visible flags have category="financial"
   Assert: URL includes query param: category=financial
   ```

5. **Apply Severity Filter**:
   ```
   Click: "Critical" severity filter
   Wait: List refreshes
   Assert: All visible flags have severity="critical"
   Assert: URL includes query params: category=financial&severity=critical
   ```

6. **Apply Status Filter**:
   ```
   Select: Status dropdown = "Open"
   Wait: List refreshes
   Assert: All visible flags have status="open"
   ```

7. **Search by Text**:
   ```
   Type: "revenue" in search box
   Wait: List refreshes
   Assert: Visible flag titles contain "revenue" (case-insensitive)
   ```

8. **Clear Filters**:
   ```
   Click: "Clear all filters" button
   Wait: List refreshes
   Assert: All flags visible again
   Assert: URL has no filter query params
   ```

**Expected Result**: User can filter flags by category, severity, status, and search text. Filters work independently and in combination.

**Playwright Test File**: `tests/e2e/red-flags-list.spec.ts`

---

## Scenario 2: Receive Notification for New Critical Flag

**User Story**: As an analyst, I want to receive immediate notifications when critical risks are detected so I can respond quickly.

### Test Steps

1. **Setup**:
   - Authenticate as `analyst@oppspot.test`
   - Subscribe to notifications for `test-company-001`
   - Navigate to dashboard

2. **Trigger Detection Run**:
   ```
   Navigate: /companies/test-company-001/red-flags
   Click: "Recompute Flags" button
   Assert: Toast notification = "Detection run started"
   ```

3. **Wait for Completion**:
   ```
   Wait: Detection run completes (poll status endpoint)
   Assert: Run status = "success"
   Assert: stats.flags_new > 0
   ```

4. **Verify Notification Received**:
   ```
   Wait: Notification bell icon shows badge (new notification count)
   Click: Notification bell
   Assert: Top notification:
     - Type: "red_flag_detected"
     - Severity: P1 (critical)
     - Title: Contains flag title
     - Link: Points to flag detail view
   ```

5. **Click Notification Link**:
   ```
   Click: Notification link
   Assert: Redirects to flag detail page
   Assert: Flag severity = "critical"
   Assert: Flag status = "open"
   ```

**Expected Result**: User receives a P1 notification when a new critical flag is detected, with a direct link to the flag detail.

**Playwright Test File**: `tests/e2e/red-flags-notifications.spec.ts`

---

## Scenario 3: Review Flag Detail with Evidence

**User Story**: As an analyst, I want to see a comprehensive breakdown of a flag with supporting evidence so I can understand the risk and its sources.

### Test Steps

1. **Setup**:
   - Authenticate as `analyst@oppspot.test`
   - Seed database with flag: `financial-revenue-concentration-001` having:
     - 3 document evidence items
     - 2 KPI evidence items
     - 1 alert evidence item

2. **Navigate to Flag Detail**:
   ```
   Navigate: /companies/test-company-001/red-flags
   Click: First flag card (title contains "Revenue Concentration")
   Wait: Detail drawer opens
   ```

3. **Verify Flag Metadata**:
   ```
   Assert: Drawer title = flag.title
   Assert: Category badge = "Financial"
   Assert: Severity badge = "Critical"
   Assert: Confidence score = 0.92
   Assert: Status = "Open"
   Assert: First detected date displayed
   Assert: Last updated date displayed
   ```

4. **Verify Explanation Section**:
   ```
   Assert: Section heading = "Why This Matters"
   Assert: Explanation text present (flag.meta.explainer.why)
   Assert: Explanation text length > 100 chars
   ```

5. **Verify Evidence List**:
   ```
   Assert: Section heading = "Evidence"
   Assert: Evidence items count = 6
   Assert: Evidence sorted by importance (desc)
   For each evidence item:
     - Assert: Type badge displayed (Document, KPI, Alert)
     - Assert: Title displayed
     - Assert: Preview text displayed (max 200 chars)
     - Assert: "View Source" link present
   ```

6. **Click Evidence Link**:
   ```
   Click: First document evidence "View Source" link
   Wait: Document viewer opens
   Assert: Document page navigated to page_number from citation
   Assert: Text chunk highlighted (if chunk_index present)
   ```

7. **Verify Remediation Section**:
   ```
   Assert: Section heading = "Recommended Remediation"
   Assert: Remediation text present (flag.meta.explainer.suggested_remediation)
   Assert: Timeframe displayed
   ```

8. **Verify Action History**:
   ```
   Assert: Section heading = "Action History"
   Assert: Actions sorted by created_at (desc)
   For each action:
     - Assert: Action type displayed
     - Assert: Actor name displayed
     - Assert: Timestamp displayed
   ```

**Expected Result**: Flag detail view shows all metadata, explanation, evidence with citations, remediation suggestions, and action history.

**Playwright Test File**: `tests/e2e/red-flags-detail.spec.ts`

---

## Scenario 4: Mark Flag as False Positive

**User Story**: As an analyst, I want to mark incorrect flags as false positives so the system learns and stops alerting on them.

### Test Steps

1. **Setup**:
   - Authenticate as `analyst@oppspot.test`
   - Navigate to flag detail for `operational-sla-breach-001` (status="open")

2. **Change Status to False Positive**:
   ```
   Click: "Change Status" dropdown
   Select: "False Positive"
   Wait: Reason dialog appears
   ```

3. **Provide Reason**:
   ```
   Type: "SLA breach was due to planned maintenance window"
   Click: "Confirm" button
   Wait: Status updates
   ```

4. **Verify Status Updated**:
   ```
   Assert: Status badge = "False Positive"
   Assert: Status badge color = gray (not red/yellow)
   Assert: Toast notification = "Flag marked as false positive"
   ```

5. **Verify Action Logged**:
   ```
   Scroll: Action History section
   Assert: Most recent action:
     - action_type = "status_change"
     - from = "open"
     - to = "false_positive"
     - reason = "SLA breach was due to planned maintenance window"
     - actor = "analyst@oppspot.test"
     - timestamp = within last 5 seconds
   ```

6. **Verify No Further Alerts**:
   ```
   Navigate: Back to flag list
   Assert: Flag still visible but grayed out
   Navigate: Notifications
   Assert: No new notifications for this flag
   ```

7. **Verify Exclusion from Exports**:
   ```
   Navigate: /companies/test-company-001/red-flags
   Click: "Export" button
   Select: Format = PDF, include_false_positives = false
   Download: PDF
   Assert: PDF does not contain this flag
   ```

**Expected Result**: Flag is marked as false positive, action is logged, and the flag is excluded from future alerts and default exports.

**Playwright Test File**: `tests/e2e/red-flags-actions.spec.ts`

---

## Scenario 5: Export Flags to PDF

**User Story**: As an analyst, I want to export flags to a board-ready PDF so I can present findings to stakeholders.

### Test Steps

1. **Setup**:
   - Authenticate as `analyst@oppspot.test`
   - Seed database with 15 flags across all categories
   - Navigate to `/companies/test-company-001/red-flags`

2. **Open Export Dialog**:
   ```
   Click: "Export" button (top right)
   Wait: Export dialog opens
   ```

3. **Configure Export**:
   ```
   Select: Format = "PDF"
   Check: Include explanations = true
   Check: Include evidence = true
   Check: Include remediation = true
   Uncheck: Include resolved = false
   Uncheck: Include false positives = false
   ```

4. **Apply Filters** (optional):
   ```
   Select: Categories = ["Financial", "Legal"]
   Select: Severities = ["Critical", "High"]
   ```

5. **Trigger Export**:
   ```
   Click: "Generate Export" button
   Wait: Progress indicator appears
   Wait: File download starts (or 202 response if async)
   ```

6. **Verify Export File**:
   ```
   Assert: File downloaded = "red-flags-<entity-name>-<date>.pdf"
   Assert: File size > 0 bytes
   Open: PDF file
   ```

7. **Verify PDF Contents**:
   ```
   Page 1 (Summary):
     - Assert: Title = "Red Flag Radar Report"
     - Assert: Entity name displayed
     - Assert: Export date displayed
     - Assert: Summary counts:
       - Total flags
       - Breakdown by category (Financial: X, Legal: Y, etc.)
       - Breakdown by severity (Critical: X, High: Y, etc.)

   Subsequent Pages (Category Sections):
     For each category with flags:
       - Assert: Section header = Category name
       - Assert: Flags sorted by severity (desc)
       - For each flag:
         - Assert: Title displayed
         - Assert: Severity badge
         - Assert: Explanation present
         - Assert: Top 3 evidence items listed
         - Assert: Remediation suggestion present
   ```

8. **Verify Filtering Applied**:
   ```
   Assert: Only Financial and Legal categories present
   Assert: Only Critical and High severity flags present
   Assert: No resolved or false_positive flags present
   ```

**Expected Result**: PDF export contains board-ready summary page, per-category sections with flags, explanations, and remediation suggestions.

**Playwright Test File**: `tests/e2e/red-flags-export.spec.ts`

---

## Scenario 6: Handle Severity Escalation

**User Story**: As an analyst, I want to be notified when a flag's severity increases so I can respond to deteriorating conditions.

### Test Steps

1. **Setup**:
   - Authenticate as `analyst@oppspot.test`
   - Seed database with flag: `financial-ar-aging-001` (severity="medium", status="open")
   - Seed KPI data showing AR aging days increasing from 45 to 65

2. **Trigger Detection Run**:
   ```
   Navigate: /companies/test-company-001/red-flags
   Click: "Recompute Flags" button
   Wait: Detection completes
   ```

3. **Verify Severity Increased**:
   ```
   Navigate: Flag detail for `financial-ar-aging-001`
   Assert: Severity badge = "High" (was "medium")
   Assert: Last updated timestamp = recent (within 1 minute)
   ```

4. **Verify Escalation Notification**:
   ```
   Click: Notification bell
   Assert: Top notification:
     - Type: "red_flag_escalated"
     - Severity: P2 (high)
     - Title: Contains "Severity increased: Medium → High"
     - Body: Contains flag title
     - Link: Points to flag detail
   ```

5. **Verify Action History Records Escalation**:
   ```
   Navigate: Flag detail
   Scroll: Action History
   Assert: Recent action (auto-generated):
     - action_type = "status_change" (or "severity_escalation")
     - payload.from = "medium"
     - payload.to = "high"
     - payload.reason = "Threshold exceeded: AR aging 65 days > 60 days"
     - actor_id = null (system-generated)
   ```

**Expected Result**: System detects severity increase, sends notification, and logs escalation in action history.

**Playwright Test File**: `tests/e2e/red-flags-escalation.spec.ts`

---

## Scenario 7: Filter by Multiple Categories and Status

**User Story**: As an analyst, I want to filter by multiple categories and statuses simultaneously so I can focus on specific risk profiles.

### Test Steps

1. **Setup**:
   - Authenticate as `analyst@oppspot.test`
   - Seed database with 50 flags across all categories and statuses
   - Navigate to `/companies/test-company-001/red-flags`

2. **Apply Multi-Category Filter**:
   ```
   Click: "Financial" category chip
   Click: "Legal" category chip (while holding Ctrl/Cmd)
   Wait: List refreshes
   Assert: URL = "?category=financial,legal"
   Assert: All visible flags have category IN ["financial", "legal"]
   Assert: Summary shows counts for Financial + Legal only
   ```

3. **Add Status Filter**:
   ```
   Select: Status dropdown = "Open"
   Wait: List refreshes
   Assert: URL = "?category=financial,legal&status=open"
   Assert: All visible flags have status="open"
   ```

4. **Verify Summary Counts**:
   ```
   Assert: Summary.total = count of flags matching filters
   Assert: Summary.by_category shows only Financial and Legal
   Assert: Summary.by_status shows only Open
   ```

5. **Remove One Category**:
   ```
   Click: "Financial" chip to deselect
   Wait: List refreshes
   Assert: URL = "?category=legal&status=open"
   Assert: Only Legal flags visible
   ```

**Expected Result**: Multiple filters work together, URL reflects filter state, and summary counts update accordingly.

**Playwright Test File**: `tests/e2e/red-flags-list.spec.ts`

---

## Scenario 8: Navigate to Evidence Source from Flag

**User Story**: As an analyst, I want to click on evidence links and navigate directly to the source document so I can verify findings.

### Test Steps

1. **Setup**:
   - Authenticate as `analyst@oppspot.test`
   - Seed database with:
     - Document: `contract-001.pdf` (10 pages)
     - Document chunk: page 5, chunk 3 (contains termination clause)
     - Flag: `legal-termination-risk-001` with evidence pointing to this chunk

2. **Navigate to Flag Detail**:
   ```
   Navigate: /companies/test-company-001/red-flags
   Click: Flag card with title "Termination for Convenience Risk"
   Wait: Detail drawer opens
   ```

3. **Locate Document Evidence**:
   ```
   Scroll: Evidence section
   Find: Evidence item with type="document", title="contract-001.pdf"
   Assert: Preview text contains excerpt from termination clause
   Assert: Citation shows: Page 5, Chunk 3
   ```

4. **Click Evidence Link**:
   ```
   Click: "View Source" button on evidence item
   Wait: Document viewer opens (new tab or modal)
   ```

5. **Verify Navigation to Exact Location**:
   ```
   Assert: Document viewer URL contains: document_id=contract-001&page=5
   Assert: Page selector shows: "Page 5 of 10"
   Assert: Highlighted text visible (chunk 3 content)
   Assert: Highlighted text matches evidence.preview
   ```

6. **Test Evidence Link for Alert**:
   ```
   Navigate: Back to flag detail
   Click: Evidence item with type="alert"
   Wait: Redirects to /alerts/<alert-id>
   Assert: Alert detail page loads
   Assert: Alert severity and title match evidence citation
   ```

7. **Test Evidence Link for KPI**:
   ```
   Navigate: Back to flag detail
   Click: Evidence item with type="kpi"
   Wait: Redirects to /analytics/kpis/<kpi-id>
   Assert: KPI detail page loads with chart
   Assert: Threshold line and actual value visible
   ```

**Expected Result**: Evidence links navigate to exact source locations (document page/chunk, alert detail, KPI detail) for all evidence types.

**Playwright Test File**: `tests/e2e/red-flags-evidence-navigation.spec.ts`

---

## Running the Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Seed test database
npm run db:seed:test
```

### Run All Scenarios
```bash
# Run all red flag tests
npm run test:e2e -- red-flags

# Run specific scenario
npm run test:e2e -- red-flags-list.spec.ts

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run headed (see browser)
npm run test:e2e:headed
```

### Expected Results

All scenarios should pass with:
- ✅ All assertions satisfied
- ✅ No console errors
- ✅ Response times < 500ms (95th percentile)
- ✅ No memory leaks

---

## Test Data Fixtures

### Required Test Entities

**Company**: `test-company-001`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174001",
  "name": "Acme Corp",
  "organization_id": "org-test-001"
}
```

**Users**:
```json
[
  {
    "id": "user-analyst-001",
    "email": "analyst@oppspot.test",
    "role": "editor"
  },
  {
    "id": "user-viewer-001",
    "email": "viewer@oppspot.test",
    "role": "viewer"
  }
]
```

**Sample Flags**:
```json
[
  {
    "id": "flag-financial-001",
    "category": "financial",
    "severity": "critical",
    "title": "Revenue Concentration Risk",
    "confidence": 0.92,
    "status": "open"
  },
  {
    "id": "flag-legal-001",
    "category": "legal",
    "severity": "high",
    "title": "Termination for Convenience Risk",
    "confidence": 0.85,
    "status": "open"
  }
]
```

---

## Success Criteria

All 8 scenarios pass, validating:
- ✅ FR-022: List view with filters
- ✅ FR-018: Notifications for critical flags
- ✅ FR-026: Detail view with evidence
- ✅ FR-014: Status change actions
- ✅ FR-027: PDF export
- ✅ FR-016: Severity escalation detection
- ✅ FR-022: Multi-filter support
- ✅ FR-011: Evidence source navigation

---

This quickstart guide is ready for implementation. Tests should be written using these scenarios as specifications, then implementation can begin following TDD principles (tests fail → implement → tests pass).
