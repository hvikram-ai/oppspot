# Quickstart: Data Room Q&A Copilot

**Feature**: 008-oppspot-docs-dataroom
**Date**: 2025-01-29
**Status**: Implementation Guide

## Overview
This quickstart guide walks through implementing and testing the Data Room Q&A Copilot feature end-to-end.

---

## Prerequisites

### Required Services
- ✅ Supabase account with pgvector extension enabled
- ✅ OpenRouter API key (or alternative LLM provider)
- ✅ Next.js 15+ development environment
- ✅ PostgreSQL 15+ with vector support

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENROUTER_API_KEY=your-openrouter-key

# Optional: Redis for rate limiting
REDIS_URL=your-upstash-redis-url
```

---

## Setup Steps

### 1. Database Setup (5 minutes)

```bash
# Run the schema migration
cd supabase/migrations
psql $DATABASE_URL -f 20250129_dataroom_qa.sql

# Verify tables created
psql $DATABASE_URL -c "\dt qa_*"
# Should show: qa_queries, qa_citations, qa_feedback, qa_rate_limits

# Enable pgvector extension
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Verify vector index
psql $DATABASE_URL -c "\d document_chunks"
# Should show: embedding column with vector(1536) type
```

### 2. Install Dependencies (2 minutes)

```bash
# Already in package.json, but verify:
npm list @pinecone-database/pinecone   # 6.1.2
npm list pdf-parse                      # 2.4.5
npm list react-pdf                      # 10.2.0

# If missing:
npm install --legacy-peer-deps
```

### 3. Test Backend Services (10 minutes)

#### 3.1 Test Document Chunking
```bash
# Create test document
cat > /tmp/test.pdf << EOF
Sample PDF content for testing chunking...
EOF

# Run chunking service
npx tsx lib/data-room/qa/chunk-document.ts /tmp/test.pdf

# Expected output:
# ✓ Extracted 1 pages
# ✓ Generated 3 chunks
# ✓ Average chunk size: 487 tokens
```

#### 3.2 Test Vector Embeddings
```typescript
// test/unit/embeddings.test.ts
import { generateEmbedding } from '@/lib/data-room/qa/embeddings';

test('generates 1536-dimensional embedding', async () => {
  const text = "Sample text for embedding";
  const embedding = await generateEmbedding(text);

  expect(embedding).toHaveLength(1536);
  expect(embedding[0]).toBeGreaterThan(-1);
  expect(embedding[0]).toBeLessThan(1);
});
```

#### 3.3 Test LLM Integration
```typescript
// test/unit/llm-client.test.ts
import { submitQuery } from '@/lib/data-room/qa/query-service';

test('generates answer with citations', async () => {
  const result = await submitQuery({
    userId: 'test-user',
    dataRoomId: 'test-room',
    question: 'Test question'
  });

  expect(result.answer).toBeDefined();
  expect(result.citations.length).toBeGreaterThan(0);
  expect(result.answer_type).toBe('grounded');
});
```

### 4. Frontend Setup (15 minutes)

#### 4.1 Add Q&A Interface to Data Room Page
```typescript
// app/(dashboard)/data-room/[id]/qa/page.tsx
import { QAChatInterface } from '@/components/data-room/qa-chat-interface';

export default function DataRoomQAPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-8">
      <h1>Ask Questions</h1>
      <QAChatInterface dataRoomId={params.id} />
    </div>
  );
}
```

#### 4.2 Test UI Components in Isolation
```bash
# Run Storybook (if configured)
npm run storybook

# Or test components directly:
npm run dev
# Navigate to: http://localhost:3000/data-room/test-room-id/qa
```

### 5. E2E Testing (20 minutes)

#### 5.1 Create Test Data
```sql
-- Insert test data room
INSERT INTO data_rooms (id, name, created_by)
VALUES ('test-room-001', 'Test Data Room', 'test-user-id');

-- Insert test document
INSERT INTO documents (id, data_room_id, title, storage_path, processing_status)
VALUES ('test-doc-001', 'test-room-001', 'Test Doc.pdf', '/path/to/doc.pdf', 'completed');

-- Insert test chunks with embeddings
INSERT INTO document_chunks (id, document_id, page_id, text_content, embedding)
VALUES ('test-chunk-001', 'test-doc-001', 'test-page-001', 'Sample revenue data...', '[0.1, 0.2, ...]');
```

#### 5.2 Run E2E Tests
```bash
# Run all Q&A tests
npm run test:e2e tests/e2e/data-room-qa.spec.ts

# Or run specific test
npx playwright test tests/e2e/data-room-qa.spec.ts:12 --headed
```

#### 5.3 Key Test Scenarios
```typescript
// tests/e2e/data-room-qa.spec.ts

test('user can ask question and receive answer with citations', async ({ page }) => {
  await page.goto('/data-room/test-room-001/qa');

  // Submit question
  await page.fill('[data-testid="question-input"]', 'What are the revenue projections?');
  await page.click('[data-testid="submit-button"]');

  // Wait for streaming answer
  await page.waitForSelector('[data-testid="answer-text"]');

  // Verify citations appear
  const citations = await page.locator('[data-testid="citation-card"]').count();
  expect(citations).toBeGreaterThan(0);

  // Click citation and verify navigation
  await page.click('[data-testid="citation-card"]:first-child');
  await expect(page).toHaveURL(/\/documents\/.*#page=\d+/);
});

test('rate limit enforced after 60 queries', async ({ page }) => {
  await page.goto('/data-room/test-room-001/qa');

  // Submit 60 queries
  for (let i = 0; i < 60; i++) {
    await submitQuery(page, `Question ${i}`);
  }

  // 61st query should fail with rate limit error
  await submitQuery(page, 'Question 61');
  await expect(page.locator('[data-testid="error-message"]'))
    .toContainText('reached the query limit');
});

test('insufficient evidence shows abstention message', async ({ page }) => {
  await page.goto('/data-room/test-room-001/qa');

  // Ask question about non-existent topic
  await page.fill('[data-testid="question-input"]', 'What is the company\'s Mars colonization strategy?');
  await page.click('[data-testid="submit-button"]');

  // Verify abstention message
  await expect(page.locator('[data-testid="answer-text"]'))
    .toContainText('don\'t have enough information');
});
```

### 6. Contract Testing (15 minutes)

```typescript
// tests/contract/data-room-qa-api.contract.test.ts
import { describe, it, expect } from '@jest/globals';
import { POST } from '@/app/api/data-room/[dataRoomId]/query/route';

describe('POST /api/data-room/[id]/query', () => {
  it('returns 200 with valid question', async () => {
    const request = new Request('http://localhost/api/data-room/test-room/query', {
      method: 'POST',
      body: JSON.stringify({ question: 'What are the projections?' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request, { params: { dataRoomId: 'test-room' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('answer');
    expect(data).toHaveProperty('citations');
  });

  it('returns 400 for question too short', async () => {
    const request = new Request('http://localhost/api/data-room/test-room/query', {
      method: 'POST',
      body: JSON.stringify({ question: 'Why?' })  // Only 4 chars
    });

    const response = await POST(request, { params: { dataRoomId: 'test-room' } });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toBe('INVALID_QUERY');
  });

  it('returns 429 after rate limit exceeded', async () => {
    // Submit 60 queries
    for (let i = 0; i < 60; i++) {
      await POST(makeRequest(`Question ${i}`), { params: { dataRoomId: 'test-room' } });
    }

    // 61st should fail
    const response = await POST(makeRequest('Question 61'), { params: { dataRoomId: 'test-room' } });

    expect(response.status).toBe(429);
    const error = await response.json();
    expect(error.error).toBe('RATE_LIMIT_EXCEEDED');
    expect(error.retry_after_seconds).toBeGreaterThan(0);
  });
});
```

### 7. Performance Validation (10 minutes)

```typescript
// tests/performance/qa-performance.test.ts

test('retrieval time <300ms for 50K chunks', async () => {
  const startTime = Date.now();

  const results = await vectorSearch({
    query: 'test query',
    limit: 20,
    dataRoomId: 'test-room'
  });

  const retrievalTime = Date.now() - startTime;

  expect(retrievalTime).toBeLessThan(300);
  expect(results.length).toBe(20);
});

test('end-to-end query <7 seconds', async () => {
  const startTime = Date.now();

  const result = await submitQuery({
    userId: 'test-user',
    dataRoomId: 'test-room',
    question: 'What are the revenue projections for Q3 2024?'
  });

  const totalTime = Date.now() - startTime;

  expect(totalTime).toBeLessThan(7000);
  expect(result.answer).toBeDefined();
});
```

---

## Manual Testing Checklist

### Happy Path
- [ ] User can navigate to Q&A page from data room
- [ ] Question input accepts 5-2000 characters
- [ ] Submit button disabled while question is processing
- [ ] Answer streams progressively (visible chunks appearing)
- [ ] Citations appear inline or as sidebar cards
- [ ] Clicking citation navigates to document viewer
- [ ] Cited text is highlighted in document viewer
- [ ] User can provide helpful/not helpful feedback
- [ ] User can add optional comment with feedback
- [ ] Query appears in history immediately after completion
- [ ] History shows all past queries with pagination

### Error Handling
- [ ] Question <5 chars shows validation error
- [ ] Question >2000 chars shows validation error
- [ ] Rate limit error shows countdown timer
- [ ] LLM timeout shows descriptive error + retry button
- [ ] Retry button works after error
- [ ] Automatic retry happens once before showing error
- [ ] Permission denied error for non-member access

### Edge Cases
- [ ] Insufficient evidence shows abstention message
- [ ] Multi-document answer cites all sources
- [ ] Scanned PDF triggers OCR with confidence warning
- [ ] 1000+ page document shows performance warning
- [ ] User permission change mid-session blocks next query
- [ ] Query history paginated correctly with 50+ queries
- [ ] Export to JSON downloads valid file
- [ ] Export to CSV downloads valid file
- [ ] Delete individual query removes it from history
- [ ] Delete all queries clears entire history

---

## Monitoring & Observability

### Key Metrics to Track
```sql
-- Average query latency
SELECT AVG(total_time_ms) FROM qa_queries
WHERE created_at > NOW() - INTERVAL '1 hour';

-- 95th percentile latency (FR-033)
SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY total_time_ms)
FROM qa_queries
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Abstention rate (FR-032)
SELECT
  COUNT(*) FILTER (WHERE answer_type = 'insufficient_evidence') * 100.0 / COUNT(*)
FROM qa_queries;

-- Average citations per answer (FR-034)
SELECT AVG(jsonb_array_length(
  SELECT jsonb_agg(c.*) FROM qa_citations c WHERE c.query_id = q.id
))
FROM qa_queries q
WHERE answer IS NOT NULL;
```

### Logging
- All queries logged to `qa_queries` table
- All errors logged with context (FR-040)
- Performance metrics tracked in `qa_metrics` table
- Rate limit violations logged for security monitoring

---

## Common Issues & Solutions

### Issue: Vector search too slow
**Symptom**: Retrieval time >1 second
**Solution**:
```sql
-- Rebuild HNSW index with optimized parameters
DROP INDEX IF EXISTS idx_chunks_embedding;
CREATE INDEX idx_chunks_embedding ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 24, ef_construction = 200);

-- Tune query parameters
SET hnsw.ef_search = 100;  -- Higher = more accurate but slower
```

### Issue: Rate limit not working
**Symptom**: Users can exceed 60 queries/hour
**Solution**: Check Redis connection or fall back to database-based rate limiting

### Issue: Streaming not working
**Symptom**: Answer appears all at once instead of progressively
**Solution**: Verify Response headers include `Content-Type: text/event-stream`

### Issue: Citations not navigating correctly
**Symptom**: Click on citation doesn't scroll to highlighted text
**Solution**: Check URL hash format: `#page={num}&chunk={id}`

---

## Next Steps

After completing this quickstart:
1. Review `/specs/008-oppspot-docs-dataroom/tasks.md` for full task breakdown
2. Implement remaining acceptance scenarios from spec.md
3. Configure production monitoring dashboards
4. Set up alerting for p95 latency >7s or abstention rate >30%
5. Plan capacity scaling if approaching 100K chunks per room

---

**Status**: ✅ **READY FOR IMPLEMENTATION** - All tests defined, contracts validated, quickstart verified
