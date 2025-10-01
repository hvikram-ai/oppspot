# ResearchGPT™ Implementation Handoff

**Feature**: Deep Company Intelligence in 30 Seconds
**Branch**: `003-researchgpt™-deep-company`
**Status**: Phase 3.1 Complete (6/52 tasks)
**Date**: 2025-10-01

---

## ✅ Completed Work (Phase 3.1: Setup & Foundation)

### T001: Database Migration ✅
**File**: `/home/vik/oppspot/supabase/migrations/20251001000000_research_gpt_schema.sql`

**Created**:
- 4 tables: `research_reports`, `research_sections`, `research_sources`, `user_research_quotas`
- 4 enums: `report_status`, `section_type`, `confidence_level`, `source_type`
- 12 indexes for query performance
- RLS policies for multi-tenant data isolation
- 3 PostgreSQL functions:
  - `calculate_section_expiration()` - Smart TTL calculation
  - `check_research_quota()` - Quota enforcement
  - `increment_research_quota()` - Usage tracking
- 4 triggers for auto-timestamps and cache expiration
- GDPR compliance index for 6-month cleanup

**To Apply Migration**:
```bash
supabase db push
# Verify tables created
supabase db list-tables | grep research
```

---

### T002: TypeScript Type Definitions ✅
**File**: `/home/vik/oppspot/types/research-gpt.ts`

**Created** (500+ lines):
- 40+ TypeScript interfaces for all entities
- 15+ enum types
- Type guards for runtime checking
- API request/response types
- Zero `any` types - fully type-safe

**Key Types**:
```typescript
ResearchReport, ResearchSection, CompanySnapshot,
BuyingSignal, DecisionMaker, RevenueSignal,
RecommendedApproach, Source, UserResearchQuota
```

---

### T003: Zod Validation Schemas ✅
**File**: `/home/vik/oppspot/lib/research-gpt/validation/schemas.ts`

**Created** (600+ lines):
- Runtime validation for all types
- GDPR-compliant business email validation
- User-friendly error messages
- API request/response schemas
- Helper functions for validation

**Usage Example**:
```typescript
import { companySnapshotSchema, validateData } from '@/lib/research-gpt/validation/schemas';

const result = validateData(companySnapshotSchema, data);
if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}
```

---

### T004: Dependencies Installed ✅
**Packages Added**:
```json
{
  "cheerio": "^1.0.0",        // Website scraping
  "newsapi": "^2.4.1",        // News API client
  "pdf-lib": "^1.17.1",       // PDF generation
  "react-markdown": "^9.0.1", // Markdown rendering
  "remark-gfm": "^4.0.0"      // GitHub Flavored Markdown
}
```

**Installed with**: `npm install --legacy-peer-deps`

---

### T005: Environment Variables ✅
**File**: `/home/vik/oppspot/.env.example`

**Added**:
```bash
# News API for press releases
NEWS_API_KEY=your_newsapi_key_here

# Reed.co.uk Jobs API (optional)
REED_API_KEY=your_reed_jobs_api_key_here
```

**Sign Up**:
- News API: https://newsapi.org/ (Free: 100 req/day, Paid: 1000 req/day)
- Reed API: https://www.reed.co.uk/developers (Free tier available)

---

### T006: Smart Cache Manager ✅
**File**: `/home/vik/oppspot/lib/research-gpt/cache/smart-cache-manager.ts`

**Created**:
- Differential TTL: 7 days (snapshot) vs 6 hours (signals)
- Cache validity checking
- Human-readable age formatting
- Cache statistics tracking
- Cache key generation utilities

**Usage Example**:
```typescript
import SmartCacheManager from '@/lib/research-gpt/cache/smart-cache-manager';

// Calculate expiration
const expiresAt = SmartCacheManager.calculateCacheExpiration('snapshot');

// Check validity
const isValid = SmartCacheManager.isCacheValid(cachedAt, expiresAt);

// Format age for UI
const age = SmartCacheManager.formatCacheAge(cachedAt); // "2 hours ago"
```

---

## 📋 Remaining Work (46 tasks across 5 phases)

### Phase 3.2: Tests First - TDD (10 tasks) ⚠️ CRITICAL
**Must complete BEFORE any implementation**

- T007-T010: Contract tests for 4 API endpoints (POST, GET, status, quota)
- T011-T016: Integration tests (happy path, cache, force refresh, quota, invalid, GDPR)

**Why Critical**: TDD approach ensures all tests FAIL before implementation begins. This validates test quality and prevents false positives.

**Files to Create**:
```
tests/e2e/research-api-post.spec.ts
tests/e2e/research-api-get.spec.ts
tests/e2e/research-api-status.spec.ts
tests/e2e/research-quota.spec.ts
tests/e2e/research-happy-path.spec.ts
tests/e2e/research-cached.spec.ts
tests/e2e/research-force-refresh.spec.ts
tests/e2e/research-quota-exceeded.spec.ts
tests/e2e/research-invalid-company.spec.ts
tests/e2e/research-gdpr.spec.ts
```

**Run Tests**:
```bash
npm run test:e2e -- research-
```

**Expected**: All tests should FAIL (endpoints don't exist yet)

---

### Phase 3.3: Data Layer (6 tasks)

**Data Sources** (T017-T020):
- Companies House integration (extend existing service)
- News API for press releases
- Reed.co.uk job board scraping
- Website scraper (Cheerio)

**Orchestration** (T021-T022):
- Data source factory (parallel execution)
- Database repository layer (Supabase)

**Files to Create**:
```
lib/research-gpt/data-sources/companies-house-source.ts
lib/research-gpt/data-sources/news-source.ts
lib/research-gpt/data-sources/jobs-source.ts
lib/research-gpt/data-sources/website-scraper.ts
lib/research-gpt/data-sources/data-source-factory.ts
lib/research-gpt/repository/research-repository.ts
```

---

### Phase 3.4: Service Layer (6 tasks)

**AI Analyzers** (T023-T026):
- Snapshot analyzer (company fundamentals)
- Buying signals analyzer (hiring, expansion, leadership)
- Decision makers analyzer (GDPR-compliant)
- Revenue signals analyzer (financial performance)

**AI Orchestration** (T027-T028):
- Recommendation generator (OpenRouter GPT-4)
- ResearchGPT main service (orchestrates all)

**Files to Create**:
```
lib/research-gpt/analyzers/snapshot-analyzer.ts
lib/research-gpt/analyzers/signals-analyzer.ts
lib/research-gpt/analyzers/decision-maker-analyzer.ts
lib/research-gpt/analyzers/revenue-analyzer.ts
lib/research-gpt/analyzers/recommendation-generator.ts
lib/research-gpt/research-gpt-service.ts
```

**Performance Target**: 95% of requests complete in <30 seconds

---

### Phase 3.5: API & UI (18 tasks)

**API Routes** (T029-T032):
```
app/api/research/[companyId]/route.ts         # POST & GET
app/api/research/[companyId]/status/route.ts  # GET status
app/api/research/quota/route.ts               # GET quota
app/api/research/history/route.ts             # GET history
app/api/research/[companyId]/export/route.ts  # PDF export
```

**UI Components** (T033-T042):
```
components/research/research-button.tsx
components/research/research-progress.tsx
components/research/research-report.tsx
components/research/research-snapshot.tsx
components/research/research-signals.tsx
components/research/research-decision-makers.tsx
components/research/research-revenue.tsx
components/research/research-approach.tsx
components/research/research-sources.tsx
lib/research-gpt/export/pdf-generator.ts
```

**Pages** (T043-T046):
```
app/(dashboard)/research/page.tsx              # History dashboard
app/(dashboard)/research/[reportId]/page.tsx   # View report
```

**Integration**:
- Add Research button to `/app/business/[id]/page.tsx`

---

### Phase 3.6: Polish & Validation (6 tasks)

- T047: E2E test validation (100% pass rate)
- T048: Performance optimization (p95 < 30s)
- T049: GDPR compliance verification
- T050: Documentation updates
- T051: Performance monitoring setup
- T052: Manual testing & launch prep

---

## 🚀 Quick Start Guide for Implementation

### Step 1: Apply Database Migration
```bash
cd /home/vik/oppspot
supabase db push
```

### Step 2: Set Up Environment Variables
```bash
# Create .env.local (if not exists)
cp .env.example .env.local

# Add your API keys
NEWS_API_KEY=your_actual_key
REED_API_KEY=your_actual_key  # Optional
```

### Step 3: Verify Setup
```bash
# TypeScript compilation
npm run build

# Verify types import correctly
node -e "const types = require('./types/research-gpt'); console.log('Types loaded:', Object.keys(types).length)"
```

### Step 4: Start with Tests (Phase 3.2)
```bash
# Create first test file
touch tests/e2e/research-api-post.spec.ts

# Follow T007 spec in tasks.md
# Test MUST fail initially
npm run test:e2e -- research-api-post
```

---

## 📚 Implementation Reference

### Key Design Documents

1. **spec.md** (17.4 KB)
   - 65 requirements (46 functional + 19 non-functional)
   - 6 acceptance scenarios
   - GDPR compliance rules
   - Success criteria

2. **data-model.md** (18.9 KB)
   - 9 entity definitions with complete field specs
   - Database relationships
   - Validation rules
   - JSONB structures

3. **contracts/research-api.yaml** (17.7 KB)
   - OpenAPI 3.0 specification
   - 5 API endpoints with full schemas
   - Request/response examples

4. **research.md** (10.5 KB)
   - 10 technical decisions
   - Architecture patterns
   - Performance strategies
   - Risk mitigation

5. **quickstart.md** (13.9 KB)
   - Step-by-step testing guide
   - Manual testing checklist
   - Performance validation

6. **tasks.md** (73.1 KB)
   - 52 detailed implementation tasks
   - Dependency graph
   - Parallel execution guide
   - Acceptance criteria

---

## 🎯 Critical Success Factors

### Performance (NFR-001)
- **Target**: 95% of requests complete in <30 seconds
- **Strategy**: Parallel data source fetching, smart caching
- **Monitor**: Track p50, p95, p99 generation times

### GDPR Compliance (NFR-006, NFR-007, NFR-008)
- **Rule**: Only business emails from official sources
- **Attribution**: All contact info must cite source
- **Retention**: Auto-delete personal data after 6 months
- **Removal**: User-accessible removal request mechanism

### Data Quality (NFR-004, NFR-005)
- **Accuracy**: 90%+ when fact-checked against sources
- **Freshness**: Flag buying signals >30 days, fundamentals >90 days
- **Sources**: Minimum 10 verified sources per report (FR-030)

### User Experience
- **Speed**: <2 second page load for reports
- **Quota**: 100 researches/month, clear quota display
- **Cache**: Show cache age, allow force refresh
- **Progress**: Real-time updates during generation

---

## 🛠️ Development Workflow

### For Each Task:

1. **Read Task Spec** in `tasks.md`
   - Note dependencies
   - Review acceptance criteria
   - Check file paths

2. **Follow TDD for Tests**
   - Write test FIRST
   - Verify test FAILS
   - Implement feature
   - Verify test PASSES

3. **Use Existing Patterns**
   - API routes: Follow `/app/api/*/route.ts` structure
   - Components: Match `/components/` organization
   - Services: Similar to `/lib/ai/scoring/` pattern

4. **Validate as You Go**
   - TypeScript: `npm run build`
   - Tests: `npm run test:e2e`
   - Lint: `npm run lint`

5. **Mark Task Complete**
   - Update `tasks.md` with ✅
   - Commit with descriptive message
   - Note any issues in implementation notes

---

## 📊 Progress Tracking

### Completed: 6/52 tasks (11.5%)

**Phase 3.1**: ✅✅✅✅✅✅ (6/6) - 100% COMPLETE
**Phase 3.2**: ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0/10)
**Phase 3.3**: ⬜⬜⬜⬜⬜⬜ (0/6)
**Phase 3.4**: ⬜⬜⬜⬜⬜⬜ (0/6)
**Phase 3.5**: ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0/18)
**Phase 3.6**: ⬜⬜⬜⬜⬜⬜ (0/6)

### Time Estimates

**Remaining Sequential**: 40 hours (5 working days)
**Remaining Parallel**: 14 hours (2 working days with 3 developers)

---

## 🔥 Next Immediate Steps

### Must Do Next (Priority Order):

1. **Apply Database Migration**
   ```bash
   supabase db push
   ```

2. **Sign Up for External APIs**
   - News API: https://newsapi.org/
   - Reed API (optional): https://www.reed.co.uk/developers

3. **Start Phase 3.2: Tests**
   - Create `tests/e2e/research-api-post.spec.ts`
   - Follow T007 specification exactly
   - Ensure test FAILS initially

4. **Continue Sequential Implementation**
   - Complete all 10 tests (T007-T016)
   - Verify ALL tests fail
   - Begin Phase 3.3 (Data Layer)

---

## 💡 Tips for Success

### Parallel Execution
Tasks marked [P] can run concurrently. Example:
```bash
# All Phase 3.2 tests can be written in parallel
# by different team members
T007, T008, T009, T010, T011, T012, T013, T014, T015, T016
```

### Use Type Safety
```typescript
// Import types for auto-completion
import type {
  ResearchReport,
  CompanySnapshot,
  BuyingSignal
} from '@/types/research-gpt';

// Validate with Zod
import { companySnapshotSchema } from '@/lib/research-gpt/validation/schemas';
```

### Cache Strategy
```typescript
// Snapshot = 7 days, Signals = 6 hours
import SmartCacheManager from '@/lib/research-gpt/cache/smart-cache-manager';

const ttl = SmartCacheManager.getCacheTTL('buying_signals'); // 6 hours
```

### Error Handling
```typescript
// Graceful degradation for data sources
try {
  const newsData = await fetchNewsAPI();
} catch (error) {
  // Log error but continue with partial data
  console.error('News API failed:', error);
  return { signals: [], confidence: 'low' };
}
```

---

## 📞 Support & Resources

### Documentation
- **Full Spec**: `specs/003-researchgpt™-deep-company/spec.md`
- **Implementation Plan**: `specs/003-researchgpt™-deep-company/plan.md`
- **Task List**: `specs/003-researchgpt™-deep-company/tasks.md`

### Code References
- **Existing AI Service**: `/lib/ai/openrouter.ts`
- **Companies House**: `/lib/services/companies-house.ts`
- **Supabase Client**: `/lib/supabase/server.ts`, `/lib/supabase/client.ts`

### Testing
- **Playwright Config**: `playwright.config.ts`
- **Existing Tests**: `tests/e2e/*.spec.ts`
- **Demo Credentials**: `demo@oppspot.com` / `Demo123456!`

---

## ✨ Feature Highlights

### What Makes ResearchGPT™ Special

1. **30-Second Intelligence**: What takes humans 2 hours, AI does in 30 seconds
2. **Smart Caching**: Fresh signals (6h) + static data (7d) = cost efficiency
3. **GDPR Compliant**: Only business contact info from official sources
4. **6 Key Sections**: Snapshot, Signals, Decision Makers, Revenue, Approach, Sources
5. **Verified Sources**: Minimum 10 sources with reliability scoring
6. **Quota Management**: 100/month with 90% warning notifications
7. **Export & Share**: PDF generation and team collaboration

### Competitive Advantage
- **vs ZoomInfo**: We provide AI analysis, not just data
- **vs Cognism**: We deliver intelligence, not just contacts
- **vs Apollo**: Deep insights beyond basic firmographics

---

## 🎉 You're Ready to Build!

The foundation is solid:
- ✅ Database schema created
- ✅ Type system complete
- ✅ Validation ready
- ✅ Dependencies installed
- ✅ Cache management built
- ✅ Environment configured

**Next**: Start writing tests (Phase 3.2), then implement features phase by phase!

---

**Good luck building ResearchGPT™!** 🚀

*If you have questions, refer to the detailed specs in the `/specs/003-researchgpt™-deep-company/` directory.*
