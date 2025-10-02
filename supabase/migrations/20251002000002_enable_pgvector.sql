-- Enable pgvector extension for semantic search
-- Created: 2025-10-02
-- Purpose: Foundation for AI-powered semantic search and similarity matching

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS embedding vector(1536);

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ;

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS embedding_token_count INTEGER;

-- Create HNSW index for fast similarity search
-- HNSW (Hierarchical Navigable Small World) is optimal for high-dimensional vectors
-- m=16: number of connections per layer (higher = better recall, more memory)
-- ef_construction=64: size of dynamic candidate list (higher = better index quality, slower build)
CREATE INDEX IF NOT EXISTS businesses_embedding_idx
ON businesses USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Function to find similar companies using cosine similarity
-- Returns companies ordered by similarity score (0-1, where 1 is identical)
CREATE OR REPLACE FUNCTION find_similar_companies(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    businesses.id,
    businesses.name,
    1 - (businesses.embedding <=> query_embedding) as similarity
  FROM businesses
  WHERE businesses.embedding IS NOT NULL
    AND 1 - (businesses.embedding <=> query_embedding) > match_threshold
  ORDER BY businesses.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to search by text query (generates embedding on-the-fly)
-- Note: In production, cache query embeddings for performance
CREATE OR REPLACE FUNCTION semantic_search(
  query_text text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- This is a placeholder - actual embedding generation happens in application code
  -- This function is here for future direct SQL usage
  RAISE NOTICE 'Use find_similar_companies() with pre-generated embeddings for production';
  RETURN;
END;
$$;

-- Add comments for documentation
COMMENT ON COLUMN businesses.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions) for semantic similarity search';
COMMENT ON COLUMN businesses.embedding_model IS 'Model used to generate embedding (text-embedding-3-small or text-embedding-3-large)';
COMMENT ON COLUMN businesses.embedding_generated_at IS 'Timestamp when embedding was last generated';
COMMENT ON COLUMN businesses.embedding_token_count IS 'Number of tokens used to generate embedding (for cost tracking)';
COMMENT ON INDEX businesses_embedding_idx IS 'HNSW index for fast cosine similarity search on company embeddings';
COMMENT ON FUNCTION find_similar_companies IS 'Find companies similar to a given embedding vector using cosine similarity';

-- Create a view for companies with embeddings (for monitoring)
CREATE OR REPLACE VIEW businesses_with_embeddings AS
SELECT
  id,
  name,
  embedding_model,
  embedding_generated_at,
  embedding_token_count,
  CASE
    WHEN embedding IS NOT NULL THEN true
    ELSE false
  END as has_embedding
FROM businesses;

COMMENT ON VIEW businesses_with_embeddings IS 'View showing which companies have embeddings generated';
