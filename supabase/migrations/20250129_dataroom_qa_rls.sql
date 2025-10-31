-- Data Room Q&A Copilot - Row Level Security Policies
-- Feature: 008-oppspot-docs-dataroom
-- Created: 2025-01-29
-- Description: RLS policies to enforce access control (FR-011, FR-012, FR-013)

-- ============================================================================
-- Enable RLS on all Q&A tables
-- ============================================================================

ALTER TABLE document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper Function: Check Data Room Membership
-- ============================================================================

CREATE OR REPLACE FUNCTION has_data_room_access(room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM data_room_access
    WHERE data_room_id = room_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION has_data_room_access IS 'Returns true if current user has access to the specified data room';

-- ============================================================================
-- document_pages RLS Policies
-- Purpose: Users can only access pages from documents in data rooms they're members of
-- ============================================================================

DROP POLICY IF EXISTS "document_pages_select_policy" ON document_pages;
CREATE POLICY document_pages_select_policy ON document_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      INNER JOIN data_rooms dr ON d.data_room_id = dr.id
      WHERE d.id = document_pages.document_id
        AND has_data_room_access(dr.id)
    )
  );

DROP POLICY IF EXISTS "document_pages_insert_policy" ON document_pages;
CREATE POLICY document_pages_insert_policy ON document_pages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      INNER JOIN data_room_access drm ON d.data_room_id = drm.data_room_id
      WHERE d.id = document_pages.document_id
        AND drm.user_id = auth.uid()
        AND drm.permission_level IN ('owner', 'editor') -- Only owners/editors can create pages
    )
  );

DROP POLICY IF EXISTS "document_pages_update_policy" ON document_pages;
CREATE POLICY document_pages_update_policy ON document_pages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      INNER JOIN data_room_access drm ON d.data_room_id = drm.data_room_id
      WHERE d.id = document_pages.document_id
        AND drm.user_id = auth.uid()
        AND drm.permission_level IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "document_pages_delete_policy" ON document_pages;
CREATE POLICY document_pages_delete_policy ON document_pages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      INNER JOIN data_room_access drm ON d.data_room_id = drm.data_room_id
      WHERE d.id = document_pages.document_id
        AND drm.user_id = auth.uid()
        AND drm.permission_level = 'owner' -- Only owners can delete pages
    )
  );

-- ============================================================================
-- document_chunks RLS Policies
-- Purpose: Same access rules as document_pages (tied to data room membership)
-- ============================================================================

DROP POLICY IF EXISTS "document_chunks_select_policy" ON document_chunks;
CREATE POLICY document_chunks_select_policy ON document_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      INNER JOIN data_rooms dr ON d.data_room_id = dr.id
      WHERE d.id = document_chunks.document_id
        AND has_data_room_access(dr.id)
    )
  );

DROP POLICY IF EXISTS "document_chunks_insert_policy" ON document_chunks;
CREATE POLICY document_chunks_insert_policy ON document_chunks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      INNER JOIN data_room_access drm ON d.data_room_id = drm.data_room_id
      WHERE d.id = document_chunks.document_id
        AND drm.user_id = auth.uid()
        AND drm.permission_level IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "document_chunks_update_policy" ON document_chunks;
CREATE POLICY document_chunks_update_policy ON document_chunks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      INNER JOIN data_room_access drm ON d.data_room_id = drm.data_room_id
      WHERE d.id = document_chunks.document_id
        AND drm.user_id = auth.uid()
        AND drm.permission_level IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "document_chunks_delete_policy" ON document_chunks;
CREATE POLICY document_chunks_delete_policy ON document_chunks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      INNER JOIN data_room_access drm ON d.data_room_id = drm.data_room_id
      WHERE d.id = document_chunks.document_id
        AND drm.user_id = auth.uid()
        AND drm.permission_level = 'owner'
    )
  );

-- ============================================================================
-- qa_queries RLS Policies
-- Purpose: Users can only access their own queries in data rooms they're members of (FR-011, FR-012)
-- ============================================================================

DROP POLICY IF EXISTS "qa_queries_select_policy" ON qa_queries;
CREATE POLICY qa_queries_select_policy ON qa_queries
  FOR SELECT
  USING (
    -- Users can only see their own queries
    user_id = auth.uid()
    -- In data rooms they have access to
    AND has_data_room_access(data_room_id)
  );

DROP POLICY IF EXISTS "qa_queries_insert_policy" ON qa_queries;
CREATE POLICY qa_queries_insert_policy ON qa_queries
  FOR INSERT
  WITH CHECK (
    -- Users can only create queries for themselves
    user_id = auth.uid()
    -- In data rooms they have access to (any role: owner, editor, viewer)
    AND has_data_room_access(data_room_id)
  );

DROP POLICY IF EXISTS "qa_queries_update_policy" ON qa_queries;
CREATE POLICY qa_queries_update_policy ON qa_queries
  FOR UPDATE
  USING (
    -- Users can only update their own queries
    user_id = auth.uid()
    AND has_data_room_access(data_room_id)
  );

DROP POLICY IF EXISTS "qa_queries_delete_policy" ON qa_queries;
CREATE POLICY qa_queries_delete_policy ON qa_queries
  FOR DELETE
  USING (
    -- Users can only delete their own queries (GDPR right to erasure FR-022a)
    user_id = auth.uid()
    AND has_data_room_access(data_room_id)
  );

-- ============================================================================
-- qa_citations RLS Policies
-- Purpose: Citations inherit access from their parent query
-- ============================================================================

DROP POLICY IF EXISTS "qa_citations_select_policy" ON qa_citations;
CREATE POLICY qa_citations_select_policy ON qa_citations
  FOR SELECT
  USING (
    -- Citations are accessible if the parent query is accessible
    EXISTS (
      SELECT 1 FROM qa_queries q
      WHERE q.id = qa_citations.query_id
        AND q.user_id = auth.uid()
        AND has_data_room_access(q.data_room_id)
    )
  );

DROP POLICY IF EXISTS "qa_citations_insert_policy" ON qa_citations;
CREATE POLICY qa_citations_insert_policy ON qa_citations
  FOR INSERT
  WITH CHECK (
    -- Citations can only be created for queries the user owns
    EXISTS (
      SELECT 1 FROM qa_queries q
      WHERE q.id = qa_citations.query_id
        AND q.user_id = auth.uid()
        AND has_data_room_access(q.data_room_id)
    )
  );

DROP POLICY IF EXISTS "qa_citations_update_policy" ON qa_citations;
CREATE POLICY qa_citations_update_policy ON qa_citations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM qa_queries q
      WHERE q.id = qa_citations.query_id
        AND q.user_id = auth.uid()
        AND has_data_room_access(q.data_room_id)
    )
  );

DROP POLICY IF EXISTS "qa_citations_delete_policy" ON qa_citations;
CREATE POLICY qa_citations_delete_policy ON qa_citations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM qa_queries q
      WHERE q.id = qa_citations.query_id
        AND q.user_id = auth.uid()
        AND has_data_room_access(q.data_room_id)
    )
  );

-- ============================================================================
-- qa_feedback RLS Policies
-- Purpose: Users can only access and modify their own feedback (FR-023, FR-024)
-- ============================================================================

DROP POLICY IF EXISTS "qa_feedback_select_policy" ON qa_feedback;
CREATE POLICY qa_feedback_select_policy ON qa_feedback
  FOR SELECT
  USING (
    -- Users can view feedback on their own queries
    EXISTS (
      SELECT 1 FROM qa_queries q
      WHERE q.id = qa_feedback.query_id
        AND q.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "qa_feedback_insert_policy" ON qa_feedback;
CREATE POLICY qa_feedback_insert_policy ON qa_feedback
  FOR INSERT
  WITH CHECK (
    -- Users can only provide feedback on their own queries
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM qa_queries q
      WHERE q.id = qa_feedback.query_id
        AND q.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "qa_feedback_update_policy" ON qa_feedback;
CREATE POLICY qa_feedback_update_policy ON qa_feedback
  FOR UPDATE
  USING (
    -- Users can only update their own feedback
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "qa_feedback_delete_policy" ON qa_feedback;
CREATE POLICY qa_feedback_delete_policy ON qa_feedback
  FOR DELETE
  USING (
    -- Users can delete their own feedback
    user_id = auth.uid()
  );

-- ============================================================================
-- qa_rate_limits RLS Policies
-- Purpose: Users can only view and update their own rate limit records
-- ============================================================================

DROP POLICY IF EXISTS "qa_rate_limits_select_policy" ON qa_rate_limits;
CREATE POLICY qa_rate_limits_select_policy ON qa_rate_limits
  FOR SELECT
  USING (
    -- Users can only see their own rate limits
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "qa_rate_limits_insert_policy" ON qa_rate_limits;
CREATE POLICY qa_rate_limits_insert_policy ON qa_rate_limits
  FOR INSERT
  WITH CHECK (
    -- Users can only create rate limit records for themselves
    user_id = auth.uid()
    AND has_data_room_access(data_room_id)
  );

DROP POLICY IF EXISTS "qa_rate_limits_update_policy" ON qa_rate_limits;
CREATE POLICY qa_rate_limits_update_policy ON qa_rate_limits
  FOR UPDATE
  USING (
    -- Users can only update their own rate limits
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "qa_rate_limits_delete_policy" ON qa_rate_limits;
CREATE POLICY qa_rate_limits_delete_policy ON qa_rate_limits
  FOR DELETE
  USING (
    -- Users can delete their own rate limit records (for cleanup)
    user_id = auth.uid()
  );

-- ============================================================================
-- Service Role Bypass (for backend operations)
-- ============================================================================

-- Grant service role full access to all tables for backend processing
-- This allows the backend to process documents and generate queries on behalf of users

DO $$
BEGIN
  -- Verify service_role exists
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    -- Grant full access to service_role
    GRANT ALL ON document_pages TO service_role;
    GRANT ALL ON document_chunks TO service_role;
    GRANT ALL ON qa_queries TO service_role;
    GRANT ALL ON qa_citations TO service_role;
    GRANT ALL ON qa_feedback TO service_role;
    GRANT ALL ON qa_rate_limits TO service_role;

    RAISE NOTICE 'service_role granted full access to Q&A tables';
  END IF;
END $$;

-- ============================================================================
-- Testing Utilities (for development/testing only)
-- ============================================================================

-- Function to test RLS policies (development use only)
CREATE OR REPLACE FUNCTION test_qa_rls_policies()
RETURNS TABLE (
  table_name TEXT,
  policy_name TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (schemaname || '.' || tablename)::TEXT AS table_name,
    policyname::TEXT AS policy_name,
    'ENABLED'::TEXT AS status
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'document_pages',
      'document_chunks',
      'qa_queries',
      'qa_citations',
      'qa_feedback',
      'qa_rate_limits'
    )
  ORDER BY tablename, policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION test_qa_rls_policies IS 'Development helper: List all RLS policies for Q&A tables';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  rls_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN (
      'document_pages',
      'document_chunks',
      'qa_queries',
      'qa_citations',
      'qa_feedback',
      'qa_rate_limits'
    )
    AND c.relrowsecurity = true;

  -- Count policies created
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'document_pages',
      'document_chunks',
      'qa_queries',
      'qa_citations',
      'qa_feedback',
      'qa_rate_limits'
    );

  RAISE NOTICE 'RLS Migration Complete: % tables secured, % policies created', rls_count, policy_count;

  -- Verify expected policy count (6 tables × 4 policies each = 24 policies)
  IF policy_count <24 THEN
    RAISE WARNING 'Expected 24 policies, but found %. Some policies may be missing.', policy_count;
  END IF;
END $$;

-- Display summary
SELECT * FROM test_qa_rls_policies();
