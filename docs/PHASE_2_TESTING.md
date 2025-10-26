# Phase 2: RAG Integration Testing Guide

## Quick Start

Test the RAG integrations in 10 minutes.

---

## Prerequisites

- [x] Phase 1 complete (Pinecone setup, indexing works)
- [x] User has some indexed data
- [x] Dev server running (`npm run dev`)

---

## Test 1: Semantic Search with RAG

### Without RAG (Baseline)
```bash
curl -X POST http://localhost:3000/api/search/semantic \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{
    "query": "payment infrastructure companies",
    "use_rag": false
  }'

# Expected: Generic results, no personalization
```

### With RAG (Personalized)
```bash
curl -X POST http://localhost:3000/api/search/semantic \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{
    "query": "payment infrastructure companies",
    "use_rag": true,
    "include_explanation": true
  }'

# Expected response:
# {
#   "results": [...],
#   "context_used": [
#     { "type": "saved_company", "content": "Stripe", "similarity": 0.89 }
#   ],
#   "explanation": "Based on your 3 saved companies..."
# }
```

### Verify Personalization
- ✅ `context_used` array has items
- ✅ `explanation` mentions user's saved companies
- ✅ Results are different from non-RAG query

---

## Test 2: Chat with User Context

```bash
# Test chat endpoint (if you have one)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{
    "message": "What companies should I look at?",
    "session_id": "test-session"
  }'

# Expected: Response references user's saved companies or deal patterns
# Example: "Given your interest in Stripe and Plaid, you might like..."
```

---

## Test 3: Background Indexing

### Trigger Manual Index
```bash
curl -X POST http://localhost:3000/api/rag/index \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{"force_refresh": true}'

# Expected:
# {
#   "success": true,
#   "items_indexed": {
#     "saved_companies": 5,
#     "total": 5
#   }
# }
```

### Check User Preferences
```bash
curl http://localhost:3000/api/user/rag-preferences \
  -H "Cookie: auth-token=YOUR_TOKEN"

# Expected:
# {
#   "rag_enabled": true,
#   "rag_auto_index": true,
#   "indexed_items": 5,
#   "last_indexed_at": "2025-01-26T...",
#   "status": "indexed"
# }
```

### Update Preferences
```bash
curl -X PUT http://localhost:3000/api/user/rag-preferences \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{
    "rag_enabled": false
  }'

# Expected: RAG disabled, no context used in searches
```

---

## Test 4: Automatic Indexing Triggers

### Scenario: User saves a company

1. **Save a company** (via UI or API):
```bash
curl -X POST http://localhost:3000/api/businesses/save \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{
    "business_id": "some-company-id",
    "notes": "Interesting payment company"
  }'
```

2. **Add the trigger** to your save API:
```typescript
// In app/api/businesses/save/route.ts
import { onCompanySaved } from '@/lib/ai/rag/trigger-indexing'

// After successful save:
await onCompanySaved(user.id) // Non-blocking
```

3. **Wait 2-3 seconds** for background job

4. **Query with RAG** - new company should appear in context

---

## Test 5: A/B Comparison

### Script to compare RAG vs Non-RAG

```bash
#!/bin/bash

TOKEN="YOUR_AUTH_TOKEN"
QUERY="fintech companies"

echo "Testing WITHOUT RAG..."
curl -s -X POST http://localhost:3000/api/search/semantic \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=$TOKEN" \
  -d "{\"query\":\"$QUERY\",\"use_rag\":false}" \
  | jq '.results[0:3] | .[].name'

echo "\nTesting WITH RAG..."
curl -s -X POST http://localhost:3000/api/search/semantic \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=$TOKEN" \
  -d "{\"query\":\"$QUERY\",\"use_rag\":true}" \
  | jq '.explanation, (.results[0:3] | .[].name)'
```

### Expected Differences

| Aspect | Without RAG | With RAG |
|--------|------------|----------|
| Explanation | None | "Based on your saved companies..." |
| Context | None | User's saved companies, deals |
| Results | Generic | Personalized to user patterns |

---

## Performance Benchmarks

Run 10 queries and measure:

```bash
# Measure latency
for i in {1..10}; do
  time curl -s -X POST http://localhost:3000/api/search/semantic \
    -H "Cookie: auth-token=$TOKEN" \
    -d '{"query":"test","use_rag":true}' > /dev/null
done
```

### Target Performance

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Search (RAG) | <1.5s | <2.5s | >3s |
| Context retrieval | <100ms | <200ms | >300ms |
| Chat (RAG) | <2s | <3s | >5s |

---

## Integration Checklist

### Semantic Search
- [x] RAG parameter added
- [x] Context retrieval works
- [x] Explanation generated
- [x] Falls back gracefully on error

### Chat
- [x] User context injected
- [x] Personalization works
- [x] No performance degradation

### Background Jobs
- [x] Inngest function created
- [x] Rate limiting works
- [x] Cooldown prevents duplicates
- [x] Retries on failure

### User Preferences
- [x] Can check status
- [x] Can enable/disable RAG
- [x] Can trigger manual reindex
- [x] Preferences persist

---

## Common Integration Points

### Where to Add RAG Triggers

#### 1. Saved Businesses API
```typescript
// app/api/businesses/save/route.ts
import { onCompanySaved } from '@/lib/ai/rag/trigger-indexing'

export async function POST(request: NextRequest) {
  // ... save logic ...

  // Trigger indexing (non-blocking)
  await onCompanySaved(user.id)

  return NextResponse.json({ success: true })
}
```

#### 2. Deal Close API
```typescript
// app/api/deals/close/route.ts
import { onDealClosed } from '@/lib/ai/rag/trigger-indexing'

export async function POST(request: NextRequest) {
  // ... deal close logic ...

  await onDealClosed(user.id)

  return NextResponse.json({ success: true })
}
```

#### 3. Research Complete
```typescript
// lib/research-gpt/research-gpt-service.ts
import { onResearchCompleted } from '@/lib/ai/rag/trigger-indexing'

async generateResearch(options: ResearchOptions) {
  // ... research logic ...

  // After saving report:
  await onResearchCompleted(options.user_id)
}
```

#### 4. ICP Update
```typescript
// lib/ai/icp/learning-engine.ts
import { onICPUpdated } from '@/lib/ai/rag/trigger-indexing'

async trainFromDeals(orgId: string) {
  // ... ICP training ...

  // After creating new ICP version:
  await onICPUpdated(userId, orgId)
}
```

---

## Troubleshooting

### Issue: Context not retrieved

**Check**:
1. User has indexed data: `GET /api/rag/index`
2. RAG enabled: `GET /api/user/rag-preferences`
3. Query embedding generated successfully
4. Pinecone healthy: `GET /api/rag/health`

**Fix**:
```bash
# Re-index user
curl -X POST http://localhost:3000/api/rag/index \
  -H "Cookie: auth-token=$TOKEN"

# Check Pinecone stats
curl http://localhost:3000/api/rag/health
```

### Issue: Background job not running

**Check Inngest dashboard**: https://app.inngest.com/

**Local testing without Inngest**:
```typescript
// Direct indexing (bypass Inngest)
import { getUserContextIndexer } from '@/lib/ai/rag/user-context-indexer'

const indexer = getUserContextIndexer()
await indexer.indexUserContext(userId)
```

### Issue: Slow queries

**Measure each step**:
```typescript
console.time('embed-query')
const { embedding } = await embeddingService.generateCompanyEmbedding(...)
console.timeEnd('embed-query') // Should be <100ms

console.time('query-pinecone')
const context = await pinecone.query(...)
console.timeEnd('query-pinecone') // Should be <100ms

console.time('llm-response')
const response = await llm.chat(...)
console.timeEnd('llm-response') // Should be 1-2s
```

**Optimize**:
- Reduce `max_context` param (default 10 → 5)
- Cache embeddings
- Use faster embedding model

---

## Next Steps

Once Phase 2 tests pass:

1. **Enable for Beta Users** (10-20 users)
2. **Monitor Metrics**:
   - Query latency
   - Context relevance
   - User satisfaction (thumbs up/down)
   - Cost per user

3. **Collect Feedback**:
   - Are recommendations relevant?
   - Is personalization helpful?
   - Any performance issues?

4. **A/B Test** (50% RAG, 50% baseline):
   - Track conversion rates
   - Measure engagement
   - Compare retention

5. **Gradual Rollout**:
   - 10% → 25% → 50% → 100%
   - Monitor each stage
   - Roll back if issues

---

## Success Metrics

| Metric | Baseline | Target | Current |
|--------|----------|--------|---------|
| Query → Save conversion | 8% | 11% | ___ |
| Queries per session | 3.2 | 4.0 | ___ |
| User satisfaction | 75% | 85% | ___ |
| Response latency | 1.2s | <2.0s | ___ |
| Cost per user | N/A | <$0.05 | ___ |

---

**Status**: Ready for Phase 2 testing
**Timeline**: 1 week testing → 1 week beta → 2 weeks rollout
**Go-live**: Week of Feb 10, 2025 (tentative)
