-- Data Room Q&A Copilot Migration
-- Feature: 008-oppspot-docs-dataroom
-- Created: 2025-01-29
-- Description: Creates tables for RAG-based Q&A system with vector search

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Table: document_pages
-- Purpose: Store per-page metadata and extracted text from documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  text_content TEXT,
  ocr_confidence DECIMAL(3,2) CHECK (ocr_confidence BETWEEN 0 AND 1),
  layout_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure page_number is unique within each document
  UNIQUE(document_id, page_number)
);

-- Index for fast page lookup by document
CREATE INDEX IF NOT EXISTS idx_doc_pages_document ON document_pages(document_id, page_number);

COMMENT ON TABLE document_pages IS 'Stores extracted text and metadata for individual pages within documents';
COMMENT ON COLUMN document_pages.ocr_confidence IS 'OCR confidence score (0.0-1.0) if document was scanned';

-- ============================================================================
-- Table: document_chunks
-- Purpose: Store chunked text segments with vector embeddings for semantic search
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES document_pages(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  text_content TEXT NOT NULL CHECK (length(text_content) > 0),
  token_count INTEGER NOT NULL CHECK (token_count > 0 AND token_count <= 1000),
  start_char INTEGER NOT NULL,
  end_char INTEGER NOT NULL CHECK (end_char > start_char),
  embedding VECTOR(1536), -- OpenAI ada-002 embeddings (1536 dimensions)
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure chunk_index is unique within each document
  UNIQUE(document_id, chunk_index)
);

-- Indices for efficient querying
CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_page ON document_chunks(page_id);

-- HNSW index for fast vector similarity search
-- m=16: number of bi-directional links per node (higher = more accurate but slower build)
-- ef_construction=64: size of dynamic candidate list (higher = better recall but slower build)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE document_chunks IS 'Text chunks with vector embeddings for semantic search';
COMMENT ON COLUMN document_chunks.embedding IS 'Vector embedding (1536-dim) for similarity search';
COMMENT ON INDEX idx_chunks_embedding IS 'HNSW index for fast cosine similarity search';

-- ============================================================================
-- Table: qa_queries
-- Purpose: Store user questions, generated answers, and query metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS qa_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_room_id UUID NOT NULL REFERENCES data_rooms(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (length(question) BETWEEN 5 AND 2000),
  answer TEXT,
  answer_type VARCHAR(50) CHECK (answer_type IN ('grounded', 'insufficient_evidence', 'error')),
  model_used VARCHAR(100),

  -- Performance metrics
  retrieval_time_ms INTEGER CHECK (retrieval_time_ms >= 0),
  llm_time_ms INTEGER CHECK (llm_time_ms >= 0),
  total_time_ms INTEGER CHECK (total_time_ms >= 0),
  chunks_retrieved INTEGER CHECK (chunks_retrieved >= 0),
  tokens_input INTEGER CHECK (tokens_input >= 0),
  tokens_output INTEGER CHECK (tokens_output >= 0),

  -- Error tracking
  error_type VARCHAR(100),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 1),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Ensure completed_at is after created_at
  CHECK (completed_at IS NULL OR completed_at >= created_at)
);

-- Indices for efficient querying
CREATE INDEX IF NOT EXISTS idx_queries_user_room ON qa_queries(user_id, data_room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queries_data_room ON qa_queries(data_room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queries_completed ON qa_queries(completed_at) WHERE completed_at IS NOT NULL;

COMMENT ON TABLE qa_queries IS 'User questions and AI-generated answers with performance metrics';
COMMENT ON COLUMN qa_queries.retry_count IS 'Number of automatic retries attempted (max 1 per FR-035)';

-- ============================================================================
-- Table: qa_citations
-- Purpose: Link answers to specific document chunks with relevance scoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS qa_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES qa_queries(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,

  -- Denormalized for query performance
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,

  -- Relevance scoring
  relevance_score DECIMAL(5,4) NOT NULL CHECK (relevance_score BETWEEN 0 AND 1),
  rank INTEGER NOT NULL CHECK (rank > 0),

  -- Preview text for display (FR-010: ~240 characters)
  text_preview TEXT NOT NULL CHECK (length(text_preview) <= 500),

  citation_format VARCHAR(20) DEFAULT 'inline' CHECK (citation_format IN ('inline', 'footnote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure rank is unique within each query
  UNIQUE(query_id, rank)
);

-- Indices for efficient querying
CREATE INDEX IF NOT EXISTS idx_citations_query ON qa_citations(query_id, rank);
CREATE INDEX IF NOT EXISTS idx_citations_chunk ON qa_citations(chunk_id);

COMMENT ON TABLE qa_citations IS 'Citations linking answers to source document chunks';
COMMENT ON COLUMN qa_citations.relevance_score IS 'Cosine similarity score from vector search (0.0-1.0)';
COMMENT ON COLUMN qa_citations.rank IS 'Citation ranking within answer (1=most relevant)';

-- ============================================================================
-- Table: qa_feedback
-- Purpose: Store user feedback on answer quality
-- ============================================================================
CREATE TABLE IF NOT EXISTS qa_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL UNIQUE REFERENCES qa_queries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating VARCHAR(20) NOT NULL CHECK (rating IN ('helpful', 'not_helpful')),
  comment TEXT CHECK (length(comment) <= 2000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for analytics
CREATE INDEX IF NOT EXISTS idx_feedback_query ON qa_feedback(query_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON qa_feedback(rating, created_at);

COMMENT ON TABLE qa_feedback IS 'User feedback on answer quality (helpful/not helpful)';
COMMENT ON COLUMN qa_feedback.query_id IS 'UNIQUE constraint ensures one feedback per query';

-- ============================================================================
-- Table: qa_rate_limits
-- Purpose: Track query rate limits per user per data room
-- ============================================================================
CREATE TABLE IF NOT EXISTS qa_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_room_id UUID NOT NULL REFERENCES data_rooms(id) ON DELETE CASCADE,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  query_count INTEGER NOT NULL DEFAULT 0 CHECK (query_count >= 0 AND query_count <= 100),
  last_query_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: one record per user per data room per hour window
CREATE UNIQUE INDEX IF NOT EXISTS idx_ratelimit_user_room_window
  ON qa_rate_limits(user_id, data_room_id, window_start);

-- Index for cleanup queries and window lookups
CREATE INDEX IF NOT EXISTS idx_ratelimit_window ON qa_rate_limits(window_start);

COMMENT ON TABLE qa_rate_limits IS 'Rate limiting state (60 queries/hour per user per data room)';
COMMENT ON COLUMN qa_rate_limits.window_start IS 'Start of hourly window (truncated to hour boundary)';

-- ============================================================================
-- Schema Extensions to Existing Tables
-- ============================================================================

-- Add columns to existing documents table for Q&A processing tracking
DO $$
BEGIN
  -- Add processing_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'processing_status'
  ) THEN
    ALTER TABLE documents ADD COLUMN processing_status VARCHAR(50)
      CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;

  -- Add ocr_attempted column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'ocr_attempted'
  ) THEN
    ALTER TABLE documents ADD COLUMN ocr_attempted BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add chunk_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'chunk_count'
  ) THEN
    ALTER TABLE documents ADD COLUMN chunk_count INTEGER DEFAULT 0
      CHECK (chunk_count >= 0);
  END IF;

  -- Add avg_chunk_size column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'avg_chunk_size'
  ) THEN
    ALTER TABLE documents ADD COLUMN avg_chunk_size INTEGER
      CHECK (avg_chunk_size >= 0);
  END IF;
END $$;

COMMENT ON COLUMN documents.processing_status IS 'Q&A processing status (pending/processing/completed/failed)';
COMMENT ON COLUMN documents.ocr_attempted IS 'Whether OCR was needed for this document';
COMMENT ON COLUMN documents.chunk_count IS 'Cached count of chunks for performance';
COMMENT ON COLUMN documents.avg_chunk_size IS 'Average tokens per chunk for cost estimation';

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify pgvector extension is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    RAISE EXCEPTION 'pgvector extension not enabled. Run: CREATE EXTENSION vector;';
  END IF;
END $$;

-- Display table creation summary
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'document_pages',
      'document_chunks',
      'qa_queries',
      'qa_citations',
      'qa_feedback',
      'qa_rate_limits'
    );

  RAISE NOTICE 'Data Room Q&A Migration Complete: % tables created/verified', table_count;
END $$;
