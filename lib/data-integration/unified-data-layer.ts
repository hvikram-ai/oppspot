/**
 * Unified Data Integration Layer
 * Centralized data access and integration for all data sources
 */

import { createClient } from '@/lib/supabase/server'
import { modelManager } from '@/lib/ml/infrastructure/model-manager'

export interface DataSource {
  id: string
  type: 'database' | 'api' | 'webhook' | 'file' | 'stream'
  name: string
  config: Record<string, unknown>
  status: 'active' | 'inactive' | 'error'
  lastSync?: Date
}

export interface DataQuery {
  source: string
  entity: string
  filters?: Record<string, unknown>
  fields?: string[]
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

// Transformation config interfaces
export interface MapTransformationConfig {
  mapper?: <T>(item: T) => T
}

export interface FilterTransformationConfig {
  predicate?: <T>(item: T) => boolean
}

export interface AggregateTransformationConfig {
  type?: 'count' | 'sum' | 'avg' | 'group'
  field?: string
  groupBy?: string
}

export interface JoinTransformationConfig {
  leftKey?: string
  rightKey?: string
  type?: 'inner' | 'left' | 'right' | 'outer'
}

export interface EnrichTransformationConfig {
  modelId: string
  enrichField?: string
  inputFields?: string[]
}

export type TransformationConfig =
  | MapTransformationConfig
  | FilterTransformationConfig
  | AggregateTransformationConfig
  | JoinTransformationConfig
  | EnrichTransformationConfig

export interface DataTransformation {
  id: string
  name: string
  type: 'map' | 'filter' | 'aggregate' | 'join' | 'enrich'
  config: TransformationConfig
}

// Type for generic data items
export type DataItem = Record<string, unknown>
export type DataSet = DataItem[]

export interface DataPipeline {
  id: string
  name: string
  sources: string[]
  transformations: DataTransformation[]
  destination: string
  schedule?: string // cron expression
  status: 'running' | 'stopped' | 'error'
}

export class UnifiedDataLayer {
  private dataSources: Map<string, DataSource> = new Map()
  private pipelines: Map<string, DataPipeline> = new Map()
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.initializeDataSources()
  }

  /**
   * Initialize all data sources
   */
  private initializeDataSources() {
    // Primary Database (Supabase)
    this.registerDataSource({
      id: 'supabase-primary',
      type: 'database',
      name: 'Primary Database',
      config: {
        provider: 'supabase',
        tables: [
          'businesses',
          'locations',
          'profiles',
          'lead_scores',
          'stakeholders',
          'funding_signals',
          'industry_benchmarks'
        ]
      },
      status: 'active'
    })

    // Companies House API
    this.registerDataSource({
      id: 'companies-house',
      type: 'api',
      name: 'Companies House API',
      config: {
        baseUrl: 'https://api.company-information.service.gov.uk',
        apiKey: process.env.COMPANIES_HOUSE_API_KEY,
        rateLimit: 600 // requests per 5 minutes
      },
      status: 'active'
    })

    // News API
    this.registerDataSource({
      id: 'news-api',
      type: 'api',
      name: 'News API',
      config: {
        baseUrl: 'https://newsapi.org/v2',
        apiKey: process.env.NEWS_API_KEY,
        endpoints: ['everything', 'top-headlines']
      },
      status: process.env.NEWS_API_KEY ? 'active' : 'inactive'
    })

    // OpenRouter AI
    this.registerDataSource({
      id: 'openrouter',
      type: 'api',
      name: 'OpenRouter AI',
      config: {
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY
      },
      status: 'active'
    })

    // LinkedIn Data (Future)
    this.registerDataSource({
      id: 'linkedin',
      type: 'api',
      name: 'LinkedIn API',
      config: {
        baseUrl: 'https://api.linkedin.com/v2',
        oauth: true
      },
      status: 'inactive'
    })

    // Google Places API (Future)
    this.registerDataSource({
      id: 'google-places',
      type: 'api',
      name: 'Google Places API',
      config: {
        baseUrl: 'https://maps.googleapis.com/maps/api/place',
        apiKey: process.env.GOOGLE_PLACES_API_KEY
      },
      status: 'inactive'
    })
  }

  /**
   * Register a new data source
   */
  registerDataSource(source: DataSource): void {
    this.dataSources.set(source.id, source)
  }

  /**
   * Query data from a source
   */
  async query(query: DataQuery): Promise<unknown> {
    const source = this.dataSources.get(query.source)
    if (!source) {
      throw new Error(`Data source ${query.source} not found`)
    }

    // Check cache first
    const cacheKey = this.getCacheKey(query)
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    let result: unknown

    switch (source.type) {
      case 'database':
        result = await this.queryDatabase(source, query)
        break

      case 'api':
        result = await this.queryAPI(source, query)
        break

      default:
        throw new Error(`Source type ${source.type} not implemented`)
    }

    // Cache the result
    this.setCache(cacheKey, result)

    return result
  }

  /**
   * Query database source (Supabase)
   */
  private async queryDatabase(source: DataSource, query: DataQuery): Promise<DataSet> {
    const supabase = await createClient()

    let dbQuery = supabase.from(query.entity).select(
      query.fields ? query.fields.join(',') : '*'
    )

    // Apply filters
    if (query.filters) {
      for (const [key, value] of Object.entries(query.filters)) {
        if (Array.isArray(value)) {
          dbQuery = dbQuery.in(key, value)
        } else if (value === null) {
          dbQuery = dbQuery.is(key, null)
        } else {
          dbQuery = dbQuery.eq(key, value)
        }
      }
    }

    // Apply ordering
    if (query.orderBy) {
      dbQuery = dbQuery.order(query.orderBy, {
        ascending: query.orderDirection === 'asc'
      })
    }

    // Apply pagination
    if (query.limit) {
      dbQuery = dbQuery.limit(query.limit)
    }
    if (query.offset) {
      dbQuery = dbQuery.range(query.offset, query.offset + (query.limit || 10) - 1)
    }

    const { data, error } = await dbQuery

    if (error) {
      throw new Error(`Database query error: ${error.message}`)
    }

    return data
  }

  /**
   * Query API source
   */
  private async queryAPI(source: DataSource, query: DataQuery): Promise<DataSet | DataItem> {
    const baseUrl = source.config.baseUrl
    const apiKey = source.config.apiKey

    switch (source.id) {
      case 'companies-house':
        return this.queryCompaniesHouse(baseUrl, apiKey, query)

      case 'news-api':
        return this.queryNewsAPI(baseUrl, apiKey, query)

      default:
        throw new Error(`API source ${source.id} not implemented`)
    }
  }

  /**
   * Query Companies House API
   */
  private async queryCompaniesHouse(
    baseUrl: string,
    apiKey: string,
    query: DataQuery
  ): Promise<DataSet | DataItem> {
    const endpoint = query.entity === 'search' ? '/search/companies' : `/company/${query.entity}`
    const url = new URL(`${baseUrl}${endpoint}`)

    if (query.filters?.q) {
      url.searchParams.append('q', query.filters.q)
    }
    if (query.limit) {
      url.searchParams.append('items_per_page', query.limit.toString())
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
      }
    })

    if (!response.ok) {
      throw new Error(`Companies House API error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Query News API
   */
  private async queryNewsAPI(
    baseUrl: string,
    apiKey: string,
    query: DataQuery
  ): Promise<DataSet> {
    const endpoint = query.entity || 'everything'
    const url = new URL(`${baseUrl}/${endpoint}`)

    // Add query parameters
    if (query.filters) {
      for (const [key, value] of Object.entries(query.filters)) {
        url.searchParams.append(key, value.toString())
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': apiKey
      }
    })

    if (!response.ok) {
      throw new Error(`News API error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Aggregate data from multiple sources
   */
  async aggregate(
    queries: DataQuery[],
    transformation?: DataTransformation
  ): Promise<DataSet | DataItem | number | Record<string, DataSet>> {
    const results = await Promise.all(
      queries.map(query => this.query(query))
    )

    if (!transformation) {
      return results
    }

    return this.applyTransformation(results, transformation)
  }

  /**
   * Apply transformation to data
   */
  private applyTransformation(data: DataSet | DataItem | number, transformation: DataTransformation): DataSet | DataItem | number {
    switch (transformation.type) {
      case 'map':
        return this.mapTransformation(data, transformation.config)

      case 'filter':
        return this.filterTransformation(data, transformation.config)

      case 'aggregate':
        return this.aggregateTransformation(data, transformation.config)

      case 'join':
        return this.joinTransformation(data, transformation.config)

      case 'enrich':
        return this.enrichTransformation(data, transformation.config)

      default:
        return data
    }
  }

  /**
   * Map transformation
   */
  private mapTransformation(data: DataSet | DataSet[], config: MapTransformationConfig): DataSet {
    const mapper = config.mapper || ((item: DataItem) => item)
    return (Array.isArray(data[0]) ? data.flat() : data as DataSet).map(mapper as (item: DataItem) => DataItem)
  }

  /**
   * Filter transformation
   */
  private filterTransformation(data: DataSet | DataSet[], config: FilterTransformationConfig): DataSet {
    const predicate = config.predicate || (() => true)
    const flatData = Array.isArray(data[0]) ? data.flat() : data as DataSet
    return flatData.filter(predicate as (item: DataItem) => boolean)
  }

  /**
   * Aggregate transformation
   */
  private aggregateTransformation(data: DataSet | DataSet[], config: AggregateTransformationConfig): number | Record<string, DataSet> | DataSet {
    const flat = Array.isArray(data[0]) ? data.flat() as DataSet : data as DataSet
    const aggregation = config.type || 'count'

    switch (aggregation) {
      case 'count':
        return flat.length

      case 'sum':
        return flat.reduce((sum, item) => sum + (Number(item[config.field || '']) || 0), 0)

      case 'avg':
        const sum = flat.reduce((s, item) => s + (Number(item[config.field || '']) || 0), 0)
        return flat.length > 0 ? sum / flat.length : 0

      case 'group':
        return flat.reduce((groups: Record<string, DataSet>, item) => {
          const key = String(item[config.groupBy || ''])
          groups[key] = groups[key] || []
          groups[key].push(item)
          return groups
        }, {})

      default:
        return flat
    }
  }

  /**
   * Join transformation
   */
  private joinTransformation(data: DataSet[], config: JoinTransformationConfig): DataSet {
    if (data.length < 2) return data[0] || []

    const [left, right] = data
    const leftKey = config.leftKey || 'id'
    const rightKey = config.rightKey || 'id'
    const joinType = config.type || 'inner'

    const joined: DataSet = []

    for (const leftItem of left) {
      const rightItem = right.find((r: DataItem) => r[rightKey] === leftItem[leftKey])

      if (rightItem || joinType === 'left') {
        joined.push({
          ...leftItem,
          ...(rightItem || {})
        })
      }
    }

    if (joinType === 'right' || joinType === 'outer') {
      for (const rightItem of right) {
        if (!left.find((l: DataItem) => l[leftKey] === rightItem[rightKey])) {
          joined.push(rightItem)
        }
      }
    }

    return joined
  }

  /**
   * Enrich transformation using ML models
   */
  private async enrichTransformation(data: DataSet | DataSet[], config: EnrichTransformationConfig): Promise<DataSet> {
    const modelId = config.modelId
    const enrichField = config.enrichField || 'enrichment'

    const enriched = []

    for (const item of data.flat()) {
      try {
        const prediction = await modelManager.predict(modelId, item)
        enriched.push({
          ...item,
          [enrichField]: prediction.output
        })
      } catch (error) {
        console.error('[DataLayer] Enrichment error:', error)
        enriched.push(item)
      }
    }

    return enriched
  }

  /**
   * Create a data pipeline
   */
  createPipeline(pipeline: DataPipeline): void {
    this.pipelines.set(pipeline.id, pipeline)
  }

  /**
   * Execute a data pipeline
   */
  async executePipeline(pipelineId: string): Promise<DataSet | DataItem | number | Record<string, DataSet>> {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`)
    }

    // Query all sources
    const sourceData = await Promise.all(
      pipeline.sources.map(sourceId => {
        const [source, entity] = sourceId.split('.')
        return this.query({
          source,
          entity
        })
      })
    )

    // Apply transformations
    let result = sourceData
    for (const transformation of pipeline.transformations) {
      result = await this.applyTransformation(result, transformation)
    }

    // Save to destination if specified
    if (pipeline.destination) {
      await this.saveToDestination(result, pipeline.destination)
    }

    return result
  }

  /**
   * Save data to destination
   */
  private async saveToDestination(data: DataSet | DataItem | number | Record<string, DataSet>, destination: string): Promise<void> {
    const [source, entity] = destination.split('.')

    if (source === 'supabase-primary') {
      const supabase = await createClient()
      await supabase.from(entity).insert(data)
    } else {
      console.warn(`Destination ${destination} not implemented`)
    }
  }

  /**
   * Get unified company profile from multiple sources
   */
  async getUnifiedCompanyProfile(companyId: string): Promise<DataItem> {
    // Aggregate data from multiple sources
    const [
      businessData,
      leadScore,
      stakeholders,
      fundingSignals,
      benchmark
    ] = await Promise.all([
      this.query({
        source: 'supabase-primary',
        entity: 'businesses',
        filters: { id: companyId }
      }),
      this.query({
        source: 'supabase-primary',
        entity: 'lead_scores',
        filters: { company_id: companyId }
      }),
      this.query({
        source: 'supabase-primary',
        entity: 'stakeholders',
        filters: { company_id: companyId }
      }),
      this.query({
        source: 'supabase-primary',
        entity: 'funding_signals',
        filters: { company_id: companyId },
        orderBy: 'announcement_date',
        orderDirection: 'desc',
        limit: 5
      }),
      this.query({
        source: 'supabase-primary',
        entity: 'company_benchmark_comparisons',
        filters: { company_id: companyId },
        orderBy: 'comparison_date',
        orderDirection: 'desc',
        limit: 1
      })
    ])

    return {
      company: businessData?.[0],
      scoring: leadScore?.[0],
      stakeholders,
      funding: fundingSignals,
      benchmark: benchmark?.[0],
      unified_at: new Date().toISOString()
    }
  }

  /**
   * Cache management
   */
  private getCacheKey(query: DataQuery): string {
    return `${query.source}:${query.entity}:${JSON.stringify(query.filters || {})}`
  }

  private getFromCache(key: string): unknown {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })

    // Clean old cache entries
    if (this.cache.size > 100) {
      const oldestKey = Array.from(this.cache.keys())[0]
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Get data source status
   */
  getDataSourceStatus(): DataSource[] {
    return Array.from(this.dataSources.values())
  }
}

// Export singleton instance
export const dataLayer = new UnifiedDataLayer()