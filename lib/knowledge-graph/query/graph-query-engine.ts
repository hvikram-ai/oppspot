/**
 * Knowledge Graph™ - Graph Query Engine
 * Natural language queries and graph traversal
 */

import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'
import type {
  GraphQueryRequest,
  GraphQueryResponse,
  SemanticSearchRequest,
  SemanticSearchResponse,
  GetEntityNetworkRequest,
  GetEntityNetworkResponse,
  KnowledgeEntity,
  EntityRelationship,
  KnowledgeFact,
  GraphData,
  EntityType,
  RelationshipType
} from '../types'

// RPC result interfaces
interface SearchResult {
  entity_id: string
  entity_name: string
  entity_type: EntityType
  description?: string
  similarity: number
}

interface RelatedEntityResult {
  entity_id: string
  relationship_type: RelationshipType
  relationship_strength: number
}

export class GraphQueryEngine {
  /**
   * Execute natural language query against knowledge graph
   */
  static async query(
    request: GraphQueryRequest,
    userId: string
  ): Promise<GraphQueryResponse> {
    const startTime = Date.now()

    try {
      const supabase = await createClient()

      // Get user's org
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', userId)
        .single() as { data: Row<'profiles'> | null; error: unknown }

      if (!profile?.org_id) {
        return this.errorResponse('User org not found', startTime)
      }

      // Interpret natural language query
      const interpretation = await this.interpretQuery(request.query, request.filters)

      // Execute query based on interpretation
      const results = await this.executeQuery(profile.org_id, interpretation, request)

      return {
        success: true,
        query_interpretation: interpretation.description,
        results: {
          entities: results.entities,
          relationships: request.include_relationships ? results.relationships : undefined,
          facts: request.include_facts ? results.facts : undefined
        },
        total_count: results.entities.length,
        query_time_ms: Date.now() - startTime
      }
    } catch (error) {
      console.error('[GraphQueryEngine] Error:', error)
      return this.errorResponse(
        error instanceof Error ? error.message : 'Query failed',
        startTime
      )
    }
  }

  /**
   * Semantic search using vector embeddings
   */
  static async semanticSearch(
    request: SemanticSearchRequest,
    userId: string
  ): Promise<SemanticSearchResponse> {
    try {
      const supabase = await createClient()

      // Get user's org
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', userId)
        .single() as { data: Row<'profiles'> | null; error: unknown }

      if (!profile?.org_id) {
        return {
          success: false,
          results: [],
          total_count: 0,
          message: 'User org not found'
        }
      }

      // Generate embedding for search query
      const embedding = await this.generateEmbedding(request.query)

      if (!embedding) {
        return {
          success: false,
          results: [],
          total_count: 0,
          message: 'Failed to generate embedding'
        }
      }

      // Search using vector similarity
      const { data: results, error } = await supabase.rpc(
        'search_knowledge_entities',
        {
          p_org_id: profile.org_id,
          p_query_embedding: embedding,
          p_entity_type: request.entity_type,
          p_similarity_threshold: request.similarity_threshold || 0.7,
          p_limit: request.limit || 20
        }
      ) as { data: SearchResult[] | null; error: unknown }

      if (error) throw error

      // Get preview facts for each entity
      const enrichedResults = await Promise.all(
        (results || []).map(async (r) => {
          const { data: facts } = await supabase.rpc('get_entity_facts', {
            p_entity_id: r.entity_id,
            p_include_historical: false
          })

          return {
            entity: {
              id: r.entity_id,
              entity_name: r.entity_name,
              entity_type: r.entity_type,
              description: r.description
            } as KnowledgeEntity,
            similarity: r.similarity,
            preview_facts: (facts || []).slice(0, 5) as KnowledgeFact[]
          }
        })
      )

      return {
        success: true,
        results: enrichedResults,
        total_count: enrichedResults.length,
        message: `Found ${enrichedResults.length} entities matching "${request.query}"`
      }
    } catch (error) {
      console.error('[GraphQueryEngine] Semantic search error:', error)
      return {
        success: false,
        results: [],
        total_count: 0,
        message: error instanceof Error ? error.message : 'Search failed'
      }
    }
  }

  /**
   * Get entity network (relationships)
   */
  static async getEntityNetwork(
    request: GetEntityNetworkRequest,
    userId: string
  ): Promise<GetEntityNetworkResponse> {
    try {
      const supabase = await createClient()

      // Get user's org
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', userId)
        .single() as { data: Row<'profiles'> | null; error: unknown }

      if (!profile?.org_id) {
        return {
          success: false,
          central_entity: {} as KnowledgeEntity,
          graph: { nodes: [], edges: [] },
          message: 'User org not found'
        }
      }

      // Get central entity
      const { data: centralEntity } = await supabase
        .from('knowledge_entities')
        .select('*')
        .eq('id', request.entity_id)
        .eq('org_id', profile.org_id)
        .single() as { data: Row<'knowledge_entities'> | null; error: unknown }

      if (!centralEntity) {
        return {
          success: false,
          central_entity: {} as KnowledgeEntity,
          graph: { nodes: [], edges: [] },
          message: 'Entity not found'
        }
      }

      // Build network graph
      const graph = await this.buildEntityNetwork(
        profile.org_id,
        request.entity_id,
        request.relationship_types,
        request.max_depth || 1,
        request.max_nodes || 50
      )

      // Generate insights
      const insights = this.generateNetworkInsights(graph)

      return {
        success: true,
        central_entity: centralEntity,
        graph,
        insights,
        message: `Network has ${graph.nodes.length} nodes and ${graph.edges.length} relationships`
      }
    } catch (error) {
      console.error('[GraphQueryEngine] Network error:', error)
      return {
        success: false,
        central_entity: {} as KnowledgeEntity,
        graph: { nodes: [], edges: [] },
        message: error instanceof Error ? error.message : 'Network query failed'
      }
    }
  }

  /**
   * Interpret natural language query
   */
  private static async interpretQuery(
    query: string,
    filters?: GraphQueryRequest['filters']
  ): Promise<{
    query_type: 'pattern_match' | 'semantic_search' | 'traversal' | 'aggregation'
    description: string
    parameters: Record<string, unknown>
  }> {
    // Simple heuristic-based interpretation
    // In production, this would use AI for better interpretation

    const lowerQuery = query.toLowerCase()

    // Detect query type
    if (lowerQuery.includes('similar to') || lowerQuery.includes('like')) {
      return {
        query_type: 'semantic_search',
        description: 'Finding similar entities using semantic search',
        parameters: { query, filters }
      }
    }

    if (lowerQuery.includes('how many') || lowerQuery.includes('count')) {
      return {
        query_type: 'aggregation',
        description: 'Counting entities matching criteria',
        parameters: { query, filters }
      }
    }

    if (lowerQuery.includes('who knows') || lowerQuery.includes('connected to')) {
      return {
        query_type: 'traversal',
        description: 'Finding relationship paths',
        parameters: { query, filters }
      }
    }

    // Default to pattern matching
    return {
      query_type: 'pattern_match',
      description: 'Finding entities matching pattern',
      parameters: { query, filters }
    }
  }

  /**
   * Execute interpreted query
   */
  private static async executeQuery(
    orgId: string,
    interpretation: {
      query_type: string;
      description: string;
      parameters: Record<string, unknown>;
    },
    request: GraphQueryRequest
  ): Promise<{
    entities: KnowledgeEntity[]
    relationships: EntityRelationship[]
    facts: KnowledgeFact[]
  }> {
    const supabase = await createClient()

    // Build base query
    let query = supabase
      .from('knowledge_entities')
      .select('*')
      .eq('org_id', orgId)

    // Apply filters
    if (request.filters?.entity_types?.length) {
      query = query.in('entity_type', request.filters.entity_types)
    }

    if (request.filters?.confidence_min) {
      const confidenceLevels = this.getConfidenceLevelsAbove(request.filters.confidence_min)
      query = query.in('confidence', confidenceLevels)
    }

    // Limit results
    query = query.limit(request.limit || 50)

    const { data: entities, error } = await query

    if (error) throw error

    return {
      entities: entities || [],
      relationships: [],
      facts: []
    }
  }

  /**
   * Build entity network graph
   */
  private static async buildEntityNetwork(
    orgId: string,
    entityId: string,
    relationshipTypes?: RelationshipType[],
    maxDepth: number = 1,
    maxNodes: number = 50
  ): Promise<GraphData> {
    const supabase = await createClient()

    const nodes: GraphData['nodes'] = []
    const edges: GraphData['edges'] = []
    const visitedNodes = new Set<string>()

    // BFS to build network
    const queue: Array<{ id: string; depth: number }> = [{ id: entityId, depth: 0 }]

    while (queue.length > 0 && nodes.length < maxNodes) {
      const current = queue.shift()!

      if (visitedNodes.has(current.id) || current.depth > maxDepth) {
        continue
      }

      visitedNodes.add(current.id)

      // Get entity
      const { data: entityData } = await supabase
        .from('knowledge_entities')
        .select('*')
        .eq('id', current.id)
        .single()

      const entity = entityData as KnowledgeEntity | null

      if (entity) {
        nodes.push({
          id: entity.id,
          label: entity.entity_name,
          type: entity.entity_type as EntityType,
          subtype: entity.entity_subtype || undefined,
          confidence: entity.confidence,
          metadata: entity.metadata || undefined
        })
      }

      // Get relationships
      const { data: relationshipsData } = await supabase.rpc('find_related_entities', {
        p_entity_id: current.id,
        p_relationship_type: relationshipTypes?.[0] || null,
        p_limit: 20
      })

      const relationships = relationshipsData as RelatedEntityResult[] | null

      for (const rel of relationships || []) {
        edges.push({
          id: `${current.id}-${rel.entity_id}`,
          source: current.id,
          target: rel.entity_id,
          type: rel.relationship_type,
          strength: rel.relationship_strength,
          confidence: entity?.confidence || 'medium'
        })

        if (!visitedNodes.has(rel.entity_id) && current.depth < maxDepth) {
          queue.push({ id: rel.entity_id, depth: current.depth + 1 })
        }
      }
    }

    return { nodes, edges }
  }

  /**
   * Generate embedding for text
   */
  private static async generateEmbedding(text: string): Promise<number[] | null> {
    // Use Ollama for embeddings (free, local)
    try {
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: text
        })
      })

      if (!response.ok) return null

      const data = await response.json()
      return data.embedding
    } catch (error) {
      console.error('[GraphQueryEngine] Embedding error:', error)
      return null
    }
  }

  /**
   * Generate insights from network
   */
  private static generateNetworkInsights(graph: GraphData): string[] {
    const insights: string[] = []

    // Analyze network
    const nodeCount = graph.nodes.length
    const edgeCount = graph.edges.length

    insights.push(`Network contains ${nodeCount} entities and ${edgeCount} relationships`)

    // Find most connected nodes
    const connectionCounts = new Map<string, number>()
    for (const edge of graph.edges) {
      connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1)
      connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1)
    }

    const mostConnected = Array.from(connectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    if (mostConnected.length > 0) {
      const topNode = graph.nodes.find(n => n.id === mostConnected[0][0])
      if (topNode) {
        insights.push(
          `Most connected: ${topNode.label} (${mostConnected[0][1]} relationships)`
        )
      }
    }

    return insights
  }

  /**
   * Helper: Get confidence levels above threshold
   */
  private static getConfidenceLevelsAbove(min: string): string[] {
    const levels = ['verified', 'high', 'medium', 'low', 'speculative']
    const minIndex = levels.indexOf(min)
    return levels.slice(0, minIndex + 1)
  }

  /**
   * Helper: Error response
   */
  private static errorResponse(message: string, startTime: number): GraphQueryResponse {
    return {
      success: false,
      results: {
        entities: [],
        relationships: [],
        facts: []
      },
      total_count: 0,
      query_time_ms: Date.now() - startTime,
      message
    }
  }
}
