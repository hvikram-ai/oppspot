/**
 * Data Source Factory
 * Centralized factory for creating and managing data source integrations
 */

import { getErrorMessage } from '@/lib/utils/error-handler'
import CompaniesHouseAPI from './companies-house-api'
import IrishCROAPI from './irish-cro-api'
import { CompanyData } from '../scanning-engine'

export interface DataSource {
  id: string
  name: string
  description: string
  regions: string[]
  dataTypes: string[]
  costPerRequest: number
  reliability: number
  rateLimit: {
    requestsPerSecond: number
    requestsPerMinute: number
  }
  requiresApiKey: boolean
}

export interface DataSourceResult {
  source: string
  companies: CompanyData[]
  metadata: {
    total_results: number
    confidence: number
    cost: number
    processing_time: number
    search_parameters: Record<string, unknown>
    rate_limit_remaining?: number
    errors?: string[]
  }
}

export class DataSourceFactory {
  private sources: Map<string, unknown> = new Map()
  private configs: Map<string, DataSource> = new Map()

  constructor() {
    this.initializeDataSources()
  }

  private initializeDataSources() {
    // Companies House UK
    this.configs.set('companies_house', {
      id: 'companies_house',
      name: 'Companies House UK',
      description: 'Official UK company registry with comprehensive company data',
      regions: ['England', 'Wales', 'Scotland', 'Northern Ireland'],
      dataTypes: ['company_details', 'officers', 'filings', 'financial_indicators'],
      costPerRequest: 0, // Free API
      reliability: 0.98,
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 600
      },
      requiresApiKey: true
    })

    // Irish CRO
    this.configs.set('irish_cro', {
      id: 'irish_cro',
      name: 'Irish Companies Registration Office',
      description: 'Irish company registry data (via web scraping)',
      regions: ['Ireland'],
      dataTypes: ['company_details', 'directors', 'share_capital'],
      costPerRequest: 2, // Estimated cost for scraping services
      reliability: 0.85,
      rateLimit: {
        requestsPerSecond: 1,
        requestsPerMinute: 50
      },
      requiresApiKey: false
    })

    // Financial Data Provider (Placeholder)
    this.configs.set('financial_data', {
      id: 'financial_data',
      name: 'Financial Intelligence Provider',
      description: 'Enhanced financial data from credit agencies',
      regions: ['UK', 'Ireland', 'EU'],
      dataTypes: ['financial_statements', 'credit_ratings', 'payment_behavior'],
      costPerRequest: 25,
      reliability: 0.92,
      rateLimit: {
        requestsPerSecond: 2,
        requestsPerMinute: 100
      },
      requiresApiKey: true
    })

    // Digital Footprint Analyzer (Placeholder)
    this.configs.set('digital_footprint', {
      id: 'digital_footprint',
      name: 'Digital Footprint Analyzer',
      description: 'Web presence, SEO, and social media analysis',
      regions: ['Global'],
      dataTypes: ['website_analysis', 'seo_metrics', 'social_presence'],
      costPerRequest: 10,
      reliability: 0.75,
      rateLimit: {
        requestsPerSecond: 1,
        requestsPerMinute: 30
      },
      requiresApiKey: true
    })

    // Patents & IP Data (Placeholder)
    this.configs.set('patents_ip', {
      id: 'patents_ip',
      name: 'Patents & IP Intelligence',
      description: 'Patent portfolios, trademarks, and IP analysis',
      regions: ['UK', 'EU', 'Global'],
      dataTypes: ['patents', 'trademarks', 'ip_strength'],
      costPerRequest: 8,
      reliability: 0.90,
      rateLimit: {
        requestsPerSecond: 2,
        requestsPerMinute: 60
      },
      requiresApiKey: true
    })

    // News & Media Intelligence (Placeholder)
    this.configs.set('news_media', {
      id: 'news_media',
      name: 'News & Media Intelligence',
      description: 'News sentiment, media coverage, and reputation analysis',
      regions: ['Global'],
      dataTypes: ['news_sentiment', 'media_coverage', 'reputation_score'],
      costPerRequest: 5,
      reliability: 0.80,
      rateLimit: {
        requestsPerSecond: 3,
        requestsPerMinute: 150
      },
      requiresApiKey: true
    })

    // Employee Intelligence (Placeholder)
    this.configs.set('employee_data', {
      id: 'employee_data',
      name: 'Employee Intelligence',
      description: 'Employee count, LinkedIn data, and talent analysis',
      regions: ['Global'],
      dataTypes: ['employee_count', 'linkedin_data', 'talent_analysis'],
      costPerRequest: 15,
      reliability: 0.70,
      rateLimit: {
        requestsPerSecond: 1,
        requestsPerMinute: 25
      },
      requiresApiKey: true
    })
  }

  /**
   * Get data source instance
   */
  getDataSource(sourceId: string): unknown {
    if (this.sources.has(sourceId)) {
      return this.sources.get(sourceId)
    }

    let sourceInstance: unknown
    
    switch (sourceId) {
      case 'companies_house':
        sourceInstance = new CompaniesHouseAPI()
        break
      
      case 'irish_cro':
        sourceInstance = new IrishCROAPI()
        break
      
      case 'financial_data':
        sourceInstance = new FinancialDataAPI()
        break
      
      case 'digital_footprint':
        sourceInstance = new DigitalFootprintAPI()
        break
      
      case 'patents_ip':
        sourceInstance = new PatentsIPAPI()
        break
      
      case 'news_media':
        sourceInstance = new NewsMediaAPI()
        break
      
      case 'employee_data':
        sourceInstance = new EmployeeDataAPI()
        break
      
      default:
        throw new Error(`Unknown data source: ${sourceId}`)
    }

    this.sources.set(sourceId, sourceInstance)
    return sourceInstance
  }

  /**
   * Get data source configuration
   */
  getDataSourceConfig(sourceId: string): DataSource | undefined {
    return this.configs.get(sourceId)
  }

  /**
   * Get all available data sources
   */
  getAvailableDataSources(): DataSource[] {
    return Array.from(this.configs.values())
  }

  /**
   * Get data sources available for specific regions
   */
  getDataSourcesForRegions(regions: string[]): DataSource[] {
    return Array.from(this.configs.values()).filter(source =>
      regions.some(region => 
        source.regions.includes(region) || source.regions.includes('Global')
      )
    )
  }

  /**
   * Estimate total cost for a scan
   */
  estimateScanCost(dataSources: string[], estimatedRequests: number): {
    totalCost: number
    costBreakdown: Array<{
      source: string
      requests: number
      costPerRequest: number
      totalCost: number
    }>
    currency: string
  } {
    const costBreakdown = dataSources.map(sourceId => {
      const config = this.configs.get(sourceId)
      if (!config) {
        return {
          source: sourceId,
          requests: 0,
          costPerRequest: 0,
          totalCost: 0
        }
      }

      const requestsForSource = Math.ceil(estimatedRequests / dataSources.length)
      return {
        source: sourceId,
        requests: requestsForSource,
        costPerRequest: config.costPerRequest,
        totalCost: requestsForSource * config.costPerRequest
      }
    })

    const totalCost = costBreakdown.reduce((sum, item) => sum + item.totalCost, 0)

    return {
      totalCost,
      costBreakdown,
      currency: 'GBP'
    }
  }

  /**
   * Test connectivity to all configured data sources
   */
  async testAllConnections(): Promise<{
    results: Array<{
      sourceId: string
      success: boolean
      message: string
      responseTime: number
    }>
    overallHealth: 'healthy' | 'degraded' | 'critical'
  }> {
    const results = []
    const sourceIds = Array.from(this.configs.keys())

    for (const sourceId of sourceIds) {
      const startTime = Date.now()
      try {
        const source = this.getDataSource(sourceId)
        
        // Test connection if method exists
        if ((source as any).testConnection) {
          const result = await (source as any).testConnection()
          results.push({
            sourceId,
            success: result.success,
            message: result.message,
            responseTime: Date.now() - startTime
          })
        } else {
          results.push({
            sourceId,
            success: true,
            message: 'Source available (no test method)',
            responseTime: Date.now() - startTime
          })
        }
      } catch (error) {
        results.push({
          sourceId,
          success: false,
          message: `Connection failed: ${getErrorMessage(error)}`,
          responseTime: Date.now() - startTime
        })
      }
    }

    // Determine overall health
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    const successRate = successCount / totalCount

    let overallHealth: 'healthy' | 'degraded' | 'critical'
    if (successRate >= 0.8) {
      overallHealth = 'healthy'
    } else if (successRate >= 0.5) {
      overallHealth = 'degraded'
    } else {
      overallHealth = 'critical'
    }

    return {
      results,
      overallHealth
    }
  }

  /**
   * Execute search across multiple data sources
   */
  async executeMultiSourceSearch(params: {
    dataSources: string[]
    searchCriteria: {
      industries?: Array<{ sic_code: string; industry: string }>
      regions?: string[]
      minIncorporationYear?: number
      maxIncorporationYear?: number
      companyTypes?: string[]
    }
    maxResultsPerSource?: number
  }): Promise<{
    results: DataSourceResult[]
    summary: {
      totalCompanies: number
      totalCost: number
      averageConfidence: number
      sourcesUsed: string[]
      processingTime: number
    }
  }> {
    const startTime = Date.now()
    const results: DataSourceResult[] = []

    for (const sourceId of params.dataSources) {
      try {
        console.log(`Executing search on ${sourceId}...`)
        
        const source = this.getDataSource(sourceId)
        const config = this.getDataSourceConfig(sourceId)
        
        if (!config) {
          console.error(`No configuration found for source: ${sourceId}`)
          continue
        }

        let sourceResult: DataSourceResult

        // Execute source-specific search logic
        if (sourceId === 'companies_house') {
          sourceResult = await this.executeCompaniesHouseSearch(source, params.searchCriteria, params.maxResultsPerSource)
        } else if (sourceId === 'irish_cro') {
          sourceResult = await this.executeIrishCROSearch(source, params.searchCriteria, params.maxResultsPerSource)
        } else {
          // For other sources, use simulated search
          sourceResult = await this.executeSimulatedSearch(sourceId, params.searchCriteria, params.maxResultsPerSource)
        }

        results.push(sourceResult)

        // Add delay between sources to respect rate limits
        await this.delay(500)
      } catch (error) {
        console.error(`Search failed for source ${sourceId}:`, error)
        
        // Add error result
        results.push({
          source: sourceId,
          companies: [],
          metadata: {
            total_results: 0,
            confidence: 0,
            cost: 0,
            processing_time: Date.now() - startTime,
            search_parameters: params.searchCriteria,
            errors: [getErrorMessage(error)]
          }
        })
      }
    }

    // Calculate summary
    const totalCompanies = results.reduce((sum, result) => sum + result.companies.length, 0)
    const totalCost = results.reduce((sum, result) => sum + result.metadata.cost, 0)
    const averageConfidence = results.length > 0 
      ? results.reduce((sum, result) => sum + result.metadata.confidence, 0) / results.length
      : 0

    return {
      results,
      summary: {
        totalCompanies,
        totalCost,
        averageConfidence,
        sourcesUsed: params.dataSources,
        processingTime: Date.now() - startTime
      }
    }
  }

  // Private helper methods

  private async executeCompaniesHouseSearch(
    source: CompaniesHouseAPI, 
    criteria: Record<string, unknown>, 
    maxResults?: number
  ): Promise<DataSourceResult> {
    const startTime = Date.now()
    
    const searchResult = await source.searchAcquisitionTargets({
      industries: criteria.industries || [],
      minIncorporationYear: criteria.minIncorporationYear,
      maxIncorporationYear: criteria.maxIncorporationYear,
      companyTypes: criteria.companyTypes,
      itemsPerPage: maxResults || 100
    })

    const companies = searchResult.companies.map(company => ({
      name: company.company_name,
      registration_number: company.company_number,
      country: 'UK',
      industry_codes: company.sic_codes || [],
      website: undefined,
      description: `${company.company_type} - ${company.company_status}`,
      employee_count: undefined,
      revenue_estimate: undefined,
      founding_year: new Date(company.date_of_creation).getFullYear(),
      address: company.registered_office_address,
      phone: undefined,
      email: undefined,
      confidence_score: 0.95,
      source_metadata: {
        source: 'companies_house',
        company_status: company.company_status,
        company_type: company.company_type,
        discovered_at: new Date().toISOString()
      }
    }))

    return {
      source: 'companies_house',
      companies,
      metadata: {
        total_results: searchResult.totalResults,
        confidence: 0.95,
        cost: 0, // Free API
        processing_time: Date.now() - startTime,
        search_parameters: criteria
      }
    }
  }

  private async executeIrishCROSearch(
    source: IrishCROAPI, 
    criteria: Record<string, unknown>, 
    maxResults?: number
  ): Promise<DataSourceResult> {
    const startTime = Date.now()
    
    const searchResult = await source.searchAcquisitionTargets({
      industries: criteria.industries?.map(i => i.industry) || [],
      minIncorporationYear: criteria.minIncorporationYear,
      maxIncorporationYear: criteria.maxIncorporationYear,
      companyTypes: criteria.companyTypes,
      pageSize: maxResults || 50
    })

    const companies = searchResult.companies.map(company => 
      source.convertToStandardFormat(company)
    )

    return {
      source: 'irish_cro',
      companies,
      metadata: {
        total_results: searchResult.totalResults,
        confidence: 0.85,
        cost: companies.length * 2, // €2 per company
        processing_time: Date.now() - startTime,
        search_parameters: criteria
      }
    }
  }

  private async executeSimulatedSearch(
    sourceId: string, 
    criteria: Record<string, unknown>, 
    maxResults?: number
  ): Promise<DataSourceResult> {
    const startTime = Date.now()
    const config = this.getDataSourceConfig(sourceId)!
    
    // Simulate processing time
    await this.delay(Math.random() * 2000 + 1000)

    // Generate simulated companies
    const companyCount = Math.min(maxResults || 30, Math.floor(Math.random() * 20) + 5)
    const companies: CompanyData[] = []

    for (let i = 0; i < companyCount; i++) {
      companies.push({
        name: `${sourceId.replace('_', ' ')} Company ${i + 1}`,
        registration_number: Math.random().toString(36).substr(2, 8).toUpperCase(),
        country: config.regions[0] === 'Global' ? 'UK' : config.regions[0],
        industry_codes: ['62020'],
        website: `https://company${i + 1}.com`,
        description: `Company found via ${config.name}`,
        employee_count: '11-50',
        revenue_estimate: Math.floor(Math.random() * 5000000) + 500000,
        founding_year: 2010 + Math.floor(Math.random() * 14),
        address: { street: '123 Business St', city: 'London', country: 'UK' },
        confidence_score: Math.random() * 0.3 + 0.5, // 0.5 to 0.8
        source_metadata: {
          source: sourceId,
          discovered_at: new Date().toISOString(),
          simulated: true
        }
      })
    }

    return {
      source: sourceId,
      companies,
      metadata: {
        total_results: companyCount,
        confidence: config.reliability,
        cost: companyCount * config.costPerRequest,
        processing_time: Date.now() - startTime,
        search_parameters: criteria
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Placeholder classes for future implementation
class FinancialDataAPI {
  async testConnection() {
    return { success: true, message: 'Financial data API simulated' }
  }
}

class DigitalFootprintAPI {
  async testConnection() {
    return { success: true, message: 'Digital footprint API simulated' }
  }
}

class PatentsIPAPI {
  async testConnection() {
    return { success: true, message: 'Patents IP API simulated' }
  }
}

class NewsMediaAPI {
  async testConnection() {
    return { success: true, message: 'News media API simulated' }
  }
}

class EmployeeDataAPI {
  async testConnection() {
    return { success: true, message: 'Employee data API simulated' }
  }
}

export default DataSourceFactory