# Pinecone RAG Implementation Plan

## Executive Summary

Transform oppSpot from generic search to personalized AI assistant by indexing user-specific context in Pinecone and using RAG (Retrieval Augmented Generation) to enhance all LLM interactions.

**Goal**: Enable LLM to access user's saved companies, deal history, ICP patterns, and research to provide personalized, context-aware recommendations.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Action                           │
│              (Save company, Win deal, Search)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Indexing Pipeline                         │
│  1. Extract relevant data + metadata                         │
│  2. Generate embedding (OpenAI text-embedding-3-small)       │
│  3. Upsert to Pinecone namespace: user_{user_id}            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Pinecone Vector Store                       │
│                                                              │
│  Namespace: user_abc123 {                                   │
│    - saved_companies: [...embeddings...]                    │
│    - won_deals: [...embeddings...]                          │
│    - lost_deals: [...embeddings...]                         │
│    - icp_profiles: [...embeddings...]                       │
│    - research_reports: [...embeddings...]                   │
│  }                                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Query with RAG                            │
│                                                              │
│  User Query: "Show me promising fintech companies"          │
│       ↓                                                      │
│  1. Embed query                                              │
│  2. Query Pinecone user namespace (top 10 matches)          │
│  3. Build enriched context prompt                            │
│  4. LLM generates personalized response                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation (Week 1)

### Deliverables
- ✅ Pinecone client setup
- ✅ User context indexing service
- ✅ Basic RAG query service
- ✅ Test API endpoint

### Tasks

#### 1.1 Environment Setup
```bash
npm install @pinecone-database/pinecone
```

Environment variables:
```env
PINECONE_API_KEY=your_key_here
PINECONE_ENVIRONMENT=us-east-1-aws  # or your region
PINECONE_INDEX_NAME=oppspot-user-context
```

#### 1.2 Core Services to Build
- `lib/ai/rag/pinecone-client.ts` - Connection management
- `lib/ai/rag/user-context-indexer.ts` - Index user data
- `lib/ai/rag/rag-query-service.ts` - Retrieve context + query LLM
- `lib/ai/rag/context-builder.ts` - Format context for prompts

#### 1.3 Data to Index (Phase 1)
1. **Saved Companies** (highest signal)
   - Company name, description, user notes
   - Metadata: saved_date, tags, category

2. **Won Deals** (learning pattern)
   - Company snapshot at deal close
   - Metadata: deal_value, win_reason, sales_cycle

3. **Active ICP**
   - Current ICP criteria as text
   - Metadata: version, win_rate, confidence

---

## Phase 2: Full Context (Weeks 2-3)

### Additional Data Sources
4. **Lost Deals** (negative examples)
5. **Research Reports** (past investigations)
6. **Business Followers** (tracking signals)
7. **Search Patterns** (successful query → save conversions)

### Hybrid Search
Enable metadata filtering:
```typescript
// Example: "Fintech from my saved list, saved in last 30 days"
pinecone.query({
  vector: queryEmbedding,
  namespace: `user_${userId}`,
  filter: {
    type: { $eq: "saved_company" },
    saved_date: { $gte: "2024-12-20" },
    tags: { $in: ["fintech"] }
  },
  topK: 10
})
```

---

## Phase 3: Intelligence Layer (Week 4)

### Real-Time Updates
- Webhook/trigger on user actions → immediate indexing
- Background job for batch updates
- Versioned ICP updates

### Smart Features
1. **Query Intent Classification**
   - Discovery: "Find new companies"
   - Research: "Tell me about X"
   - Comparison: "How does X compare to Y"

2. **Context Relevance Scoring**
   - Boost recent interactions (time decay)
   - Boost high-value deals
   - De-boost old/irrelevant context

3. **Feedback Loop**
   - Track query → result → save conversion
   - A/B test personalized vs generic
   - Continuously refine embeddings

---

## Technical Specifications

### Vector Dimensions
- **1536** (OpenAI text-embedding-3-small)
- Same as existing company embeddings for consistency

### Metadata Schema

```typescript
interface PineconeMetadata {
  // Common fields
  type: 'saved_company' | 'won_deal' | 'lost_deal' | 'icp' | 'research'
  user_id: string
  org_id?: string
  created_at: string

  // Type-specific fields
  // For saved_company:
  company_id?: string
  company_name?: string
  user_notes?: string
  tags?: string[]
  saved_date?: string

  // For deals:
  deal_id?: string
  deal_value?: number
  outcome?: 'won' | 'lost'
  outcome_reason?: string
  industry?: string
  employee_count?: number

  // For ICP:
  icp_version?: number
  win_rate?: number
  confidence_score?: number

  // For research:
  report_id?: string
  research_date?: string
  signals?: string[]
}
```

### Namespace Strategy
- **One namespace per user**: `user_{user_id}`
- Pros: Perfect isolation, fast queries, easy cleanup
- Cons: Many namespaces (acceptable for Pinecone)

### Index Configuration
```typescript
{
  name: 'oppspot-user-context',
  dimension: 1536,
  metric: 'cosine',
  spec: {
    serverless: {
      cloud: 'aws',
      region: 'us-east-1'
    }
  }
}
```

---

## API Endpoints

### 1. Index User Context (Background)
```
POST /api/rag/index
Body: {
  user_id: string
  force_refresh?: boolean
}
Response: {
  indexed_count: number
  types: { saved_companies: 15, won_deals: 8, ... }
}
```

### 2. RAG Search (Main Feature)
```
POST /api/search/rag
Body: {
  query: string
  use_rag: boolean
  limit?: number
}
Response: {
  results: [...companies...],
  context_used: [...user context...],
  explanation: "Based on your saved payment companies..."
}
```

### 3. Context Stats
```
GET /api/rag/stats
Response: {
  user_id: string,
  indexed_items: 45,
  breakdown: { saved_companies: 23, won_deals: 12, ... },
  last_updated: "2025-01-20T10:30:00Z"
}
```

---

## Cost Estimation

### Pinecone Serverless Pricing
Assuming 1,000 active users:

**Storage**:
- 1,000 users × 100 vectors/user × 1536 dims = 153.6M dimensions
- Storage: ~$0.25/1M dimensions/month
- **Cost: ~$38/month**

**Queries**:
- 10,000 queries/day × 30 days = 300K queries/month
- Read units: ~0.5 per query
- **Cost: ~$15/month**

**Writes**:
- Initial index: 100K vectors (one-time)
- Ongoing: 1K updates/day = 30K/month
- Write units: ~0.5 per upsert
- **Cost: ~$5/month**

**Total: ~$60/month for 1,000 users**

### Scaling
- 10,000 users: ~$450/month
- 100,000 users: ~$3,500/month

Still cheaper than dedicated infrastructure, and scales automatically.

---

## Success Metrics

### Phase 1 (MVP)
- [ ] Index 100% of saved companies for pilot users
- [ ] RAG queries return relevant context >80% of time
- [ ] Query latency <500ms (including Pinecone roundtrip)

### Phase 2 (Validation)
- [ ] User engagement: +20% save rate with RAG vs without
- [ ] Query satisfaction: >4.0/5.0 thumbs up
- [ ] Context accuracy: >90% relevance (manual review)

### Phase 3 (Scale)
- [ ] Support 1,000+ users with <100ms p95 latency
- [ ] A/B test: RAG users have +15% retention
- [ ] Cost per user: <$0.05/month

---

## Risk Mitigation

### Data Privacy
- ✅ User namespaces = perfect isolation
- ✅ No cross-user data leakage possible
- ✅ Easy GDPR compliance (delete namespace)

### Performance
- ✅ Async indexing (non-blocking)
- ✅ Cached embeddings (don't regenerate)
- ✅ Fallback to non-RAG if Pinecone slow

### Cost Overruns
- ✅ Monitor per-user vector count (alert if >200)
- ✅ Archive old context (>6 months)
- ✅ Rate limit indexing (max 100 upserts/user/day)

---

## Implementation Checklist

### Week 1: Foundation
- [ ] Set up Pinecone account + index
- [ ] Build core services (indexer, query, client)
- [ ] Index saved companies for 10 test users
- [ ] Create test API endpoint
- [ ] Validate: Can retrieve user context with <100ms latency

### Week 2: Integration
- [ ] Integrate RAG into semantic search API
- [ ] Add context to ChatOrchestrator
- [ ] Build background indexing job (Inngest/cron)
- [ ] Add all data types (deals, ICP, research)
- [ ] Test with 50 users

### Week 3: Polish
- [ ] Add metadata filtering (hybrid search)
- [ ] Implement time decay for old context
- [ ] Build admin dashboard for monitoring
- [ ] Add query analytics (track what context helps)
- [ ] Beta test with 100 users

### Week 4: Launch
- [ ] A/B test framework (50% RAG, 50% baseline)
- [ ] Monitor metrics (engagement, satisfaction, cost)
- [ ] Document API for frontend integration
- [ ] Roll out to all users gradually (10% → 50% → 100%)

---

## Next Steps

1. **Review this plan** - Get stakeholder approval
2. **Set up Pinecone account** - Create index
3. **Start coding** - Begin with pinecone-client.ts
4. **Test with real data** - Use your own user account
5. **Iterate quickly** - Ship MVP in 1 week, not 1 month

---

## Questions to Resolve

1. **Pinecone region**: Which AWS region for lowest latency?
2. **Embedding model**: Stick with text-embedding-3-small or upgrade to large?
3. **Update frequency**: Real-time vs batch (hourly/daily)?
4. **Context window**: How many context items to retrieve (5, 10, 20)?
5. **Fallback strategy**: What if Pinecone is down?

---

**Status**: Ready to implement
**Owner**: Engineering Team
**Timeline**: 4 weeks to production
**Priority**: HIGH (transformational feature)
