# Pinecone RAG Setup Guide

## Quick Start

This guide will help you set up and test the Pinecone RAG (Retrieval Augmented Generation) system in 15 minutes.

---

## Prerequisites

- [x] Pinecone account ([sign up free](https://www.pinecone.io/))
- [x] oppSpot development environment running
- [x] OpenAI or OpenRouter API key (already configured)

---

## Step 1: Install Dependencies

```bash
npm install @pinecone-database/pinecone --legacy-peer-deps
```

---

## Step 2: Create Pinecone Index

### Option A: Via Pinecone Console (Recommended)

1. Go to [console.pinecone.io](https://console.pinecone.io/)
2. Click "Create Index"
3. Settings:
   - **Name**: `oppspot-user-context`
   - **Dimensions**: `1536` (OpenAI text-embedding-3-small)
   - **Metric**: `cosine`
   - **Cloud**: `aws`
   - **Region**: `us-east-1` (or closest to your users)
   - **Plan**: Start with Serverless (free tier)

4. Click "Create Index"

### Option B: Via API (Alternative)

```bash
curl -X POST https://api.pinecone.io/indexes \
  -H "Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "oppspot-user-context",
    "dimension": 1536,
    "metric": "cosine",
    "spec": {
      "serverless": {
        "cloud": "aws",
        "region": "us-east-1"
      }
    }
  }'
```

---

## Step 3: Configure Environment Variables

Add to your `.env.local`:

```env
# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=oppspot-user-context

# Optional: Specify environment if not using default
# PINECONE_ENVIRONMENT=us-east-1-aws
```

**Get your API key**: [console.pinecone.io/api-keys](https://console.pinecone.io/api-keys)

---

## Step 4: Verify Installation

```bash
# Restart dev server
npm run dev

# Test health check
curl http://localhost:3000/api/rag/health

# Expected response:
# {
#   "status": "healthy",
#   "pinecone": {
#     "connected": true,
#     "index": "oppspot-user-context",
#     "dimension": 1536
#   },
#   ...
# }
```

---

## Step 5: Index Your First User

### 5.1 Login to oppSpot

```bash
# Use demo account or your test account
# Email: demo@oppspot.com
# Password: Demo123456!
```

### 5.2 Add Some Test Data

In the oppSpot UI:
1. Save 3-5 companies (use "Save" button)
2. Add notes to at least 2 companies
3. (Optional) Create a test deal in your CRM

### 5.3 Index the Data

```bash
# Get your auth token from browser (DevTools > Application > Cookies > auth token)
# Or use the UI to call the API

curl -X POST http://localhost:3000/api/rag/index \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{
    "force_refresh": true
  }'

# Expected response:
# {
#   "success": true,
#   "items_indexed": {
#     "saved_companies": 5,
#     "won_deals": 0,
#     "lost_deals": 0,
#     "icp_profiles": 0,
#     "research_reports": 0,
#     "business_followers": 0,
#     "total": 5
#   },
#   "duration_ms": 2341
# }
```

### 5.4 Verify Indexing

```bash
curl http://localhost:3000/api/rag/index \
  -H "Cookie: auth-token=YOUR_TOKEN"

# Expected response:
# {
#   "user_id": "...",
#   "namespace": "user_abc123",
#   "vectors_count": 5,
#   "status": "indexed"
# }
```

---

## Step 6: Test RAG Queries

### 6.1 Query WITH RAG (Personalized)

```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{
    "query": "Show me companies similar to my saved fintech companies",
    "use_rag": true,
    "include_explanation": true
  }'

# Example response:
# {
#   "success": true,
#   "response": "Based on your saved payment companies (Stripe, Plaid, Wise), here are 3 similar companies:\n\n1. **GoCardless** - Direct debit API matching your B2B payment infrastructure pattern...",
#   "context_used": [
#     {
#       "type": "saved_company",
#       "content": "Saved company: Stripe | Notes: Study their pricing model",
#       "similarity": 0.89
#     },
#     ...
#   ],
#   "explanation": "Based on your saved companies (Stripe, Plaid, Wise).",
#   "metadata": {
#     "contextItemsRetrieved": 5,
#     "contextItemsUsed": 3,
#     "querySimilarityAvg": 0.85,
#     "responseTime_ms": 1523
#   }
# }
```

### 6.2 Query WITHOUT RAG (Generic - for comparison)

```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{
    "query": "Show me companies similar to my saved fintech companies",
    "use_rag": false
  }'

# Response will be generic (no personalization)
```

### 6.3 Compare Results

Notice how:
- **WITH RAG**: References your specific saved companies, notes, patterns
- **WITHOUT RAG**: Generic fintech recommendations, no personalization

---

## Testing Checklist

### Basic Functionality
- [ ] Health check passes (`GET /api/rag/health`)
- [ ] Can index user data (`POST /api/rag/index`)
- [ ] Indexed data appears in stats (`GET /api/rag/index`)
- [ ] Can query with RAG (`POST /api/rag/query` with `use_rag: true`)
- [ ] Context items are retrieved (check `context_used` in response)

### Personalization
- [ ] RAG response references saved companies
- [ ] Response mentions user's notes/tags
- [ ] Explanation shows why recommendations were made
- [ ] Results differ from non-RAG query

### Performance
- [ ] Indexing completes in <5 seconds (for 5-10 items)
- [ ] Query responds in <2 seconds
- [ ] Context retrieval latency <500ms

---

## Common Issues & Troubleshooting

### Issue: "PINECONE_API_KEY environment variable is required"

**Solution**: Ensure `.env.local` has the API key and restart dev server

```bash
# Check if env var is loaded
echo $PINECONE_API_KEY

# If empty, restart dev server
npm run dev
```

### Issue: "Failed to connect to Pinecone"

**Solutions**:
1. Check API key is valid ([console.pinecone.io/api-keys](https://console.pinecone.io/api-keys))
2. Verify index name matches environment variable
3. Check Pinecone status ([status.pinecone.io](https://status.pinecone.io))

### Issue: "Index not found"

**Solution**: Create the index first (see Step 2)

```bash
# Verify index exists
curl https://api.pinecone.io/indexes \
  -H "Api-Key: YOUR_API_KEY"
```

### Issue: "Dimension mismatch"

**Solution**: Index must be 1536 dimensions (OpenAI text-embedding-3-small)

Delete and recreate index with correct dimensions.

### Issue: "No context items retrieved"

**Possible causes**:
1. User hasn't saved any companies yet
2. Indexing hasn't been run
3. Similarity threshold too high (default 0.65)

**Solutions**:
```bash
# Check if data is indexed
curl http://localhost:3000/api/rag/index \
  -H "Cookie: auth-token=YOUR_TOKEN"

# If vectors_count is 0, run indexing
curl -X POST http://localhost:3000/api/rag/index \
  -H "Cookie: auth-token=YOUR_TOKEN"

# Lower similarity threshold
curl -X POST http://localhost:3000/api/rag/query \
  -d '{"query": "...", "similarity_threshold": 0.5}'
```

---

## Architecture Overview

```
┌──────────────┐
│  User saves  │
│   company    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Background Job (Future)             │
│  Inngest/Cron triggers indexing      │
└──────┬───────────────────────────────┘
       │ OR manual trigger
       ▼
┌──────────────────────────────────────┐
│  UserContextIndexer                  │
│  1. Fetch saved companies, deals     │
│  2. Generate embeddings (OpenAI)     │
│  3. Upsert to Pinecone namespace     │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Pinecone                            │
│  namespace: user_abc123 {            │
│    vectors: [saved_companies...]     │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼ User queries
┌──────────────────────────────────────┐
│  RAGQueryService                     │
│  1. Embed query                      │
│  2. Query Pinecone for context       │
│  3. Build enriched prompt            │
│  4. Call LLM with context            │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Personalized Response               │
│  "Based on your saved payment        │
│   companies (Stripe, Plaid)..."      │
└──────────────────────────────────────┘
```

---

## Cost Monitoring

### Pinecone Serverless Pricing (Approximate)

For a test user with 50 vectors:
- **Storage**: $0.25 per 1M dimensions/month
  - 50 vectors × 1536 dims = 76,800 dimensions
  - Cost: ~$0.02/month

- **Reads**: First 100K read units free, then $2.00 per 1M
  - 1 query ≈ 0.5 read units
  - 1,000 queries = 500 units ≈ $0.001

- **Writes**: First 100K write units free, then $2.00 per 1M
  - 1 upsert ≈ 0.5 write units
  - 100 upserts = 50 units ≈ $0.0001

**Total for testing**: ~$0.05/month (negligible)

---

## Next Steps

### Phase 1: Manual Testing (You are here)
- [x] Set up Pinecone
- [x] Index test user data
- [x] Test RAG queries
- [ ] Compare RAG vs non-RAG results
- [ ] Test with different query types

### Phase 2: Integration
- [ ] Add RAG toggle to existing search API
- [ ] Integrate into ChatOrchestrator
- [ ] Create background indexing job (Inngest)
- [ ] Add user-facing "Index My Data" button

### Phase 3: Production
- [ ] A/B test RAG vs non-RAG
- [ ] Monitor query quality (thumbs up/down)
- [ ] Track cost per user
- [ ] Optimize context window size

---

## API Reference

### POST /api/rag/index
Index user's context into Pinecone.

**Request**:
```json
{
  "force_refresh": boolean,
  "types": ["saved_companies", "deals", "icp", "research", "followers"]
}
```

**Response**:
```json
{
  "success": true,
  "items_indexed": {
    "saved_companies": 15,
    "won_deals": 8,
    "total": 23
  },
  "duration_ms": 2341
}
```

### POST /api/rag/query
Query with user context.

**Request**:
```json
{
  "query": "Show me fintech companies",
  "use_rag": true,
  "max_context": 10,
  "include_explanation": true,
  "context_types": ["saved_company", "won_deal"]
}
```

**Response**:
```json
{
  "success": true,
  "response": "Based on your saved payment companies...",
  "context_used": [...],
  "explanation": "Based on your saved companies (Stripe, Plaid).",
  "metadata": {
    "contextItemsRetrieved": 10,
    "querySimilarityAvg": 0.85,
    "responseTime_ms": 1523
  }
}
```

### GET /api/rag/health
Check system health.

**Response**:
```json
{
  "status": "healthy",
  "pinecone": {
    "connected": true,
    "index": "oppspot-user-context",
    "dimension": 1536
  }
}
```

---

## Support

**Questions?**
- Check [PINECONE_RAG_IMPLEMENTATION.md](./PINECONE_RAG_IMPLEMENTATION.md) for architecture details
- Review Pinecone docs: [docs.pinecone.io](https://docs.pinecone.io/)
- Test with `/api/rag/health` endpoint first

**Found a bug?**
Create an issue with:
1. Steps to reproduce
2. Expected vs actual behavior
3. Health check output
4. Relevant logs

---

**Status**: Ready for testing
**Last Updated**: 2025-01-26
