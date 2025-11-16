# TypeScript Cleanup Plan - Tier 1 Priority Files

## Executive Summary

**Current Status**: 1,227 `@typescript-eslint/no-explicit-any` errors across the codebase
**Goal**: Fix Tier 1 critical files (core business logic) to improve type safety
**Time Estimate**: 20 hours for Tier 1 files
**Priority**: HIGH (Critical Blocker for Launch)

## Strategy

### Phase 1: Tier 1 - Core Business Logic (20 hours)
Fix the 500 most critical errors in files that handle core business operations:

1. **Supabase Client** (`lib/supabase/client.ts`) - ~50 errors
   - Database queries and type definitions
   - User authentication flows
   - Row Level Security (RLS) interactions

2. **AI/OpenRouter** (`lib/ai/openrouter.ts`) - ~40 errors
   - LLM API interactions
   - Prompt handling
   - Response parsing

3. **Analytics** (`lib/analytics/*.ts`) - ~100 errors across 5 files
   - Predictive analytics engine
   - Business scoring algorithms
   - Market metrics calculations

4. **Data Room Repository** (`lib/data-room/repository/*.ts`) - ~150 errors across 8 files
   - Document management
   - Access control
   - Query operations

5. **Competitive Analysis** (`lib/competitive-analysis/*.ts`) - ~80 errors across 3 files
   - Competitor data processing
   - Feature matrix calculations
   - Pricing comparisons

6. **ResearchGPT** (`lib/research-gpt/*.ts`) - ~80 errors across 2 files
   - Report generation
   - Data aggregation
   - Source attribution

### Phase 2: Tier 2 - API Routes (Deferred)
- `app/api/**/*.ts` - ~400 errors
- Impact: Medium (errors are isolated to API boundaries)

### Phase 3: Tier 3 - Components (Deferred)
- `components/**/*.tsx` - ~300 errors
- Impact: Low (UI-level type safety, less critical)

## Tier 1 File Breakdown

### Priority 1: lib/supabase/client.ts (Estimated: 4 hours)

**Why Critical**: Every database operation in the app uses this file. Type errors here propagate throughout the entire codebase.

**Common Patterns to Fix**:
```typescript
// ❌ BEFORE
const { data, error } = await supabase
  .from('businesses')
  .select('*')

// ✅ AFTER
interface Business {
  id: string
  name: string
  // ... full type definition
}

const { data, error } = await supabase
  .from('businesses')
  .select<'*', Business>('*')
```

**Action Items**:
- [ ] Define TypeScript interfaces for all database tables
- [ ] Type all Supabase query results
- [ ] Replace `any` with proper generic types for query builders
- [ ] Add return type annotations to all exported functions

**Files**:
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`

---

### Priority 2: lib/ai/openrouter.ts (Estimated: 3 hours)

**Why Critical**: Powers all AI features (ResearchGPT, Data Room Q&A, Competitive Analysis). Errors could cause silent failures in LLM responses.

**Common Patterns to Fix**:
```typescript
// ❌ BEFORE
async function callLLM(prompt: string): Promise<any> {
  const response = await fetch(OPENROUTER_API, {
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
  })
  return response.json()
}

// ✅ AFTER
interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OpenRouterResponse {
  choices: Array<{
    message: OpenRouterMessage
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
  }
}

async function callLLM(prompt: string): Promise<OpenRouterResponse> {
  const response = await fetch(OPENROUTER_API, {
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt } as OpenRouterMessage]
    })
  })
  return response.json() as Promise<OpenRouterResponse>
}
```

**Action Items**:
- [ ] Define OpenRouter API request/response types
- [ ] Type all LLM message structures
- [ ] Add zod validation for LLM responses
- [ ] Type error handling paths

**Files**:
- `lib/ai/openrouter.ts`
- `lib/ai/llm-manager.ts`

---

### Priority 3: lib/analytics/*.ts (Estimated: 5 hours)

**Why Critical**: Powers BANT scoring, market predictions, and investment recommendations. Errors could produce incorrect business intelligence.

**Files to Fix** (100 errors across 5 files):
1. `lib/analytics/predictive-engine.ts` - ~30 errors
2. `lib/analytics/bant-scoring.ts` - ~25 errors
3. `lib/analytics/market-metrics.ts` - ~20 errors
4. `lib/analytics/growth-predictor.ts` - ~15 errors
5. `lib/analytics/acquisition-signals.ts` - ~10 errors

**Common Patterns to Fix**:
```typescript
// ❌ BEFORE
function calculateBANTScore(business: any): any {
  const budget = business.revenue * 0.1
  const authority = business.decision_makers.length
  // ...
  return { score: total, factors: [] }
}

// ✅ AFTER
interface Business {
  id: string
  revenue: number | null
  decision_makers: DecisionMaker[]
  // ... full definition
}

interface BANTScore {
  score: number
  budget_score: number
  authority_score: number
  need_score: number
  timing_score: number
  factors: BANTFactor[]
}

function calculateBANTScore(business: Business): BANTScore {
  const budget = (business.revenue ?? 0) * 0.1
  const authority = business.decision_makers.length
  // ...
  return {
    score: total,
    budget_score: budgetScore,
    authority_score: authorityScore,
    need_score: needScore,
    timing_score: timingScore,
    factors: []
  }
}
```

**Action Items**:
- [ ] Define types for all analytics inputs (Business, MarketData, etc.)
- [ ] Type all scoring algorithm outputs
- [ ] Add JSDoc comments for complex calculations
- [ ] Use type guards for null/undefined handling

---

### Priority 4: lib/data-room/repository/*.ts (Estimated: 5 hours)

**Why Critical**: Manages secure document storage and access control. Type errors could create security vulnerabilities.

**Files to Fix** (150 errors across 8 files):
1. `lib/data-room/repository/data-room-repository.ts` - ~30 errors
2. `lib/data-room/repository/document-repository.ts` - ~25 errors
3. `lib/data-room/repository/access-repository.ts` - ~20 errors
4. `lib/data-room/repository/activity-repository.ts` - ~20 errors
5. `lib/data-room/repository/qa-repository.ts` - ~20 errors
6. `lib/data-room/repository/hypothesis-repository.ts` - ~15 errors
7. `lib/data-room/repository/tech-stack-repository.ts` - ~10 errors
8. `lib/data-room/repository/annotation-repository.ts` - ~10 errors

**Common Patterns to Fix**:
```typescript
// ❌ BEFORE
async function getDataRoom(id: string): Promise<any> {
  const { data } = await supabase
    .from('data_rooms')
    .select('*, documents(*)')
    .eq('id', id)
    .single()

  return data
}

// ✅ AFTER
interface Document {
  id: string
  title: string
  file_size: number
  // ... full definition
}

interface DataRoom {
  id: string
  name: string
  description: string
  documents: Document[]
  created_at: string
  updated_at: string
}

async function getDataRoom(id: string): Promise<DataRoom | null> {
  const { data, error } = await supabase
    .from('data_rooms')
    .select<'*, documents(*)', DataRoom>('*, documents(*)')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch data room: ${error.message}`)
  }

  return data
}
```

**Action Items**:
- [ ] Use existing types from `lib/data-room/types.ts`
- [ ] Type all Supabase queries with proper selects
- [ ] Add error handling with typed errors
- [ ] Type RLS policy interactions

---

### Priority 5: lib/competitive-analysis/*.ts (Estimated: 3 hours)

**Why Critical**: Powers competitive intelligence features. Type errors could cause incorrect competitor comparisons.

**Files to Fix** (80 errors across 3 files):
1. `lib/competitive-analysis/analyzer.ts` - ~40 errors
2. `lib/competitive-analysis/feature-matrix.ts` - ~25 errors
3. `lib/competitive-analysis/pricing-comparator.ts` - ~15 errors

**Common Patterns to Fix**:
```typescript
// ❌ BEFORE
function compareFeatures(company1: any, company2: any): any {
  const features = [...company1.features, ...company2.features]
  const matrix = features.map(f => ({
    feature: f,
    company1: company1.features.includes(f),
    company2: company2.features.includes(f)
  }))
  return matrix
}

// ✅ AFTER
interface CompetitorCompany {
  id: string
  name: string
  features: string[]
  pricing: PricingTier[]
}

interface FeatureMatrixEntry {
  feature: string
  company1_has: boolean
  company2_has: boolean
  advantage: 'company1' | 'company2' | 'neither'
}

function compareFeatures(
  company1: CompetitorCompany,
  company2: CompetitorCompany
): FeatureMatrixEntry[] {
  const allFeatures = new Set([...company1.features, ...company2.features])

  return Array.from(allFeatures).map(feature => {
    const c1Has = company1.features.includes(feature)
    const c2Has = company2.features.includes(feature)

    return {
      feature,
      company1_has: c1Has,
      company2_has: c2Has,
      advantage: c1Has && !c2Has ? 'company1' :
                 !c1Has && c2Has ? 'company2' : 'neither'
    }
  })
}
```

**Action Items**:
- [ ] Define types for competitor data structures
- [ ] Type feature comparison algorithms
- [ ] Type pricing calculation functions
- [ ] Use existing types from `lib/competitive-analysis/types.ts`

---

### Priority 6: lib/research-gpt/*.ts (Estimated: 0 hours - SKIP)

**Files to Fix** (80 errors across 2 files):
1. `lib/research-gpt/research-gpt-service.ts` - ~50 errors
2. `lib/research-gpt/report-generator.ts` - ~30 errors

**Action Items**:
- [ ] Define types for report sections
- [ ] Type data source responses
- [ ] Type AI analysis results
- [ ] Add comprehensive error types

**Common Patterns to Fix**:
```typescript
// ❌ BEFORE
async function generateReport(companyId: string): Promise<any> {
  const snapshot = await fetchSnapshot(companyId)
  const signals = await analyzeSignals(companyId)
  const decisionMakers = await findDecisionMakers(companyId)

  return {
    snapshot,
    signals,
    decision_makers: decisionMakers,
    generated_at: new Date()
  }
}

// ✅ AFTER
interface ResearchReport {
  id: string
  company_id: string
  snapshot: CompanySnapshot
  signals: AcquisitionSignal[]
  decision_makers: DecisionMaker[]
  revenue_analysis: RevenueAnalysis | null
  recommendations: Recommendation[]
  generated_at: Date
  expires_at: Date
}

interface CompanySnapshot {
  company_name: string
  industry: string
  employee_count: number | null
  revenue: number | null
  founding_year: number | null
  description: string
}

async function generateReport(companyId: string): Promise<ResearchReport> {
  const snapshot = await fetchSnapshot(companyId)
  const signals = await analyzeSignals(companyId)
  const decisionMakers = await findDecisionMakers(companyId)

  return {
    id: generateUUID(),
    company_id: companyId,
    snapshot,
    signals,
    decision_makers: decisionMakers,
    revenue_analysis: null,
    recommendations: [],
    generated_at: new Date(),
    expires_at: addDays(new Date(), 7)
  }
}
```

---

## Implementation Approach

### 1. Create Type Definition Files First
Before fixing individual files, create centralized type definition files:

```bash
# Create if they don't exist
touch lib/types/database.ts          # Supabase table types
touch lib/types/ai.ts                # AI/LLM types
touch lib/types/analytics.ts         # Analytics types
touch lib/types/data-room.ts         # Data room types (already exists)
touch lib/types/competitive.ts       # Competitive analysis types
```

### 2. Work File-by-File
- One file at a time
- Run `npx eslint <file> --fix` after each change
- Test that file's functionality
- Commit frequently with descriptive messages

### 3. Use Type Assertions Sparingly
Only use `as` when absolutely necessary (e.g., external API responses). Prefer:
- Type guards (`if (typeof x === 'string')`)
- Narrowing with conditionals
- Exhaustive type checking with `never`

### 4. Leverage Existing Types
Many types already exist in `lib/data-room/types.ts` and other files. Reuse them instead of duplicating.

### 5. Add Runtime Validation with Zod
For critical paths (API routes, external data), add Zod schemas:

```typescript
import { z } from 'zod'

const BusinessSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  revenue: z.number().nullable(),
})

type Business = z.infer<typeof BusinessSchema>

// Runtime validation
const business = BusinessSchema.parse(data) // Throws if invalid
```

## Testing Strategy

After fixing each file:
1. Run TypeScript compiler: `npx tsc --noEmit`
2. Run ESLint: `npx eslint <file>`
3. Run relevant E2E tests
4. Manual testing of feature if possible

## Success Criteria

### Tier 1 Complete When:
- [ ] All 6 priority files have zero `@typescript-eslint/no-explicit-any` errors
- [ ] All tests pass
- [ ] Application builds without TypeScript errors
- [ ] No regressions in functionality

### Metrics:
- **Before**: 1,227 errors
- **After Tier 1**: ~700 errors (43% reduction)
- **Risk Reduction**: HIGH → MEDIUM

## Time Breakdown

| File | Errors | Hours | Assignee |
|------|--------|-------|----------|
| lib/supabase/client.ts | ~50 | 4 | Senior Dev |
| lib/ai/openrouter.ts | ~40 | 3 | Senior Dev |
| lib/analytics/*.ts | ~100 | 5 | Senior Dev |
| lib/data-room/repository/*.ts | ~150 | 5 | Senior Dev |
| lib/competitive-analysis/*.ts | ~80 | 3 | Senior Dev |
| **TOTAL** | **~420** | **20** | |

## References

- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- Supabase TypeScript Guide: https://supabase.com/docs/guides/api/generating-types
- Zod Documentation: https://zod.dev

---

**Status**: Ready to Start
**Owner**: Senior Developer
**Deadline**: Week 1 of Pre-Launch Sprint
**Priority**: HIGH (Critical Blocker)
