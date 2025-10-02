-- Knowledge Graph™ - Team Intelligence Memory System
-- Created: 2025-10-02
-- Purpose: Capture and connect all team knowledge across companies, people, signals, and insights

-- ============================================================================
-- Core Knowledge Entities
-- ============================================================================

-- Entity types enum
CREATE TYPE entity_type AS ENUM (
  'company',
  'person',
  'stakeholder',
  'buying_signal',
  'research_report',
  'meeting',
  'conversation',
  'document',
  'technology',
  'industry',
  'insight',
  'event',
  'deal',
  'product',
  'use_case'
);

-- Confidence levels for extracted knowledge
CREATE TYPE confidence_level AS ENUM (
  'verified',      -- 0.9-1.0 Human confirmed
  'high',          -- 0.7-0.89 Multiple sources
  'medium',        -- 0.5-0.69 Single reliable source
  'low',           -- 0.3-0.49 Inferred
  'speculative'    -- 0.0-0.29 AI guess
);

-- Knowledge entities - all nodes in the graph
CREATE TABLE IF NOT EXISTS knowledge_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Entity classification
  entity_type entity_type NOT NULL,
  entity_name TEXT NOT NULL,
  entity_subtype TEXT, -- e.g., 'cto', 'series_a', 'hiring_signal'

  -- Reference to actual record (if exists)
  reference_type TEXT, -- 'businesses', 'profiles', 'buying_signals', etc.
  reference_id UUID,

  -- Entity metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- Embeddings for semantic search
  embedding vector(1536),

  -- Tracking
  confidence confidence_level DEFAULT 'medium',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ,

  -- Search optimization
  search_vector tsvector,

  -- Constraints
  UNIQUE(org_id, entity_type, reference_id),

  -- Indexes
  INDEX idx_knowledge_entities_org_id ON knowledge_entities(org_id),
  INDEX idx_knowledge_entities_type ON knowledge_entities(entity_type),
  INDEX idx_knowledge_entities_reference ON knowledge_entities(reference_type, reference_id),
  INDEX idx_knowledge_entities_search ON knowledge_entities USING gin(search_vector)
);

-- Vector similarity index for semantic search
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_embedding
  ON knowledge_entities
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================================
-- Relationships - Edges in the knowledge graph
-- ============================================================================

-- Relationship types
CREATE TYPE relationship_type AS ENUM (
  -- Professional relationships
  'works_at',
  'reports_to',
  'manages',
  'colleagues_with',

  -- Interest and engagement
  'interested_in',
  'researched',
  'evaluated',
  'purchased',
  'uses',

  -- Influence and advocacy
  'champions',
  'opposes',
  'influences',
  'recommends',

  -- Technical relationships
  'built_with',
  'integrates_with',
  'competes_with',
  'similar_to',

  -- Temporal relationships
  'preceded_by',
  'resulted_in',
  'triggered_by',

  -- Informational
  'mentioned_in',
  'discussed_in',
  'related_to',
  'tagged_with',

  -- Custom
  'custom'
);

-- Entity relationships table
CREATE TABLE IF NOT EXISTS entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Graph edge
  source_entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,

  -- Relationship properties
  relationship_type relationship_type NOT NULL,
  relationship_label TEXT, -- Human-readable label

  -- Relationship metadata
  properties JSONB DEFAULT '{}',
  strength DECIMAL(3,2) DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  confidence confidence_level DEFAULT 'medium',

  -- Evidence and sources
  source_type TEXT, -- 'research_report', 'conversation', 'ai_inference', etc.
  source_id UUID,
  evidence TEXT,

  -- Temporal
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,

  -- Tracking
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,

  -- Constraints
  CHECK (source_entity_id != target_entity_id),

  -- Indexes for graph traversal
  INDEX idx_entity_relationships_org_id ON entity_relationships(org_id),
  INDEX idx_entity_relationships_source ON entity_relationships(source_entity_id),
  INDEX idx_entity_relationships_target ON entity_relationships(target_entity_id),
  INDEX idx_entity_relationships_type ON entity_relationships(relationship_type),
  INDEX idx_entity_relationships_both ON entity_relationships(source_entity_id, target_entity_id),
  INDEX idx_entity_relationships_bidirectional ON entity_relationships(target_entity_id, source_entity_id)
);

-- ============================================================================
-- Knowledge Facts - Atomic pieces of knowledge
-- ============================================================================

-- Fact types
CREATE TYPE fact_type AS ENUM (
  'attribute',      -- "Company has 50 employees"
  'event',          -- "Company raised Series A on 2024-01-15"
  'opinion',        -- "CTO likes AWS"
  'observation',    -- "Website has pricing page"
  'intent',         -- "Looking to buy CRM"
  'pain_point',     -- "Current system is slow"
  'goal',           -- "Want to scale to 10k users"
  'constraint',     -- "Budget is £50k"
  'preference',     -- "Prefers monthly billing"
  'relationship'    -- "Sarah knows John"
);

-- Knowledge facts table - atomic knowledge units
CREATE TABLE IF NOT EXISTS knowledge_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Fact about an entity
  entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,

  -- Fact classification
  fact_type fact_type NOT NULL,
  fact_key TEXT NOT NULL,   -- e.g., "employee_count", "funding_stage"
  fact_value TEXT NOT NULL, -- e.g., "50", "Series A"
  fact_text TEXT,           -- Full text: "Company has 50 employees"

  -- Context
  context TEXT,
  metadata JSONB DEFAULT '{}',

  -- Evidence
  source_type TEXT NOT NULL,  -- 'research_report', 'conversation', 'web_scraping', etc.
  source_id UUID,
  source_url TEXT,
  extracted_by TEXT,  -- 'ai', 'user', 'api'

  -- Quality
  confidence confidence_level DEFAULT 'medium',
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),

  -- Temporal
  fact_date TIMESTAMPTZ,      -- When the fact was true
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_current BOOLEAN DEFAULT true,

  -- Tracking
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,

  -- Indexes
  INDEX idx_knowledge_facts_org_id ON knowledge_facts(org_id),
  INDEX idx_knowledge_facts_entity_id ON knowledge_facts(entity_id),
  INDEX idx_knowledge_facts_type ON knowledge_facts(fact_type),
  INDEX idx_knowledge_facts_key ON knowledge_facts(fact_key),
  INDEX idx_knowledge_facts_current ON knowledge_facts(is_current) WHERE is_current = true
);

-- ============================================================================
-- Saved Queries and Patterns
-- ============================================================================

-- Saved knowledge graph queries
CREATE TABLE IF NOT EXISTS knowledge_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Query definition
  query_name TEXT NOT NULL,
  query_description TEXT,

  -- Query types
  query_type TEXT CHECK (query_type IN (
    'pattern_match',     -- Graph pattern matching
    'semantic_search',   -- Vector similarity
    'traversal',         -- Multi-hop graph traversal
    'aggregation',       -- Count, sum, group by
    'temporal'           -- Time-based queries
  )),

  -- Query specification
  query_pattern JSONB,  -- Pattern definition
  query_filters JSONB,  -- Filters and conditions
  query_params JSONB DEFAULT '{}',

  -- Usage
  is_public BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Tracking
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  INDEX idx_knowledge_queries_org_id ON knowledge_queries(org_id),
  INDEX idx_knowledge_queries_type ON knowledge_queries(query_type)
);

-- ============================================================================
-- Knowledge Insights - AI-generated insights
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Insight classification
  insight_type TEXT CHECK (insight_type IN (
    'pattern_detected',
    'anomaly',
    'opportunity',
    'risk',
    'recommendation',
    'trend',
    'gap',
    'connection'
  )),

  -- Insight content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),

  -- Related entities
  related_entities UUID[] DEFAULT '{}',
  related_facts UUID[] DEFAULT '{}',

  -- Evidence
  evidence JSONB DEFAULT '{}',
  confidence confidence_level DEFAULT 'medium',

  -- Impact
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
  action_required BOOLEAN DEFAULT false,
  recommended_actions JSONB DEFAULT '[]',

  -- Status
  status TEXT CHECK (status IN ('active', 'acknowledged', 'acted_upon', 'dismissed')) DEFAULT 'active',
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Indexes
  INDEX idx_knowledge_insights_org_id ON knowledge_insights(org_id),
  INDEX idx_knowledge_insights_type ON knowledge_insights(insight_type),
  INDEX idx_knowledge_insights_status ON knowledge_insights(status)
);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_knowledge_entity_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.entity_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.metadata::text, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update search vector
CREATE TRIGGER knowledge_entity_search_vector_update
  BEFORE INSERT OR UPDATE ON knowledge_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_entity_search_vector();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER knowledge_entities_updated_at
  BEFORE UPDATE ON knowledge_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

CREATE TRIGGER entity_relationships_updated_at
  BEFORE UPDATE ON entity_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

CREATE TRIGGER knowledge_facts_updated_at
  BEFORE UPDATE ON knowledge_facts
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

-- ============================================================================
-- Graph Query Functions
-- ============================================================================

-- Find related entities (1-hop)
CREATE OR REPLACE FUNCTION find_related_entities(
  p_entity_id UUID,
  p_relationship_type relationship_type DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  entity_id UUID,
  entity_name TEXT,
  entity_type entity_type,
  relationship_type relationship_type,
  relationship_strength DECIMAL,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.entity_name,
    e.entity_type,
    r.relationship_type,
    r.strength,
    r.created_at
  FROM entity_relationships r
  JOIN knowledge_entities e ON (
    (r.source_entity_id = p_entity_id AND e.id = r.target_entity_id) OR
    (r.target_entity_id = p_entity_id AND e.id = r.source_entity_id)
  )
  WHERE
    (p_relationship_type IS NULL OR r.relationship_type = p_relationship_type)
  ORDER BY r.strength DESC, r.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get entity facts
CREATE OR REPLACE FUNCTION get_entity_facts(
  p_entity_id UUID,
  p_include_historical BOOLEAN DEFAULT false
)
RETURNS TABLE (
  fact_id UUID,
  fact_type fact_type,
  fact_key TEXT,
  fact_value TEXT,
  fact_text TEXT,
  confidence confidence_level,
  fact_date TIMESTAMPTZ,
  source_type TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.fact_type,
    f.fact_key,
    f.fact_value,
    f.fact_text,
    f.confidence,
    f.fact_date,
    f.source_type,
    f.created_at
  FROM knowledge_facts f
  WHERE
    f.entity_id = p_entity_id
    AND (p_include_historical OR f.is_current = true)
  ORDER BY f.importance DESC, f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Semantic search across entities
CREATE OR REPLACE FUNCTION search_knowledge_entities(
  p_org_id UUID,
  p_query_embedding vector(1536),
  p_entity_type entity_type DEFAULT NULL,
  p_similarity_threshold FLOAT DEFAULT 0.7,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  entity_id UUID,
  entity_name TEXT,
  entity_type entity_type,
  description TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.entity_name,
    e.entity_type,
    e.description,
    1 - (e.embedding <=> p_query_embedding) as similarity
  FROM knowledge_entities e
  WHERE
    e.org_id = p_org_id
    AND e.embedding IS NOT NULL
    AND (p_entity_type IS NULL OR e.entity_type = p_entity_type)
    AND 1 - (e.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE knowledge_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_insights ENABLE ROW LEVEL SECURITY;

-- Knowledge entities policies
CREATE POLICY "Users can view their org's knowledge entities"
  ON knowledge_entities FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create knowledge entities for their org"
  ON knowledge_entities FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's knowledge entities"
  ON knowledge_entities FOR UPDATE
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Entity relationships policies
CREATE POLICY "Users can view their org's relationships"
  ON entity_relationships FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create relationships for their org"
  ON entity_relationships FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's relationships"
  ON entity_relationships FOR UPDATE
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Knowledge facts policies
CREATE POLICY "Users can view their org's facts"
  ON knowledge_facts FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create facts for their org"
  ON knowledge_facts FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's facts"
  ON knowledge_facts FOR UPDATE
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Knowledge queries policies
CREATE POLICY "Users can view their org's queries and public queries"
  ON knowledge_queries FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()) OR
    is_public = true
  );

CREATE POLICY "Users can create queries for their org"
  ON knowledge_queries FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own queries"
  ON knowledge_queries FOR UPDATE
  USING (created_by = auth.uid());

-- Knowledge insights policies
CREATE POLICY "Users can view their org's insights"
  ON knowledge_insights FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can create insights for orgs"
  ON knowledge_insights FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update insights status"
  ON knowledge_insights FOR UPDATE
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE knowledge_entities IS 'All entities (nodes) in the knowledge graph';
COMMENT ON TABLE entity_relationships IS 'Relationships (edges) between entities in the knowledge graph';
COMMENT ON TABLE knowledge_facts IS 'Atomic facts extracted about entities';
COMMENT ON TABLE knowledge_queries IS 'Saved graph queries and patterns';
COMMENT ON TABLE knowledge_insights IS 'AI-generated insights from knowledge graph';

COMMENT ON COLUMN knowledge_entities.embedding IS 'Vector embedding for semantic search (1536 dimensions)';
COMMENT ON COLUMN entity_relationships.strength IS 'Relationship strength score 0.0-1.0';
COMMENT ON COLUMN knowledge_facts.is_current IS 'Whether this fact is currently valid';
COMMENT ON COLUMN knowledge_insights.impact_score IS 'Impact score 1-10';
