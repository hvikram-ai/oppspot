# Phase 2: RAG Integration & Automation

## Overview

Phase 2 integrates RAG into existing oppSpot features and automates the indexing pipeline. Users will get personalized results everywhere without manual intervention.

---

## Goals

1. **Seamless Integration**: RAG works in search, chat, research - everywhere
2. **Automatic Indexing**: User actions → instant indexing (no manual trigger)
3. **User Control**: Toggle RAG on/off, see what's indexed
4. **Performance**: <100ms overhead, non-blocking indexing
5. **Analytics**: Track RAG usage, quality, conversions

---

## Architecture Changes

```
BEFORE (Phase 1):                    AFTER (Phase 2):
──────────────────                   ─────────────────

Manual indexing:                     Automatic indexing:
POST /api/rag/index                  User saves company
                                     ↓
                                     Event → Inngest job
                                     ↓
                                     Auto-index in background

Generic search:                      RAG-powered search:
POST /api/search/semantic            POST /api/search/semantic?rag=true
↓                                    ↓
Company embeddings only              Company + User context
                                     ↓
                                     Personalized results

Basic chat:                          Context-aware chat:
POST /api/chat                       POST /api/chat
↓                                    ↓
LLM with no context                  LLM + User history
```

---

## Phase 2 Deliverables

### 1. Semantic Search Integration ✅
**File**: `app/api/search/semantic/route.ts`

**Changes**:
- Add `?rag=true` query parameter
- Retrieve user context if RAG enabled
- Enrich search results with context
- Return personalized explanations

**Before**:
```typescript
POST /api/search/semantic
{ "query": "fintech companies" }
→ Generic semantic search
```

**After**:
```typescript
POST /api/search/semantic
{ "query": "fintech companies", "use_rag": true }
→ Semantic search + User context
→ "Based on your saved payment companies..."
```

### 2. ChatOrchestrator Integration ✅
**File**: `lib/ai/chat-orchestrator.ts`

**Changes**:
- Add RAG context retrieval to `processMessage()`
- Inject user context into conversation
- Track which context helped
- Explain reasoning

**Impact**: Chat remembers user's:
- Saved companies
- Past research
- Deal patterns
- ICP preferences

### 3. Background Indexing Job (Inngest) ✅
**File**: `lib/inngest/functions/index-user-context.ts`

**Job**: `rag/index-user-context`
**Triggers**:
- User saves company
- Deal closed (won/lost)
- Research completed
- ICP updated
- Manual trigger

**Features**:
- Async execution (non-blocking)
- Retry on failure (3x)
- Rate limiting (1/min per user)
- Batch operations
- Error logging

### 4. Automatic Indexing Triggers ✅
**Files**: Multiple API routes

**Trigger Points**:
```typescript
// When user saves company
POST /api/businesses/save
→ await inngest.send('rag/index-user-context', { userId })

// When deal closes
POST /api/deals/close
→ await inngest.send('rag/index-user-context', { userId, type: 'deals' })

// When research completes
POST /api/research/complete
→ await inngest.send('rag/index-user-context', { userId, type: 'research' })
```

### 5. User Preferences ✅
**Database**: Add to `profiles` table

```sql
ALTER TABLE profiles ADD COLUMN rag_enabled BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN rag_auto_index BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN rag_indexed_at TIMESTAMP;
```

**API**: `GET/PUT /api/user/rag-preferences`

**Settings UI**: User can:
- Enable/disable RAG
- Enable/disable auto-indexing
- See indexing status
- Manually trigger re-index
- View indexed items count

### 6. RAG Analytics ✅
**Database**: New table `rag_query_logs`

```sql
CREATE TABLE rag_query_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  rag_enabled BOOLEAN,
  context_items_used INT,
  avg_similarity FLOAT,
  response_time_ms INT,
  user_feedback TEXT, -- 'thumbs_up' | 'thumbs_down'
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Metrics**:
- RAG vs non-RAG conversion rates
- Context relevance scores
- User satisfaction (thumbs up/down)
- Query → save conversion
- Response latency

### 7. Research Integration ✅
**File**: `lib/research-gpt/research-gpt-service.ts`

**Changes**:
- Use RAG context for research prompts
- "You previously researched {company}..."
- Reference past findings
- Avoid duplicate research

---

## Implementation Plan

### Week 1: Core Integrations

#### Day 1-2: Semantic Search
- [x] Add RAG parameter to API
- [x] Integrate context retrieval
- [x] Test with/without RAG
- [x] Measure latency

#### Day 3-4: Chat Integration
- [x] Add RAG to ChatOrchestrator
- [x] Context injection logic
- [x] Test conversation flow
- [x] Verify memory works

#### Day 5: Testing
- [x] E2E tests for search + RAG
- [x] Chat context persistence
- [x] Performance benchmarks

### Week 2: Automation

#### Day 1-2: Inngest Job
- [ ] Create indexing job
- [ ] Add retry logic
- [ ] Test async execution
- [ ] Monitor job status

#### Day 3-4: Triggers
- [ ] Add to save business API
- [ ] Add to deal close API
- [ ] Add to research complete
- [ ] Test event flow

#### Day 5: Testing
- [ ] Verify auto-indexing
- [ ] Check rate limits
- [ ] Monitor job queue

### Week 3: User Features

#### Day 1-2: Preferences
- [ ] Database migration
- [ ] Preferences API
- [ ] Settings UI
- [ ] Test toggles

#### Day 3-4: Analytics
- [ ] Create logs table
- [ ] Logging middleware
- [ ] Analytics dashboard
- [ ] Export reports

#### Day 5: Polish
- [ ] Documentation
- [ ] User guides
- [ ] Admin tools

---

## API Changes

### Enhanced Semantic Search

```typescript
POST /api/search/semantic
{
  "query": "fintech companies",
  "use_rag": true,           // NEW
  "max_context": 10,         // NEW
  "include_explanation": true // NEW
}

Response:
{
  "results": [...companies...],
  "context_used": [          // NEW
    { type: "saved_company", content: "Stripe", similarity: 0.89 }
  ],
  "explanation": "Based on your saved payment companies..." // NEW
}
```

### User Preferences API

```typescript
GET /api/user/rag-preferences
Response:
{
  "rag_enabled": true,
  "rag_auto_index": true,
  "indexed_items": 45,
  "last_indexed_at": "2025-01-26T10:30:00Z"
}

PUT /api/user/rag-preferences
{
  "rag_enabled": false,
  "rag_auto_index": true
}
```

### Analytics API

```typescript
GET /api/rag/analytics
Response:
{
  "total_queries": 1234,
  "rag_enabled_queries": 890,
  "avg_context_items": 8.5,
  "avg_response_time_ms": 1523,
  "user_satisfaction": 0.87, // 87% thumbs up
  "conversion_rate_rag": 0.15,
  "conversion_rate_no_rag": 0.08
}
```

---

## Inngest Job Details

### Job Definition

```typescript
// lib/inngest/functions/index-user-context.ts

export const indexUserContext = inngest.createFunction(
  {
    id: 'rag-index-user-context',
    name: 'Index User Context for RAG',
    retries: 3
  },
  { event: 'rag/index.requested' },
  async ({ event, step }) => {
    const { userId, types } = event.data

    // Step 1: Check if already indexing
    await step.run('check-lock', async () => {
      // Prevent duplicate jobs
    })

    // Step 2: Index context
    await step.run('index-context', async () => {
      const indexer = getUserContextIndexer()
      return await indexer.indexUserContext(userId, { includeTypes: types })
    })

    // Step 3: Update user metadata
    await step.run('update-metadata', async () => {
      // Update profiles.rag_indexed_at
    })
  }
)
```

### Trigger Events

```typescript
// When user saves company
await inngest.send({
  name: 'rag/index.requested',
  data: { userId, types: ['saved_companies'] }
})

// When deal closes
await inngest.send({
  name: 'rag/index.requested',
  data: { userId, types: ['deals'] }
})
```

### Rate Limiting

- Max 1 index per user per minute
- Queue multiple triggers, execute once
- Deduplicate events within 60s window

---

## Database Migrations

### Migration 1: User Preferences

```sql
-- 20250126_add_rag_preferences.sql

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rag_auto_index BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rag_indexed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rag_indexed_count INTEGER DEFAULT 0;

CREATE INDEX idx_profiles_rag_enabled ON profiles(rag_enabled);
```

### Migration 2: Analytics Table

```sql
-- 20250126_create_rag_analytics.sql

CREATE TABLE IF NOT EXISTS rag_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  query TEXT NOT NULL,
  rag_enabled BOOLEAN NOT NULL,
  context_items_retrieved INTEGER,
  context_items_used INTEGER,
  avg_similarity FLOAT,
  response_time_ms INTEGER,
  resulted_in_save BOOLEAN,
  user_feedback TEXT CHECK (user_feedback IN ('thumbs_up', 'thumbs_down', NULL)),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rag_logs_user_id ON rag_query_logs(user_id);
CREATE INDEX idx_rag_logs_created_at ON rag_query_logs(created_at);
CREATE INDEX idx_rag_logs_rag_enabled ON rag_query_logs(rag_enabled);
```

---

## Performance Targets

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Search latency (RAG) | <1.5s | <2.5s | >3s |
| Context retrieval | <100ms | <200ms | >300ms |
| Indexing (async) | <3s | <5s | >10s |
| Chat response | <2s | <3s | >5s |
| Job queue delay | <30s | <60s | >120s |

---

## Testing Strategy

### Unit Tests
- RAG context injection
- Preference toggling
- Job deduplication

### Integration Tests
- Search with RAG enabled/disabled
- Chat with context
- Auto-indexing triggers
- Job execution

### E2E Tests
```typescript
test('User saves company → auto-indexes → personalized search', async () => {
  // 1. User saves Stripe
  await saveCompany('stripe-id')

  // 2. Wait for indexing
  await waitForIndexing()

  // 3. Search with RAG
  const results = await search('payment companies', { rag: true })

  // 4. Verify personalization
  expect(results.explanation).toContain('Stripe')
})
```

### A/B Testing
- 50% users: RAG enabled by default
- 50% users: RAG disabled by default
- Measure:
  - Engagement (queries per session)
  - Conversion (query → save)
  - Satisfaction (feedback)
  - Retention (7-day return rate)

---

## Rollout Plan

### Stage 1: Alpha (Week 1)
- Enable for 10 internal users
- Manual testing
- Fix critical bugs
- Gather feedback

### Stage 2: Beta (Week 2)
- Enable for 100 power users
- Monitor performance
- Collect satisfaction data
- Optimize based on metrics

### Stage 3: Gradual Rollout (Week 3-4)
- 10% of users
- 25% of users
- 50% of users
- 100% of users

### Rollback Plan
- Feature flag: `ENABLE_RAG`
- Can disable instantly via env var
- Graceful fallback to non-RAG
- No data loss

---

## Success Criteria

### Must Have (MVP)
- [x] RAG works in semantic search
- [x] RAG works in chat
- [ ] Auto-indexing on user actions
- [ ] <2s end-to-end latency
- [ ] Zero errors in production

### Should Have
- [ ] User preferences UI
- [ ] Analytics tracking
- [ ] A/B test framework
- [ ] Admin monitoring

### Nice to Have
- [ ] Research integration
- [ ] Smart context selection
- [ ] Time decay for old context
- [ ] Multi-language support

---

## Monitoring & Alerts

### Key Metrics
- RAG query volume (per hour)
- Average latency
- Context retrieval success rate
- User satisfaction score
- Cost per user

### Alerts
- ⚠️ Latency >3s (5 min avg)
- ⚠️ Error rate >5%
- ⚠️ Pinecone downtime
- ⚠️ Cost spike (>$100/day)
- ⚠️ Job queue backlog >100

### Dashboards
- Real-time query volume
- RAG vs non-RAG comparison
- Cost tracking
- User satisfaction trends

---

## Next Steps

1. **Start Day 1**: Integrate semantic search
2. **Review this plan** with team
3. **Set up monitoring** before launch
4. **Prepare rollback** procedure
5. **Document** for support team

---

**Status**: Ready to implement
**Timeline**: 3 weeks
**Risk Level**: Medium (new feature, external dependency)
**Impact**: HIGH (transformational UX improvement)
