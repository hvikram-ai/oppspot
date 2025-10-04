-- ============================================
-- Enable pgvector Extension for Semantic Search
-- ============================================
-- This enables vector similarity search for AI-powered
-- similar company discovery and semantic search features

-- ============================================
-- 1. Enable pgvector extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 2. Add embedding column to businesses table
-- ============================================
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS embedding vector(1536);

COMMENT ON COLUMN businesses.embedding IS 'Vector embedding for semantic similarity search (OpenAI text-embedding-3-small model)';

-- ============================================
-- 3. Create index for fast similarity search
-- ============================================
-- Using IVFFlat index for approximate nearest neighbor search
-- lists = 100 is optimal for 10k-100k rows (adjust based on data size)
CREATE INDEX IF NOT EXISTS idx_businesses_embedding
ON businesses USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- 4. Create embedding generation queue table
-- ============================================
CREATE TABLE IF NOT EXISTS embedding_generation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    UNIQUE(business_id)
);

CREATE INDEX idx_embedding_queue_status ON embedding_generation_queue(status, priority DESC, created_at);
CREATE INDEX idx_embedding_queue_business ON embedding_generation_queue(business_id);

COMMENT ON TABLE embedding_generation_queue IS 'Queue for background embedding generation via Inngest';

-- ============================================
-- 5. Create function for similarity search
-- ============================================
CREATE OR REPLACE FUNCTION find_similar_companies(
    target_embedding vector(1536),
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INTEGER DEFAULT 20,
    exclude_business_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE (
    business_id UUID,
    name TEXT,
    description TEXT,
    similarity_score FLOAT,
    categories TEXT[],
    location TEXT,
    employee_count INTEGER,
    founded_year INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.name,
        b.description,
        1 - (b.embedding <=> target_embedding) as similarity,
        b.categories,
        b.location,
        b.employee_count,
        b.founded_year
    FROM businesses b
    WHERE b.embedding IS NOT NULL
        AND b.id != ALL(exclude_business_ids)
        AND 1 - (b.embedding <=> target_embedding) >= similarity_threshold
    ORDER BY b.embedding <=> target_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_similar_companies IS 'Find similar companies using vector similarity search';

-- ============================================
-- 6. Create function to queue embedding generation
-- ============================================
CREATE OR REPLACE FUNCTION queue_embedding_generation(
    p_business_id UUID,
    p_priority INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
BEGIN
    INSERT INTO embedding_generation_queue (business_id, priority)
    VALUES (p_business_id, p_priority)
    ON CONFLICT (business_id)
    DO UPDATE SET
        status = 'pending',
        priority = EXCLUDED.priority,
        retry_count = 0,
        error_message = NULL,
        created_at = NOW()
    RETURNING id INTO v_queue_id;

    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. Create function to compose embedding text
-- ============================================
CREATE OR REPLACE FUNCTION compose_embedding_text(
    p_business_id UUID
)
RETURNS TEXT AS $$
DECLARE
    v_business RECORD;
    v_text TEXT;
BEGIN
    SELECT
        name,
        description,
        categories,
        products_services,
        sic_codes,
        founded_year,
        employee_count,
        location,
        ownership_type
    INTO v_business
    FROM businesses
    WHERE id = p_business_id;

    v_text := COALESCE(v_business.name, '') || E'\n' ||
              COALESCE(v_business.description, '') || E'\n' ||
              'Industry: ' || COALESCE(array_to_string(v_business.categories, ', '), '') || E'\n' ||
              'Products: ' || COALESCE(array_to_string(v_business.products_services, ', '), '') || E'\n' ||
              'SIC Codes: ' || COALESCE(array_to_string(v_business.sic_codes, ', '), '') || E'\n' ||
              'Founded: ' || COALESCE(v_business.founded_year::TEXT, '') || E'\n' ||
              'Employees: ' || COALESCE(v_business.employee_count::TEXT, '') || E'\n' ||
              'Location: ' || COALESCE(v_business.location, '') || E'\n' ||
              'Ownership: ' || COALESCE(v_business.ownership_type, '');

    RETURN v_text;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Create trigger to queue new businesses
-- ============================================
CREATE OR REPLACE FUNCTION trigger_queue_embedding()
RETURNS TRIGGER AS $$
BEGIN
    -- Queue embedding generation for new businesses
    IF TG_OP = 'INSERT' THEN
        PERFORM queue_embedding_generation(NEW.id, 5);
    -- Re-queue if key fields change
    ELSIF TG_OP = 'UPDATE' AND (
        NEW.name != OLD.name OR
        NEW.description != OLD.description OR
        NEW.categories != OLD.categories OR
        NEW.products_services != OLD.products_services
    ) THEN
        PERFORM queue_embedding_generation(NEW.id, 3);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER queue_embedding_on_business_change
AFTER INSERT OR UPDATE ON businesses
FOR EACH ROW
EXECUTE FUNCTION trigger_queue_embedding();

-- ============================================
-- 9. RLS Policies
-- ============================================
ALTER TABLE embedding_generation_queue ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view queue status
CREATE POLICY "Users can view embedding queue"
ON embedding_generation_queue FOR SELECT
TO authenticated
USING (true);

-- Only service role can manage queue
CREATE POLICY "Service role can manage embedding queue"
ON embedding_generation_queue FOR ALL
TO service_role
USING (true);

-- ============================================
-- 10. Grants
-- ============================================
GRANT SELECT ON embedding_generation_queue TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_companies TO authenticated;
GRANT EXECUTE ON FUNCTION compose_embedding_text TO authenticated;
GRANT EXECUTE ON FUNCTION queue_embedding_generation TO service_role;

-- ============================================
-- 11. Statistics View
-- ============================================
CREATE OR REPLACE VIEW embedding_stats AS
SELECT
    COUNT(*) FILTER (WHERE embedding IS NOT NULL) as businesses_with_embeddings,
    COUNT(*) as total_businesses,
    (COUNT(*) FILTER (WHERE embedding IS NOT NULL)::FLOAT / NULLIF(COUNT(*), 0) * 100) as coverage_percentage,
    (SELECT COUNT(*) FROM embedding_generation_queue WHERE status = 'pending') as pending_queue,
    (SELECT COUNT(*) FROM embedding_generation_queue WHERE status = 'processing') as processing_queue,
    (SELECT COUNT(*) FROM embedding_generation_queue WHERE status = 'failed') as failed_queue
FROM businesses;

GRANT SELECT ON embedding_stats TO authenticated;

COMMENT ON VIEW embedding_stats IS 'Statistics about embedding coverage and queue status';
