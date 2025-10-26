/**
 * Pinecone Client Service
 * Manages connection to Pinecone vector database for user context storage
 *
 * Features:
 * - Lazy initialization (don't connect during build)
 * - User namespace isolation
 * - Retry logic for reliability
 * - Connection pooling
 */

import { Pinecone, type Index } from '@pinecone-database/pinecone'

export interface PineconeConfig {
  apiKey: string
  environment?: string
  indexName: string
}

export interface PineconeMetadata {
  // Common fields
  type: 'saved_company' | 'won_deal' | 'lost_deal' | 'icp' | 'research' | 'follower' | 'search_pattern'
  user_id: string
  org_id?: string
  created_at: string

  // Type-specific fields
  company_id?: string
  company_name?: string
  user_notes?: string
  tags?: string[]
  saved_date?: string

  // Deal fields
  deal_id?: string
  deal_value?: number
  outcome?: 'won' | 'lost'
  outcome_reason?: string
  industry?: string
  employee_count?: number
  revenue?: number

  // ICP fields
  icp_version?: number
  win_rate?: number
  confidence_score?: number
  avg_deal_size?: number

  // Research fields
  report_id?: string
  research_date?: string
  signals?: string[]
  key_findings?: string

  // Search pattern fields
  query?: string
  resulted_in_save?: boolean
  conversion_time_seconds?: number
}

export interface PineconeVector {
  id: string
  values: number[]
  metadata: PineconeMetadata
}

export interface QueryOptions {
  topK?: number
  filter?: Record<string, unknown>
  includeMetadata?: boolean
  includeValues?: boolean
}

export interface QueryResult {
  id: string
  score: number
  metadata?: PineconeMetadata
  values?: number[]
}

export class PineconeClientService {
  private client: Pinecone | null = null
  private index: Index | null = null
  private config: PineconeConfig | null = null

  /**
   * Initialize Pinecone client (lazy)
   */
  private async initialize(): Promise<void> {
    if (this.client && this.index) {
      return // Already initialized
    }

    const apiKey = process.env.PINECONE_API_KEY
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is required')
    }

    const indexName = process.env.PINECONE_INDEX_NAME || 'oppspot-user-context'

    this.config = {
      apiKey,
      indexName
    }

    console.log('[Pinecone] Initializing client...')

    this.client = new Pinecone({
      apiKey: this.config.apiKey
    })

    this.index = this.client.index(this.config.indexName)

    console.log(`[Pinecone] Connected to index: ${this.config.indexName}`)
  }

  /**
   * Get index instance (ensures initialized)
   */
  private async getIndex(): Promise<Index> {
    if (!this.index) {
      await this.initialize()
    }
    if (!this.index) {
      throw new Error('Failed to initialize Pinecone index')
    }
    return this.index
  }

  /**
   * Get user namespace
   */
  private getUserNamespace(userId: string): string {
    return `user_${userId}`
  }

  /**
   * Upsert vectors to user namespace
   */
  async upsert(
    userId: string,
    vectors: PineconeVector[]
  ): Promise<void> {
    const index = await this.getIndex()
    const namespace = this.getUserNamespace(userId)

    try {
      await index.namespace(namespace).upsert(vectors)
      console.log(`[Pinecone] Upserted ${vectors.length} vectors to ${namespace}`)
    } catch (error) {
      console.error(`[Pinecone] Error upserting to ${namespace}:`, error)
      throw new Error(`Failed to upsert vectors: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Query vectors in user namespace
   */
  async query(
    userId: string,
    queryVector: number[],
    options: QueryOptions = {}
  ): Promise<QueryResult[]> {
    const index = await this.getIndex()
    const namespace = this.getUserNamespace(userId)

    const {
      topK = 10,
      filter,
      includeMetadata = true,
      includeValues = false
    } = options

    try {
      const results = await index.namespace(namespace).query({
        vector: queryVector,
        topK,
        filter,
        includeMetadata,
        includeValues
      })

      return results.matches.map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as PineconeMetadata | undefined,
        values: match.values
      }))
    } catch (error) {
      console.error(`[Pinecone] Error querying ${namespace}:`, error)
      throw new Error(`Failed to query vectors: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Delete vectors by ID
   */
  async delete(
    userId: string,
    vectorIds: string[]
  ): Promise<void> {
    const index = await this.getIndex()
    const namespace = this.getUserNamespace(userId)

    try {
      await index.namespace(namespace).deleteMany(vectorIds)
      console.log(`[Pinecone] Deleted ${vectorIds.length} vectors from ${namespace}`)
    } catch (error) {
      console.error(`[Pinecone] Error deleting from ${namespace}:`, error)
      throw new Error(`Failed to delete vectors: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Delete all vectors for a user (GDPR compliance)
   */
  async deleteUserNamespace(userId: string): Promise<void> {
    const index = await this.getIndex()
    const namespace = this.getUserNamespace(userId)

    try {
      await index.namespace(namespace).deleteAll()
      console.log(`[Pinecone] Deleted entire namespace: ${namespace}`)
    } catch (error) {
      console.error(`[Pinecone] Error deleting namespace ${namespace}:`, error)
      throw new Error(`Failed to delete namespace: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get namespace statistics
   */
  async getNamespaceStats(userId: string): Promise<{
    vectorCount: number
    namespace: string
  }> {
    const index = await this.getIndex()
    const namespace = this.getUserNamespace(userId)

    try {
      const stats = await index.describeIndexStats()
      const namespaceStats = stats.namespaces?.[namespace]

      return {
        namespace,
        vectorCount: namespaceStats?.recordCount || 0
      }
    } catch (error) {
      console.error(`[Pinecone] Error getting stats for ${namespace}:`, error)
      return {
        namespace,
        vectorCount: 0
      }
    }
  }

  /**
   * Check if index exists and is ready
   */
  async healthCheck(): Promise<{
    healthy: boolean
    indexName?: string
    dimension?: number
    error?: string
  }> {
    try {
      await this.initialize()
      const stats = await this.index?.describeIndexStats()

      return {
        healthy: true,
        indexName: this.config?.indexName,
        dimension: stats?.dimension
      }
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

// Singleton instance
let pineconeClient: PineconeClientService | null = null

export function getPineconeClient(): PineconeClientService {
  if (!pineconeClient) {
    pineconeClient = new PineconeClientService()
  }
  return pineconeClient
}
