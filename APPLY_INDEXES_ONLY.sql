-- ============================================================================
-- COMPETITIVE INTELLIGENCE - PERFORMANCE INDEXES ONLY
-- ============================================================================
-- This file ONLY creates indexes, safe to run even if base tables exist
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/editor
-- ============================================================================

-- Check if tables exist before creating indexes
DO $$
BEGIN
  -- Only proceed if competitive intelligence tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'feature_parity_scores'
  ) THEN
    RAISE NOTICE 'Skipping optimization: Competitive intelligence tables not found.';
    RETURN;
  END IF;

  RAISE NOTICE 'Starting index creation...';

  -- Composite index for feature parity scores with sorting
  -- Used by: getParityScores() which orders by parity_score DESC
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_parity_scores_analysis_score'
  ) THEN
    CREATE INDEX idx_parity_scores_analysis_score
      ON feature_parity_scores(analysis_id, parity_score DESC);
    RAISE NOTICE 'Created index: idx_parity_scores_analysis_score';
  ELSE
    RAISE NOTICE 'Index already exists: idx_parity_scores_analysis_score';
  END IF;

  -- Composite index for feature matrix with category and name ordering
  -- Used by: getFeatureMatrix() which orders by feature_category, feature_name
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_feature_matrix_analysis_ordered'
  ) THEN
    CREATE INDEX idx_feature_matrix_analysis_ordered
      ON feature_matrix_entries(analysis_id, feature_category, feature_name);
    RAISE NOTICE 'Created index: idx_feature_matrix_analysis_ordered';
  ELSE
    RAISE NOTICE 'Index already exists: idx_feature_matrix_analysis_ordered';
  END IF;

  -- Index for competitor company lookup by name and website
  -- Used by: Frequently accessed when displaying competitor information
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_competitor_companies_name_website'
  ) THEN
    CREATE INDEX idx_competitor_companies_name_website
      ON competitor_companies(name, website) WHERE website IS NOT NULL;
    RAISE NOTICE 'Created index: idx_competitor_companies_name_website';
  ELSE
    RAISE NOTICE 'Index already exists: idx_competitor_companies_name_website';
  END IF;

  -- Partial index for active (non-deleted) analyses
  -- Used by: Most queries filter out deleted_at IS NULL
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_competitive_analyses_active'
  ) THEN
    CREATE INDEX idx_competitive_analyses_active
      ON competitive_analyses(id, created_by, status) WHERE deleted_at IS NULL;
    RAISE NOTICE 'Created index: idx_competitive_analyses_active';
  ELSE
    RAISE NOTICE 'Index already exists: idx_competitive_analyses_active';
  END IF;

  -- Add comments to indexes
  EXECUTE 'COMMENT ON INDEX idx_parity_scores_analysis_score IS ''Optimizes getParityScores() query with analysis_id filter and parity_score ordering''';
  EXECUTE 'COMMENT ON INDEX idx_feature_matrix_analysis_ordered IS ''Optimizes getFeatureMatrix() query with analysis_id filter and category/name ordering''';
  EXECUTE 'COMMENT ON INDEX idx_competitor_companies_name_website IS ''Speeds up competitor lookup by name/website, excluding null websites''';
  EXECUTE 'COMMENT ON INDEX idx_competitive_analyses_active IS ''Optimizes queries for active (non-deleted) analyses''';

  RAISE NOTICE '✅ Competitive intelligence indexes created successfully';
END $$;

-- Update query planner statistics
DO $$
BEGIN
  -- Only analyze if tables exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'competitive_analyses'
  ) THEN
    EXECUTE 'ANALYZE competitive_analyses';
    EXECUTE 'ANALYZE competitive_analysis_competitors';
    EXECUTE 'ANALYZE competitor_companies';
    EXECUTE 'ANALYZE feature_parity_scores';
    EXECUTE 'ANALYZE feature_matrix_entries';
    EXECUTE 'ANALYZE pricing_comparisons';
    EXECUTE 'ANALYZE market_positioning';
    EXECUTE 'ANALYZE competitive_moat_scores';
    RAISE NOTICE '✅ Table statistics updated successfully';
  END IF;
END $$;

-- Verification query - Check indexes were created
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_parity_scores_analysis_score',
    'idx_feature_matrix_analysis_ordered',
    'idx_competitor_companies_name_website',
    'idx_competitive_analyses_active'
  )
ORDER BY tablename, indexname;

-- Expected output: 4 rows showing all indexes
