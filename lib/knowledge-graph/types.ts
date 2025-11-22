/**
 * Knowledge Graph™ - Type Definitions
 * Comprehensive types for team intelligence memory system
 */

// ============================================================================
// Core Types
// ============================================================================

export type EntityType =
  | 'company'
  | 'person'
  | 'stakeholder'
  | 'buying_signal'
  | 'research_report'
  | 'meeting'
  | 'conversation'
  | 'document'
  | 'technology'
  | 'industry'
  | 'insight'
  | 'event'
  | 'deal'
  | 'product'
  | 'use_case'

export type ConfidenceLevel =
  | 'verified'      // 0.9-1.0 Human confirmed
  | 'high'          // 0.7-0.89 Multiple sources
  | 'medium'        // 0.5-0.69 Single reliable source
  | 'low'           // 0.3-0.49 Inferred
  | 'speculative'   // 0.0-0.29 AI guess

export type RelationshipType =
  // Professional relationships
  | 'works_at'
  | 'reports_to'
  | 'manages'
  | 'colleagues_with'
  // Interest and engagement
  | 'interested_in'
  | 'researched'
  | 'evaluated'
  | 'purchased'
  | 'uses'
  // Influence and advocacy
  | 'champions'
  | 'opposes'
  | 'influences'
  | 'recommends'
  // Technical relationships
  | 'built_with'
  | 'integrates_with'
  | 'competes_with'
  | 'similar_to'
  // Temporal relationships
  | 'preceded_by'
  | 'resulted_in'
  | 'triggered_by'
  // Informational
  | 'mentioned_in'
  | 'discussed_in'
  | 'related_to'
  | 'tagged_with'
  // Custom
  | 'custom'

export type FactType =
  | 'attribute'      // "Company has 50 employees"
  | 'event'          // "Company raised Series A on 2024-01-15"
  | 'opinion'        // "CTO likes AWS"
  | 'observation'    // "Website has pricing page"
  | 'intent'         // "Looking to buy CRM"
  | 'pain_point'     // "Current system is slow"
  | 'goal'           // "Want to scale to 10k users"
  | 'constraint'     // "Budget is £50k"
  | 'preference'     // "Prefers monthly billing"
  | 'relationship'   // "Sarah knows John"

// ============================================================================
// Entity Interfaces
// ============================================================================

export interface KnowledgeEntity {
  id: string
  org_id: string

  // Entity classification
  entity_type: EntityType
  entity_name: string
  entity_subtype?: string

  // Reference to actual record
  reference_type?: string
  reference_id?: string

  // Entity metadata
  description?: string
  metadata?: Record<string, unknown>

  // Embeddings for semantic search
  embedding?: number[]

  // Tracking
  confidence: ConfidenceLevel
  created_by?: string
  created_at: string
  updated_at: string
  last_verified_at?: string

  // Populated fields (not in DB)
  related_entities?: EntityRelationship[]
  facts?: KnowledgeFact[]
  fact_count?: number
  relationship_count?: number
}

export interface EntityRelationship {
  id: string
  org_id: string

  // Graph edge
  source_entity_id: string
  target_entity_id: string

  // Relationship properties
  relationship_type: RelationshipType
  relationship_label?: string

  // Relationship metadata
  properties?: Record<string, unknown>
  strength: number // 0.0-1.0
  confidence: ConfidenceLevel

  // Evidence and sources
  source_type?: string
  source_id?: string
  evidence?: string

  // Temporal
  valid_from?: string
  valid_until?: string

  // Tracking
  created_by?: string
  created_at: string
  updated_at: string
  verified: boolean
  verified_by?: string
  verified_at?: string

  // Populated fields
  source_entity?: KnowledgeEntity
  target_entity?: KnowledgeEntity
}

export interface KnowledgeFact {
  id: string
  org_id: string
  entity_id: string

  // Fact classification
  fact_type: FactType
  fact_key: string
  fact_value: string
  fact_text?: string

  // Context
  context?: string
  metadata?: Record<string, unknown>

  // Evidence
  source_type: string
  source_id?: string
  source_url?: string
  extracted_by?: 'ai' | 'user' | 'api'

  // Quality
  confidence: ConfidenceLevel
  importance: number // 1-10

  // Temporal
  fact_date?: string
  valid_from?: string
  valid_until?: string
  is_current: boolean

  // Tracking
  created_by?: string
  created_at: string
  updated_at: string
  verified: boolean
  verified_by?: string
  verified_at?: string

  // Populated fields
  entity?: KnowledgeEntity
}

// ============================================================================
// Query Types
// ============================================================================

export type QueryType =
  | 'pattern_match'     // Graph pattern matching
  | 'semantic_search'   // Vector similarity
  | 'traversal'         // Multi-hop graph traversal
  | 'aggregation'       // Count, sum, group by
  | 'temporal'          // Time-based queries

export interface KnowledgeQuery {
  id: string
  org_id: string

  // Query definition
  query_name: string
  query_description?: string
  query_type: QueryType

  // Query specification
  query_pattern?: Record<string, unknown>
  query_filters?: Record<string, unknown>
  query_params?: Record<string, unknown>

  // Usage
  is_public: boolean
  use_count: number
  last_used_at?: string

  // Tracking
  created_by?: string
  created_at: string
  updated_at: string
}

// ============================================================================
// Insight Types
// ============================================================================

export type InsightType =
  | 'pattern_detected'
  | 'anomaly'
  | 'opportunity'
  | 'risk'
  | 'recommendation'
  | 'trend'
  | 'gap'
  | 'connection'

export type InsightSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export type InsightStatus = 'active' | 'acknowledged' | 'acted_upon' | 'dismissed'

export interface KnowledgeInsight {
  id: string
  org_id: string

  // Insight classification
  insight_type: InsightType
  title: string
  description: string
  severity: InsightSeverity

  // Related entities
  related_entities: string[]
  related_facts: string[]

  // Evidence
  evidence?: Record<string, unknown>
  confidence: ConfidenceLevel

  // Impact
  impact_score: number // 1-10
  action_required: boolean
  recommended_actions?: Array<{ action: string; priority?: number; description?: string }>

  // Status
  status: InsightStatus
  acknowledged_by?: string
  acknowledged_at?: string

  // Tracking
  created_at: string
  expires_at?: string

  // Populated fields
  entities?: KnowledgeEntity[]
}

// ============================================================================
// Graph Visualization Types
// ============================================================================

export interface GraphNode {
  id: string
  label: string
  type: EntityType
  subtype?: string
  confidence: ConfidenceLevel
  metadata?: Record<string, unknown>

  // Visual properties
  size?: number
  color?: string
  icon?: string

  // Stats
  fact_count?: number
  relationship_count?: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: RelationshipType
  label?: string
  strength: number
  confidence: ConfidenceLevel

  // Visual properties
  color?: string
  width?: number
  style?: 'solid' | 'dashed' | 'dotted'
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  metadata?: {
    total_nodes: number
    total_edges: number
    node_types: Record<EntityType, number>
    relationship_types: Record<RelationshipType, number>
  }
}

// ============================================================================
// API Request/Response Types
// ============================================================================

// Entity operations
export interface CreateEntityRequest {
  entity_type: EntityType
  entity_name: string
  entity_subtype?: string
  reference_type?: string
  reference_id?: string
  description?: string
  metadata?: Record<string, unknown>
  confidence?: ConfidenceLevel
}

export interface CreateEntityResponse {
  success: boolean
  entity: KnowledgeEntity
  message?: string
}

export interface UpdateEntityRequest {
  entity_id: string
  entity_name?: string
  description?: string
  metadata?: Record<string, unknown>
  confidence?: ConfidenceLevel
}

// Relationship operations
export interface CreateRelationshipRequest {
  source_entity_id: string
  target_entity_id: string
  relationship_type: RelationshipType
  relationship_label?: string
  properties?: Record<string, unknown>
  strength?: number
  confidence?: ConfidenceLevel
  evidence?: string
}

export interface CreateRelationshipResponse {
  success: boolean
  relationship: EntityRelationship
  message?: string
}

// Fact operations
export interface CreateFactRequest {
  entity_id: string
  fact_type: FactType
  fact_key: string
  fact_value: string
  fact_text?: string
  context?: string
  source_type: string
  source_id?: string
  source_url?: string
  confidence?: ConfidenceLevel
  importance?: number
  fact_date?: string
}

export interface CreateFactResponse {
  success: boolean
  fact: KnowledgeFact
  message?: string
}

// Knowledge extraction
export interface ExtractKnowledgeRequest {
  content: string
  content_type: 'research_report' | 'conversation' | 'meeting_notes' | 'email' | 'document'
  source_id?: string
  entity_context?: {
    entity_id?: string
    entity_type?: EntityType
    entity_name?: string
  }
}

export interface ExtractedKnowledge {
  entities: Array<{
    entity_type: EntityType
    entity_name: string
    entity_subtype?: string
    description?: string
    confidence: ConfidenceLevel
  }>
  relationships: Array<{
    source_entity_name: string
    target_entity_name: string
    relationship_type: RelationshipType
    relationship_label?: string
    confidence: ConfidenceLevel
  }>
  facts: Array<{
    entity_name: string
    fact_type: FactType
    fact_key: string
    fact_value: string
    fact_text: string
    confidence: ConfidenceLevel
    importance: number
  }>
}

export interface ExtractKnowledgeResponse {
  success: boolean
  extracted: ExtractedKnowledge
  entities_created: number
  relationships_created: number
  facts_created: number
  message?: string
}

// Graph queries
export interface GraphQueryRequest {
  query: string // Natural language query
  query_type?: QueryType
  filters?: {
    entity_types?: EntityType[]
    relationship_types?: RelationshipType[]
    confidence_min?: ConfidenceLevel
    date_range?: {
      from: string
      to: string
    }
  }
  limit?: number
  include_facts?: boolean
  include_relationships?: boolean
}

export interface GraphQueryResponse {
  success: boolean
  query_interpretation?: string
  results: {
    entities: KnowledgeEntity[]
    relationships?: EntityRelationship[]
    facts?: KnowledgeFact[]
  }
  total_count: number
  query_time_ms: number
  message?: string
}

// Semantic search
export interface SemanticSearchRequest {
  query: string
  entity_type?: EntityType
  similarity_threshold?: number
  limit?: number
}

export interface SemanticSearchResponse {
  success: boolean
  results: Array<{
    entity: KnowledgeEntity
    similarity: number
    preview_facts?: KnowledgeFact[]
  }>
  total_count: number
  message?: string
}

// Entity network
export interface GetEntityNetworkRequest {
  entity_id: string
  relationship_types?: RelationshipType[]
  max_depth?: number // 1-3
  max_nodes?: number
  include_facts?: boolean
}

export interface GetEntityNetworkResponse {
  success: boolean
  central_entity: KnowledgeEntity
  graph: GraphData
  insights?: string[]
  message?: string
}

// Insights
export interface GetInsightsRequest {
  insight_types?: InsightType[]
  severity_min?: InsightSeverity
  status?: InsightStatus
  limit?: number
}

export interface GetInsightsResponse {
  success: boolean
  insights: KnowledgeInsight[]
  total_count: number
  message?: string
}

// Dashboard
export interface KnowledgeGraphDashboard {
  stats: {
    total_entities: number
    total_relationships: number
    total_facts: number
    entities_by_type: Record<EntityType, number>
    facts_by_confidence: Record<ConfidenceLevel, number>
    recent_activity: {
      entities_added_today: number
      facts_added_today: number
      relationships_added_today: number
    }
  }
  recent_insights: KnowledgeInsight[]
  top_entities: Array<{
    entity: KnowledgeEntity
    fact_count: number
    relationship_count: number
  }>
  knowledge_gaps: Array<{
    entity: KnowledgeEntity
    missing_fact_types: FactType[]
    priority: number
  }>
  recommendations: string[]
}

// ============================================================================
// Helper Types
// ============================================================================

export interface EntityWithContext extends KnowledgeEntity {
  facts: KnowledgeFact[]
  relationships: EntityRelationship[]
  insights: KnowledgeInsight[]
  knowledge_score: number // 0-100 based on completeness
}

export interface FactGroup {
  entity: KnowledgeEntity
  grouped_facts: Record<string, KnowledgeFact[]> // Grouped by fact_key
  fact_count: number
  last_updated: string
}

export interface RelationshipPath {
  entities: KnowledgeEntity[]
  relationships: EntityRelationship[]
  path_length: number
  total_strength: number
  path_description: string
}
