-- ================================================
-- RAG User Preferences Migration
-- ================================================
-- Add RAG preference columns to profiles table
-- Enables user control over personalized AI features
--
-- Features:
-- - rag_enabled: Toggle RAG personalization on/off
-- - rag_auto_index: Automatic background indexing
-- - rag_indexed_at: Last indexing timestamp
-- - rag_indexed_count: Number of vectors in Pinecone
--
-- Created: 2025-10-26
-- ================================================

-- Add RAG preference columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rag_auto_index BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rag_indexed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rag_indexed_count INTEGER DEFAULT 0;

-- Add index for querying RAG-enabled users
CREATE INDEX IF NOT EXISTS idx_profiles_rag_enabled
ON profiles(rag_enabled)
WHERE rag_enabled = true;

-- Add index for finding users needing reindexing
CREATE INDEX IF NOT EXISTS idx_profiles_rag_indexed_at
ON profiles(rag_indexed_at)
WHERE rag_enabled = true;

-- Add comment for documentation
COMMENT ON COLUMN profiles.rag_enabled IS 'Enable RAG personalization for this user';
COMMENT ON COLUMN profiles.rag_auto_index IS 'Automatically index user data for RAG';
COMMENT ON COLUMN profiles.rag_indexed_at IS 'Timestamp of last successful indexing';
COMMENT ON COLUMN profiles.rag_indexed_count IS 'Number of vectors indexed in Pinecone';
