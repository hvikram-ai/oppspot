# Data Model: Data Room Q&A Copilot

**Feature**: 008-oppspot-docs-dataroom
**Date**: 2025-01-29
**Status**: Design Complete

## Overview
Data model for the RAG-based Q&A system, extending the existing data room schema with query, citation, and feedback entities.

---

## Entity Relationship Diagram

```
users (existing)
  │
  ├─── data_room_members (existing)
  │         │
  │         └─── data_rooms (existing)
  │                   │
  │                   ├─── documents (existing)
  │                   │         │
  │                   │         ├─── document_pages (new)
  │                   │         │
  │                   │         └─── document_chunks (new) [has vector embeddings]
  │                   │
  │                   └─── qa_queries (new)
  │                             │
  │                             ├─── qa_citations (new)
  │                             │
  │                             └─── qa_feedback (new)
  │
  └─── qa_rate_limits (new)
```

---

## New Entities

### 1. document_pages

**Purpose**: Store per-page metadata and extracted text from documents

**Fields**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique page identifier |
| `document_id` | UUID | NOT NULL, REFERENCES documents(id) ON DELETE CASCADE | Parent document |
| `page_number` | INTEGER | NOT NULL, CHECK (page_number > 0) | Page number within document (1-indexed) |
| `text_content` | TEXT | | Extracted text from this page |
| `ocr_confidence` | DECIMAL(3,2) | CHECK (ocr_confidence BETWEEN 0 AND 1) | OCR confidence score if scanned (0.0-1.0) |
| `layout_data` | JSONB | | Optional layout/positioning data |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indices**:
```sql
CREATE INDEX idx_doc_pages_document ON document_pages(document_id, page_number);
```

**Validation Rules**:
- page_number must be unique within each document
- text_content required unless document marked as processing_failed
- ocr_confidence only present if text extracted via OCR

**State Transitions**: Immutable after creation (pages don't change unless document replaced)

---

### 2. document_chunks

**Purpose**: Store chunked text segments with vector embeddings for semantic search

**Fields**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique chunk identifier |
| `document_id` | UUID | NOT NULL, REFERENCES documents(id) ON DELETE CASCADE | Parent document |
| `page_id` | UUID | NOT NULL, REFERENCES document_pages(id) ON DELETE CASCADE | Source page |
| `chunk_index` | INTEGER | NOT NULL, CHECK (chunk_index >= 0) | Sequential chunk number |
| `text_content` | TEXT | NOT NULL, CHECK (length(text_content) > 0) | Chunked text content |
| `token_count` | INTEGER | NOT NULL, CHECK (token_count > 0 AND token_count <= 1000) | Number of tokens (for cost estimation) |
| `start_char` | INTEGER | NOT NULL | Character offset start in page |
| `end_char` | INTEGER | NOT NULL, CHECK (end_char > start_char) | Character offset end in page |
| `embedding` | VECTOR(1536) | | OpenAI ada-002 embedding (1536 dimensions) |
| `embedding_model` | VARCHAR(100) | DEFAULT 'text-embedding-ada-002' | Model used for embedding |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indices**:
```sql
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_page ON document_chunks(page_id);
CREATE INDEX idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);
```

**Validation Rules**:
- chunk_index must be unique within each document
- text_content minimum 50 characters, maximum 3000 characters
- embedding required before chunk is searchable
- token_count calculated via tiktoken (cl100k_base encoding)

**State Transitions**:
1. **Created**: Initial insert with text_content
2. **Embedded**: embedding field populated
3. **Searchable**: After embedding index updated

---

### 3. qa_queries

**Purpose**: Store user questions, generated answers, and query metadata

**Fields**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique query identifier |
| `user_id` | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | User who asked question |
| `data_room_id` | UUID | NOT NULL, REFERENCES data_rooms(id) ON DELETE CASCADE | Data room context |
| `question` | TEXT | NOT NULL, CHECK (length(question) BETWEEN 5 AND 2000) | User's question |
| `answer` | TEXT | | Generated answer (null if failed/pending) |
| `answer_type` | VARCHAR(50) | CHECK (answer_type IN ('grounded', 'insufficient_evidence', 'error')) | Answer classification |
| `model_used` | VARCHAR(100) | | LLM model identifier (e.g., 'anthropic/claude-3.5-sonnet') |
| `retrieval_time_ms` | INTEGER | CHECK (retrieval_time_ms >= 0) | Vector search duration |
| `llm_time_ms` | INTEGER | CHECK (llm_time_ms >= 0) | LLM response generation duration |
| `total_time_ms` | INTEGER | CHECK (total_time_ms >= 0) | End-to-end query duration |
| `chunks_retrieved` | INTEGER | CHECK (chunks_retrieved >= 0) | Number of chunks used for context |
| `tokens_input` | INTEGER | CHECK (tokens_input >= 0) | LLM input tokens |
| `tokens_output` | INTEGER | CHECK (tokens_output >= 0) | LLM output tokens |
| `error_type` | VARCHAR(100) | | Error classification if failed |
| `error_message` | TEXT | | Error details if failed |
| `retry_count` | INTEGER | DEFAULT 0, CHECK (retry_count >= 0 AND retry_count <= 1) | Number of retries attempted |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Query submission time |
| `completed_at` | TIMESTAMP | | Query completion time |

**Indices**:
```sql
CREATE INDEX idx_queries_user_room ON qa_queries(user_id, data_room_id, created_at DESC);
CREATE INDEX idx_queries_data_room ON qa_queries(data_room_id, created_at DESC);
CREATE INDEX idx_queries_completed ON qa_queries(completed_at) WHERE completed_at IS NOT NULL;
```

**Validation Rules**:
- question length: 5-2000 characters
- answer_type required if answer present
- timestamps: completed_at must be >= created_at
- total_time_ms should approximately equal retrieval_time_ms + llm_time_ms
- retry_count maximum 1 (per FR-035)

**State Transitions**:
1. **Pending**: Initial insert with question only
2. **Processing**: Retrieval and LLM generation in progress
3. **Completed**: answer populated, completed_at set
4. **Failed**: error_type and error_message set

---

### 4. qa_citations

**Purpose**: Link answers to specific document chunks with relevance scoring

**Fields**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique citation identifier |
| `query_id` | UUID | NOT NULL, REFERENCES qa_queries(id) ON DELETE CASCADE | Parent query |
| `chunk_id` | UUID | NOT NULL, REFERENCES document_chunks(id) ON DELETE CASCADE | Cited chunk |
| `document_id` | UUID | NOT NULL, REFERENCES documents(id) ON DELETE CASCADE | Document for fast access |
| `page_number` | INTEGER | NOT NULL | Page number for display |
| `relevance_score` | DECIMAL(5,4) | NOT NULL, CHECK (relevance_score BETWEEN 0 AND 1) | Cosine similarity score |
| `rank` | INTEGER | NOT NULL, CHECK (rank > 0) | Citation ranking (1 = most relevant) |
| `text_preview` | TEXT | NOT NULL, CHECK (length(text_preview) <= 500) | ~240 chars of cited text (FR-010) |
| `citation_format` | VARCHAR(20) | DEFAULT 'inline', CHECK (citation_format IN ('inline', 'footnote')) | Display format hint |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Citation creation time |

**Indices**:
```sql
CREATE INDEX idx_citations_query ON qa_citations(query_id, rank);
CREATE INDEX idx_citations_chunk ON qa_citations(chunk_id);
```

**Validation Rules**:
- rank must be unique within each query
- text_preview truncated to ~240 characters (FR-010)
- relevance_score: 0.0 (no similarity) to 1.0 (perfect match)
- Top 3-5 citations per query (FR-010)

**Denormalization**:
- document_id and page_number duplicated from chunk for query performance
- text_preview duplicated from chunk to avoid JOIN on display

---

### 5. qa_feedback

**Purpose**: Store user feedback on answer quality

**Fields**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique feedback identifier |
| `query_id` | UUID | NOT NULL, UNIQUE, REFERENCES qa_queries(id) ON DELETE CASCADE | Query being rated |
| `user_id` | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | User providing feedback |
| `rating` | VARCHAR(20) | NOT NULL, CHECK (rating IN ('helpful', 'not_helpful')) | Binary rating (FR-023) |
| `comment` | TEXT | CHECK (length(comment) <= 2000) | Optional detailed feedback (FR-024) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Feedback submission time |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update time |

**Indices**:
```sql
CREATE INDEX idx_feedback_query ON qa_feedback(query_id);
CREATE INDEX idx_feedback_rating ON qa_feedback(rating, created_at);
```

**Validation Rules**:
- One feedback per query (UNIQUE constraint)
- comment optional, max 2000 characters
- rating must be 'helpful' or 'not_helpful'

**State Transitions**:
- **Created**: Initial feedback submission
- **Updated**: User can change rating/comment (updated_at changes)

---

### 6. qa_rate_limits

**Purpose**: Track query rate limits per user per data room

**Fields**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique rate limit record |
| `user_id` | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | User being rate limited |
| `data_room_id` | UUID | NOT NULL, REFERENCES data_rooms(id) ON DELETE CASCADE | Data room context |
| `window_start` | TIMESTAMP | NOT NULL | Start of current hour window |
| `query_count` | INTEGER | NOT NULL, DEFAULT 0, CHECK (query_count >= 0 AND query_count <= 100) | Queries in current window |
| `last_query_at` | TIMESTAMP | | Timestamp of most recent query |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update time |

**Indices**:
```sql
CREATE UNIQUE INDEX idx_ratelimit_user_room_window ON qa_rate_limits(user_id, data_room_id, window_start);
CREATE INDEX idx_ratelimit_window ON qa_rate_limits(window_start) WHERE window_start < NOW() - INTERVAL '2 hours';
```

**Validation Rules**:
- query_count max 60 per hour (FR-014)
- window_start truncated to hour boundary
- Stale records (>2 hours old) cleaned up periodically

**State Transitions**:
1. **Created**: First query in hour creates record
2. **Incremented**: Each subsequent query increments count
3. **Expired**: Deleted after 2 hours (cleanup job)

**Note**: In production, this may be replaced by Redis-based rate limiting (see research.md). Table serves as fallback and audit trail.

---

## Schema Extensions to Existing Entities

### documents (existing table)

**New Fields**:
```sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50)
  CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE documents ADD COLUMN IF NOT EXISTS ocr_attempted BOOLEAN DEFAULT FALSE;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0
  CHECK (chunk_count >= 0);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS avg_chunk_size INTEGER
  CHECK (avg_chunk_size >= 0);
```

**Purpose**:
- `processing_status`: Track document processing lifecycle (FR-020)
- `ocr_attempted`: Flag indicating OCR was needed for this document
- `chunk_count`: Cached count of chunks for performance
- `avg_chunk_size`: Average tokens per chunk for cost estimation

---

## Constraints & Relationships

### Cascade Delete Behavior
| Parent | Child | Behavior |
|--------|-------|----------|
| documents | document_pages | CASCADE |
| document_pages | document_chunks | CASCADE |
| qa_queries | qa_citations | CASCADE |
| qa_queries | qa_feedback | CASCADE |
| data_rooms | qa_queries | CASCADE |
| users | qa_queries | CASCADE |
| users | qa_feedback | CASCADE |

**Rationale**: When a document is deleted, all derived data (pages, chunks, citations) should be removed. When a user is deleted (GDPR right to erasure), all their queries and feedback are removed.

### Foreign Key Integrity
- All foreign keys use UUID type for consistency
- All foreign keys include ON DELETE clause for data lifecycle management
- No circular dependencies in schema

---

## Data Volume Estimates

### Per Data Room (typical)
| Entity | Count | Size/Row | Total |
|--------|-------|----------|-------|
| documents | 50 | 1 KB | 50 KB |
| document_pages | 2,500 | 2 KB | 5 MB |
| document_chunks | 5,000 | 7 KB | 35 MB |
| qa_queries | 1,000/month | 2 KB | 2 MB/month |
| qa_citations | 4,000/month | 500 B | 2 MB/month |
| qa_feedback | 500/month | 500 B | 250 KB/month |

**Total per room**: ~40MB static + ~5MB/month growth

### System-Wide (100 data rooms)
- Static: 4GB (documents, chunks)
- Monthly growth: 500MB (queries, citations, feedback)
- Yearly growth: ~6GB

**Conclusion**: Well within PostgreSQL capacity. No sharding needed for MVP.

---

## Indexing Strategy

### Performance Critical Indices
1. **Vector search** (FR-031: <300ms for 50K chunks):
   ```sql
   CREATE INDEX idx_chunks_embedding ON document_chunks
   USING hnsw (embedding vector_cosine_ops)
   WITH (m = 16, ef_construction = 64);
   ```

2. **Query history pagination** (FR-022):
   ```sql
   CREATE INDEX idx_queries_user_room ON qa_queries(user_id, data_room_id, created_at DESC);
   ```

3. **Citation retrieval**:
   ```sql
   CREATE INDEX idx_citations_query ON qa_citations(query_id, rank);
   ```

### Maintenance
- HNSW index rebuilds needed if chunk count grows >10x (monitor with `pg_stat_user_indexes`)
- VACUUM ANALYZE weekly on qa_queries and qa_citations (high churn tables)

---

## Data Retention & Archival

### Retention Policy (per clarifications)
| Entity | Retention | Archival Strategy |
|--------|-----------|-------------------|
| qa_queries | Indefinite | Partition by month after 1 year |
| qa_citations | Indefinite | Follows qa_queries |
| qa_feedback | Indefinite | Follows qa_queries |
| document_chunks | Until document deleted | N/A |
| qa_rate_limits | 2 hours | Auto-delete via cron job |

**GDPR Compliance** (FR-022a, FR-022b):
- User deletion triggers CASCADE delete of all qa_queries
- Export function generates JSON dump of user's query history
- Manual deletion via `/api/data-room/{id}/history` DELETE endpoint

---

## Migration Strategy

### Phase 1: Schema Creation
```sql
-- Create new tables in dependency order
CREATE TABLE document_pages (...);
CREATE TABLE document_chunks (...);
CREATE TABLE qa_queries (...);
CREATE TABLE qa_citations (...);
CREATE TABLE qa_feedback (...);
CREATE TABLE qa_rate_limits (...);
```

### Phase 2: Enable pgvector Extension
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Phase 3: Backfill Existing Documents
- For each existing document in data_rooms:
  1. Extract pages → document_pages
  2. Chunk text → document_chunks
  3. Generate embeddings → update document_chunks.embedding
  4. Update documents.processing_status = 'completed'

**Estimated backfill time**: 10-30 seconds per document (async job)

---

## Security Considerations

### Row Level Security (RLS)
```sql
-- Users can only query data rooms they have access to
ALTER TABLE qa_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY qa_queries_access_policy ON qa_queries
  USING (
    data_room_id IN (
      SELECT data_room_id FROM data_room_members
      WHERE user_id = auth.uid()
    )
  );

-- Similar policies for qa_citations, qa_feedback
```

### PII Protection
- `qa_queries.question` and `answer` may contain PII
- `qa_feedback.comment` may contain PII
- All PII sanitized during export (FR-022b)
- No email addresses or phone numbers stored in text fields

---

## Testing Considerations

### Data Fixtures for Tests
1. **Small dataset** (unit tests): 1 document, 10 chunks, 5 queries
2. **Medium dataset** (integration tests): 10 documents, 500 chunks, 50 queries
3. **Large dataset** (performance tests): 50 documents, 50K chunks, 1000 queries

### Contract Test Scenarios
- Create query → retrieve by ID → verify citations → submit feedback
- Rate limit enforcement → 60 queries → 61st query fails
- Document deletion → cascades to chunks → invalidates citations
- User deletion (GDPR) → all queries deleted

---

**Status**: ✅ **DATA MODEL COMPLETE** - All entities defined, relationships mapped, ready for contract generation
