-- Data Room Q&A Analytics Queries
-- Task: T040
-- Reference: research.md section 10 (performance monitoring)
-- Purpose: SQL queries for monitoring Q&A copilot performance and quality

-- ============================================================================
-- 1. Average Query Latency
-- ============================================================================
-- Tracks average end-to-end query processing time
-- Target: < 7 seconds (FR-033)

CREATE OR REPLACE FUNCTION get_average_query_latency(
  p_data_room_id UUID DEFAULT NULL,
  p_hours_back INT DEFAULT 24
)
RETURNS TABLE (
  data_room_id UUID,
  avg_total_ms NUMERIC,
  avg_retrieval_ms NUMERIC,
  avg_llm_ms NUMERIC,
  query_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.data_room_id,
    ROUND(AVG((q.metrics->>'total_time_ms')::numeric), 2) as avg_total_ms,
    ROUND(AVG((q.metrics->>'retrieval_time_ms')::numeric), 2) as avg_retrieval_ms,
    ROUND(AVG((q.metrics->>'llm_time_ms')::numeric), 2) as avg_llm_ms,
    COUNT(*) as query_count
  FROM qa_queries q
  WHERE
    q.created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_data_room_id IS NULL OR q.data_room_id = p_data_room_id)
    AND q.metrics IS NOT NULL
  GROUP BY q.data_room_id;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_average_query_latency(); -- All data rooms, last 24 hours
-- SELECT * FROM get_average_query_latency('uuid-here', 48); -- Specific room, last 48 hours


-- ============================================================================
-- 2. 95th Percentile Latency (FR-033)
-- ============================================================================
-- Critical performance metric: 95% of queries should complete in < 7 seconds

CREATE OR REPLACE FUNCTION get_p95_query_latency(
  p_data_room_id UUID DEFAULT NULL,
  p_hours_back INT DEFAULT 24
)
RETURNS TABLE (
  data_room_id UUID,
  p95_total_ms NUMERIC,
  p95_retrieval_ms NUMERIC,
  p95_llm_ms NUMERIC,
  query_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.data_room_id,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (q.metrics->>'total_time_ms')::numeric) as p95_total_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (q.metrics->>'retrieval_time_ms')::numeric) as p95_retrieval_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (q.metrics->>'llm_time_ms')::numeric) as p95_llm_ms,
    COUNT(*) as query_count
  FROM qa_queries q
  WHERE
    q.created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_data_room_id IS NULL OR q.data_room_id = p_data_room_id)
    AND q.metrics IS NOT NULL
  GROUP BY q.data_room_id;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_p95_query_latency();
-- Alert if p95_total_ms > 7000


-- ============================================================================
-- 3. Abstention Rate (FR-032)
-- ============================================================================
-- Tracks how often the copilot says "I don't have enough information"
-- Target: Monitor trend, ideally < 30%

CREATE OR REPLACE FUNCTION get_abstention_rate(
  p_data_room_id UUID DEFAULT NULL,
  p_hours_back INT DEFAULT 24
)
RETURNS TABLE (
  data_room_id UUID,
  total_queries BIGINT,
  abstention_count BIGINT,
  abstention_rate_percent NUMERIC,
  grounded_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.data_room_id,
    COUNT(*) as total_queries,
    SUM(CASE WHEN q.answer_type = 'insufficient_evidence' THEN 1 ELSE 0 END) as abstention_count,
    ROUND(
      100.0 * SUM(CASE WHEN q.answer_type = 'insufficient_evidence' THEN 1 ELSE 0 END) / COUNT(*),
      2
    ) as abstention_rate_percent,
    SUM(CASE WHEN q.answer_type = 'grounded' THEN 1 ELSE 0 END) as grounded_count
  FROM qa_queries q
  WHERE
    q.created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_data_room_id IS NULL OR q.data_room_id = p_data_room_id)
  GROUP BY q.data_room_id;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_abstention_rate();
-- Alert if abstention_rate_percent > 30


-- ============================================================================
-- 4. Average Citations Per Answer (FR-034)
-- ============================================================================
-- Measures how well answers are grounded in source documents
-- Higher is generally better (more evidence backing answers)

CREATE OR REPLACE FUNCTION get_average_citations_per_answer(
  p_data_room_id UUID DEFAULT NULL,
  p_hours_back INT DEFAULT 24
)
RETURNS TABLE (
  data_room_id UUID,
  total_queries BIGINT,
  total_citations BIGINT,
  avg_citations_per_query NUMERIC,
  queries_with_citations BIGINT,
  queries_without_citations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.data_room_id,
    COUNT(DISTINCT q.id) as total_queries,
    COUNT(c.id) as total_citations,
    ROUND(COUNT(c.id)::numeric / NULLIF(COUNT(DISTINCT q.id), 0), 2) as avg_citations_per_query,
    COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN q.id END) as queries_with_citations,
    COUNT(DISTINCT CASE WHEN c.id IS NULL THEN q.id END) as queries_without_citations
  FROM qa_queries q
  LEFT JOIN qa_citations c ON q.id = c.query_id
  WHERE
    q.created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_data_room_id IS NULL OR q.data_room_id = p_data_room_id)
  GROUP BY q.data_room_id;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_average_citations_per_answer();


-- ============================================================================
-- 5. Rate Limit Violations Count
-- ============================================================================
-- Tracks how often users hit the 60 queries/hour limit (FR-014)

CREATE OR REPLACE FUNCTION get_rate_limit_violations(
  p_hours_back INT DEFAULT 24
)
RETURNS TABLE (
  user_id UUID,
  data_room_id UUID,
  violation_count BIGINT,
  last_violation_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rl.user_id,
    rl.data_room_id,
    COUNT(*) as violation_count,
    MAX(rl.created_at) as last_violation_at
  FROM qa_rate_limits rl
  WHERE
    rl.created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND rl.queries_count >= 60
  GROUP BY rl.user_id, rl.data_room_id
  ORDER BY violation_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_rate_limit_violations(24);


-- ============================================================================
-- 6. Query Failure Rate
-- ============================================================================
-- Tracks errors during query processing

CREATE OR REPLACE FUNCTION get_query_failure_rate(
  p_data_room_id UUID DEFAULT NULL,
  p_hours_back INT DEFAULT 24
)
RETURNS TABLE (
  data_room_id UUID,
  total_queries BIGINT,
  failed_queries BIGINT,
  failure_rate_percent NUMERIC,
  error_types JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.data_room_id,
    COUNT(*) as total_queries,
    SUM(CASE WHEN q.error IS NOT NULL THEN 1 ELSE 0 END) as failed_queries,
    ROUND(
      100.0 * SUM(CASE WHEN q.error IS NOT NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
      2
    ) as failure_rate_percent,
    JSONB_OBJECT_AGG(
      COALESCE(q.error->>'type', 'unknown'),
      COUNT(*)
    ) FILTER (WHERE q.error IS NOT NULL) as error_types
  FROM qa_queries q
  WHERE
    q.created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_data_room_id IS NULL OR q.data_room_id = p_data_room_id)
  GROUP BY q.data_room_id;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_query_failure_rate();


-- ============================================================================
-- 7. User Feedback Analysis (FR-023-024)
-- ============================================================================
-- Tracks helpful/not_helpful ratings to measure answer quality

CREATE OR REPLACE FUNCTION get_feedback_analysis(
  p_data_room_id UUID DEFAULT NULL,
  p_hours_back INT DEFAULT 24
)
RETURNS TABLE (
  data_room_id UUID,
  total_feedback_count BIGINT,
  helpful_count BIGINT,
  not_helpful_count BIGINT,
  helpful_rate_percent NUMERIC,
  avg_response_time_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.data_room_id,
    COUNT(f.id) as total_feedback_count,
    SUM(CASE WHEN f.rating = 'helpful' THEN 1 ELSE 0 END) as helpful_count,
    SUM(CASE WHEN f.rating = 'not_helpful' THEN 1 ELSE 0 END) as not_helpful_count,
    ROUND(
      100.0 * SUM(CASE WHEN f.rating = 'helpful' THEN 1 ELSE 0 END) / NULLIF(COUNT(f.id), 0),
      2
    ) as helpful_rate_percent,
    ROUND(AVG(EXTRACT(EPOCH FROM (f.created_at - q.created_at))), 2) as avg_response_time_seconds
  FROM qa_feedback f
  JOIN qa_queries q ON f.query_id = q.id
  WHERE
    f.created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_data_room_id IS NULL OR q.data_room_id = p_data_room_id)
  GROUP BY q.data_room_id;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_feedback_analysis();


-- ============================================================================
-- 8. Document Usage Analysis
-- ============================================================================
-- Shows which documents are most frequently cited in answers

CREATE OR REPLACE FUNCTION get_most_cited_documents(
  p_data_room_id UUID,
  p_hours_back INT DEFAULT 24,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  document_id UUID,
  document_title TEXT,
  citation_count BIGINT,
  unique_queries BIGINT,
  avg_relevance_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.document_id,
    c.document_title,
    COUNT(c.id) as citation_count,
    COUNT(DISTINCT c.query_id) as unique_queries,
    ROUND(AVG(c.relevance_score), 3) as avg_relevance_score
  FROM qa_citations c
  JOIN qa_queries q ON c.query_id = q.id
  WHERE
    q.created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND q.data_room_id = p_data_room_id
  GROUP BY c.document_id, c.document_title
  ORDER BY citation_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_most_cited_documents('data-room-uuid');


-- ============================================================================
-- 9. Monitoring Dashboard Summary View
-- ============================================================================
-- Combines key metrics into a single view for dashboards

CREATE OR REPLACE VIEW qa_monitoring_summary AS
SELECT
  CURRENT_TIMESTAMP as snapshot_time,

  -- Performance metrics
  (SELECT ROUND(AVG((metrics->>'total_time_ms')::numeric), 0)
   FROM qa_queries
   WHERE created_at >= NOW() - INTERVAL '24 hours') as avg_latency_ms_24h,

  (SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metrics->>'total_time_ms')::numeric)
   FROM qa_queries
   WHERE created_at >= NOW() - INTERVAL '24 hours') as p95_latency_ms_24h,

  -- Quality metrics
  (SELECT ROUND(100.0 * SUM(CASE WHEN answer_type = 'insufficient_evidence' THEN 1 ELSE 0 END) / COUNT(*), 2)
   FROM qa_queries
   WHERE created_at >= NOW() - INTERVAL '24 hours') as abstention_rate_percent_24h,

  (SELECT ROUND(100.0 * SUM(CASE WHEN rating = 'helpful' THEN 1 ELSE 0 END) / COUNT(*), 2)
   FROM qa_feedback
   WHERE created_at >= NOW() - INTERVAL '24 hours') as helpful_rate_percent_24h,

  -- Volume metrics
  (SELECT COUNT(*) FROM qa_queries WHERE created_at >= NOW() - INTERVAL '24 hours') as total_queries_24h,
  (SELECT COUNT(*) FROM qa_queries WHERE created_at >= NOW() - INTERVAL '1 hour') as total_queries_1h,

  -- Error metrics
  (SELECT ROUND(100.0 * SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2)
   FROM qa_queries
   WHERE created_at >= NOW() - INTERVAL '24 hours') as error_rate_percent_24h,

  -- Rate limit metrics
  (SELECT COUNT(DISTINCT user_id)
   FROM qa_rate_limits
   WHERE created_at >= NOW() - INTERVAL '24 hours' AND queries_count >= 60) as rate_limited_users_24h;


-- Example usage:
-- SELECT * FROM qa_monitoring_summary;


-- ============================================================================
-- 10. Alert Thresholds
-- ============================================================================
-- SQL queries to check if metrics exceed alert thresholds

-- Alert: P95 latency > 7 seconds
SELECT
  data_room_id,
  p95_total_ms,
  'P95 latency exceeds 7s threshold' as alert_message
FROM get_p95_query_latency()
WHERE p95_total_ms > 7000;

-- Alert: Abstention rate > 30%
SELECT
  data_room_id,
  abstention_rate_percent,
  'Abstention rate exceeds 30% threshold' as alert_message
FROM get_abstention_rate()
WHERE abstention_rate_percent > 30;

-- Alert: Error rate > 5%
SELECT
  data_room_id,
  failure_rate_percent,
  'Error rate exceeds 5% threshold' as alert_message
FROM get_query_failure_rate()
WHERE failure_rate_percent > 5;

-- Alert: Helpful rate < 50%
SELECT
  data_room_id,
  helpful_rate_percent,
  'Helpful rate below 50% threshold' as alert_message
FROM get_feedback_analysis()
WHERE helpful_rate_percent < 50 AND total_feedback_count > 10;
