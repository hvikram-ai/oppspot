-- ============================================================================
-- COMPETITIVE INTELLIGENCE - PERFORMANCE INDEXES (FIXED FOR ACTUAL SCHEMA)
-- ============================================================================
-- This matches the actual schema from 20251105000001_competitive_intelligence.sql
-- Run this in Supabase SQL Editor
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Starting competitive intelligence index optimization...';

  -- ========================================================================
  -- 1. Index for competitive_analyses queries
  -- ========================================================================

  -- Index for active analyses by user
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_competitive_analyses_user_status'
  ) THEN
    CREATE INDEX idx_competitive_analyses_user_status
      ON competitive_analyses(created_by, status, created_at DESC);
    RAISE NOTICE '✅ Created index: idx_competitive_analyses_user_status';
  ELSE
    RAISE NOTICE '⏭️  Index already exists: idx_competitive_analyses_user_status';
  END IF;

  -- Index for analyses needing refresh (data staleness check)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_competitive_analyses_refresh'
  ) THEN
    CREATE INDEX idx_competitive_analyses_refresh
      ON competitive_analyses(last_refreshed_at NULLS FIRST)
      WHERE status != 'archived';
    RAISE NOTICE '✅ Created index: idx_competitive_analyses_refresh';
  ELSE
    RAISE NOTICE '⏭️  Index already exists: idx_competitive_analyses_refresh';
  END IF;

  -- Index for moat score sorting
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_competitive_analyses_moat_score'
  ) THEN
    CREATE INDEX idx_competitive_analyses_moat_score
      ON competitive_analyses(moat_score DESC NULLS LAST)
      WHERE status != 'archived';
    RAISE NOTICE '✅ Created index: idx_competitive_analyses_moat_score';
  ELSE
    RAISE NOTICE '⏭️  Index already exists: idx_competitive_analyses_moat_score';
  END IF;

  -- ========================================================================
  -- 2. Index for competitors queries
  -- ========================================================================

  -- Composite index for competitor lookups by analysis
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_competitors_analysis_threat'
  ) THEN
    CREATE INDEX idx_competitors_analysis_threat
      ON competitors(analysis_id, threat_level, feature_parity_score DESC NULLS LAST);
    RAISE NOTICE '✅ Created index: idx_competitors_analysis_threat';
  ELSE
    RAISE NOTICE '⏭️  Index already exists: idx_competitors_analysis_threat';
  END IF;

  -- Index for competitor name search
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_competitors_name'
  ) THEN
    CREATE INDEX idx_competitors_name
      ON competitors(competitor_name);
    RAISE NOTICE '✅ Created index: idx_competitors_name';
  ELSE
    RAISE NOTICE '⏭️  Index already exists: idx_competitors_name';
  END IF;

  -- Index for feature parity score ranking
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_competitors_parity_score'
  ) THEN
    CREATE INDEX idx_competitors_parity_score
      ON competitors(analysis_id, feature_parity_score DESC NULLS LAST);
    RAISE NOTICE '✅ Created index: idx_competitors_parity_score';
  ELSE
    RAISE NOTICE '⏭️  Index already exists: idx_competitors_parity_score';
  END IF;

  -- ========================================================================
  -- 3. Index for access grants (sharing)
  -- ========================================================================

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_access_grants_user'
  ) THEN
    CREATE INDEX idx_access_grants_user
      ON competitive_analysis_access_grants(user_id, access_level);
    RAISE NOTICE '✅ Created index: idx_access_grants_user';
  ELSE
    RAISE NOTICE '⏭️  Index already exists: idx_access_grants_user';
  END IF;

  -- ========================================================================
  -- 4. Update table statistics
  -- ========================================================================

  EXECUTE 'ANALYZE competitive_analyses';
  EXECUTE 'ANALYZE competitors';
  EXECUTE 'ANALYZE competitive_analysis_access_grants';

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'competitive_analysis_refresh_jobs'
  ) THEN
    EXECUTE 'ANALYZE competitive_analysis_refresh_jobs';
  END IF;

  RAISE NOTICE '✅ Table statistics updated';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Optimization complete! 🚀';
  RAISE NOTICE '========================================';

END $$;

-- ============================================================================
-- VERIFICATION - Check indexes were created
-- ============================================================================

SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_competitive%'
    OR indexname LIKE 'idx_competitors%'
    OR indexname LIKE 'idx_access_grants%'
  )
  AND indexname NOT LIKE '%pkey'
ORDER BY tablename, indexname;

-- Expected: 7+ indexes
