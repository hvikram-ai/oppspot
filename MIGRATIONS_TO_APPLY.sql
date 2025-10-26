-- =====================================================================
-- RAG MIGRATIONS - Execute in Supabase SQL Editor
-- =====================================================================
-- 🔗 https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new
--
-- Instructions:
-- 1. Open the link above
-- 2. Copy this entire file
-- 3. Paste into the SQL Editor
-- 4. Click "RUN" button
-- 5. Verify with: node scripts/verify-rag-schema.js
-- =====================================================================

-- =====================================================================
-- MIGRATION 1: Add RAG Preferences to Profiles Table
-- =====================================================================

-- Add RAG preference columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rag_auto_index BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rag_indexed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rag_indexed_count INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_rag_enabled
ON profiles(rag_enabled)
WHERE rag_enabled = true;

CREATE INDEX IF NOT EXISTS idx_profiles_rag_indexed_at
ON profiles(rag_indexed_at)
WHERE rag_enabled = true;

-- Add column documentation
COMMENT ON COLUMN profiles.rag_enabled IS 'Enable RAG personalization for this user';
COMMENT ON COLUMN profiles.rag_auto_index IS 'Automatically index user data for RAG';
COMMENT ON COLUMN profiles.rag_indexed_at IS 'Timestamp of last successful indexing';
COMMENT ON COLUMN profiles.rag_indexed_count IS 'Number of vectors indexed in Pinecone';

-- =====================================================================
-- MIGRATION 2: Create RAG Query Logs Table
-- =====================================================================

-- Create analytics table
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

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_user
ON rag_query_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_rag_query_logs_created
ON rag_query_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_query_logs_used_rag
ON rag_query_logs(used_rag);

-- Composite index for A/B testing
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_rag_performance
ON rag_query_logs(used_rag, response_time_ms)
WHERE response_time_ms IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE rag_query_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own query logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rag_query_logs'
    AND policyname = 'Users can view own query logs'
  ) THEN
    CREATE POLICY "Users can view own query logs"
    ON rag_query_logs
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS Policy: System can insert query logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rag_query_logs'
    AND policyname = 'System can insert query logs'
  ) THEN
    CREATE POLICY "System can insert query logs"
    ON rag_query_logs
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- RLS Policy: Users can update their own ratings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rag_query_logs'
    AND policyname = 'Users can update own ratings'
  ) THEN
    CREATE POLICY "Users can update own ratings"
    ON rag_query_logs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add table and column documentation
COMMENT ON TABLE rag_query_logs IS 'Analytics tracking for RAG query performance and A/B testing';
COMMENT ON COLUMN rag_query_logs.used_rag IS 'Whether RAG personalization was used for this query';
COMMENT ON COLUMN rag_query_logs.context_items IS 'Number of context items retrieved from Pinecone';
COMMENT ON COLUMN rag_query_logs.response_time_ms IS 'Total query response time in milliseconds';
COMMENT ON COLUMN rag_query_logs.satisfaction_rating IS 'User satisfaction rating (1-5 stars)';

-- =====================================================================
-- VERIFICATION QUERIES (Optional - run after migration)
-- =====================================================================

-- Check profiles columns
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
--   AND column_name LIKE 'rag%'
-- ORDER BY ordinal_position;

-- Check rag_query_logs table
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'rag_query_logs'
-- ORDER BY ordinal_position;

-- =====================================================================
-- END OF MIGRATIONS
-- =====================================================================
