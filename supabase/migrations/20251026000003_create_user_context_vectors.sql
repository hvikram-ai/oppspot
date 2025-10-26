-- ================================================
-- User Context Vectors Table for RAG
-- ================================================
-- Store user-specific vectors for personalized AI
-- Uses pgvector for semantic similarity search
--
-- Vector types:
-- - saved_company: Companies user saved
-- - won_deal: Successful deals
-- - lost_deal: Lost opportunities (negative signal)
-- - icp: Ideal Customer Profile
-- - research: Research reports
-- - follower: Companies user follows
-- - search_pattern: User's search history patterns
--
-- Created: 2025-10-26
-- ================================================

-- Create user_context_vectors table
CREATE TABLE IF NOT EXISTS user_context_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Vector embedding (OpenAI text-embedding-3-small: 1536 dimensions)
  embedding vector(1536) NOT NULL,

  -- Context type
  type TEXT NOT NULL CHECK (type IN (
    'saved_company',
    'won_deal',
    'lost_deal',
    'icp',
    'research',
    'follower',
    'search_pattern'
  )),

  -- Metadata stored as JSONB for flexibility
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create HNSW index for fast similarity search
-- HNSW (Hierarchical Navigable Small World) is optimal for high-dimensional vectors
-- m=16: number of connections per layer (higher = better recall, more memory)
-- ef_construction=64: size of dynamic candidate list (higher = better index quality, slower build)
CREATE INDEX IF NOT EXISTS user_context_vectors_embedding_idx
ON user_context_vectors USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_context_vectors_user_id
ON user_context_vectors(user_id);

CREATE INDEX IF NOT EXISTS idx_user_context_vectors_type
ON user_context_vectors(type);

CREATE INDEX IF NOT EXISTS idx_user_context_vectors_user_type
ON user_context_vectors(user_id, type);

CREATE INDEX IF NOT EXISTS idx_user_context_vectors_created
ON user_context_vectors(created_at DESC);

-- Create GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_user_context_vectors_metadata
ON user_context_vectors USING GIN (metadata);

-- Create unique index to prevent duplicate context items per user
-- This replaces the table-level UNIQUE constraint which doesn't support expressions
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_context_unique_item
ON user_context_vectors (user_id, type, (metadata->>'item_id'));

-- ================================================
-- RLS Policies
-- ================================================
ALTER TABLE user_context_vectors ENABLE ROW LEVEL SECURITY;

-- Users can only see their own context vectors
CREATE POLICY "Users can view own context vectors"
ON user_context_vectors
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage all context vectors
CREATE POLICY "Service role can manage context vectors"
ON user_context_vectors
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can delete their own context vectors
CREATE POLICY "Users can delete own context vectors"
ON user_context_vectors
FOR DELETE
USING (auth.uid() = user_id);

-- ================================================
-- Helper Functions
-- ================================================

-- Function to find similar user context
CREATE OR REPLACE FUNCTION find_similar_user_context(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INTEGER DEFAULT 10,
  p_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  similarity FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.type,
    1 - (v.embedding <=> p_query_embedding) as similarity,
    v.metadata,
    v.created_at
  FROM user_context_vectors v
  WHERE v.user_id = p_user_id
    AND v.embedding IS NOT NULL
    AND (p_types IS NULL OR v.type = ANY(p_types))
    AND 1 - (v.embedding <=> p_query_embedding) >= p_match_threshold
  ORDER BY v.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- Function to get user context stats
CREATE OR REPLACE FUNCTION get_user_context_stats(p_user_id UUID)
RETURNS TABLE (
  type TEXT,
  count BIGINT,
  oldest_item TIMESTAMPTZ,
  newest_item TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.type,
    COUNT(*) as count,
    MIN(v.created_at) as oldest_item,
    MAX(v.created_at) as newest_item
  FROM user_context_vectors v
  WHERE v.user_id = p_user_id
  GROUP BY v.type
  ORDER BY count DESC;
END;
$$;

-- Function to delete old user context (cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_user_context(
  p_older_than_days INTEGER DEFAULT 180
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM user_context_vectors
    WHERE created_at < NOW() - (p_older_than_days || ' days')::INTERVAL
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

-- ================================================
-- Triggers
-- ================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_context_vectors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_context_vectors_updated_at
BEFORE UPDATE ON user_context_vectors
FOR EACH ROW
EXECUTE FUNCTION update_user_context_vectors_updated_at();

-- ================================================
-- Grants
-- ================================================
GRANT SELECT ON user_context_vectors TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_user_context TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_context_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_user_context TO service_role;

-- ================================================
-- Comments
-- ================================================
COMMENT ON TABLE user_context_vectors IS 'User-specific context vectors for personalized RAG queries';
COMMENT ON COLUMN user_context_vectors.embedding IS 'Vector embedding (1536 dims, OpenAI text-embedding-3-small)';
COMMENT ON COLUMN user_context_vectors.type IS 'Type of context: saved_company, won_deal, lost_deal, icp, research, follower, search_pattern';
COMMENT ON COLUMN user_context_vectors.metadata IS 'Flexible JSONB metadata including company_id, company_name, notes, tags, etc.';
COMMENT ON INDEX user_context_vectors_embedding_idx IS 'HNSW index for fast cosine similarity search on embeddings';
COMMENT ON FUNCTION find_similar_user_context IS 'Find similar context vectors for a user using cosine similarity';
COMMENT ON FUNCTION get_user_context_stats IS 'Get statistics about a user''s context vectors';
COMMENT ON FUNCTION cleanup_old_user_context IS 'Clean up context vectors older than specified days (for GDPR/maintenance)';

-- ================================================
-- Create view for monitoring
-- ================================================
CREATE OR REPLACE VIEW user_context_coverage AS
SELECT
  COUNT(DISTINCT user_id) as users_with_context,
  COUNT(*) as total_vectors,
  AVG(vector_count) as avg_vectors_per_user,
  MAX(vector_count) as max_vectors_per_user
FROM (
  SELECT user_id, COUNT(*) as vector_count
  FROM user_context_vectors
  GROUP BY user_id
) subquery;

GRANT SELECT ON user_context_coverage TO authenticated;

COMMENT ON VIEW user_context_coverage IS 'Monitoring view showing RAG context vector coverage across users';
