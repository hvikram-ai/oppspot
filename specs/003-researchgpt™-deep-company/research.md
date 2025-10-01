# Research: ResearchGPT™ Implementation

**Feature**: ResearchGPT™ - Deep Company Intelligence in Seconds
**Date**: 2025-10-01
**Status**: Complete

## Research Decisions

### 1. AI Orchestration Strategy

**Decision**: Use existing OpenRouter API with GPT-4 for synthesis + specialized analyzers for structured data extraction

**Rationale**:
- OpenRouter already integrated (`/lib/ai/openrouter.ts`)
- GPT-4 excels at synthesizing multiple data sources into narrative intelligence
- Specialized TypeScript analyzers provide structured, reliable extraction from APIs
- Hybrid approach: APIs for facts, AI for insights

**Alternatives Considered**:
- Pure LLM approach: Too slow and expensive for 30-second target
- Pure rule-based: Lacks intelligence and narrative quality
- Local LLMs: Insufficient quality for business intelligence

**Best Practices Applied**:
- Parallel data source fetching for speed
- Structured output from LLMs using JSON schema
- Fallback mechanisms for API failures

---

### 2. Caching Architecture

**Decision**: Two-tier smart caching in PostgreSQL with differential TTLs

**Rationale**:
- Static data (fundamentals) changes rarely: 7-day cache
- Dynamic data (buying signals) needs freshness: 6-hour cache
- PostgreSQL already in stack (no new dependencies)
- Cache invalidation on company data updates via triggers

**Alternatives Considered**:
- Redis cache: Adds infrastructure complexity
- No caching: Too expensive, fails 30-second requirement
- Single TTL: Wastes money refreshing static data or shows stale signals

**Implementation Pattern**:
```typescript
// Cache schema
{
  company_id: uuid,
  section: 'snapshot' | 'signals' | 'decision_makers' | 'revenue' | 'approach',
  data: jsonb,
  cached_at: timestamp,
  expires_at: timestamp (7d for snapshot, 6h for signals)
}
```

---

### 3. Data Source Selection

**Decision**: Companies House (primary) + News API + Job boards + Website scraping

**Rationale**:
- **Companies House**: Official UK data, free API, already integrated
- **News API**: Press releases for expansion/funding signals (newsapi.org)
- **Job Boards**: Indeed/LinkedIn public job postings for hiring signals
- **Website Scraping**: Company about pages, team pages (respect robots.txt)
- **No LinkedIn API**: Expensive ($$$), strict scraping restrictions, GDPR concerns

**Alternatives Considered**:
- ZoomInfo API: Too expensive, direct competitor
- Clearbit: US-focused, poor UK coverage
- LinkedIn API: $$$, rate limits, scraping violations

**API Rate Limits to Handle**:
- Companies House: 600 requests/5 minutes
- News API: 100 requests/day (free tier) or 1000/day (paid)
- Website scraping: Respect robots.txt, implement backoff

---

### 4. Performance Optimization Strategy

**Decision**: Parallel execution with Promise.all() + streaming progress updates

**Rationale**:
- 30-second target requires parallelization
- 6 sections can be generated concurrently where data allows
- Server-Sent Events (SSE) for real-time progress to user
- Dependency graph: Snapshot → Signals, Revenue, Decision Makers → Approach

**Implementation Flow**:
```
[0-5s]   Fetch Companies House data (blocking)
[5-15s]  Parallel: News API + Jobs API + Website scraping
[15-25s] Parallel: AI analysis of 6 sections
[25-30s] Synthesize recommendations + save to DB
```

**Alternatives Considered**:
- Sequential execution: Would take 2+ minutes
- Background jobs: Poor UX, users want instant results
- Pre-computation: Impossible to predict which companies users will research

---

### 5. GDPR Compliance Strategy

**Decision**: Public data only + source attribution + removal mechanism + 6-month auto-deletion

**Rationale**:
- UK GDPR applies to personal data processing
- Legitimate interest basis: business contact information for B2B sales
- Source attribution proves data is publicly available
- Removal mechanism satisfies right to erasure
- 6-month retention aligns with sales cycle duration

**Data Classification**:
- **Public**: Names, titles, company emails from official sources (✅ Display)
- **Restricted**: Personal emails, mobile numbers (❌ Never display)
- **Contextual**: LinkedIn profiles (✅ Link only, no scraping)

**Implementation**:
- Database table: `data_removal_requests`
- Cron job: Daily anonymization of 6-month-old personal data
- Privacy page: Self-service removal request form

---

### 6. Database Schema Design

**Decision**: Normalize core entities, use JSONB for flexibility, pgvector for semantic search

**Rationale**:
- Core entities (research_reports, research_sections) normalized for queries
- Section content in JSONB for schema flexibility
- pgvector embeddings for "similar research" feature
- RLS policies for multi-tenant isolation

**Schema Overview**:
```sql
research_reports (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  company_id uuid REFERENCES businesses,
  status: 'pending' | 'generating' | 'complete' | 'failed',
  generated_at timestamp,
  cached_until timestamp,
  metadata jsonb
)

research_sections (
  id uuid PRIMARY KEY,
  report_id uuid REFERENCES research_reports,
  section_type: 'snapshot' | 'signals' | 'decision_makers' | 'revenue' | 'approach' | 'sources',
  content jsonb,
  cached_at timestamp,
  expires_at timestamp
)

research_sources (
  id uuid PRIMARY KEY,
  report_id uuid REFERENCES research_reports,
  source_url text,
  source_type text,
  published_date timestamp,
  reliability_score float
)

user_research_quotas (
  user_id uuid PRIMARY KEY REFERENCES profiles,
  period_start timestamp,
  period_end timestamp,
  researches_used int,
  researches_limit int DEFAULT 100
)
```

---

### 7. Error Handling & Graceful Degradation

**Decision**: Partial results with confidence scoring + retry mechanism

**Rationale**:
- Not all data sources will always work (APIs down, rate limits)
- Better to show 4/6 sections than error page
- Confidence scores set user expectations
- Automatic retries for transient failures

**Error Scenarios**:
1. **Companies House down**: Use cached data, show staleness warning
2. **News API rate limit**: Skip news signals, note in sources
3. **Website unreachable**: Skip website data, no error to user
4. **AI timeout**: Retry once, then show raw data instead of analysis

**Confidence Scoring**:
```typescript
{
  snapshot: { confidence: 'high', sources: 3 },
  signals: { confidence: 'medium', sources: 1 },  // News API failed
  decision_makers: { confidence: 'low', sources: 0 },  // All sources failed
}
```

---

### 8. Testing Strategy

**Decision**: E2E tests with Playwright + contract tests for APIs

**Rationale**:
- Existing project uses Playwright (no new tools)
- E2E tests validate full user journey
- Contract tests ensure API stability
- No unit tests (consistent with codebase patterns)

**Test Scenarios** (from spec.md):
1. Generate research for known company → validates 30s completion
2. View cached research → validates smart caching
3. Force refresh → validates cache bypass
4. Quota exceeded → validates rate limiting
5. Invalid company → validates error handling

---

### 9. UI/UX Design Pattern

**Decision**: Progressive disclosure with collapsible sections + export functionality

**Rationale**:
- 6 sections is too much information at once
- Users need scannable summaries with option to drill down
- PDF export for sharing with team/CRM
- Real-time progress bar reduces perceived wait time

**Component Hierarchy**:
```
<ResearchReport>
  <ResearchProgress /> // During generation
  <ResearchSnapshot collapsed={false} />
  <ResearchSignals collapsed={true} priority="high" />
  <ResearchDecisionMakers collapsed={true} />
  <ResearchRevenue collapsed={true} />
  <ResearchApproach collapsed={false} />
  <ResearchSources collapsed={true} />
  <ResearchActions>
    <ExportPDF />
    <SaveToCRM />
    <ShareWithTeam />
    <ForceRefresh />
  </ResearchActions>
</ResearchReport>
```

---

### 10. Integration Points with Existing Features

**Decision**: Integrate with existing business profile pages, lists, and qualification system

**Rationale**:
- ResearchGPT adds value to existing company profiles
- Should work from Lists feature (research multiple companies)
- Research signals feed into qualification scoring
- Maintain consistency with existing UI patterns

**Integration Points**:
1. **Business Profile Page** (`/business/[id]`): Add "Research with AI" button
2. **Lists Feature** (`/lists`): Add "Research All" bulk action
3. **Qualification System**: Research signals update BANT scores
4. **Dashboard**: New "Recent Research" widget

---

## Technology Stack Summary

### Core Technologies
- **Language**: TypeScript 5.x
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL (Supabase) with pgvector
- **AI**: OpenRouter API (GPT-4)
- **UI**: React 18 + shadcn/ui + Tailwind CSS

### External APIs
1. **Companies House API** (official UK company data)
2. **News API** (newsapi.org - press releases)
3. **Job Boards** (Indeed, Reed.co.uk - hiring signals)
4. **OpenRouter** (GPT-4 for synthesis)

### Infrastructure
- **Hosting**: Vercel (existing)
- **Storage**: Supabase PostgreSQL
- **Cache**: PostgreSQL JSONB (no Redis)
- **Auth**: Supabase Auth (existing)

---

## Performance Targets Validation

| Requirement | Target | Strategy |
|-------------|---------|----------|
| Research time | <30s (95%) | Parallel fetching + smart caching |
| Page load | <2s | Next.js SSR + code splitting |
| Concurrent requests | 5/user | PostgreSQL connection pooling |
| Monthly quota | 100/user | Database-tracked quotas |
| Cache hit rate | >60% | 7d fundamentals + 6h signals |

---

## Risk Mitigation

### Technical Risks
1. **API rate limits**: Implement exponential backoff + quota monitoring
2. **30s timeout**: Optimize with parallel execution + streaming
3. **Data quality**: Confidence scoring + source verification

### Business Risks
1. **GDPR compliance**: Legal review + removal mechanism + audit trail
2. **API costs**: Caching + quota limits + cost monitoring
3. **Accuracy concerns**: Source attribution + confidence scores

### Mitigation Strategies
- Monitor API usage and costs via dashboard
- Legal review of GDPR compliance before launch
- Beta test with 10 users for quality validation
- Implement cost alerts (>$100/day on APIs)

---

## Open Questions for Implementation

None - all clarifications resolved in `/clarify` phase.

---

**Research Status**: ✅ COMPLETE - Ready for Phase 1 (Design & Contracts)
