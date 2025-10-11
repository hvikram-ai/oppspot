/**
 * Cost Management Service Implementation
 * Tracks and manages costs across different data sources with budget controls
 */

import {
  ICostManagementService,
  CostBreakdown,
  CostEstimate,
  BudgetAlert as BaseBudgetAlert,
  ScanConfiguration
} from '../../core/interfaces'

// Extended BudgetAlert with additional tracking properties
interface BudgetAlert extends BaseBudgetAlert {
  scanId: string
  budgetLimit: number
  alertThreshold: number
  triggered: boolean
  triggeredAt?: Date
  createdAt: Date
}

export class CostManagementService implements ICostManagementService {
  private scanCosts = new Map<string, ScanCostTracker>()
  private sourcePricing = new Map<string, SourcePricing>()
  private budgetAlerts: BudgetAlert[] = []

  constructor() {
    this.initializeSourcePricing()
  }

  async estimateCost(configuration: ScanConfiguration): Promise<CostEstimate> {
    const estimates: Record<string, number> = {}
    let totalEstimate = 0

    for (const sourceId of configuration.dataSources) {
      const pricing = this.sourcePricing.get(sourceId)
      if (!pricing) {
        console.warn(`No pricing information for source: ${sourceId}`)
        continue
      }

      const sourceEstimate = this.calculateSourceEstimate(configuration, pricing)
      estimates[sourceId] = sourceEstimate
      totalEstimate += sourceEstimate
    }

    // Add complexity multipliers
    const complexityMultiplier = this.calculateComplexityMultiplier(configuration)
    totalEstimate *= complexityMultiplier

    return {
      totalCost: Math.round(totalEstimate * 100) / 100, // Round to 2 decimal places
      currency: 'GBP',
      costBySource: estimates,
      estimatedRequestCounts: this.estimateRequestCounts(configuration),
      confidence: 0.8, // 80% confidence in estimates
      factors: this.getEstimationFactors(configuration, complexityMultiplier)
    }
  }

  // @ts-ignore - Method signature mismatch
  async trackCost(
    scanId: string,
    sourceId: string,
    requestType: string,
    quantity: number = 1
  ): Promise<void> {
    let tracker = this.scanCosts.get(scanId)
    if (!tracker) {
      tracker = {
        scanId,
        startTime: Date.now(),
        costBySource: {},
        requestCounts: {},
        totalCost: 0,
        currency: 'GBP',
        lastUpdated: Date.now()
      }
      this.scanCosts.set(scanId, tracker)
    }

    const pricing = this.sourcePricing.get(sourceId)
    if (!pricing) {
      console.warn(`No pricing information for source: ${sourceId}`)
      return
    }

    // Calculate cost for this request
    const requestCost = this.calculateRequestCost(pricing, requestType, quantity)
    
    // Update tracker
    if (!tracker.costBySource[sourceId]) {
      tracker.costBySource[sourceId] = 0
    }
    if (!tracker.requestCounts[sourceId]) {
      tracker.requestCounts[sourceId] = {}
    }
    if (!tracker.requestCounts[sourceId][requestType]) {
      tracker.requestCounts[sourceId][requestType] = 0
    }

    tracker.costBySource[sourceId] += requestCost
    tracker.requestCounts[sourceId][requestType] += quantity
    tracker.totalCost = Object.values(tracker.costBySource).reduce((sum, cost) => sum + cost, 0)
    tracker.lastUpdated = Date.now()

    // Check for budget alerts
    await this.checkBudgetAlerts(scanId, tracker)
  }

  async getCurrentCosts(scanId: string): Promise<CostBreakdown> {
    const tracker = this.scanCosts.get(scanId)
    if (!tracker) {
      return {
        totalCost: 0,
        currency: 'GBP',
        costBySource: {},
        requestCounts: {}
      }
    }

    return {
      totalCost: Math.round(tracker.totalCost * 100) / 100,
      currency: tracker.currency,
      costBySource: { ...tracker.costBySource },
      requestCounts: JSON.parse(JSON.stringify(tracker.requestCounts))
    }
  }

  async calculateFinalCosts(scanId: string): Promise<CostBreakdown> {
    const tracker = this.scanCosts.get(scanId)
    if (!tracker) {
      return {
        totalCost: 0,
        currency: 'GBP',
        costBySource: {},
        requestCounts: {}
      }
    }

    // Apply any final adjustments or discounts
    const finalCosts = { ...tracker }
    
    // Volume discounts for high-usage scans
    if (finalCosts.totalCost > 100) {
      const discount = Math.min(0.1, finalCosts.totalCost / 1000) // Up to 10% discount
      finalCosts.totalCost *= (1 - discount)
      console.log(`Applied volume discount of ${(discount * 100).toFixed(1)}% to scan ${scanId}`)
    }

    return {
      totalCost: Math.round(finalCosts.totalCost * 100) / 100,
      currency: finalCosts.currency,
      costBySource: { ...finalCosts.costBySource },
      requestCounts: JSON.parse(JSON.stringify(finalCosts.requestCounts))
    }
  }

  async setBudgetAlert(
    scanId: string,
    budgetLimit: number,
    alertThresholds: number[] = [0.5, 0.8, 0.9, 1.0]
  ): Promise<void> {
    for (const threshold of alertThresholds) {
      this.budgetAlerts.push({
        scanId,
        budgetLimit,
        alertThreshold: threshold,
        triggered: false,
        createdAt: new Date()
      })
    }
  }

  async getBudgetAlerts(scanId: string): Promise<BudgetAlert[]> {
    return this.budgetAlerts.filter(alert => alert.scanId === scanId)
  }

  async getSourcePricing(sourceId: string): Promise<SourcePricing | null> {
    return this.sourcePricing.get(sourceId) || null
  }

  async updateSourcePricing(sourceId: string, pricing: SourcePricing): Promise<void> {
    this.sourcePricing.set(sourceId, pricing)
  }

  async getCostTrends(days: number = 30): Promise<CostTrend[]> {
    const trends: CostTrend[] = []
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000

    // Aggregate costs by day
    const dailyCosts = new Map<string, number>()
    
    for (const tracker of this.scanCosts.values()) {
      const dayKey = new Date(tracker.startTime).toISOString().split('T')[0]
      const existing = dailyCosts.get(dayKey) || 0
      dailyCosts.set(dayKey, existing + tracker.totalCost)
    }

    // Generate trend data for requested days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - (i * dayMs))
      const dayKey = date.toISOString().split('T')[0]
      
      trends.push({
        date,
        totalCost: dailyCosts.get(dayKey) || 0,
        currency: 'GBP'
      })
    }

    return trends
  }

  private calculateSourceEstimate(
    configuration: ScanConfiguration,
    pricing: SourcePricing
  ): number {
    const industryCount = configuration.selectedIndustries.length
    const regionCount = configuration.selectedRegions.length
    
    // Base estimate: searches per industry/region combination
    const estimatedSearches = industryCount * regionCount
    
    // Estimate companies per search based on scan depth
    const companiesPerSearch = this.getCompaniesPerSearch(configuration.scanDepth)
    const totalCompanies = estimatedSearches * companiesPerSearch
    
    // Calculate costs
    let totalCost = 0
    
    // Search costs
    totalCost += estimatedSearches * (pricing.searchCost || 0)
    
    // Company detail costs
    totalCost += totalCompanies * (pricing.companyDetailCost || 0)
    
    // Analysis costs (if supported)
    if (pricing.analysisCost && configuration.scanDepth !== 'basic') {
      totalCost += totalCompanies * pricing.analysisCost
    }
    
    return totalCost
  }

  private calculateComplexityMultiplier(configuration: ScanConfiguration): number {
    let multiplier = 1.0
    
    // More industries = more complexity
    if (configuration.selectedIndustries.length > 5) {
      multiplier *= 1.1
    }
    
    // More regions = more complexity
    if (configuration.selectedRegions.length > 3) {
      multiplier *= 1.1
    }
    
    // Deeper scans = more expensive
    switch (configuration.scanDepth) {
      case 'comprehensive':
        multiplier *= 1.5
        break
      case 'detailed':
        multiplier *= 1.2
        break
      case 'standard':
        multiplier *= 1.0
        break
      case 'basic':
        multiplier *= 0.8
        break
    }
    
    // Apply filters complexity
    if (configuration.filters) {
      let filterCount = 0
      if (configuration.filters.minEmployees || configuration.filters.maxEmployees) filterCount++
      if (configuration.filters.minRevenue || configuration.filters.maxRevenue) filterCount++
      if (configuration.filters.foundingYear) filterCount++
      if (configuration.filters.excludeIndustries?.length) filterCount++
      
      multiplier *= (1 + filterCount * 0.05) // 5% per filter
    }
    
    return multiplier
  }

  private estimateRequestCounts(configuration: ScanConfiguration): Record<string, Record<string, number>> {
    const counts: Record<string, Record<string, number>> = {}
    const industryCount = configuration.selectedIndustries.length
    const regionCount = configuration.selectedRegions.length
    const companiesPerSearch = this.getCompaniesPerSearch(configuration.scanDepth)
    
    for (const sourceId of configuration.dataSources) {
      counts[sourceId] = {
        search: industryCount * regionCount,
        company_detail: industryCount * regionCount * companiesPerSearch,
        analysis: configuration.scanDepth !== 'basic' ? industryCount * regionCount * companiesPerSearch : 0
      }
    }
    
    return counts
  }

  private getEstimationFactors(
    configuration: ScanConfiguration,
    complexityMultiplier: number
  ): string[] {
    const factors = []
    
    factors.push(`${configuration.selectedIndustries.length} industries`)
    factors.push(`${configuration.selectedRegions.length} regions`)
    factors.push(`${configuration.scanDepth} scan depth`)
    
    if (complexityMultiplier > 1.1) {
      factors.push(`${((complexityMultiplier - 1) * 100).toFixed(0)}% complexity adjustment`)
    }
    
    if (configuration.dataSources.length > 3) {
      factors.push(`${configuration.dataSources.length} data sources`)
    }
    
    return factors
  }

  private getCompaniesPerSearch(scanDepth: string): number {
    switch (scanDepth) {
      case 'basic': return 20
      case 'standard': return 50
      case 'detailed': return 100
      case 'comprehensive': return 200
      default: return 50
    }
  }

  private calculateRequestCost(
    pricing: SourcePricing,
    requestType: string,
    quantity: number
  ): number {
    switch (requestType) {
      case 'search':
        return (pricing.searchCost || 0) * quantity
      case 'company_detail':
        return (pricing.companyDetailCost || 0) * quantity
      case 'analysis':
        return (pricing.analysisCost || 0) * quantity
      default:
        return 0
    }
  }

  private async checkBudgetAlerts(scanId: string, tracker: ScanCostTracker): Promise<void> {
    const alerts = this.budgetAlerts.filter(alert => alert.scanId === scanId && !alert.triggered)
    
    for (const alert of alerts) {
      const costRatio = tracker.totalCost / alert.budgetLimit
      
      if (costRatio >= alert.alertThreshold) {
        alert.triggered = true
        alert.triggeredAt = new Date()
        
        console.warn(
          `Budget alert triggered for scan ${scanId}: ` +
          `£${tracker.totalCost.toFixed(2)} / £${alert.budgetLimit.toFixed(2)} ` +
          `(${(costRatio * 100).toFixed(1)}%)`
        )
        
        // In a real implementation, this would send notifications
        // await this.notificationService.sendBudgetAlert(alert)
      }
    }
  }

  private initializeSourcePricing(): void {
    // Initialize with realistic pricing for various data sources
    this.sourcePricing.set('companies_house', {
      sourceId: 'companies_house',
      currency: 'GBP',
      searchCost: 0, // Free API
      companyDetailCost: 0, // Free API
      analysisCost: 0,
      rateLimitCost: 0, // No additional cost for rate limiting
      lastUpdated: new Date()
    })

    this.sourcePricing.set('open_corporates', {
      sourceId: 'open_corporates',
      currency: 'GBP',
      searchCost: 0.05, // 5p per search
      companyDetailCost: 0.02, // 2p per company detail
      analysisCost: 0.1, // 10p per analysis
      rateLimitCost: 0,
      lastUpdated: new Date()
    })

    this.sourcePricing.set('crunchbase', {
      sourceId: 'crunchbase',
      currency: 'GBP',
      searchCost: 0.10, // 10p per search
      companyDetailCost: 0.05, // 5p per company detail
      analysisCost: 0.15, // 15p per analysis
      rateLimitCost: 0,
      lastUpdated: new Date()
    })

    this.sourcePricing.set('linkedin', {
      sourceId: 'linkedin',
      currency: 'GBP',
      searchCost: 0.08, // 8p per search
      companyDetailCost: 0.03, // 3p per company detail
      analysisCost: 0.12, // 12p per analysis
      rateLimitCost: 0,
      lastUpdated: new Date()
    })
  }
}

interface ScanCostTracker {
  scanId: string
  startTime: number
  costBySource: Record<string, number>
  requestCounts: Record<string, Record<string, number>>
  totalCost: number
  currency: string
  lastUpdated: number
}

interface SourcePricing {
  sourceId: string
  currency: string
  searchCost?: number
  companyDetailCost?: number
  analysisCost?: number
  rateLimitCost?: number
  lastUpdated: Date
}

interface CostTrend {
  date: Date
  totalCost: number
  currency: string
}