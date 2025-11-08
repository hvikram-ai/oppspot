# Research & Technical Decisions: Stream Setup Workflow

**Feature**: Stream Setup Workflow with Goal-Oriented Configuration
**Date**: 2025-10-31
**Status**: Completed

## Overview

This document consolidates research findings and technical decisions for implementing the 3-step stream setup wizard with business profile creation and stream-scoped work management.

---

## 1. Multi-Step Wizard Implementation

### Decision: Next.js Dynamic Routes with Zustand State

**Rationale**:
- Next.js App Router supports dynamic routes (`/streams/new/[step]`) for clean URLs
- Zustand provides lightweight state management without Redux complexity
- Client-side state persistence using localStorage for "save progress on navigation away" requirement (FR-006)
- Server-side validation at each step prevents invalid progressions

**Alternatives Considered**:
1. **React Context + useState**: Rejected - no built-in persistence, complex prop drilling
2. **URL Query Parameters**: Rejected - exposes sensitive data in URL, poor UX for back button
3. **Server Session Storage**: Rejected - requires server round-trips, slower wizard transitions

**Implementation Pattern**:
```typescript
// lib/stores/wizard-store.ts
interface WizardState {
  currentStep: 1 | 2 | 3
  goalType: string | null
  businessImpact: Record<string, unknown>
  selectedProfileId: string | null
  newProfileData: Partial<BusinessProfile> | null
  saveProgress: () => void
  loadProgress: () => void
}
```

**References**:
- Next.js Dynamic Routes: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
- Zustand Persist Middleware: https://docs.pmnd.rs/zustand/integrations/persisting-store-state

---

## 2. AI Website Analysis for Business Profiles

### Decision: OpenRouter API with Claude Sonnet 3.5 + Cheerio Scraping

**Rationale**:
- OpenRouter provides consistent API access (already integrated in oppSpot for ResearchGPT™)
- Claude Sonnet 3.5 excels at structured data extraction from unstructured HTML
- Cheerio for lightweight HTML parsing (no browser overhead)
- Fallback to manual entry if website unreachable (FR-009 graceful error handling)

**Extraction Strategy**:
1. Fetch website HTML via fetch() with 10s timeout
2. Parse with Cheerio, extract text from specific selectors (h1, p, meta tags)
3. Send cleaned text to Claude Sonnet 3.5 with structured JSON schema
4. Validate response against TypeScript interface, show user for confirmation (FR-010)

**Performance Target**: <30 seconds for 95% of websites (Technical Context)

**Alternatives Considered**:
1. **Playwright Browser Automation**: Rejected - too slow (>30s), resource-intensive
2. **Third-party APIs (Clearbit, BuiltWith)**: Rejected - costly, API rate limits, less customizable
3. **Local LLM (Ollama)**: Rejected - inconsistent availability, slower inference

**Example Prompt**:
```
Analyze the following company website content and extract structured information.
Return ONLY valid JSON matching this schema:
{
  "company_name": string,
  "industry": string,
  "description": string (max 500 chars),
  "size": "1-10" | "11-50" | "51-200" | "201-500" | "500+",
  "location": string (city, country),
  "revenue_range": "$0-1M" | "$1-10M" | "$10-50M" | "$50-100M" | "$100M+",
  "tech_stack": string[] (max 10),
  "products_services": string[] (max 5),
  "target_markets": string[] (max 5),
  "key_differentiators": string[] (max 3),
  "employee_count": number | null
}

Website content:
[CONTENT]
```

**References**:
- OpenRouter Documentation: https://openrouter.ai/docs
- Cheerio Scraping: https://cheerio.js.org/docs/intro
- Claude Sonnet 3.5 Structured Outputs: Anthropic best practices

---

## 3. Stream Context Management & Work Association

### Decision: Zustand Global Store + Supabase user_metadata

**Rationale**:
- FR-013 requires "current active stream" tracking across all pages
- Zustand provides reactive global state accessible from any component
- Persist to Supabase auth.user.user_metadata for cross-device/session consistency
- Middleware intercepts API calls to inject stream_id automatically (FR-014)

**Implementation Pattern**:
```typescript
// lib/stores/stream-context-store.ts
interface StreamContextState {
  activeStreamId: string | null
  setActiveStream: (streamId: string) => Promise<void>
  clearActiveStream: () => Promise<void>
}

// Persist to Supabase
await supabase.auth.updateUser({
  data: { active_stream_id: streamId }
})
```

**Asset Association Strategy**:
- All write API routes check `user.user_metadata.active_stream_id`
- Create stream_items record linking asset to stream
- Dashboard queries filter by stream_id (FR-017)

**Alternatives Considered**:
1. **URL Parameter /streams/[id]/...**: Rejected - requires refactoring all routes, breaks existing URLs
2. **Server Session Cookies**: Rejected - doesn't persist across devices, session expiry issues
3. **Database user_context Table**: Rejected - unnecessary extra table, slower than user_metadata

**References**:
- Supabase Auth Metadata: https://supabase.com/docs/guides/auth/managing-user-data
- Zustand Async Actions: https://docs.pmnd.rs/zustand/guides/async-actions

---

## 4. Personalization Engine Architecture

### Decision: Three-Layer Approach (Filtering + Ranking + AI Recommendations)

**Rationale**:
- Clarification answer specified "All combined" approach (Question 5)
- Layer 1 (Filtering): PostgreSQL WHERE clauses using profile criteria (fast, deterministic)
- Layer 2 (Ranking): Scoring algorithm using profile attributes (moderate complexity)
- Layer 3 (AI Recommendations): LLM-generated contextual insights (slow, non-deterministic)

**Implementation Pattern**:
```typescript
// lib/services/stream-personalization.ts
interface PersonalizationConfig {
  profile: BusinessProfile
  searchResults: Company[]
}

async function applyPersonalization(config: PersonalizationConfig) {
  // Layer 1: Hard filters
  const filtered = filterByProfileCriteria(config)

  // Layer 2: Score and rank
  const ranked = scoreByStrategicFit(filtered, config.profile)

  // Layer 3: AI insights (parallel, non-blocking)
  const withInsights = await addAIRecommendations(ranked, config.profile)

  return withInsights
}
```

**Layer 1 Example (Filtering)**:
```sql
WHERE
  industry = ANY(profile.target_markets)
  AND revenue_estimate BETWEEN profile.revenue_range.min AND profile.revenue_range.max
  AND location = ANY(profile.locations)
```

**Layer 2 Example (Ranking)**:
```typescript
function calculateFitScore(company: Company, profile: BusinessProfile): number {
  let score = 0
  // Industry match: 30 points
  if (profile.target_markets.includes(company.industry)) score += 30
  // Tech stack overlap: 25 points
  const techOverlap = intersection(company.tech_stack, profile.tech_stack)
  score += (techOverlap.length / profile.tech_stack.length) * 25
  // Size match: 20 points
  if (company.size === profile.preferred_company_size) score += 20
  // Geographic proximity: 15 points
  if (company.location === profile.location) score += 15
  // Differentiators alignment: 10 points
  // ... more criteria
  return score // 0-100
}
```

**Layer 3 Example (AI)**:
```
Given this company profile: [PROFILE]
And these search results: [RESULTS]
Provide 3 actionable recommendations for why each result is a strategic fit.
Focus on: synergies, acquisition rationale, integration opportunities.
```

**Performance Targets**:
- Layer 1: <100ms (database index optimization)
- Layer 2: <200ms (in-memory calculation)
- Layer 3: <3s (async, doesn't block UI)

**Alternatives Considered**:
1. **AI-Only Personalization**: Rejected - too slow, non-deterministic, costly
2. **Rule-Based Only**: Rejected - insufficient for "hyperpersonalization" requirement
3. **Vector Similarity Search**: Rejected - over-engineered, profile changes require re-embedding

**References**:
- PostgreSQL Array Operators: https://www.postgresql.org/docs/current/functions-array.html
- Scoring Algorithm Design: Domain-driven design patterns

---

## 5. Database Schema Design

### Decision: business_profiles Table (Org-Scoped) + Enhanced streams Table

**Rationale**:
- Clarification confirmed profiles are org-scoped (Question 3)
- Reusable across multiple streams (efficiency, consistency)
- Separate table allows independent lifecycle (edit without affecting streams)
- goal_templates table exists but needs proper TypeScript types

**New Tables**:

#### business_profiles
```sql
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  website_url TEXT NOT NULL,

  -- AI-Extracted Data (FR-007)
  industry TEXT,
  description TEXT,
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  location TEXT,
  revenue_range TEXT,
  tech_stack TEXT[] DEFAULT '{}',
  products_services TEXT[] DEFAULT '{}',
  target_markets TEXT[] DEFAULT '{}',
  key_differentiators TEXT[] DEFAULT '{}',
  employee_count INTEGER,

  -- Manual Overrides
  manual_edits JSONB DEFAULT '{}',

  -- Metadata
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
  analysis_metadata JSONB DEFAULT '{}',

  -- Ownership
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(org_id, website_url)  -- Prevent duplicate profiles for same website
);
```

#### streams Enhancements (Already Exist)
- `goal_template_id TEXT` ✅ Exists
- `goal_criteria JSONB` ✅ Exists
- `target_metrics JSONB` ✅ Exists
- `business_profile_id UUID REFERENCES business_profiles(id)` ⚠️ NEEDS ADDING

#### goal_templates (Needs Proper Types)
```sql
CREATE TABLE IF NOT EXISTS goal_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'acquisition', 'expansion', 'research'
  icon TEXT,

  -- Defaults
  default_criteria JSONB DEFAULT '{}',
  default_metrics JSONB DEFAULT '{}',
  default_success_criteria JSONB DEFAULT '{}',

  -- Suggested Workflow
  suggested_stages JSONB DEFAULT '[]',
  suggested_agents JSONB DEFAULT '[]',

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed 7 goal types (FR-002 clarification)
INSERT INTO goal_templates (id, name, description, category) VALUES
  ('due_diligence', 'Conduct Due Diligence', 'Deep analysis of specific acquisition target', 'acquisition'),
  ('discover_companies', 'Discover Companies', 'Find and qualify potential acquisition targets', 'expansion'),
  ('market_research', 'Market Research', 'Analyze market trends and competitive landscape', 'research'),
  ('competitive_analysis', 'Competitive Analysis', 'Compare competitors and identify differentiation', 'research'),
  ('territory_expansion', 'Territory Expansion', 'Explore new geographic or vertical markets', 'expansion'),
  ('investment_pipeline', 'Investment Pipeline', 'Build and manage deal flow pipeline', 'acquisition'),
  ('partnership_opportunities', 'Partnership Opportunities', 'Identify strategic partnership candidates', 'expansion');
```

**Migration Strategy**:
1. Create business_profiles table
2. Add business_profile_id to streams (nullable for backwards compatibility)
3. Create goal_templates table if not exists, seed data
4. Add indexes: business_profiles(org_id), streams(business_profile_id), goal_templates(category)

**References**:
- Supabase Schema Design: https://supabase.com/docs/guides/database/tables
- PostgreSQL JSONB: https://www.postgresql.org/docs/current/datatype-json.html

---

## 6. Wizard Progress Persistence (FR-006)

### Decision: Session-Only Persistence (Not Cross-Session)

**Rationale**:
- FR-006 was deferred as "minor clarification" in spec review
- Session-only persistence balances UX (recover from accidental navigation) with security (don't persist sensitive half-filled forms indefinitely)
- Use Zustand persist middleware with sessionStorage (clears on tab close)
- Clear wizard state on successful stream creation

**Implementation**:
```typescript
import { persist } from 'zustand/middleware'

const useWizardStore = create(
  persist(
    (set) => ({
      // ... wizard state
    }),
    {
      name: 'stream-wizard',
      storage: createJSONStorage(() => sessionStorage) // Not localStorage
    }
  )
)
```

**Alternatives Considered**:
1. **Cross-Session Persistence (localStorage)**: Rejected - security risk (unfinished profiles linger), spec ambiguity
2. **No Persistence**: Rejected - poor UX for accidental back button clicks
3. **Server-Side Draft**: Rejected - unnecessary complexity, adds latency

**References**:
- Zustand Persist: https://docs.pmnd.rs/zustand/integrations/persisting-store-state

---

## 7. Business Impact Criteria (FR-003 Deferred)

### Decision: Free-Form Text Area (v1), Structured Form (v2)

**Rationale**:
- FR-003 was deferred as "minor clarification"
- v1 (MVP): Single rich text area for user to describe business impact in natural language
- v2 (Future): Structured form with predefined dimensions (revenue targets, strategic fit, geographic focus, technology needs, talent acquisition)
- Stored as JSONB in streams.goal_criteria for forward compatibility

**v1 Implementation**:
```typescript
// Step 2: Business Impact
<Textarea
  label="Why are you pursuing this goal?"
  placeholder="Describe your business objectives, strategic priorities, and success criteria..."
  value={businessImpact}
  onChange={(e) => setBusinessImpact(e.target.value)}
/>
```

**v2 Future Enhancement**:
```typescript
interface BusinessImpactCriteria {
  revenue_targets?: { min: number; max: number; timeframe: string }
  strategic_fit?: string[] // e.g., ["vertical_integration", "geographic_expansion"]
  geographic_focus?: string[]
  technology_needs?: string[]
  talent_acquisition?: boolean
  custom_criteria?: string
}
```

**References**:
- Spec clarifications section (lines 217, 253)

---

## Summary of Decisions

| Topic | Decision | Status |
|-------|----------|--------|
| Wizard Implementation | Next.js dynamic routes + Zustand | ✅ Finalized |
| AI Website Analysis | OpenRouter + Claude Sonnet 3.5 + Cheerio | ✅ Finalized |
| Stream Context | Zustand + Supabase user_metadata | ✅ Finalized |
| Personalization | 3-layer (Filter + Rank + AI) | ✅ Finalized |
| Database Schema | business_profiles + enhanced streams | ✅ Finalized |
| Wizard Persistence | Session-only (sessionStorage) | ✅ Finalized |
| Business Impact UI | Free-form text (v1) | ✅ Finalized |

---

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| AI website analysis timeout (>30s) | Implement 30s timeout, fallback to manual entry, show progress indicator |
| Profile creation failure (invalid website) | Graceful error handling (FR-009), offer manual data entry form |
| Stream context lost on session expiry | Persist to Supabase user_metadata, restore on auth.getSession() |
| Profile reuse conflicts (org-scoped) | Implement profile name search, show last used date, enforce unique website per org |
| Wizard abandonment (incomplete setup) | Session persistence recovers state, analytics to track abandonment funnel |

---

## Next Steps (Phase 1)

1. Generate data-model.md with full schema definitions
2. Create API contracts for 4 new endpoints:
   - POST /api/profiles (create with AI analysis)
   - GET /api/profiles (list org profiles)
   - GET /api/profiles/[id] (get single)
   - PATCH /api/profiles/[id] (update)
3. Generate contract tests (failing, TDD)
4. Create quickstart.md for feature validation
5. Update CLAUDE.md agent context

---

**Research Status**: ✅ COMPLETE - All critical unknowns resolved, ready for Phase 1 design
