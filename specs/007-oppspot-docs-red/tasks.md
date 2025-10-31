# Tasks: Red Flag Radar (Explainable Risk Detection)

**Input**: Design documents from `/home/vik/oppspot/specs/007-oppspot-docs-red/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Tech stack: TypeScript 5.x, Next.js 15 App Router, Supabase, OpenRouter
   ✓ Structure: Next.js integrated frontend/backend (app/, lib/, components/)
2. Load optional design documents:
   ✓ data-model.md: 4 entities (red_flag_runs, red_flags, red_flag_evidence, red_flag_actions)
   ✓ contracts/: 5 OpenAPI specs (list, detail, recompute, actions, export)
   ✓ research.md: 12 technical decisions documented
   ✓ quickstart.md: 8 integration test scenarios
3. Generate tasks by category:
   ✓ Setup: Dependencies, migrations, types
   ✓ Tests: 5 contract tests + 8 E2E tests
   ✓ Core: 5 detectors, services, evidence linking
   ✓ Implementation: API routes, UI components
   ✓ Integration: Alerts, explainability, exports
   ✓ Polish: Performance, documentation
4. Apply task rules:
   ✓ Different files = marked [P] for parallel
   ✓ Same file = sequential (no [P])
   ✓ Tests before implementation (TDD)
5. Number tasks sequentially (T001-T060)
6. Validation:
   ✓ All 5 contracts have corresponding tests
   ✓ All 4 entities have migration tasks
   ✓ All 8 user stories have E2E tests
   ✓ Tests come before implementation
```

**Total Tasks**: 60 tasks across 6 phases
**Estimated Duration**: 6-8 weeks (1-2 sprints per phase)

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Exact file paths included in task descriptions
- Dependencies noted explicitly

---

## Phase 1: Setup & Infrastructure (5 tasks)

### T001: ✅ Install new dependencies
**File**: `package.json`
**Description**: Add Red Flag Radar dependencies to package.json:
- `@react-pdf/renderer` for PDF export generation
- `csv-stringify` for CSV export
- Verify existing dependencies: `zod` (validation), `zustand` (state), OpenRouter client

**Commands**:
```bash
npm install --legacy-peer-deps @react-pdf/renderer csv-stringify
```

**Acceptance Criteria**:
- Dependencies added to package.json
- No peer dependency conflicts
- npm install completes successfully

---

### T002: ✅ [P] Create database migration for red_flag_runs table
**File**: `supabase/migrations/20251029000001_red_flags_schema.sql`
**Description**: Create the `red_flag_runs` table with:
- Columns: id (uuid pk), entity_type, entity_id, started_at, finished_at, detector_version, stats (jsonb), status
- Constraints: CHECK entity_type IN ('company', 'data_room'), CHECK status IN ('running', 'success', 'partial', 'error')
- Constraint: finished_at >= started_at
- Indexes: (entity_type, entity_id, started_at DESC), (status, started_at DESC)

**Reference**: data-model.md Migration 1 & 2

**Acceptance Criteria**:
- Migration file creates table with correct schema
- Constraints enforce valid data
- Indexes optimize query patterns

---

### T003: ✅ [P] Create database migration for red_flags table
**File**: `supabase/migrations/20251029000001_red_flags_schema.sql` (same file as T002)
**Description**: In same migration, create the `red_flags` table with:
- Columns: id, entity_type, entity_id, category, title, description, severity, confidence, status, timestamps, run_id (FK), fingerprint, meta (jsonb), owner_id, snoozed_until
- Constraints: CHECK category IN (...5 categories), CHECK severity IN (...4 levels), CHECK status IN (...5 states)
- Unique constraint: (entity_type, entity_id, fingerprint)
- Indexes: (entity_type, entity_id, category, severity, status), (fingerprint), (severity) WHERE status NOT IN ('resolved', 'false_positive')

**Reference**: data-model.md Migration 1 & 2

**Acceptance Criteria**:
- Table created with all columns and constraints
- Unique fingerprint constraint prevents duplicates
- Partial index optimizes open flags queries

---

### T004: ✅ [P] Create database migration for red_flag_evidence and red_flag_actions tables
**File**: `supabase/migrations/20251029000001_red_flags_schema.sql` (same file as T002-T003)
**Description**: In same migration, create both tables:

**red_flag_evidence**:
- Columns: id, flag_id (FK CASCADE), evidence_type, source_id, title, preview, citation (jsonb), importance, score, url, page_number, chunk_index, created_at
- Constraints: CHECK evidence_type IN (...5 types), CHECK preview length <= 200
- Indexes: (flag_id, evidence_type, importance DESC), (evidence_type, source_id)

**red_flag_actions**:
- Columns: id, flag_id (FK CASCADE), action_type, actor_id, payload (jsonb), created_at
- Constraints: CHECK action_type IN (...6 types)
- RULES: Prevent UPDATE and DELETE (immutable audit log)
- Indexes: (flag_id, created_at DESC), (actor_id, created_at DESC)

**Reference**: data-model.md Migration 1 & 2

**Acceptance Criteria**:
- Both tables created with correct schemas
- CASCADE deletes work correctly
- Immutability rules prevent modifications to actions

---

### T005: ✅ [P] Create RLS policies for all red flag tables
**File**: `supabase/migrations/20251029000003_red_flags_rls.sql`
**Description**: Enable RLS and create policies:
- Helper function: `user_has_entity_access(entity_type, entity_id, user_id)`
- Policies for each table checking entity access
- red_flag_runs: SELECT (all with access), INSERT (editors only)
- red_flags: SELECT (all with access), UPDATE (editors only)
- red_flag_evidence: SELECT (inherit from parent flag)
- red_flag_actions: SELECT (inherit), INSERT (all with access, actor_id must match auth.uid())

**Reference**: data-model.md Migration 3

**Acceptance Criteria**:
- RLS enabled on all 4 tables
- Helper function works for both companies and data_rooms
- Policies enforce proper access control
- Editors can modify, viewers are read-only

---

## Phase 2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE PHASE 3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### T006: ✅ [P]: Contract test for GET red-flags list API
**File**: `tests/contract/red-flags-list.contract.test.ts`
**Description**: Write contract test validating API schema per `contracts/api-red-flags-list.yaml`:
- Request: GET /api/companies/[id]/red-flags with query params (status, category, severity, search, sort, page, limit)
- Response 200: Validate schema { data: RedFlagListItem[], pagination, summary }
- Response 401/403/404: Validate error schemas
- Test with data-rooms variant as well

**Reference**: contracts/api-red-flags-list.yaml

**Acceptance Criteria**:
- Test asserts request/response schemas match OpenAPI spec
- Test FAILS (route not implemented yet)
- Test covers auth errors and not found cases

---

### T007: ✅ [P]: Contract test for GET red-flags detail API
**File**: `tests/contract/red-flags-detail.contract.test.ts`
**Description**: Write contract test per `contracts/api-red-flags-detail.yaml`:
- Request: GET /api/companies/[id]/red-flags/[flagId]
- Response 200: Validate RedFlagDetail schema with evidence array, actions array, explainer
- Validate citation types (DocumentCitation, AlertCitation, etc.)

**Reference**: contracts/api-red-flags-detail.yaml

**Acceptance Criteria**:
- Schema validation covers all nested objects
- Test FAILS (route not implemented)

---

### T008: ✅ [P]: Contract test for POST recompute API
**File**: `tests/contract/red-flags-recompute.contract.test.ts`
**Description**: Write contract test per `contracts/api-red-flags-recompute.yaml`:
- Request: POST /api/companies/[id]/red-flags/recompute with optional body { detectors, force }
- Response 202: Validate { run_id, status: 'running', started_at, poll_url }
- Response 400: Recent run exists without force=true
- Response 403: Non-editor users
- GET /api/.../red-flags/runs/[runId]: Validate RunStatus schema

**Reference**: contracts/api-red-flags-recompute.yaml

**Acceptance Criteria**:
- Tests async execution pattern (202 Accepted)
- Tests rate limiting and permissions
- Test FAILS (routes not implemented)

---

### T009: ✅ [P]: Contract test for POST actions API
**File**: `tests/contract/red-flags-actions.contract.test.ts`
**Description**: Write contract test per `contracts/api-red-flags-actions.yaml`:
- Request: POST /api/companies/[id]/red-flags/[flagId]/actions
- Test all 6 action types (assign, note, status_change, snooze, remediation, override)
- Response 201: Validate ActionResponse schema
- Response 400: Invalid status transition, missing reason for overrides

**Reference**: contracts/api-red-flags-actions.yaml

**Acceptance Criteria**:
- Tests all action type schemas with discriminator
- Validates error cases (invalid transitions, missing fields)
- Test FAILS (route not implemented)

---

### T010: ✅ [P]: Contract test for GET export API
**File**: `tests/contract/red-flags-export.contract.test.ts`
**Description**: Write contract test per `contracts/api-red-flags-export.yaml`:
- Request: GET /api/companies/[id]/red-flags/export?format=pdf&...filters
- Response 200: Binary PDF data with Content-Disposition header
- Request with format=csv: Binary CSV data
- Response 202: Large export (>1000 flags) with poll_url
- Response 413: Export too large (>2000 flags)

**Reference**: contracts/api-red-flags-export.yaml

**Acceptance Criteria**:
- Tests both synchronous (200) and async (202) patterns
- Validates binary responses and headers
- Test FAILS (route not implemented)

---

### T011: ✅ [P]: E2E test for red flag list with filters
**File**: `tests/e2e/red-flags-list.spec.ts`
**Description**: Implement Scenario 1 from quickstart.md:
- Navigate to /companies/test-company-001/red-flags
- Verify list display with category badges, severity indicators, summary counts
- Apply category filter (Financial), verify URL and filtered results
- Apply severity filter (Critical), verify combined filters
- Apply status filter (Open)
- Search by text ("revenue")
- Clear all filters
- Verify summary counts update with filters

**Reference**: quickstart.md Scenario 1

**Acceptance Criteria**:
- All 8 test steps from scenario pass
- Test uses Playwright page objects
- Test FAILS (UI not implemented)

---

### T012: ✅ [P]: E2E test for red flag detail with evidence
**File**: `tests/e2e/red-flags-detail.spec.ts`
**Description**: Implement Scenario 3 from quickstart.md:
- Click flag card to open detail drawer
- Verify metadata (category, severity, confidence, status, timestamps)
- Verify explanation section with "Why This Matters"
- Verify evidence list (6 items, sorted by importance)
- Click document evidence "View Source" link
- Verify document viewer opens at correct page/chunk
- Verify remediation section
- Verify action history

**Reference**: quickstart.md Scenario 3

**Acceptance Criteria**:
- All verification steps pass
- Evidence navigation tested
- Test FAILS (components not implemented)

---

### T013: ✅ [P]: E2E test for flag status change to false positive
**File**: `tests/e2e/red-flags-actions.spec.ts`
**Description**: Implement Scenario 4 from quickstart.md:
- Open flag detail
- Change status to "False Positive"
- Provide reason in dialog
- Verify status updated, action logged
- Verify no further alerts
- Verify exclusion from default exports

**Reference**: quickstart.md Scenario 4

**Acceptance Criteria**:
- Status change workflow works end-to-end
- Action history records change with reason
- Test FAILS (status change not implemented)

---

### T014: ✅ [P]: E2E test for PDF export
**File**: `tests/e2e/red-flags-export.spec.ts`
**Description**: Implement Scenario 5 from quickstart.md:
- Open export dialog
- Configure export (format=PDF, filters, inclusions)
- Trigger export
- Verify file download
- Open PDF and verify contents:
  - Summary page with counts
  - Category sections with flags
  - Explanations and evidence present
  - Filtering applied correctly

**Reference**: quickstart.md Scenario 5

**Acceptance Criteria**:
- PDF generation tested
- Content validation automated
- Test FAILS (export not implemented)

---

### T015: ✅ [P]: E2E test for severity escalation notifications
**File**: `tests/e2e/red-flags-escalation.spec.ts`
**Description**: Implement Scenario 6 from quickstart.md:
- Seed flag with medium severity
- Update KPI data to trigger threshold
- Trigger recompute
- Verify severity increased to High
- Verify escalation notification received (P2 alert)
- Verify action history logs escalation with system actor

**Reference**: quickstart.md Scenario 6

**Acceptance Criteria**:
- Escalation detection works
- Notification sent correctly
- Test FAILS (escalation logic not implemented)

---

### T016: ✅ [P]: E2E test for multi-category and status filtering
**File**: `tests/e2e/red-flags-list.spec.ts` (add to existing file)
**Description**: Implement Scenario 7 from quickstart.md:
- Apply multiple category filters (Financial + Legal)
- Verify URL params and filtered results
- Add status filter (Open)
- Verify combined filters
- Verify summary counts show only filtered results
- Remove one category, verify update

**Reference**: quickstart.md Scenario 7

**Acceptance Criteria**:
- Multi-select filters work
- URL state management tested
- Test FAILS (multi-filter logic not implemented)

---

### T017: ✅ [P]: E2E test for evidence source navigation
**File**: `tests/e2e/red-flags-evidence-navigation.spec.ts`
**Description**: Implement Scenario 8 from quickstart.md:
- Open flag detail
- Click document evidence link
- Verify document viewer opens at exact page/chunk with highlighting
- Test alert evidence link → redirects to /alerts/[id]
- Test KPI evidence link → redirects to /analytics/kpis/[id] with chart
- Verify citation data matches evidence metadata

**Reference**: quickstart.md Scenario 8

**Acceptance Criteria**:
- All 3 evidence types tested (document, alert, KPI)
- Navigation and highlighting verified
- Test FAILS (evidence linking not implemented)

---

### T018: ✅ [P]: E2E test for notification on new critical flag
**File**: `tests/e2e/red-flags-notifications.spec.ts`
**Description**: Implement Scenario 2 from quickstart.md:
- Trigger detection run via "Recompute" button
- Wait for completion (poll status endpoint)
- Verify notification received with:
  - Type: "red_flag_detected"
  - Severity: P1 (critical)
  - Link to flag detail
- Click notification, verify redirect

**Reference**: quickstart.md Scenario 2

**Acceptance Criteria**:
- Notification system integration tested
- P1 alert for critical flags verified
- Test FAILS (notification wiring not implemented)

---

## Phase 3: Core Implementation (20 tasks)

### T019: Create TypeScript types for Red Flag entities
**File**: `lib/red-flags/types.ts`
**Description**: Define TypeScript interfaces and types per data-model.md TypeScript section:
- Enums: EntityType, FlagCategory, FlagSeverity, FlagStatus, EvidenceType, ActionType, RunStatus
- Interfaces: RedFlagRun, RedFlag, FlagMetadata, RedFlagEvidence, CitationData (union type), RedFlagAction, ActionPayload (union type)
- Export all types

**Reference**: data-model.md TypeScript Type Definitions

**Acceptance Criteria**:
- All types match database schema
- Union types use discriminators
- Types compile without errors

**Dependencies**: None (can start immediately)

---

### T020 [P]: Create base detector interface
**File**: `lib/red-flags/detectors/base-detector.ts`
**Description**: Define abstract base class/interface for detectors per research.md Section 1:
```typescript
export interface DetectorResult {
  flags: Partial<RedFlag>[];
  metadata: {
    detector: string;
    version: string;
    duration_ms: number;
  };
}

export abstract class BaseDetector {
  abstract name: string;
  abstract category: FlagCategory;
  abstract detect(entityId: string, entityType: EntityType): Promise<DetectorResult>;

  protected generateFingerprint(flag: Partial<RedFlag>): string;
  protected async timeout<T>(promise: Promise<T>, ms: number): Promise<T>;
}
```

**Reference**: research.md Section 1 Detector Architecture

**Acceptance Criteria**:
- Abstract class provides common utilities (fingerprinting, timeout)
- Detectors extend this base class
- Timeout guard defaults to 10s

**Dependencies**: T019 (types)

---

### T021: Implement financial detector with rule-based logic
**File**: `lib/red-flags/detectors/financial-detector.ts`
**Description**: Extend BaseDetector to detect financial red flags per data-model.md examples:
- Revenue concentration: Query top 3 customers, calculate percentage, flag if >80%
- Negative NRR: Query subscription metrics, flag if NRR < 100%
- AR aging: Query accounts receivable, flag if >60 days and increasing
- DSO above target: Calculate DSO, flag if > target threshold

**Reference**: data-model.md Detection Sources, research.md Section 1

**Acceptance Criteria**:
- Detector queries Supabase for financial KPIs
- Emits candidate flags with raw metrics as evidence
- Returns DetectorResult with fingerprints
- Handles missing data gracefully (partial results)

**Dependencies**: T020 (base detector)

---

### T022: Implement operational detector with rule-based logic
**File**: `lib/red-flags/detectors/operational-detector.ts`
**Description**: Extend BaseDetector for operational flags:
- SLA breach rates: Query SLA metrics, flag if breach rate > threshold
- Backlog aging: Query backlog items, flag if median age increasing
- Single-supplier dependency: Query vendor concentration, flag if top vendor >50%

**Reference**: data-model.md Detection Sources

**Acceptance Criteria**:
- Detector queries operational KPIs
- Emits flags with severity based on threshold exceedance
- Confidence = 1.0 (rule-based = certain)

**Dependencies**: T020 (base detector)

---

### T023: Implement legal detector with LLM classification
**File**: `lib/red-flags/detectors/legal-detector.ts`
**Description**: Extend BaseDetector for LLM-assisted legal analysis per research.md Section 3:
- Query document_chunks for contracts (type='contract')
- Use structured prompt with few-shot examples (change-of-control, MFN, termination clauses)
- Call OpenRouter API with Claude Sonnet 3.5
- Parse JSON response for flags
- Extract citations with page/chunk references

**Reference**: research.md Section 3 LLM Classification Patterns

**Acceptance Criteria**:
- LLM prompt includes 2+ few-shot examples
- Confidence score extracted from response
- Citation includes documentId, pageNumber, chunkIndex
- Handles API errors gracefully (return empty results)

**Dependencies**: T020 (base detector), lib/ai/rag (existing)

---

### T024: Implement cyber detector with policy gap analysis
**File**: `lib/red-flags/detectors/cyber-detector.ts`
**Description**: Extend BaseDetector for LLM-assisted cyber policy gap detection:
- Query document_chunks for security policies
- Use structured prompt listing required policies (Incident Response, Data Classification, Access Control, etc.)
- Call OpenRouter API
- Identify missing or inadequate policies
- Flag historical security incidents from alerts table

**Reference**: research.md Section 3 LLM Classification Patterns

**Acceptance Criteria**:
- Detects policy gaps via LLM
- Flags historical incidents from alerts
- Confidence calibration: High (0.8-1.0) for explicit gaps, Medium (0.5-0.8) for implied

**Dependencies**: T020 (base detector)

---

### T025: Implement ESG detector with news sentiment analysis
**File**: `lib/red-flags/detectors/esg-detector.ts`
**Description**: Extend BaseDetector for ESG risk detection:
- Query for ESG disclosure documents
- Check for material topic gaps (emissions, labor, governance)
- Query news items for negative sentiment
- Use LLM to summarize recurring negative themes
- Flag missing data on key metrics

**Reference**: data-model.md Detection Sources

**Acceptance Criteria**:
- Detects disclosure gaps
- Aggregates negative news sentiment
- Emits consolidated flags for recurring issues

**Dependencies**: T020 (base detector)

---

### T026: Implement fingerprinting and deduplication logic
**File**: `lib/red-flags/consolidation/fingerprint.ts`
**Description**: Implement fingerprinting per research.md Section 2:
```typescript
export function generateFingerprint(flag: Partial<RedFlag>): string {
  const normalized = {
    category: flag.category.toLowerCase(),
    title: normalizeText(flag.title),
    entityId: flag.entity_id,
    keyAttributes: extractKeyAttributes(flag)
  };
  return crypto.createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')
    .substring(0, 16);
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}
```

**Reference**: research.md Section 2 Fingerprinting Algorithm

**Acceptance Criteria**:
- Fingerprint is deterministic (same input = same hash)
- Normalization handles formatting variations
- Key attributes extracted per category

**Dependencies**: T019 (types)

---

### T027: Implement evidence merger for deduplication
**File**: `lib/red-flags/consolidation/merger.ts`
**Description**: Merge evidence when consolidating duplicate flags:
```typescript
export function mergeFlags(existing: RedFlag, incoming: Partial<RedFlag>): {
  updatedFlag: RedFlag;
  severityIncreased: boolean;
} {
  // Compare severities, take max
  // Merge evidence arrays (dedupe by source_id)
  // Update last_updated_at
  // Return severityIncreased flag for alerting
}
```

**Reference**: research.md Section 2 Consolidation & Deduplication

**Acceptance Criteria**:
- Severity escalation detected
- Evidence arrays merged without duplicates
- Metadata preserved from both flags

**Dependencies**: T019 (types)

---

### T028: Implement evidence resolver registry
**File**: `lib/red-flags/utils/evidence-linker.ts`
**Description**: Create evidence type resolver pattern per research.md Section 4:
```typescript
interface EvidenceResolver {
  type: EvidenceType;
  resolve(sourceId: string): Promise<EvidenceMetadata>;
}

class DocumentEvidenceResolver implements EvidenceResolver {
  type = 'document';
  async resolve(sourceId: string): Promise<EvidenceMetadata> {
    // Query document_chunks via pgvector
    // Return metadata with citation
  }
}

// Similar for AlertEvidenceResolver, KPIEvidenceResolver, etc.

export class EvidenceLinker {
  private resolvers: Map<EvidenceType, EvidenceResolver>;

  async resolveEvidence(evidence: RedFlagEvidence[]): Promise<ResolvedEvidence[]> {
    // Batch resolve, handle unavailable sources
  }
}
```

**Reference**: research.md Section 4 Evidence Linking Strategy

**Acceptance Criteria**:
- Registry supports all 5 evidence types
- Batch resolution implemented
- Handles deleted sources (marks as unavailable)

**Dependencies**: T019 (types)

---

### T029: Implement PII scrubber utility
**File**: `lib/red-flags/utils/pii-scrubber.ts`
**Description**: Create utility to scrub PII from evidence previews per data-model.md:
```typescript
export function scrubPII(text: string): string {
  // Remove email addresses (regex)
  // Remove phone numbers (regex)
  // Truncate to 200 chars
  // Return scrubbed text
}
```

**Reference**: data-model.md FR-012, research.md Section 10 Security

**Acceptance Criteria**:
- Email regex removes addresses
- Phone regex removes numbers
- Truncation preserves word boundaries
- Unit tests cover edge cases

**Dependencies**: None

---

### T030: Implement Research GPT explainer service integration
**File**: `lib/red-flags/explainability/explainer-service.ts`
**Description**: Integrate with existing lib/research-gpt for explanations per research.md Section 7:
```typescript
export class ExplainerService {
  async generateExplanation(flag: RedFlag, evidence: RedFlagEvidence[]): Promise<Explainer> {
    // For rule-based flags: use pre-canned explanations
    // For LLM flags: call Research GPT with evidence context
    // Generate { why, key_evidence, suggested_remediation, timeframe }
    // Cache in flag.meta.explainer with inputs_hash
  }
}
```

**Reference**: research.md Section 3 Explainability & Remediation, data-model.md meta.explainer

**Acceptance Criteria**:
- Pre-canned explanations for financial/operational rules
- LLM fallback for legal/cyber/esg
- Caching with inputs_hash prevents regeneration
- TTL: 6 hours for dynamic content, 7 days for static

**Dependencies**: T019 (types), lib/research-gpt (existing)

---

### T031: Implement remediation suggestion generator
**File**: `lib/red-flags/explainability/remediation-generator.ts`
**Description**: Generate remediation suggestions per flag category:
```typescript
export class RemediationGenerator {
  async generateRemediation(flag: RedFlag): Promise<RemediationSuggestion> {
    // Map category + severity to remediation templates
    // Include timeframe recommendations
    // Return { plan: string, timeframe: string, stakeholders?: string[] }
  }
}
```

**Reference**: research.md Section 7 Explainability & Remediation

**Acceptance Criteria**:
- Remediation templates per category
- Timeframe varies by severity (Critical=immediate, High=7 days, etc.)
- Output is board-ready language

**Dependencies**: T019 (types)

---

### T032: Implement red flag service orchestrator
**File**: `lib/red-flags/red-flag-service.ts`
**Description**: Main service coordinating detection workflow per research.md Section 1:
```typescript
export class RedFlagService {
  async runDetection(entityId: string, entityType: EntityType, detectors?: string[]): Promise<RedFlagRun> {
    // 1. Create run record (status='running')
    // 2. Execute detectors in parallel (Promise.allSettled)
    // 3. Consolidate results (fingerprinting, deduplication)
    // 4. Resolve evidence
    // 5. Generate explanations
    // 6. Upsert flags and evidence
    // 7. Update run record (stats, status)
    // 8. Emit alerts for critical/high flags
    // 9. Return run record
  }

  async getFlags(entityId: string, filters: FlagFilters): Promise<FlagListResult>;
  async getFlagDetail(flagId: string): Promise<RedFlagDetail>;
  async recordAction(flagId: string, action: ActionPayload, actorId: string): Promise<void>;
}
```

**Reference**: research.md Section 1 Detector Architecture, plan.md Phase 3

**Acceptance Criteria**:
- Parallel detector execution with timeout guards
- Graceful degradation (partial results on detector failure)
- Stats collection (detectors_ran, flags_detected, etc.)
- Performance target: <10s for typical workload

**Dependencies**: T020-T025 (detectors), T026-T027 (consolidation), T028 (evidence), T030-T031 (explainability)

---

### T033: Create Zustand store for red flags state
**File**: `lib/stores/red-flags-store.ts`
**Description**: Client state management per data-model.md:
```typescript
interface RedFlagsState {
  currentDataRoomId: string | null;
  documentFilters: FlagFilters;
  uploadProgress: Map<string, number>;
  selectedFlags: Set<string>;

  setCurrentDataRoom: (id: string) => void;
  updateFilters: (filters: Partial<FlagFilters>) => void;
  clearFilters: () => void;
  toggleFlagSelection: (id: string) => void;
}

export const useRedFlagsStore = create<RedFlagsState>((set) => ({ ... }));
```

**Reference**: CLAUDE.md state management patterns

**Acceptance Criteria**:
- Store manages filters, selections, loading states
- Filters sync with URL query params
- Store is type-safe with TypeScript

**Dependencies**: T019 (types)

---

## Phase 4: API Implementation (10 tasks)

### T034: Implement GET red-flags list API route
**File**: `app/api/companies/[id]/red-flags/route.ts` (and data-rooms variant)
**Description**: Implement list endpoint per contracts/api-red-flags-list.yaml:
- GET handler with query param parsing (status, category, severity, search, sort, page, limit)
- Call RedFlagService.getFlags() with filters
- Apply RLS via Supabase client
- Return paginated results with summary counts
- Handle auth errors (401), permission errors (403), not found (404)

**Reference**: contracts/api-red-flags-list.yaml

**Acceptance Criteria**:
- Contract test T006 now passes
- Filtering works per spec
- Pagination calculates total_pages correctly
- Summary counts aggregate by category/severity/status

**Dependencies**: T032 (RedFlagService), T006 (contract test must be failing)

---

### T035: Implement GET red-flags detail API route
**File**: `app/api/companies/[id]/red-flags/[flagId]/route.ts` (and data-rooms variant)
**Description**: Implement detail endpoint per contracts/api-red-flags-detail.yaml:
- GET handler fetching flag with evidence and actions
- Resolve evidence via EvidenceLinker
- Include explainer from meta.explainer
- Enrich with owner profile data
- Check RLS access

**Reference**: contracts/api-red-flags-detail.yaml

**Acceptance Criteria**:
- Contract test T007 now passes
- Evidence list includes all 5 types with resolved metadata
- Action history sorted by created_at DESC
- Explainer present if cached

**Dependencies**: T032 (RedFlagService), T028 (EvidenceLinker), T007 (contract test)

---

### T036: Implement POST recompute API route
**File**: `app/api/companies/[id]/red-flags/recompute/route.ts` (and data-rooms variant)
**Description**: Implement recompute endpoint per contracts/api-red-flags-recompute.yaml:
- POST handler accepting { detectors?, force? }
- Check permissions (editor/admin only)
- Rate limit: max 1 run per entity per 10 minutes (unless force=true)
- Call RedFlagService.runDetection() asynchronously
- Return 202 Accepted with run_id and poll_url
- GET handler for /runs/[runId] returning run status

**Reference**: contracts/api-red-flags-recompute.yaml

**Acceptance Criteria**:
- Contract test T008 now passes
- Rate limiting works (400 if recent run)
- Async execution returns immediately
- Poll endpoint shows progress

**Dependencies**: T032 (RedFlagService), T008 (contract test)

---

### T037: Implement POST actions API route
**File**: `app/api/companies/[id]/red-flags/[flagId]/actions/route.ts` (and data-rooms variant)
**Description**: Implement actions endpoint per contracts/api-red-flags-actions.yaml:
- POST handler with discriminated union for 6 action types
- Validate payload per action type (Zod schemas)
- Record action in red_flag_actions table (immutable)
- Update parent flag if needed:
  - assign: set owner_id
  - status_change: update status, log transition
  - snooze: set snoozed_until
  - override: update severity/confidence in meta.overrides
- Return updated flag state

**Reference**: contracts/api-red-flags-actions.yaml

**Acceptance Criteria**:
- Contract test T009 now passes
- All 6 action types handled
- Invalid transitions rejected (400)
- Actor_id enforced (must match auth.uid())

**Dependencies**: T032 (RedFlagService), T009 (contract test)

---

### T038: Implement PDF export generation
**File**: `app/api/companies/[id]/red-flags/export/route.ts` - PDF logic
**Description**: Implement PDF export per contracts/api-red-flags-export.yaml and research.md Section 5:
- GET handler with query params (filters, include_explainer, include_evidence, etc.)
- Query flags with filters
- Generate PDF using @react-pdf/renderer:
  - Summary page with counts
  - Per-category sections
  - Flag cards with explanation, evidence (top 3), remediation
- Return binary PDF with Content-Disposition header
- For >1000 flags: Return 202 with export_id, generate in background

**Reference**: contracts/api-red-flags-export.yaml, research.md Section 5

**Acceptance Criteria**:
- Contract test T010 now passes (partial - PDF format)
- PDF is board-ready (professional styling)
- Filtering applied correctly
- Target: <5s for 500 flags

**Dependencies**: T032 (RedFlagService), T010 (contract test), @react-pdf/renderer (T001)

---

### T039: Implement CSV export generation
**File**: `app/api/companies/[id]/red-flags/export/route.ts` - CSV logic (same file as T038)
**Description**: Add CSV export to same route per research.md Section 5:
- Use csv-stringify library
- Flatten flag data to CSV columns:
  - id, category, severity, confidence, title, status, first_detected, last_updated, explanation, remediation, evidence_count
- Apply same filters as PDF
- Return binary CSV with Content-Disposition header

**Reference**: contracts/api-red-flags-export.yaml, research.md Section 5

**Acceptance Criteria**:
- Contract test T010 now passes (full)
- CSV is valid (opens in Excel/Sheets)
- All flags flattened correctly
- Target: <2s for 1000 flags

**Dependencies**: T038 (same file), csv-stringify (T001)

---

### T040: Implement async export status endpoint
**File**: `app/api/companies/[id]/red-flags/exports/[exportId]/route.ts`
**Description**: For large exports (>1000 flags), implement background job pattern:
- GET handler returning ExportStatus
- Store export metadata in database table (exports table)
- Status: processing, ready, expired, failed
- Generate presigned URL for download (Supabase Storage)
- 24-hour expiration

**Reference**: contracts/api-red-flags-export.yaml

**Acceptance Criteria**:
- Large exports don't timeout
- Presigned URLs work for 1 hour
- Exports auto-expire after 24 hours
- Status polling works

**Dependencies**: T038-T039 (export generation)

---

### T041: Wire alert service for Critical/High flags
**File**: `lib/red-flags/red-flag-service.ts` (update existing file)
**Description**: Integrate with lib/alerts/alert-service.ts per research.md Section 7:
- In runDetection(), after upserting flags:
  - Filter for severity IN ('critical', 'high') AND status='open'
  - Filter for severity increases (compare with previous run)
  - Call AlertService.emit() with:
    - Severity mapping: Critical→P1, High→P2
    - Title: flag.title
    - Body: flag.meta.explainer.why
    - Link: /companies/[id]/red-flags/[flagId]
    - Evidence: top 3 evidence items

**Reference**: research.md Section 7 Alerts & Notifications

**Acceptance Criteria**:
- Critical flags trigger P1 alerts
- High flags trigger P2 alerts
- Severity escalations trigger alerts
- Alert includes link and top evidence

**Dependencies**: T032 (RedFlagService), lib/alerts/alert-service.ts (existing)

---

### T042: Implement daily digest notification
**File**: `lib/red-flags/notifications/digest-service.ts`
**Description**: Generate daily digest emails per research.md Section 7:
- Query open flags per entity
- Group by entity and severity
- Generate email template with summary
- Send via existing notification system
- Cron job: daily at 8 AM user timezone

**Reference**: research.md Section 7 Alerts & Notifications

**Acceptance Criteria**:
- Daily email sent to users with open flags
- Summary shows counts by category/severity
- Links to detail pages

**Dependencies**: T032 (RedFlagService), existing notification system

---

### T043: Implement severity escalation detection
**File**: `lib/red-flags/red-flag-service.ts` (update existing)
**Description**: Enhance runDetection() to detect escalations:
- Before upserting flags, query existing flags by fingerprint
- Compare incoming severity with existing severity
- If severity increased:
  - Record action: { type: 'severity_escalation', from, to, reason: 'Threshold exceeded: [metric]' }
  - Trigger alert (even if flag already exists)
- Log escalation in red_flag_actions with actor_id=null (system)

**Reference**: quickstart.md Scenario 6, research.md Section 2

**Acceptance Criteria**:
- Escalations detected correctly
- Action history records escalation
- Alert triggered for escalations
- E2E test T015 now passes

**Dependencies**: T032 (RedFlagService), T041 (alert wiring), T015 (E2E test)

---

## Phase 5: UI Implementation (12 tasks)

### T044 [P]: Create red flag list component
**File**: `components/red-flags/red-flag-list.tsx`
**Description**: Main list view with filters per quickstart.md Scenario 1:
- Fetch flags via API with query params from URL
- Display flag cards with category badge, severity indicator, title, status
- Integrate with red-flag-filters component
- Show summary counts (total, by_category, by_severity, by_status)
- Pagination controls
- Loading skeleton
- Empty state

**Reference**: quickstart.md Scenario 1, plan.md UI structure

**Acceptance Criteria**:
- List displays flags correctly
- Pagination works
- Loading and empty states
- E2E test T011 now passes (partial - display only)

**Dependencies**: T034 (list API), T033 (Zustand store)

---

### T045 [P]: Create filter components
**File**: `components/red-flags/red-flag-filters.tsx`
**Description**: Filter controls per quickstart.md Scenario 1:
- Category chips (multi-select)
- Severity dropdown (multi-select)
- Status dropdown (single-select)
- Search input with debounce (300ms)
- Sort dropdown (severity, confidence, updated, detected)
- Clear filters button
- Sync with URL query params (useSearchParams)
- Sync with Zustand store

**Reference**: quickstart.md Scenario 1

**Acceptance Criteria**:
- All filters update URL and trigger re-fetch
- Multi-select works for category/severity
- Search debounced
- E2E test T011 now passes (full)

**Dependencies**: T044 (list component), T033 (store)

---

### T046 [P]: Create flag card component
**File**: `components/red-flags/red-flag-card.tsx`
**Description**: Individual flag display for list view:
- Category badge with color coding (Financial=blue, Legal=purple, etc.)
- Severity indicator (Critical=red icon, High=orange, etc.)
- Title (clickable to open detail)
- Status badge
- Confidence score (if present)
- Evidence preview (first 3 items as chips)
- Last updated timestamp (relative format)
- Owner avatar (if assigned)
- Snoozed indicator (if snoozed_until)

**Reference**: plan.md UI structure

**Acceptance Criteria**:
- Card displays all metadata
- Click opens detail drawer
- Hover shows tooltip with description

**Dependencies**: None (pure UI component)

---

### T047: Create detail drawer component
**File**: `components/red-flags/red-flag-detail-drawer.tsx`
**Description**: Drawer/modal for flag detail per quickstart.md Scenario 3:
- Fetch flag detail via API
- Display metadata section (category, severity, confidence, status, timestamps, owner)
- Explanation section ("Why This Matters" with flag.meta.explainer.why)
- Evidence list (integrate evidence-list component)
- Remediation section (suggested_remediation, timeframe)
- Action history (integrate action-history component)
- Action buttons (Change Status, Assign Owner, Snooze, Add Note, Override)
- Close button

**Reference**: quickstart.md Scenario 3

**Acceptance Criteria**:
- Drawer opens on flag click
- All sections displayed
- Action buttons trigger dialogs
- E2E test T012 now passes (partial - display only)

**Dependencies**: T035 (detail API), T046 (flag card)

---

### T048 [P]: Create evidence list component
**File**: `components/red-flags/evidence-list.tsx`
**Description**: Evidence display with citation links per quickstart.md Scenario 3 & 8:
- Display evidence items sorted by importance DESC
- Type badge (Document, Alert, KPI, News, Signal)
- Title
- Preview text (truncated to 200 chars)
- Citation display:
  - Document: "Page X, Chunk Y"
  - Alert: "Severity: [severity]"
  - KPI: "Value: [value], Threshold: [threshold]"
- "View Source" button:
  - Document: Opens document viewer at page/chunk
  - Alert: Links to /alerts/[alertId]
  - KPI: Links to /analytics/kpis/[kpiId]
- Unavailable indicator if source deleted

**Reference**: quickstart.md Scenario 3 & 8

**Acceptance Criteria**:
- All evidence types displayed correctly
- Citation links navigate properly
- E2E test T017 now passes

**Dependencies**: T028 (evidence resolver)

---

### T049 [P]: Create action history component
**File**: `components/red-flags/action-history.tsx`
**Description**: Timeline of actions per quickstart.md Scenario 3 & 4:
- Display actions sorted by created_at DESC
- Action type icon (assign=user icon, note=comment, status_change=arrow, etc.)
- Actor name and avatar
- Timestamp (relative format)
- Payload display:
  - assign: "Assigned to [name]"
  - note: Show note text
  - status_change: "Status changed from [from] to [to]" (with reason if present)
  - snooze: "Snoozed for [duration] days: [reason]"
  - remediation: "Remediation plan added"
  - override: "Override: [field] changed from [from] to [to]: [reason]"
- System actions (actor_id=null) show "System" as actor

**Reference**: quickstart.md Scenario 3 & 4

**Acceptance Criteria**:
- All action types formatted correctly
- Timeline sorted correctly
- System actions distinguished

**Dependencies**: None (pure display component)

---

### T050: Create status change dialog
**File**: `components/red-flags/red-flag-detail-drawer.tsx` (add dialog logic)
**Description**: Dialog for changing flag status per quickstart.md Scenario 4:
- Dropdown with valid status transitions
- Reason textarea (optional, except for false_positive)
- Validation:
  - false_positive requires reason
  - Prevent invalid transitions (resolved → open)
- Call POST actions API with status_change payload
- Optimistic update + refetch on success
- Error handling

**Reference**: quickstart.md Scenario 4

**Acceptance Criteria**:
- Status change works
- Reason required for false_positive
- Invalid transitions rejected client-side
- E2E test T013 now passes

**Dependencies**: T037 (actions API), T047 (detail drawer)

---

### T051 [P]: Create bulk actions toolbar
**File**: `components/red-flags/bulk-actions.tsx`
**Description**: Toolbar for multi-select operations:
- Select all checkbox
- Individual flag checkboxes
- Selection count display
- Bulk actions:
  - Assign owner (common dropdown)
  - Change status (common dropdown)
  - Export selected
- Clear selection button

**Reference**: plan.md UI structure

**Acceptance Criteria**:
- Multi-select works
- Bulk actions apply to all selected
- Confirmation dialog for bulk status change

**Dependencies**: T037 (actions API), T033 (store for selection state)

---

### T052 [P]: Create export dialog
**File**: `components/red-flags/export-dialog.tsx`
**Description**: Dialog for export configuration per quickstart.md Scenario 5:
- Format radio buttons (PDF, CSV)
- Filter checkboxes:
  - Include resolved flags
  - Include false positives
  - Include explanations (PDF only)
  - Include evidence (PDF only)
  - Include remediation (PDF only)
- Apply current list filters checkbox
- Select specific flags (if bulk selection active)
- Generate button
- Progress indicator (if async export)
- Download button (when ready)

**Reference**: quickstart.md Scenario 5

**Acceptance Criteria**:
- Export configuration works
- File downloads correctly
- E2E test T014 now passes

**Dependencies**: T038-T039 (export APIs)

---

### T053 [P]: Create dashboard widget for top 3 flags
**File**: `components/analytics/red-flags-summary.tsx`
**Description**: Dashboard widget showing top 3 critical/high flags per plan.md:
- Query for entity's flags sorted by severity DESC, limit 3
- Display compact flag cards
- "View All" link to full list
- Empty state if no flags
- Refresh on detection run completion

**Reference**: plan.md Phase 2 UI Components

**Acceptance Criteria**:
- Widget shows top 3 flags
- Link navigates to full list
- Auto-refreshes on run completion

**Dependencies**: T034 (list API)

---

### T054: Integrate red flags into existing dashboard
**File**: `app/(dashboard)/companies/[id]/page.tsx` (and data-rooms variant)
**Description**: Add Red Flag Radar section to dashboard:
- Import red-flags-summary component
- Add "Risk Assessment" tab to dashboard tabs
- Tab content shows red-flag-list component
- Link from summary widget to tab
- Permission check (viewers can read, editors can recompute)

**Reference**: CLAUDE.md dashboard patterns, quickstart.md Scenario 1

**Acceptance Criteria**:
- Tab navigation works
- Summary widget integrated
- Permissions enforced (editors see "Recompute" button)

**Dependencies**: T044 (list), T053 (summary widget)

---

### T055: Add recompute button to red flags page
**File**: `components/red-flags/red-flag-list.tsx` (update existing)
**Description**: Add manual trigger button per quickstart.md Scenario 2:
- "Recompute Flags" button (top right, editor/admin only)
- Click triggers POST /api/.../red-flags/recompute
- Show progress modal with polling
- Toast notification on completion
- Refresh list after completion
- Handle rate limit error (show remaining time)

**Reference**: quickstart.md Scenario 2

**Acceptance Criteria**:
- Button triggers detection
- Progress indicator shows status
- E2E test T018 now passes

**Dependencies**: T036 (recompute API), T044 (list component)

---

## Phase 6: Polish & Validation (5 tasks)

### T056 [P]: Add unit tests for fingerprinting
**File**: `lib/red-flags/consolidation/fingerprint.test.ts`
**Description**: Test fingerprinting logic:
- Same input produces same fingerprint
- Formatting variations produce same fingerprint (case, whitespace)
- Different inputs produce different fingerprints
- Key attribute changes affect fingerprint
- Collision rate is acceptably low

**Reference**: research.md Section 2

**Acceptance Criteria**:
- All edge cases covered
- No collisions in test data set (100+ flags)

**Dependencies**: T026 (fingerprint implementation)

---

### T057 [P]: Add unit tests for PII scrubbing
**File**: `lib/red-flags/utils/pii-scrubber.test.ts`
**Description**: Test PII removal:
- Email addresses removed
- Phone numbers removed
- Truncation works correctly
- Edge cases (malformed emails, international phones)

**Reference**: T029 (PII scrubber)

**Acceptance Criteria**:
- Regex patterns tested exhaustively
- No false positives (legitimate text preserved)

**Dependencies**: T029 (PII scrubber)

---

### T058: Performance testing for detection runs
**File**: `tests/performance/red-flags-detection.perf.ts`
**Description**: Load test detection runs per plan.md performance goals:
- Test with 12 months data + 5k documents
- Measure detector execution time (target: <10s)
- Measure API response times (list: <300ms cached, <500ms uncached)
- Test parallel execution benefits
- Identify bottlenecks

**Reference**: plan.md Performance Goals, research.md Section 11

**Acceptance Criteria**:
- 95th percentile detection time <10s
- 99th percentile API reads <500ms
- Report identifies any bottlenecks

**Dependencies**: T032 (service), T034 (API)

---

### T059: Performance testing for exports
**File**: `tests/performance/red-flags-export.perf.ts`
**Description**: Load test export generation:
- Test PDF export with 500 flags (target: <5s)
- Test PDF export with 1000 flags (target: <15s)
- Test CSV export with 1000 flags (target: <2s)
- Measure memory usage
- Verify streaming works

**Reference**: plan.md Performance Goals, research.md Section 5

**Acceptance Criteria**:
- PDF: 500 flags in <5s
- CSV: 1000 flags in <2s
- Memory usage stays under 500MB

**Dependencies**: T038-T039 (export generation)

---

### T060: Run full quickstart validation
**File**: `tests/e2e/` (all files)
**Description**: Execute complete quickstart.md test suite:
- Run all 8 E2E scenarios end-to-end
- Verify all acceptance criteria pass
- Test with fresh database seed
- Test with multiple browsers (Chromium, Firefox, WebKit)
- Test responsive layouts (desktop, tablet, mobile)
- Generate test report

**Reference**: quickstart.md all scenarios

**Acceptance Criteria**:
- All 8 scenarios pass
- All browsers pass
- No console errors
- Test report generated

**Dependencies**: T011-T018 (E2E tests), all implementation tasks

---

## Dependencies Graph

```
Phase 1 (Setup):
T001 → [T038, T039]
T002-T005 [P] → Phase 2, Phase 3

Phase 2 (Tests First):
T006-T018 [P] → Phase 3, Phase 4, Phase 5

Phase 3 (Core):
T019 → T020-T033
T020 → T021-T025
T021-T025 [P] → T032
T026, T027 [P] → T032
T028 → T032, T035, T048
T029 [P] → T028
T030, T031 → T032
T032 → T034-T043, T055
T033 [P] → T044, T045, T051

Phase 4 (API):
T034 → T044, T053
T035 → T047
T036 → T055
T037 → T050, T051
T038, T039 → T040, T052
T040 → T052
T041 → T043, T055
T042 [P] → none (standalone)
T043 → none (updates T032)

Phase 5 (UI):
T044 → T045, T047, T054
T045 → none (used by T044)
T046 [P] → T047
T047 → T050
T048, T049 [P] → T047
T050 → none (updates T047)
T051, T052 [P] → none (standalone)
T053 [P] → T054
T054 → none (integration)
T055 → none (updates T044)

Phase 6 (Polish):
T056, T057 [P] → none (standalone tests)
T058, T059 → none (performance tests)
T060 → all (final validation)
```

---

## Parallel Execution Examples

### Setup Phase (can run in parallel after T001):
```
# Launch T002-T005 together (different migration files):
Task: "Create database migration for red_flag_runs table in supabase/migrations/20251029000001_red_flags_schema.sql"
Task: "Create database migration for red_flags table in same file"
Task: "Create database migration for evidence and actions tables in same file"
Task: "Create RLS policies in supabase/migrations/20251029000003_red_flags_rls.sql"
```

### Tests Phase (all can run in parallel):
```
# Launch T006-T018 together (independent test files):
Task: "Contract test for GET red-flags list API in tests/contract/red-flags-list.contract.test.ts"
Task: "Contract test for GET red-flags detail API in tests/contract/red-flags-detail.contract.test.ts"
Task: "Contract test for POST recompute API in tests/contract/red-flags-recompute.contract.test.ts"
Task: "Contract test for POST actions API in tests/contract/red-flags-actions.contract.test.ts"
Task: "Contract test for GET export API in tests/contract/red-flags-export.contract.test.ts"
Task: "E2E test for red flag list with filters in tests/e2e/red-flags-list.spec.ts"
Task: "E2E test for red flag detail with evidence in tests/e2e/red-flags-detail.spec.ts"
Task: "E2E test for flag status change to false positive in tests/e2e/red-flags-actions.spec.ts"
Task: "E2E test for PDF export in tests/e2e/red-flags-export.spec.ts"
Task: "E2E test for severity escalation notifications in tests/e2e/red-flags-escalation.spec.ts"
Task: "E2E test for multi-category and status filtering (add to existing file)"
Task: "E2E test for evidence source navigation in tests/e2e/red-flags-evidence-navigation.spec.ts"
Task: "E2E test for notification on new critical flag in tests/e2e/red-flags-notifications.spec.ts"
```

### Core Phase (detectors can run in parallel after T020):
```
# Launch T021-T025 together (independent detector files):
Task: "Implement financial detector with rule-based logic in lib/red-flags/detectors/financial-detector.ts"
Task: "Implement operational detector with rule-based logic in lib/red-flags/detectors/operational-detector.ts"
Task: "Implement legal detector with LLM classification in lib/red-flags/detectors/legal-detector.ts"
Task: "Implement cyber detector with policy gap analysis in lib/red-flags/detectors/cyber-detector.ts"
Task: "Implement ESG detector with news sentiment analysis in lib/red-flags/detectors/esg-detector.ts"
```

---

## Notes

- **[P] tasks** = different files, no dependencies, safe to parallelize
- **Verify tests fail before implementing** (TDD principle)
- **Commit after each task** for clean history
- **Avoid**: vague tasks, same file conflicts in parallel execution
- **Performance targets** are validated in Phase 6 (T058-T059)
- **All contract tests (T006-T010) must fail** before API implementation (T034-T040)
- **All E2E tests (T011-T018) must fail** before UI implementation (T044-T055)

---

## Validation Checklist

*GATE: Checked before implementation begins*

- [x] All 5 contracts have corresponding tests (T006-T010)
- [x] All 4 entities have migration tasks (T002-T005)
- [x] All tests come before implementation (Phase 2 before Phase 3-5)
- [x] Parallel tasks truly independent (checked file paths)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] 8 E2E scenarios from quickstart.md covered (T011-T018)
- [x] Dependencies graph is acyclic
- [x] Performance testing included (T058-T059)
- [x] Final validation included (T060)

---

**Tasks are ready for execution. Begin with Phase 1 (T001-T005), then proceed sequentially through phases.**
