-- ================================================
-- RAG Query Analytics Migration
-- ================================================
-- Create rag_query_logs table for tracking RAG usage
-- Enables A/B testing and performance monitoring
--
-- Analytics tracked:
-- - Query content and RAG usage
-- - Context items retrieved
-- - Response time performance
-- - User satisfaction ratings
--
-- Created: 2025-10-26
-- ================================================

-- Create rag_query_logs table
CREATE TABLE IF NOT EXISTS rag_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  used_rag BOOLEAN NOT NULL DEFAULT false,
  context_items INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_user
ON rag_query_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_rag_query_logs_created
ON rag_query_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_query_logs_used_rag
ON rag_query_logs(used_rag);

-- Composite index for A/B testing comparisons
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_rag_performance
ON rag_query_logs(used_rag, response_time_ms)
WHERE response_time_ms IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE rag_query_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own query logs
CREATE POLICY "Users can view own query logs"
ON rag_query_logs
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: System can insert query logs for any user
CREATE POLICY "System can insert query logs"
ON rag_query_logs
FOR INSERT
WITH CHECK (true);

-- RLS Policy: Users can update their own ratings/feedback
CREATE POLICY "Users can update own ratings"
ON rag_query_logs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE rag_query_logs IS 'Analytics tracking for RAG query performance and A/B testing';
COMMENT ON COLUMN rag_query_logs.used_rag IS 'Whether RAG personalization was used for this query';
COMMENT ON COLUMN rag_query_logs.context_items IS 'Number of context items retrieved from Pinecone';
COMMENT ON COLUMN rag_query_logs.response_time_ms IS 'Total query response time in milliseconds';
COMMENT ON COLUMN rag_query_logs.satisfaction_rating IS 'User satisfaction rating (1-5 stars)';
