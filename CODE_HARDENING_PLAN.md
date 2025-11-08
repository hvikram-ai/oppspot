# Competitive Intelligence - Code Hardening Plan

**Status**: Planning Phase
**Target**: Production-Ready Code Quality
**Estimated Duration**: 8-12 hours

---

## Executive Summary

This plan systematically addresses security, reliability, performance, and maintainability issues in the Competitive Intelligence feature codebase. The plan is organized into 8 priority categories with 47 specific tasks.

**Current Assessment**:
- ✅ **Strengths**: Good architecture, TypeScript typing, Zod validation, proper separation of concerns
- ⚠️ **Needs Improvement**: Error handling, rate limiting, input sanitization, edge cases, testing
- ❌ **Critical Gaps**: AI data gatherer missing, no rate limiting, missing validation, no E2E tests

---

## Priority Levels

- **P0 - Critical**: Security vulnerabilities, data corruption risks (Must fix before production)
- **P1 - High**: Reliability issues, performance bottlenecks (Should fix before launch)
- **P2 - Medium**: Code quality, maintainability (Fix within 2 weeks of launch)
- **P3 - Low**: Nice-to-have improvements (Backlog)

---

## Category 1: Security Hardening (P0)

### 1.1 Input Sanitization & Validation

**Issue**: User inputs (URLs, company names, emails) are not sanitized against XSS, SQL injection, or command injection.

**Files Affected**:
- `app/api/competitive-analysis/route.ts:68` - POST body validation
- `app/api/competitive-analysis/[id]/competitors/route.ts` - Competitor data validation
- `app/api/competitive-analysis/[id]/share/route.ts` - Email validation
- `components/competitive-analysis/analysis-list.tsx:45` - Search query sanitization

**Tasks**:
- [ ] Add HTML entity encoding for all user-generated text fields (company names, descriptions, notes)
- [ ] Validate URL format and whitelist schemes (only https://) in competitor websites
- [ ] Add email format validation using Zod .email() in share endpoints
- [ ] Sanitize search queries to prevent NoSQL injection (even though Supabase uses parameterized queries)
- [ ] Add max length limits to all text inputs (title: 200, description: 2000, notes: 1000)

**Example Fix** (lib/competitive-analysis/types.ts):
```typescript
// Before
export const CreateCompetitiveAnalysisSchema = z.object({
  title: z.string(),
  target_company_name: z.string(),
  target_company_website: z.string().optional(),
});

// After
export const CreateCompetitiveAnalysisSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  target_company_name: z.string().min(1).max(200).trim(),
  target_company_website: z.string().url().startsWith('https://').max(500).optional(),
  target_company_description: z.string().max(2000).optional(),
});
```

---

### 1.2 Authentication & Authorization

**Issue**: Missing authorization checks in some endpoints, inconsistent access control patterns.

**Files Affected**:
- `app/api/competitive-analysis/[id]/route.ts:33` - PATCH endpoint only checks existence, not ownership
- `app/api/competitive-analysis/[id]/competitors/[competitorId]/route.ts` - DELETE endpoint missing auth check

**Tasks**:
- [ ] Add `checkUserAccess()` call to ALL endpoints that modify data (PATCH, DELETE, POST)
- [ ] Implement row-level security (RLS) policies in Supabase migration to enforce access at DB level
- [ ] Add audit logging for sensitive operations (share, revoke, delete)
- [ ] Ensure `checkUserAccess()` is called BEFORE any database operations
- [ ] Add rate limiting per user for expensive operations (refresh, export)

**Example Fix** (app/api/competitive-analysis/[id]/route.ts):
```typescript
// Before (line 33)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const analysis = await competitiveAnalysisRepository.findById(params.id);
  if (!analysis) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await competitiveAnalysisRepository.update(params.id, body, user.id);
  // ...
}

// After
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const hasAccess = await competitiveAnalysisRepository.checkUserAccess(params.id, user.id);
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const analysis = await competitiveAnalysisRepository.findById(params.id);
  if (!analysis) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await competitiveAnalysisRepository.update(params.id, body, user.id);
  // ...
}
```

---

### 1.3 Rate Limiting & Resource Protection

**Issue**: No rate limiting on expensive operations (AI refresh, exports, sharing).

**Tasks**:
- [ ] Implement rate limiter using Upstash Redis or in-memory cache (60 requests/hour per user for refresh)
- [ ] Add request throttling for API endpoints (100 requests/minute per IP)
- [ ] Add timeout limits for AI operations (30 seconds per competitor)
- [ ] Implement queue system for refresh operations (use BullMQ or similar)
- [ ] Add max competitors limit (10 per analysis for free tier)

**Implementation Location**: `lib/competitive-analysis/rate-limiter.ts` (NEW FILE)

---

## Category 2: Error Handling & Resilience (P1)

### 2.1 Comprehensive Error Handling

**Issue**: Generic error handling, missing specific error types, no error recovery.

**Files Affected**:
- `lib/competitive-analysis/repository.ts` - All methods throw generic Error
- `app/api/competitive-analysis/[id]/refresh/route.ts:289` - Catch-all error handler
- `components/competitive-analysis/refresh-button.tsx:28` - No error display beyond console.error

**Tasks**:
- [ ] Create custom error classes (NotFoundError, UnauthorizedError, ValidationError, RateLimitError)
- [ ] Replace all `throw new Error()` with specific error types
- [ ] Add error recovery strategies (retry with exponential backoff for transient errors)
- [ ] Display user-friendly error messages in UI components
- [ ] Add error boundary components for each major section
- [ ] Log errors to external service (Sentry, LogRocket, or similar)

**Example Implementation**:
```typescript
// lib/competitive-analysis/errors.ts (NEW FILE)
export class CompetitiveAnalysisError extends Error {
  constructor(message: string, public code: string, public statusCode: number) {
    super(message);
    this.name = 'CompetitiveAnalysisError';
  }
}

export class NotFoundError extends CompetitiveAnalysisError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends CompetitiveAnalysisError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class RateLimitError extends CompetitiveAnalysisError {
  constructor(public retryAfter: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429);
  }
}
```

---

### 2.2 Graceful Degradation

**Issue**: Components crash or show blank screens when data is missing or malformed.

**Files Affected**:
- `components/competitive-analysis/feature-matrix.tsx:120` - Assumes data structure exists
- `components/competitive-analysis/pricing-comparison.tsx:35` - No null checks for pricing data
- `components/competitive-analysis/moat-strength-radar.tsx:25` - Crashes if moatScore is null

**Tasks**:
- [ ] Add null/undefined checks in all components before accessing nested properties
- [ ] Display fallback UI (empty states, loading skeletons) when data is missing
- [ ] Add TypeScript strict null checks (`strictNullChecks: true`)
- [ ] Handle partial data gracefully (e.g., show partial feature matrix if some competitors fail)
- [ ] Add data validation on the client side before rendering

**Example Fix** (components/competitive-analysis/moat-strength-radar.tsx):
```typescript
// Before (line 25)
export function MoatStrengthRadar({ moatScore }: MoatStrengthRadarProps) {
  const radarData = [
    { dimension: 'Feature\nDifferentiation', score: moatScore.feature_differentiation_score, weight: 35 },
    // ...
  ];

  return <RadarChart data={radarData}>...</RadarChart>;
}

// After
export function MoatStrengthRadar({ moatScore }: MoatStrengthRadarProps) {
  if (!moatScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Competitive Moat Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No moat analysis available</p>
            <p className="text-sm mt-2">Trigger a data refresh to calculate moat score</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const radarData = [
    { dimension: 'Feature\nDifferentiation', score: moatScore.feature_differentiation_score || 0, weight: 35 },
    // ...
  ];

  return <RadarChart data={radarData}>...</RadarChart>;
}
```

---

### 2.3 Data Validation & Type Safety

**Issue**: Inconsistent validation between Zod schemas and TypeScript types.

**Tasks**:
- [ ] Ensure all Zod schemas have corresponding TypeScript types via `z.infer<>`
- [ ] Add runtime validation for all API responses (use Zod to validate Supabase responses)
- [ ] Enable TypeScript strict mode (`strict: true` in tsconfig.json)
- [ ] Add exhaustive type guards for discriminated unions (status, price_tier, etc.)
- [ ] Validate date formats and timezones consistently

---

## Category 3: Missing Core Functionality (P0)

### 3.1 AI Data Gatherer Implementation

**Issue**: `lib/competitive-analysis/ai-data-gatherer.ts` file does not exist, but is imported in refresh endpoint.

**Files Affected**:
- `app/api/competitive-analysis/[id]/refresh/route.ts:4` - Imports non-existent module
- Entire refresh flow is broken without this

**Tasks**:
- [ ] Create `lib/competitive-analysis/data-gatherer.ts` with full implementation
- [ ] Implement web scraping logic using Cheerio or Playwright
- [ ] Integrate OpenRouter API for AI analysis of website content
- [ ] Add retry logic for failed web requests (3 retries with exponential backoff)
- [ ] Implement progress tracking callback mechanism
- [ ] Add timeout handling (30 seconds per website)
- [ ] Cache results to avoid re-scraping same URL within 24 hours

**Implementation Template**:
```typescript
// lib/competitive-analysis/data-gatherer.ts (NEW FILE)
import { openRouterClient } from '@/lib/ai/openrouter';

export interface CompetitorDataPoint {
  competitor_name: string;
  website: string;
  features: string[];
  pricing_info?: {
    price_tier: 'starter' | 'professional' | 'enterprise';
    representative_price?: number;
    pricing_model?: 'per_user' | 'per_year' | 'per_month' | 'custom';
    currency?: string;
  };
}

export interface ProgressCallback {
  (progress: { current: number; total: number; current_competitor?: string }): void;
}

export class DataGatherer {
  async gatherCompetitorData(
    competitors: Array<{ name: string; website: string }>,
    onProgress?: ProgressCallback
  ): Promise<CompetitorDataPoint[]> {
    const results: CompetitorDataPoint[] = [];

    for (let i = 0; i < competitors.length; i++) {
      const competitor = competitors[i];
      onProgress?.({ current: i + 1, total: competitors.length, current_competitor: competitor.name });

      try {
        const data = await this.scrapeCompetitorWebsite(competitor.website);
        const analysis = await this.analyzeWithAI(data, competitor.name);
        results.push(analysis);
      } catch (error) {
        console.error(`Failed to gather data for ${competitor.name}:`, error);
        results.push({
          competitor_name: competitor.name,
          website: competitor.website,
          features: [],
        });
      }

      // Rate limiting: 500ms delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return results;
  }

  private async scrapeCompetitorWebsite(url: string): Promise<string> {
    // Implementation: Use fetch + Cheerio or Playwright
    // TODO: Implement web scraping logic
    throw new Error('Not implemented');
  }

  private async analyzeWithAI(htmlContent: string, competitorName: string): Promise<CompetitorDataPoint> {
    // Implementation: Use OpenRouter API to extract features and pricing
    // TODO: Implement AI analysis logic
    throw new Error('Not implemented');
  }
}

export const dataGatherer = new DataGatherer();
```

---

### 3.2 Export Service Implementation

**Issue**: Export endpoints return 501 Not Implemented.

**Tasks**:
- [ ] Implement PDF export using jsPDF or Puppeteer
- [ ] Implement Excel export using xlsx library
- [ ] Implement PowerPoint export using pptxgenjs
- [ ] Add proper MIME types and Content-Disposition headers
- [ ] Generate meaningful file names with timestamp (e.g., `ITONICS_Analysis_2024-11-05.pdf`)
- [ ] Add export templates with branding/styling

---

## Category 4: Performance Optimization (P1)

### 4.1 Database Query Optimization

**Issue**: N+1 queries in dashboard data fetching, no pagination on large datasets.

**Files Affected**:
- `lib/competitive-analysis/repository.ts:549` - getDashboardData uses Promise.all but still 6 separate queries
- `components/competitive-analysis/analysis-list.tsx:89` - Fetches all analyses without cursor pagination

**Tasks**:
- [ ] Create database view or materialized view for dashboard data aggregation
- [ ] Implement cursor-based pagination instead of offset-based
- [ ] Add database indexes on foreign keys (analysis_id, competitor_id, created_by)
- [ ] Use Supabase `select` with joins to reduce round trips
- [ ] Cache frequently accessed data (moat scores, parity scores) in Redis
- [ ] Add EXPLAIN ANALYZE to identify slow queries

**Example Optimization** (lib/competitive-analysis/repository.ts):
```typescript
// Before (line 549)
async getDashboardData(analysisId: string): Promise<DashboardData | null> {
  const [analysis, competitors, feature_parity_scores, ...] = await Promise.all([
    this.findById(analysisId),
    this.getCompetitors(analysisId),
    this.getParityScores(analysisId),
    // ... 6 separate queries
  ]);
  return { analysis, competitors, ... };
}

// After
async getDashboardData(analysisId: string): Promise<DashboardData | null> {
  const supabase = await createClient();

  // Single query with joins
  const { data, error } = await supabase
    .from('competitive_analyses')
    .select(`
      *,
      competitors:competitive_analysis_competitors(
        competitor_companies(*)
      ),
      feature_parity_scores(*),
      feature_matrix_entries(*),
      pricing_comparisons(*),
      market_positioning(*),
      moat_score:competitive_moat_scores(*)
    `)
    .eq('id', analysisId)
    .is('deleted_at', null)
    .single();

  if (error) throw new Error(`Failed to fetch dashboard data: ${error.message}`);

  // Transform to DashboardData structure
  return this.transformToDashboardData(data);
}
```

---

### 4.2 Frontend Performance

**Issue**: Large rerenders, no memoization, no code splitting.

**Files Affected**:
- `components/competitive-analysis/feature-matrix.tsx:120` - Rerenders entire table on every keystroke
- `app/(dashboard)/competitive-analysis/[id]/page.tsx:45` - No React.memo or useMemo

**Tasks**:
- [ ] Add React.memo to expensive components (FeatureMatrix, PricingComparison, MoatStrengthRadar)
- [ ] Use useMemo for computed values (filtered lists, sorted data, aggregations)
- [ ] Use useCallback for event handlers passed as props
- [ ] Implement virtual scrolling for long lists (feature matrix with 100+ features)
- [ ] Add dynamic imports for heavy components (recharts, dialog modals)
- [ ] Optimize recharts rendering (use ResponsiveContainer, debounce resize events)

---

## Category 5: Testing & Quality Assurance (P1)

### 5.1 Unit Tests

**Issue**: No unit tests exist for scoring algorithms, repository methods, or utilities.

**Tasks**:
- [ ] Write tests for `ScoringEngine.calculateFeatureParity()` - 10 test cases
- [ ] Write tests for `ScoringEngine.calculateMoatScore()` - 8 test cases
- [ ] Write tests for `CompetitiveAnalysisRepository` CRUD methods - 15 test cases
- [ ] Write tests for Zod schemas validation - 12 test cases
- [ ] Achieve >80% code coverage for core logic

**Test Framework**: Jest or Vitest

**Example Test** (lib/competitive-analysis/scoring-engine.test.ts):
```typescript
import { scoringEngine } from './scoring-engine';

describe('ScoringEngine.calculateFeatureParity', () => {
  it('should return 100% overlap when all features match', () => {
    const featureMatrix = [
      { feature_name: 'Feature A', possessed_by: { target: true, comp1: true } },
      { feature_name: 'Feature B', possessed_by: { target: true, comp1: true } },
    ];

    const result = scoringEngine.calculateFeatureParity(featureMatrix, 'target', 'comp1');

    expect(result.overlap_score).toBe(100);
    expect(result.differentiation_score).toBe(0);
    expect(result.parity_score).toBe(70); // 0.7 * 100 + 0.3 * 0
  });

  it('should handle empty feature matrix gracefully', () => {
    const result = scoringEngine.calculateFeatureParity([], 'target', 'comp1');

    expect(result.parity_score).toBe(0);
    expect(result.confidence_level).toBe('low');
  });

  // ... 8 more test cases
});
```

---

### 5.2 Integration Tests

**Tasks**:
- [ ] Test full CRUD flow for competitive analyses
- [ ] Test competitor addition/removal flow
- [ ] Test refresh flow (mock AI data gatherer)
- [ ] Test sharing and access grant flow
- [ ] Test dashboard data aggregation

---

### 5.3 E2E Tests

**Issue**: No E2E tests exist for the entire feature.

**Tasks**:
- [ ] Create E2E test suite using existing Playwright setup
- [ ] Test wizard flow (3 steps, competitor addition, creation)
- [ ] Test dashboard visualization rendering
- [ ] Test refresh button and progress modal
- [ ] Test share dialog and invitation flow
- [ ] Test export dialog (even if download fails, dialog should work)
- [ ] Test permissions (viewer vs editor access levels)

**Test File**: `tests/e2e/competitive-analysis.spec.ts` (NEW FILE)

---

## Category 6: User Experience & Edge Cases (P2)

### 6.1 Loading States

**Issue**: Missing loading indicators, blank screens during data fetch.

**Tasks**:
- [ ] Add skeleton loaders for all major components
- [ ] Add loading spinners to all async buttons (Refresh, Export, Share)
- [ ] Show progress indicators during long operations (refresh: 20+ seconds)
- [ ] Add optimistic UI updates (show competitor card immediately, then fetch data)
- [ ] Disable buttons during async operations to prevent double-clicks

---

### 6.2 Empty States

**Issue**: Poor UX when no data exists.

**Tasks**:
- [ ] Add illustrated empty states for:
  - No analyses created yet
  - No competitors added
  - No features in matrix
  - No pricing data available
  - No moat score calculated
- [ ] Include actionable CTAs in empty states ("Add your first competitor")

---

### 6.3 Edge Case Handling

**Tasks**:
- [ ] Handle extremely long company names (>100 characters) with truncation
- [ ] Handle invalid URLs in competitor websites (validate before saving)
- [ ] Handle duplicate competitor names (show warning, allow override)
- [ ] Handle analysis with 1 competitor (moat score calculation may break)
- [ ] Handle negative pricing values (validation error)
- [ ] Handle non-ASCII characters in company names (internationalization)
- [ ] Handle timezone differences in date displays (use user's local timezone)

---

## Category 7: Code Quality & Maintainability (P2)

### 7.1 Code Documentation

**Issue**: Missing JSDoc comments, unclear function purposes.

**Tasks**:
- [ ] Add JSDoc comments to all repository methods with @param and @returns
- [ ] Add inline comments for complex algorithms (scoring formulas)
- [ ] Create architecture diagram (Mermaid.js) showing data flow
- [ ] Document environment variables required (OPENROUTER_API_KEY, etc.)
- [ ] Add README.md in `lib/competitive-analysis/` explaining module structure

---

### 7.2 Code Organization

**Tasks**:
- [ ] Extract magic numbers to constants (30 days for stale data, 20s per competitor, etc.)
- [ ] Create separate files for large components (split feature-matrix.tsx if >300 lines)
- [ ] Move inline styles to Tailwind utility classes
- [ ] Consolidate duplicate error handling logic into shared utility
- [ ] Extract repeated Supabase queries into repository methods

**Example Refactor**:
```typescript
// Before: Magic numbers scattered across files
const daysSince = Math.floor((Date.now() - lastRefresh) / (1000 * 60 * 60 * 24));
if (daysSince >= 30) { /* stale */ }

// After: Constants file
// lib/competitive-analysis/constants.ts (NEW FILE)
export const STALE_DATA_THRESHOLD_DAYS = 30;
export const REFRESH_ESTIMATE_SECONDS_PER_COMPETITOR = 20;
export const MAX_COMPETITORS_PER_ANALYSIS = 10;
export const RATE_LIMIT_REFRESH_PER_HOUR = 5;

// Usage
import { STALE_DATA_THRESHOLD_DAYS } from './constants';
if (daysSinceRefresh >= STALE_DATA_THRESHOLD_DAYS) { /* stale */ }
```

---

### 7.3 TypeScript Strict Mode

**Tasks**:
- [ ] Enable `strictNullChecks: true`
- [ ] Enable `noImplicitAny: true`
- [ ] Enable `strictFunctionTypes: true`
- [ ] Fix all resulting type errors (~50 expected)
- [ ] Remove all `as any` type assertions

---

## Category 8: Observability & Monitoring (P2)

### 8.1 Logging

**Issue**: Only console.log, no structured logging.

**Tasks**:
- [ ] Implement structured logging with Winston or Pino
- [ ] Add log levels (debug, info, warn, error, fatal)
- [ ] Log all API requests with user ID, endpoint, duration
- [ ] Log all errors with stack traces
- [ ] Add request correlation IDs for tracing

---

### 8.2 Metrics & Analytics

**Tasks**:
- [ ] Track usage metrics (analyses created, refreshes triggered, exports downloaded)
- [ ] Track performance metrics (API latency, database query time, AI response time)
- [ ] Track error rates (failed refreshes, failed exports, validation errors)
- [ ] Add monitoring dashboard (Grafana, Datadog, or similar)
- [ ] Set up alerts for critical errors (>5% error rate, >10s API latency)

---

### 8.3 Audit Trail

**Tasks**:
- [ ] Log all sensitive operations (share, revoke, delete) to audit table
- [ ] Include user ID, timestamp, IP address, action details
- [ ] Make audit logs immutable (insert-only, no updates/deletes)
- [ ] Add UI to view audit trail (for compliance)

---

## Implementation Roadmap

### Phase 1: Critical Security & Functionality (Week 1)
**Priority**: P0 tasks
- Security hardening (input sanitization, auth checks)
- Implement AI data gatherer
- Add comprehensive error handling

**Estimated Time**: 16 hours
**Deliverable**: Secure, functional refresh flow

---

### Phase 2: Reliability & Performance (Week 2)
**Priority**: P1 tasks
- Rate limiting
- Database optimization
- Frontend performance improvements
- Basic test coverage (unit + integration)

**Estimated Time**: 12 hours
**Deliverable**: Production-ready performance

---

### Phase 3: Polish & Quality (Week 3)
**Priority**: P2 tasks
- E2E tests
- Loading states and empty states
- Code documentation
- Export service implementation

**Estimated Time**: 10 hours
**Deliverable**: Enterprise-grade UX

---

### Phase 4: Monitoring & Maintenance (Week 4)
**Priority**: P2-P3 tasks
- Observability setup
- Audit trail
- Code organization cleanup

**Estimated Time**: 8 hours
**Deliverable**: Maintainable, observable system

---

## Success Metrics

After completing this hardening plan, the codebase should achieve:

- ✅ **Security**: OWASP Top 10 compliance, input validation, proper auth
- ✅ **Reliability**: 99.9% uptime, graceful error handling, retry logic
- ✅ **Performance**: <500ms API latency (p95), <2s dashboard load
- ✅ **Quality**: >80% test coverage, TypeScript strict mode, zero ESLint errors
- ✅ **Maintainability**: Well-documented, organized, observable

---

## Next Steps

1. **Review this plan** with the team
2. **Prioritize tasks** based on launch timeline
3. **Assign owners** to each category
4. **Create GitHub issues** for tracking
5. **Start with Phase 1** (Critical Security & Functionality)

---

**Last Updated**: 2024-11-05
**Author**: Claude Code
**Status**: Draft - Awaiting Approval
