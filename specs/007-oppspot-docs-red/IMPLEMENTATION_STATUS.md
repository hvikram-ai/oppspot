# Red Flag Radar - Implementation Status

**Last Updated**: 2025-10-29
**Current Phase**: Ready for Phase 3 (Core Implementation)
**Branch**: `007-oppspot-docs-red`

---

## ✅ COMPLETED: Phases 1-2 (18/60 tasks)

### Phase 1: Setup & Infrastructure ✅ (5 tasks)
- [x] T001: Dependencies installed (@react-pdf/renderer, csv-stringify)
- [x] T002-T004: Database schema migration created and **APPLIED TO SUPABASE**
  - 4 tables: red_flag_runs, red_flags, red_flag_evidence, red_flag_actions
  - 10 indexes, 2 immutability rules
- [x] T005: RLS policies migration created and **APPLIED TO SUPABASE**
  - 7 policies, 2 helper functions

### Phase 2: Tests First (TDD) ✅ (13 tasks)
- [x] T006-T010: 5 contract tests (58 test cases total)
- [x] T011-T018: 8 E2E test scenarios
- **All tests ready and WILL FAIL (expected for TDD)**

---

## 🚀 NEXT: Phase 3 - Core Implementation (15 tasks)

**Start here when resuming:** `/implement` command or manual implementation

### Tasks Overview:

**T019**: TypeScript types (`lib/red-flags/types.ts`)
- Define all enums and interfaces per data-model.md

**T020**: Base detector interface (`lib/red-flags/detectors/base-detector.ts`)
- Abstract class with fingerprinting and timeout utilities

**T021-T025**: 5 Detector implementations [P]
- T021: financial-detector.ts (revenue concentration, NRR, AR aging, DSO)
- T022: operational-detector.ts (SLA breaches, backlog, supplier deps)
- T023: legal-detector.ts (LLM-assisted contract clause analysis)
- T024: cyber-detector.ts (LLM-assisted policy gap detection)
- T025: esg-detector.ts (disclosure gaps, news sentiment)

**T026-T027**: Consolidation logic [P]
- T026: fingerprint.ts (SHA-256 normalization)
- T027: merger.ts (evidence merging, deduplication)

**T028**: Evidence resolver registry (`lib/red-flags/utils/evidence-linker.ts`)
- 5 evidence type resolvers (document, alert, KPI, signal, news)

**T029**: PII scrubber (`lib/red-flags/utils/pii-scrubber.ts`)
- Remove emails, phones; truncate to 200 chars

**T030-T031**: Explainability services [P]
- T030: explainer-service.ts (Research GPT integration)
- T031: remediation-generator.ts (suggestion templates)

**T032**: Main orchestrator (`lib/red-flags/red-flag-service.ts`)
- Coordinates all detectors, consolidation, evidence, explanations
- **Critical task - many others depend on this**

**T033**: Zustand store (`lib/stores/red-flags-store.ts`)
- Client state for filters, selections, loading states

### Dependencies:
- T019 must complete first (all tasks need types)
- T020 must complete before T021-T025 (detectors extend base)
- T021-T025 can run in parallel [P]
- T026-T027 can run in parallel [P]
- T032 requires: T020-T027, T028, T030-T031

---

## 📁 Project Structure

### Database (LIVE in Supabase)
```sql
-- Tables created and populated:
red_flag_runs       -- Detection execution tracking
red_flags           -- Core risk entities (5 categories, 4 severities)
red_flag_evidence   -- Supporting proof (5 evidence types)
red_flag_actions    -- Immutable audit log (6 action types)

-- RLS enabled on all tables
-- Helper functions: user_has_entity_access(), user_has_role()
```

### Code Structure (to be created in Phase 3)
```
lib/red-flags/
├── types.ts                              [T019]
├── red-flag-service.ts                   [T032] ← Main orchestrator
├── detectors/
│   ├── base-detector.ts                  [T020]
│   ├── financial-detector.ts             [T021]
│   ├── operational-detector.ts           [T022]
│   ├── legal-detector.ts                 [T023]
│   ├── cyber-detector.ts                 [T024]
│   └── esg-detector.ts                   [T025]
├── consolidation/
│   ├── fingerprint.ts                    [T026]
│   └── merger.ts                         [T027]
├── explainability/
│   ├── explainer-service.ts              [T030]
│   └── remediation-generator.ts          [T031]
└── utils/
    ├── evidence-linker.ts                [T028]
    └── pii-scrubber.ts                   [T029]

lib/stores/
└── red-flags-store.ts                    [T033]
```

### Tests (READY to run - will fail until implementation)
```
tests/contract/                           [5 files, 58 tests]
tests/e2e/                                [4 files, 8 scenarios]
```

---

## 🎯 Quick Start for Phase 3

### Option 1: Automated Implementation
```bash
# From repo root:
cd /home/vik/oppspot
/implement
# When prompted, select: "Continue with Phase 3"
```

### Option 2: Manual Implementation
```bash
# Start with T019 (types) - required by all others:
# Create lib/red-flags/types.ts
# Reference: specs/007-oppspot-docs-red/data-model.md lines 445-530

# Then T020 (base detector):
# Create lib/red-flags/detectors/base-detector.ts
# Reference: specs/007-oppspot-docs-red/research.md Section 1

# Continue with tasks in dependency order per tasks.md
```

---

## 📋 Key Reference Documents

All specs are in: `/home/vik/oppspot/specs/007-oppspot-docs-red/`

- **tasks.md**: Complete task list with acceptance criteria
- **plan.md**: Technical architecture and approach
- **data-model.md**: Database schema and TypeScript types (lines 445-530 for types)
- **research.md**: Technical decisions (detector patterns, LLM prompts, algorithms)
- **contracts/**: 5 OpenAPI specs for API validation
- **quickstart.md**: 8 user scenarios for E2E tests

---

## 🔑 Key Technical Decisions (from research.md)

### Detector Architecture (Section 1)
- Pattern: `Promise.allSettled` with timeout guards (10s per detector)
- Parallel execution of 5 detectors
- Graceful degradation on partial failures

### Fingerprinting (Section 2)
- Algorithm: SHA-256 hash of normalized attributes
- Normalization: lowercase, trim, remove punctuation
- Deduplication by (entity_type, entity_id, fingerprint)

### LLM Classification (Section 3)
- Provider: OpenRouter API with Claude Sonnet 3.5
- Pattern: Structured prompts with few-shot examples
- Use cases: Legal clause detection, cyber policy gaps

### Evidence Linking (Section 4)
- Pattern: Evidence type resolver registry
- 5 resolvers: DocumentEvidenceResolver, AlertEvidenceResolver, etc.
- Cache: 1-hour TTL for evidence metadata

### Explainability (Section 7)
- Integration: Research GPT service (existing lib/research-gpt)
- Caching: Store in red_flags.meta.explainer with inputs_hash
- TTL: 6 hours dynamic, 7 days static

---

## 🧪 Test Validation

### To verify tests are ready:
```bash
# Contract tests (should fail with "route not found"):
npm test tests/contract/red-flags-list.contract.test.ts

# E2E tests (should fail with "element not found"):
npm run test:e2e tests/e2e/red-flags-list.spec.ts
```

**Expected**: All tests fail because routes/components don't exist yet (TDD approach ✓)

---

## 📊 Progress Tracking

**Overall**: 18/60 tasks (30%)

```
✅ Phase 1: Setup & Infrastructure         5/5   (100%)
✅ Phase 2: Tests First (TDD)             13/13  (100%)
🔄 Phase 3: Core Implementation            0/15  (  0%) ← START HERE
⏳ Phase 4: API Implementation             0/10  (  0%)
⏳ Phase 5: UI Implementation              0/12  (  0%)
⏳ Phase 6: Polish & Validation            0/5   (  0%)
```

---

## 💡 Implementation Tips for Phase 3

1. **Start with T019 (types)**: Everything depends on this
2. **T020 (base detector)**: Creates pattern for all 5 detectors
3. **Parallel tasks marked [P]**: Can implement simultaneously
4. **T032 is the linchpin**: Main service that ties everything together
5. **Test as you go**: Contract tests validate service layer without UI

### Performance Targets
- Detection runs: <10s for 12 months data + 5k documents
- Parallel detector execution
- Fingerprinting deduplication
- Evidence caching (1-hour TTL)

---

## 🚨 Important Notes

### Database
- ✅ Migrations applied to Supabase
- ✅ RLS policies active
- ⚠️ `user_has_role()` function may need adjustment based on your role schema

### Existing Integrations
- **lib/alerts/alert-service.ts**: Emit P1/P2 alerts (used in T041)
- **lib/research-gpt**: Generate explanations (used in T030)
- **lib/ai/rag**: Citation extraction (used in T023-T025)

### Dependencies
- All installed via T001
- OpenRouter API key required for LLM detectors (T023-T025)
- Supabase configured and live

---

## 📞 How to Resume

When ready to continue:

1. Open Claude Code in `/home/vik/oppspot`
2. Run: `/implement` or manually start with Phase 3 tasks
3. Reference this document for context
4. Reference `tasks.md` for detailed task descriptions
5. Reference `research.md` for technical implementation patterns

---

**Status**: ✅ Ready for Phase 3 Core Implementation
**Next Task**: T019 - Create TypeScript types
**Estimated Time**: 2-3 hours for Phase 3 completion
