/**
 * Company Analysis Service
 * Provides comprehensive analysis of companies including financial health, risk assessment, and strategic fit
 */

import {
  ICompanyAnalysisService,
  IDataSourceProvider,
  ICacheService,
  CompanyEntity,
  ScanConfiguration,
  IndustrySelection,
  RegionSelection
} from '../../core/interfaces'

// ==========================================
// ANALYSIS RESULT TYPES
// ==========================================

export interface CompanyAnalysisResult {
  overallScore: number
  financialHealth: FinancialHealthResult
  riskAssessment: RiskAssessmentResult
  strategicFit: StrategicFitResult
  marketPosition: MarketPositionResult
  analysisDate: Date
  confidence: number
}

export interface FinancialHealthResult {
  score: number
  metrics: Record<string, unknown>
  indicators: string[]
  concerns: string[]
}

export interface RiskFactor {
  category: 'regulatory' | 'operational' | 'financial' | 'market'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: number
  likelihood: number
}

export interface RiskAssessmentResult {
  overallRiskScore: number
  riskLevel: 'low' | 'moderate' | 'high' | 'critical'
  riskFactors: RiskFactor[]
  mitigationStrategies: string[]
  redFlags: string[]
}

export interface AlignmentFactor {
  category: string
  score: number
  description: string
  weight: number
}

export interface StrategicFitResult {
  score: number
  alignmentFactors: AlignmentFactor[]
  synergyOpportunities: string[]
  integrationComplexity: 'low' | 'medium' | 'high' | 'very_high'
}

export interface MarketPositionResult {
  competitivePosition: 'weak' | 'moderate' | 'strong' | 'dominant'
  marketShare: number
  growthPotential: number
  competitiveAdvantages: string[]
  threats: string[]
}

export class CompanyAnalysisService implements ICompanyAnalysisService {
  private readonly analysisTimeout = 30000 // 30 seconds per company

  constructor(
    private readonly dataSources: Map<string, IDataSourceProvider>,
    private readonly cacheService: ICacheService
  ) {}

  async analyzeCompanies(
    companies: CompanyEntity[],
    configuration: ScanConfiguration,
    progressCallback?: (progress: number) => void
  ): Promise<CompanyAnalysisResult[]> {
    const results: CompanyAnalysisResult[] = []
    const totalCompanies = companies.length
    let completedCompanies = 0

    // Process companies in parallel batches
    const batchSize = 10
    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize)

      const batchPromises = batch.map(async (company) => {
        try {
          const analysis = await this.analyzeCompanyWithConfig(company, configuration)
          completedCompanies++
          progressCallback?.(completedCompanies / totalCompanies * 100)
          return analysis
        } catch (error) {
          console.error(`Error analyzing company ${company.id}:`, error)
          completedCompanies++
          progressCallback?.(completedCompanies / totalCompanies * 100)
          return null
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)

      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value)
        }
      }
    }

    return results
  }

  // Interface implementation - delegates to full implementation with basic config
  async analyzeCompany(company: any): Promise<any> {
    // Create a basic configuration for the analysis
    const basicConfig: ScanConfiguration = {
      id: 'basic-analysis',
      userId: 'system',
      name: 'Basic Analysis',
      selectedIndustries: [],
      selectedRegions: [],
      dataSources: [],
      scanDepth: 'basic',
      requiredCapabilities: []
    }
    return this.analyzeCompanyWithConfig(company, basicConfig)
  }

  async analyzeCompanyWithConfig(
    company: CompanyEntity,
    configuration: ScanConfiguration
  ): Promise<CompanyAnalysisResult> {
    // Check cache first
    const cacheKey = `analysis:${company.id}:${this.getConfigHash(configuration)}`
    const cachedResult = await this.cacheService.get<CompanyAnalysisResult>(cacheKey)
    
    if (cachedResult) {
      return cachedResult
    }

    // Perform comprehensive analysis
    const [financialHealth, riskAssessment, strategicFit, marketPosition] = await Promise.all([
      this.analyzeFinancialHealth(company),
      this.assessRisk(company, configuration),
      this.analyzeStrategicFit(company, configuration),
      this.analyzeMarketPosition(company)
    ])

    const overallScore = this.calculateOverallScore(
      financialHealth,
      riskAssessment,
      strategicFit,
      marketPosition
    )

    const result: CompanyAnalysisResult = {
      overallScore,
      financialHealth,
      riskAssessment,
      strategicFit,
      marketPosition,
      analysisDate: new Date(),
      confidence: this.calculateAnalysisConfidence(company, financialHealth, riskAssessment)
    }

    // Cache result for 24 hours
    await this.cacheService.set(cacheKey, result, 86400)

    return result
  }

  private async analyzeFinancialHealth(company: CompanyEntity): Promise<FinancialHealthResult> {
    const metrics: Record<string, unknown> = {}
    const indicators: string[] = []
    const concerns: string[] = []

    // Revenue analysis
    if (company.revenueEstimate) {
      if (company.revenueEstimate > 10000000) { // £10M+
        indicators.push('Strong revenue base')
        metrics.revenueGrowth = 15 // Mock growth rate
      } else if (company.revenueEstimate < 1000000) { // < £1M
        concerns.push('Limited revenue scale')
      }
    } else {
      concerns.push('Revenue information not available')
    }

    // Company age analysis
    if (company.foundingYear) {
      const currentYear = new Date().getFullYear()
      const age = currentYear - company.foundingYear
      if (age > 10) {
        indicators.push('Established business with market presence')
      } else if (age < 2) {
        concerns.push('Early-stage company with limited track record')
      }
    }

    // Employee count analysis
    if (company.employeeCount) {
      const empCount = this.parseEmployeeCount(company.employeeCount)
      if (empCount > 100) {
        indicators.push('Substantial workforce indicating scale')
        metrics.profitabilityScore = 75
      } else if (empCount < 10) {
        concerns.push('Limited workforce may indicate scaling challenges')
        metrics.profitabilityScore = 45
      } else {
        metrics.profitabilityScore = 60
      }
    }

    // Calculate financial health score
    let score = 50 // Base score
    score += indicators.length * 10
    score -= concerns.length * 15
    score = Math.max(0, Math.min(100, score))

    return {
      score,
      metrics,
      indicators,
      concerns
    }
  }

  private async assessRisk(
    company: CompanyEntity,
    configuration: ScanConfiguration
  ): Promise<RiskAssessmentResult> {
    const riskFactors: RiskFactor[] = []
    const redFlags: string[] = []
    const mitigationStrategies: string[] = []

    // Industry risk assessment
    const highRiskIndustries = ['cryptocurrency', 'gambling', 'adult-entertainment']
    const isHighRiskIndustry = company.industryCodes.some(code =>
      highRiskIndustries.some(risk => code.toLowerCase().includes(risk))
    )

    if (isHighRiskIndustry) {
      riskFactors.push({
        category: 'regulatory' as const,
        severity: 'high' as const,
        description: 'Operating in heavily regulated or high-risk industry',
        impact: 80,
        likelihood: 70
      })
      mitigationStrategies.push('Enhanced due diligence on regulatory compliance')
    }

    // Geographic risk
    const highRiskCountries = ['sanctioned-countries'] // Mock list
    if (highRiskCountries.includes(company.country.toLowerCase())) {
      riskFactors.push({
        category: 'regulatory' as const,
        severity: 'critical' as const,
        description: 'Operating in high-risk jurisdiction',
        impact: 95,
        likelihood: 90
      })
      redFlags.push('Company based in sanctioned or high-risk country')
    }

    // Financial risk indicators
    if (!company.website) {
      riskFactors.push({
        category: 'operational' as const,
        severity: 'medium' as const,
        description: 'No web presence indicates limited digital footprint',
        impact: 40,
        likelihood: 60
      })
    }

    // Check for low confidence (using confidenceScore directly)
    if (company.confidenceScore < 0.5) {
      riskFactors.push({
        category: 'operational' as const,
        severity: 'medium' as const,
        description: 'Low data confidence may indicate limited transparency',
        impact: 50,
        likelihood: 70
      })
      mitigationStrategies.push('Additional verification of company information required')
    }

    // Calculate overall risk score
    let riskScore = 20 // Base low risk
    riskScore += riskFactors.reduce((sum, factor) => sum + (factor.impact * factor.likelihood / 100), 0) / riskFactors.length || 0

    const riskLevel = this.determineRiskLevel(riskScore)

    return {
      overallRiskScore: Math.min(100, riskScore),
      riskLevel,
      riskFactors,
      mitigationStrategies,
      redFlags
    }
  }

  private async analyzeStrategicFit(
    company: CompanyEntity,
    configuration: ScanConfiguration
  ): Promise<StrategicFitResult> {
    const alignmentFactors: AlignmentFactor[] = []
    const synergyOpportunities: string[] = []

    // Industry alignment
    const targetIndustries = configuration.selectedIndustries.map((i: IndustrySelection) => i.sicCode)
    const industryOverlap = company.industryCodes.filter(code =>
      targetIndustries.includes(code)
    ).length

    if (industryOverlap > 0) {
      alignmentFactors.push({
        category: 'Industry Alignment',
        score: Math.min(100, industryOverlap * 30),
        description: `${industryOverlap} industry code(s) match target criteria`,
        weight: 0.3
      })
      synergyOpportunities.push('Direct industry synergies available')
    }

    // Geographic alignment
    const targetRegions = configuration.selectedRegions.map((r: RegionSelection) => r.country)
    const isInTargetRegion = targetRegions.includes(company.country)

    if (isInTargetRegion) {
      alignmentFactors.push({
        category: 'Geographic Fit',
        score: 80,
        description: 'Company located in target market region',
        weight: 0.2
      })
      synergyOpportunities.push('Geographic market synergies')
    }

    // Size compatibility
    if (company.employeeCount) {
      const empCount = this.parseEmployeeCount(company.employeeCount)
      let sizeScore = 50

      if (empCount >= 50 && empCount <= 500) {
        sizeScore = 85 // Sweet spot for acquisition
        synergyOpportunities.push('Optimal size for integration and growth')
      } else if (empCount > 1000) {
        sizeScore = 40 // May be too large for smooth integration
      }

      alignmentFactors.push({
        category: 'Size Compatibility',
        score: sizeScore,
        description: `${empCount} employees indicates ${sizeScore > 70 ? 'good' : 'moderate'} size fit`,
        weight: 0.25
      })
    }

    // Technology/digital presence
    if (company.website) {
      alignmentFactors.push({
        category: 'Digital Presence',
        score: 70,
        description: 'Company has established web presence',
        weight: 0.15
      })
      synergyOpportunities.push('Digital transformation opportunities')
    }

    // Calculate weighted strategic fit score
    const weightedScore = alignmentFactors.reduce(
      (sum, factor) => sum + (factor.score * factor.weight), 0
    )
    
    const integrationComplexity = this.assessIntegrationComplexity(company)

    return {
      score: Math.round(weightedScore),
      alignmentFactors,
      synergyOpportunities,
      integrationComplexity
    }
  }

  private async analyzeMarketPosition(company: CompanyEntity): Promise<MarketPositionResult> {
    // Mock market position analysis - in real implementation would use external data
    const competitiveAdvantages: string[] = []
    const threats: string[] = []

    // Check if company is established (founded more than 5 years ago)
    const currentYear = new Date().getFullYear()
    const isEstablished = company.foundingYear && (currentYear - company.foundingYear) > 5

    if (isEstablished) {
      competitiveAdvantages.push('Established market presence')
    }

    if (company.website) {
      competitiveAdvantages.push('Digital presence and accessibility')
    } else {
      threats.push('Limited digital presence may affect competitiveness')
    }

    // Mock values - in real implementation would calculate from market data
    return {
      competitivePosition: 'moderate' as const,
      marketShare: 5, // Mock percentage
      growthPotential: 70, // Mock score
      competitiveAdvantages,
      threats
    }
  }

  private calculateOverallScore(
    financial: FinancialHealthResult,
    risk: RiskAssessmentResult,
    strategic: StrategicFitResult,
    market: MarketPositionResult
  ): number {
    const weights = {
      financial: 0.3,
      risk: 0.25,
      strategic: 0.3,
      market: 0.15
    }

    const riskAdjustedScore = Math.max(0, 100 - risk.overallRiskScore)
    
    const weightedScore = 
      (financial.score * weights.financial) +
      (riskAdjustedScore * weights.risk) +
      (strategic.score * weights.strategic) +
      (market.growthPotential * weights.market)

    return Math.round(weightedScore)
  }

  private calculateAnalysisConfidence(
    company: CompanyEntity,
    financial: FinancialHealthResult,
    risk: RiskAssessmentResult
  ): number {
    let confidence = company.confidenceScore * 100 // Base on data confidence
    
    // Adjust based on available data
    if (company.revenueEstimate) confidence += 10
    if (company.employeeCount) confidence += 10
    if (company.website) confidence += 5
    if (company.address) confidence += 5
    
    // Adjust based on analysis quality
    if (financial.concerns.length === 0) confidence += 10
    if (risk.redFlags.length === 0) confidence += 10
    
    return Math.min(100, confidence)
  }

  private parseEmployeeCount(employeeCount: string): number {
    // Parse various employee count formats
    const match = employeeCount.match(/(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  private determineRiskLevel(score: number): 'low' | 'moderate' | 'high' | 'critical' {
    if (score < 25) return 'low'
    if (score < 50) return 'moderate'
    if (score < 75) return 'high'
    return 'critical'
  }

  private assessIntegrationComplexity(company: CompanyEntity): 'low' | 'medium' | 'high' | 'very_high' {
    const empCount = company.employeeCount ? this.parseEmployeeCount(company.employeeCount) : 0
    
    if (empCount < 50) return 'low'
    if (empCount < 200) return 'medium'
    if (empCount < 1000) return 'high'
    return 'very_high'
  }

  private getConfigHash(configuration: ScanConfiguration): string {
    return Buffer.from(JSON.stringify({
      industries: configuration.selectedIndustries,
      regions: configuration.selectedRegions,
      scanDepth: configuration.scanDepth
    })).toString('base64').substring(0, 16)
  }
}