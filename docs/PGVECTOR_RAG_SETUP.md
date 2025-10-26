# pgvector RAG Setup Guide

Quick setup guide for RAG (Retrieval Augmented Generation) using Supabase's built-in pgvector.

## Why pgvector?

✅ **$0 cost** - Included in Supabase (vs $60-600/month for Pinecone)
✅ **2-5x faster** - No external API calls (same database)
✅ **Simpler** - One system instead of two
✅ **Already enabled** - pgvector extension already in your database
✅ **Better compliance** - Unified GDPR compliance

---

## Setup Status

✅ **pgvector extension** - Already enabled
✅ **Database migrations** - Applied
✅ **RAG implementation** - Complete
✅ **API endpoints** - Ready

---

## Quick Test

### 1. Health Check

```bash
curl http://localhost:3000/api/rag/health
```

Expected response:
```json
{
  "status": "healthy",
  "pinecone": {
    "connected": true,
    "index": "user_context_vectors",
    "dimension": 1536
  }
}
```

### 2. Check User Preferences

```bash
curl http://localhost:3000/api/user/rag-preferences \
  -H "Cookie: auth-token=YOUR_TOKEN"
```

Expected response:
```json
{
  "rag_enabled": true,
  "rag_auto_index": true,
  "indexed_items": 0,
  "status": "not_indexed"
}
```

### 3. Index User Data

```bash
curl -X POST http://localhost:3000/api/rag/index \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{"force_refresh": true}'
```

This will index:
- Saved companies
- Won/lost deals
- ICP profiles
- Research reports
- Business followers

### 4. Test RAG-Powered Search

```bash
curl -X POST http://localhost:3000/api/search/semantic \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{
    "query": "fintech companies",
    "use_rag": true,
    "include_explanation": true
  }'
```

Expected: Personalized results based on user's saved companies and preferences.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Action                              │
│            (Save company, Close deal, Search)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 Indexing Pipeline                            │
│  1. Extract user data                                        │
│  2. Generate embedding (OpenAI text-embedding-3-small)       │
│  3. Store in user_context_vectors (pgvector)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL + pgvector)                │
│                                                              │
│  user_context_vectors table:                                │
│  - user_id (isolation)                                       │
│  - embedding vector(1536)                                    │
│  - type (saved_company, won_deal, etc.)                     │
│  - metadata (JSONB)                                          │
│                                                              │
│  HNSW index for fast similarity search                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Query with RAG                              │
│                                                              │
│  User: "Show me promising fintech companies"                │
│    ↓                                                         │
│  1. Embed query                                              │
│  2. Query user_context_vectors (similarity search)          │
│  3. Build enriched prompt with user context                 │
│  4. LLM generates personalized response                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### user_context_vectors Table

```sql
CREATE TABLE user_context_vectors (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  org_id UUID REFERENCES organizations(id),
  embedding vector(1536) NOT NULL,
  type TEXT CHECK (type IN (
    'saved_company',
    'won_deal',
    'lost_deal',
    'icp',
    'research',
    'follower',
    'search_pattern'
  )),
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- HNSW index for fast cosine similarity
CREATE INDEX ON user_context_vectors
USING hnsw (embedding vector_cosine_ops);
```

### Helper Functions

```sql
-- Find similar context for a user
SELECT * FROM find_similar_user_context(
  p_user_id := 'user-uuid',
  p_query_embedding := ARRAY[...], -- 1536 dims
  p_match_count := 10
);

-- Get user's context stats
SELECT * FROM get_user_context_stats('user-uuid');
```

---

## API Endpoints

### GET /api/rag/health
Check if pgvector is working.

### GET /api/user/rag-preferences
Get user's RAG settings and indexing status.

### PUT /api/user/rag-preferences
Update RAG settings:
```json
{
  "rag_enabled": true,
  "rag_auto_index": true
}
```

### POST /api/rag/index
Manually trigger indexing:
```json
{
  "force_refresh": true,
  "types": ["saved_companies", "deals"]
}
```

### POST /api/search/semantic
Search with RAG personalization:
```json
{
  "query": "fintech companies",
  "use_rag": true,
  "max_context": 10,
  "include_explanation": true
}
```

---

## Background Indexing

Indexing happens automatically via Inngest when:
- User saves a company → indexes within 2-3 seconds
- Deal is closed → indexes deal patterns
- Research is completed → indexes findings
- ICP is updated → indexes preferences

**Rate Limiting:**
- Maximum 1 index per user per 60 seconds
- Global limit: 60 indexing jobs per minute

---

## Monitoring

### Check Coverage

```sql
SELECT * FROM user_context_coverage;
```

Returns:
- `users_with_context` - Number of users with indexed data
- `total_vectors` - Total vectors across all users
- `avg_vectors_per_user` - Average vectors per user
- `max_vectors_per_user` - Maximum vectors for any user

### Performance Metrics

Target performance:
- Context retrieval: <50ms (pgvector query)
- Full RAG query: <2s (including LLM)
- Indexing: <5s per user

---

## Cost Analysis

**pgvector (Current Implementation):**
- Cost: **$0** (included in Supabase)
- Scales with database plan
- No per-vector or API call charges

**Pinecone (Alternative):**
- Free tier: 100K vectors (dev only)
- Paid: $70/month minimum
- Scale: $60/month per 1,000 users
- 10K users: ~$450-600/month

**Savings: $720-$7,200/year** (depending on scale)

---

## Troubleshooting

### Issue: No context retrieved

**Check:**
1. User has saved companies or deals
2. RAG is enabled: `GET /api/user/rag-preferences`
3. Indexing completed: Check `indexed_items` count

**Fix:**
```bash
# Trigger manual index
curl -X POST http://localhost:3000/api/rag/index \
  -H "Cookie: auth-token=$TOKEN"
```

### Issue: Slow queries

**Diagnose:**
```sql
EXPLAIN ANALYZE
SELECT * FROM find_similar_user_context(
  'user-id',
  ARRAY[...],
  10
);
```

Should show HNSW index usage. If not, rebuild index:
```sql
REINDEX INDEX user_context_vectors_embedding_idx;
```

### Issue: Out of date context

**Solution:**
```bash
# Force refresh indexing
curl -X POST http://localhost:3000/api/rag/index \
  -H "Cookie: auth-token=$TOKEN" \
  -d '{"force_refresh": true}'
```

---

## Next Steps

1. **Test with real users** - Have beta users try RAG-powered search
2. **Monitor performance** - Check query times and context relevance
3. **A/B test** - Compare RAG vs non-RAG conversion rates
4. **Iterate** - Adjust context types and similarity thresholds

---

## References

- **Testing Guide**: `docs/PHASE_2_TESTING.md`
- **Integration Guide**: `docs/PHASE_2_INTEGRATION.md`
- **pgvector Docs**: https://github.com/pgvector/pgvector
- **Supabase Vector Guide**: https://supabase.com/docs/guides/ai/vector-columns
