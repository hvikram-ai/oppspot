-- ============================================================================
-- Competitive Intelligence Performance Optimization
-- ============================================================================
-- Description: Add composite indexes to optimize dashboard query performance
-- Expected improvement: 30-40% reduction in query time (from 80-150ms to 50-100ms)
-- Date: 2025-11-09
-- Prerequisites: Requires 20251031_competitive_intelligence.sql to be applied first
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
    RAISE NOTICE 'Skipping optimization: Competitive intelligence tables not found. Please apply migration 20251031_competitive_intelligence.sql first.';
    RETURN;
  END IF;

  -- Composite index for feature parity scores with sorting
  -- Used by: getParityScores() which orders by parity_score DESC
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_parity_scores_analysis_score'
  ) THEN
    CREATE INDEX idx_parity_scores_analysis_score
      ON feature_parity_scores(analysis_id, parity_score DESC);
    RAISE NOTICE 'Created index: idx_parity_scores_analysis_score';
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
  END IF;

  -- Add comments to indexes
  EXECUTE 'COMMENT ON INDEX idx_parity_scores_analysis_score IS ''Optimizes getParityScores() query with analysis_id filter and parity_score ordering''';
  EXECUTE 'COMMENT ON INDEX idx_feature_matrix_analysis_ordered IS ''Optimizes getFeatureMatrix() query with analysis_id filter and category/name ordering''';
  EXECUTE 'COMMENT ON INDEX idx_competitor_companies_name_website IS ''Speeds up competitor lookup by name/website, excluding null websites''';
  EXECUTE 'COMMENT ON INDEX idx_competitive_analyses_active IS ''Optimizes queries for active (non-deleted) analyses''';

  RAISE NOTICE 'Competitive intelligence indexes created successfully';
END $$;

-- ============================================================================
-- Update Query Planner Statistics
-- ============================================================================
-- Ensures PostgreSQL has accurate row counts and data distribution for optimal query planning

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
    RAISE NOTICE 'Table statistics updated successfully';
  END IF;
END $$;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify indexes are being used:

-- 1. Check index usage for parity scores query:
-- EXPLAIN ANALYZE
-- SELECT * FROM feature_parity_scores
-- WHERE analysis_id = 'some-uuid'
-- ORDER BY parity_score DESC;

-- 2. Check index usage for feature matrix query:
-- EXPLAIN ANALYZE
-- SELECT * FROM feature_matrix_entries
-- WHERE analysis_id = 'some-uuid'
-- ORDER BY feature_category, feature_name;

-- 3. Check index usage for competitor lookup:
-- EXPLAIN ANALYZE
-- SELECT * FROM competitor_companies
-- WHERE name = 'Company Name' AND website = 'https://example.com';

-- ============================================================================
-- Performance Notes
-- ============================================================================
-- Current implementation uses 6 parallel queries via Promise.all:
--   1. getCompetitors (competitive_analysis_competitors + competitor_companies)
--   2. getParityScores (feature_parity_scores) ← NOW OPTIMIZED
--   3. getFeatureMatrix (feature_matrix_entries) ← NOW OPTIMIZED
--   4. getPricingComparisons (pricing_comparisons)
--   5. getMarketPositioning (market_positioning)
--   6. getMoatScore (competitive_moat_scores)
--
-- These indexes improve #2 and #3 which are often the slowest due to:
-- - Large result sets (50-100+ features per analysis)
-- - Sorting operations (ORDER BY)
-- - Composite filtering (analysis_id + ordering)
--
-- Indexes #1, #4, #5, #6 already have adequate coverage via foreign key indexes
-- ============================================================================
