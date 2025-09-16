/**
 * SimilarityScoringService: MnA-focused company similarity scoring algorithms
 * Implements sophisticated scoring models for merger and acquisition analysis
 * Built for enterprise-grade decision making with explainable AI principles
 */

import {
  MnABenchmarkScores,
  MnABenchmarkEntity,
  MnAParameterWeights,
  ParameterScore,
  SimilarityConfiguration,
  CompanyEntity,
  MnAFinancialProfile,
  MnAStrategicProfile,
  MnAOperationalProfile,
  MnAMarketProfile,
  MnARiskProfile,
  ConfidenceLevel
} from '../core/similarity-interfaces'

interface ScoringContext {
  targetCompany: CompanyEntity
  candidateCompany: CompanyEntity
  targetBenchmark: MnABenchmarkEntity
  candidateBenchmark: MnABenchmarkEntity
  configuration: SimilarityConfiguration
}

interface NormalizedMetrics {
  financial: Record<string, number>
  strategic: Record<string, number>
  operational: Record<string, number>
  market: Record<string, number>
  risk: Record<string, number>
}

interface ScoringExplanation {
  category: string
  score: number
  factors: Array<{
    metric: string
    similarity: number
    weight: number
    explanation: string
  }>
}

export class SimilarityScoringService {
  private readonly defaultWeights: MnAParameterWeights = {
    financial: 0.30,
    strategic: 0.25,
    operational: 0.20,
    market: 0.15,
    risk: 0.10
  }

  /**
   * Calculate comprehensive MnA similarity scores
   */
  async calculateSimilarityScores(context: ScoringContext): Promise<{
    scores: MnABenchmarkScores
    explanations: ScoringExplanation[]
    overallScore: number
    confidence: ConfidenceLevel
  }> {
    const weights = context.configuration.parameterWeights || this.defaultWeights
    
    // Calculate individual category scores
    const financialScore = await this.calculateFinancialSimilarity(context)
    const strategicScore = await this.calculateStrategicSimilarity(context)
    const operationalScore = await this.calculateOperationalSimilarity(context)
    const marketScore = await this.calculateMarketSimilarity(context)
    const riskScore = await this.calculateRiskSimilarity(context)

    // Create comprehensive score object
    const scores: MnABenchmarkScores = {
      financial: financialScore,
      strategic: strategicScore,
      operational: operationalScore,
      market: marketScore,
      risk: riskScore,
      overall: this.calculateWeightedOverallScore({
        financial: financialScore.score,
        strategic: strategicScore.score,
        operational: operationalScore.score,
        market: marketScore.score,
        risk: riskScore.score
      }, weights)
    }

    // Generate explanations for each category
    const explanations = await this.generateScoringExplanations(context, scores)
    
    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(scores)

    return {
      scores,
      explanations,
      overallScore: scores.overall,
      confidence
    }
  }

  /**
   * Financial similarity scoring (30% weight)
   * Considers revenue, profitability, growth, debt, and valuation metrics
   */
  private async calculateFinancialSimilarity(context: ScoringContext): Promise<ParameterScore> {
    const { targetBenchmark, candidateBenchmark } = context
    const targetFinancial = targetBenchmark.financialProfile
    const candidateFinancial = candidateBenchmark.financialProfile

    if (!targetFinancial || !candidateFinancial) {
      return {
        score: 50, // Default moderate score when data is limited
        confidence: 0.3,
        contributingFactors: ['Limited financial data available'],
        dataPoints: 0
      }
    }

    const factors: Array<{ metric: string; similarity: number; weight: number }> = []

    // Revenue size similarity (25% of financial score)
    const revenueSimilarity = this.calculateRevenueSimilarity(targetFinancial, candidateFinancial)
    factors.push({ metric: 'Revenue Size', similarity: revenueSimilarity, weight: 0.25 })

    // Profitability similarity (20% of financial score)
    const profitabilitySimilarity = this.calculateProfitabilitySimilarity(targetFinancial, candidateFinancial)
    factors.push({ metric: 'Profitability', similarity: profitabilitySimilarity, weight: 0.20 })

    // Growth trajectory similarity (20% of financial score)
    const growthSimilarity = this.calculateGrowthSimilarity(targetFinancial, candidateFinancial)
    factors.push({ metric: 'Growth Trajectory', similarity: growthSimilarity, weight: 0.20 })

    // Debt profile similarity (15% of financial score)
    const debtSimilarity = this.calculateDebtSimilarity(targetFinancial, candidateFinancial)
    factors.push({ metric: 'Debt Profile', similarity: debtSimilarity, weight: 0.15 })

    // Valuation metrics similarity (10% of financial score)
    const valuationSimilarity = this.calculateValuationSimilarity(targetFinancial, candidateFinancial)
    factors.push({ metric: 'Valuation Multiples', similarity: valuationSimilarity, weight: 0.10 })

    // Cash flow similarity (10% of financial score)
    const cashFlowSimilarity = this.calculateCashFlowSimilarity(targetFinancial, candidateFinancial)
    factors.push({ metric: 'Cash Flow Patterns', similarity: cashFlowSimilarity, weight: 0.10 })

    // Calculate weighted financial score
    const score = factors.reduce((sum, factor) => sum + (factor.similarity * factor.weight), 0) * 100
    
    // Calculate confidence based on data availability
    const confidence = this.calculateFinancialConfidence(targetFinancial, candidateFinancial)

    // Generate contributing factors description
    const contributingFactors = factors
      .filter(f => f.similarity > 0.7) // High similarity factors
      .map(f => `Strong ${f.metric.toLowerCase()} alignment`)

    return {
      score: Math.round(score * 100) / 100,
      confidence,
      contributingFactors,
      dataPoints: factors.length
    }
  }

  /**
   * Strategic similarity scoring (25% weight)
   * Considers market position, geographic presence, customer base, and competitive advantages
   */
  private async calculateStrategicSimilarity(context: ScoringContext): Promise<ParameterScore> {
    const { targetBenchmark, candidateBenchmark } = context
    const targetStrategic = targetBenchmark.strategicProfile
    const candidateStrategic = candidateBenchmark.strategicProfile

    if (!targetStrategic || !candidateStrategic) {
      return {
        score: 50,
        confidence: 0.3,
        contributingFactors: ['Limited strategic data available'],
        dataPoints: 0
      }
    }

    const factors: Array<{ metric: string; similarity: number; weight: number }> = []

    // Market position similarity (30% of strategic score)
    const marketPositionSimilarity = this.calculateMarketPositionSimilarity(targetStrategic, candidateStrategic)
    factors.push({ metric: 'Market Position', similarity: marketPositionSimilarity, weight: 0.30 })

    // Geographic presence similarity (25% of strategic score)
    const geographicSimilarity = this.calculateGeographicSimilarity(targetStrategic, candidateStrategic)
    factors.push({ metric: 'Geographic Presence', similarity: geographicSimilarity, weight: 0.25 })

    // Customer base similarity (20% of strategic score)
    const customerBaseSimilarity = this.calculateCustomerBaseSimilarity(targetStrategic, candidateStrategic)
    factors.push({ metric: 'Customer Base', similarity: customerBaseSimilarity, weight: 0.20 })

    // Technology alignment (15% of strategic score)
    const technologySimilarity = this.calculateTechnologySimilarity(targetStrategic, candidateStrategic)
    factors.push({ metric: 'Technology Alignment', similarity: technologySimilarity, weight: 0.15 })

    // Distribution channels similarity (10% of strategic score)
    const distributionSimilarity = this.calculateDistributionSimilarity(targetStrategic, candidateStrategic)
    factors.push({ metric: 'Distribution Channels', similarity: distributionSimilarity, weight: 0.10 })

    const score = factors.reduce((sum, factor) => sum + (factor.similarity * factor.weight), 0) * 100
    const confidence = this.calculateStrategicConfidence(targetStrategic, candidateStrategic)
    
    const contributingFactors = factors
      .filter(f => f.similarity > 0.7)
      .map(f => `Aligned ${f.metric.toLowerCase()}`)

    return {
      score: Math.round(score * 100) / 100,
      confidence,
      contributingFactors,
      dataPoints: factors.length
    }
  }

  /**
   * Operational similarity scoring (20% weight)
   * Considers business model, scale, regulatory complexity, and operational efficiency
   */
  private async calculateOperationalSimilarity(context: ScoringContext): Promise<ParameterScore> {
    const { targetBenchmark, candidateBenchmark } = context
    const targetOperational = targetBenchmark.operationalProfile
    const candidateOperational = candidateBenchmark.operationalProfile

    if (!targetOperational || !candidateOperational) {
      return {
        score: 50,
        confidence: 0.3,
        contributingFactors: ['Limited operational data available'],
        dataPoints: 0
      }
    }

    const factors: Array<{ metric: string; similarity: number; weight: number }> = []

    // Business model similarity (35% of operational score)
    const businessModelSimilarity = this.calculateBusinessModelSimilarity(targetOperational, candidateOperational)
    factors.push({ metric: 'Business Model', similarity: businessModelSimilarity, weight: 0.35 })

    // Operational scale similarity (25% of operational score)
    const scaleSimilarity = this.calculateScaleSimilarity(targetOperational, candidateOperational)
    factors.push({ metric: 'Operational Scale', similarity: scaleSimilarity, weight: 0.25 })

    // Regulatory complexity similarity (20% of operational score)
    const regulatorySimilarity = this.calculateRegulatorySimilarity(targetOperational, candidateOperational)
    factors.push({ metric: 'Regulatory Environment', similarity: regulatorySimilarity, weight: 0.20 })

    // Operational efficiency similarity (20% of operational score)
    const efficiencySimilarity = this.calculateEfficiencySimilarity(targetOperational, candidateOperational)
    factors.push({ metric: 'Operational Efficiency', similarity: efficiencySimilarity, weight: 0.20 })

    const score = factors.reduce((sum, factor) => sum + (factor.similarity * factor.weight), 0) * 100
    const confidence = this.calculateOperationalConfidence(targetOperational, candidateOperational)
    
    const contributingFactors = factors
      .filter(f => f.similarity > 0.7)
      .map(f => `Similar ${f.metric.toLowerCase()}`)

    return {
      score: Math.round(score * 100) / 100,
      confidence,
      contributingFactors,
      dataPoints: factors.length
    }
  }

  /**
   * Market similarity scoring (15% weight)
   * Considers industry dynamics, competitive landscape, and growth potential
   */
  private async calculateMarketSimilarity(context: ScoringContext): Promise<ParameterScore> {
    const { targetBenchmark, candidateBenchmark } = context
    const targetMarket = targetBenchmark.marketProfile
    const candidateMarket = candidateBenchmark.marketProfile

    if (!targetMarket || !candidateMarket) {
      return {
        score: 50,
        confidence: 0.3,
        contributingFactors: ['Limited market data available'],
        dataPoints: 0
      }
    }

    const factors: Array<{ metric: string; similarity: number; weight: number }> = []

    // Industry vertical similarity (40% of market score)
    const industrySimilarity = this.calculateIndustrySimilarity(targetMarket, candidateMarket)
    factors.push({ metric: 'Industry Vertical', similarity: industrySimilarity, weight: 0.40 })

    // Market maturity similarity (25% of market score)
    const maturitySimilarity = this.calculateMaturitySimilarity(targetMarket, candidateMarket)
    factors.push({ metric: 'Market Maturity', similarity: maturitySimilarity, weight: 0.25 })

    // Competitive intensity similarity (20% of market score)
    const competitiveSimilarity = this.calculateCompetitiveSimilarity(targetMarket, candidateMarket)
    factors.push({ metric: 'Competitive Landscape', similarity: competitiveSimilarity, weight: 0.20 })

    // Growth potential similarity (15% of market score)
    const growthPotentialSimilarity = this.calculateGrowthPotentialSimilarity(targetMarket, candidateMarket)
    factors.push({ metric: 'Growth Potential', similarity: growthPotentialSimilarity, weight: 0.15 })

    const score = factors.reduce((sum, factor) => sum + (factor.similarity * factor.weight), 0) * 100
    const confidence = this.calculateMarketConfidence(targetMarket, candidateMarket)
    
    const contributingFactors = factors
      .filter(f => f.similarity > 0.7)
      .map(f => `Comparable ${f.metric.toLowerCase()}`)

    return {
      score: Math.round(score * 100) / 100,
      confidence,
      contributingFactors,
      dataPoints: factors.length
    }
  }

  /**
   * Risk similarity scoring (10% weight)
   * Considers regulatory, operational, financial, and integration risks
   */
  private async calculateRiskSimilarity(context: ScoringContext): Promise<ParameterScore> {
    const { targetBenchmark, candidateBenchmark } = context
    const targetRisk = targetBenchmark.riskProfile
    const candidateRisk = candidateBenchmark.riskProfile

    if (!targetRisk || !candidateRisk) {
      return {
        score: 50,
        confidence: 0.3,
        contributingFactors: ['Limited risk data available'],
        dataPoints: 0
      }
    }

    const factors: Array<{ metric: string; similarity: number; weight: number }> = []

    // Regulatory risk similarity (30% of risk score)
    const regulatoryRiskSimilarity = this.calculateRegulatoryRiskSimilarity(targetRisk, candidateRisk)
    factors.push({ metric: 'Regulatory Risk', similarity: regulatoryRiskSimilarity, weight: 0.30 })

    // Integration complexity similarity (25% of risk score)
    const integrationRiskSimilarity = this.calculateIntegrationRiskSimilarity(targetRisk, candidateRisk)
    factors.push({ metric: 'Integration Complexity', similarity: integrationRiskSimilarity, weight: 0.25 })

    // ESG risk similarity (20% of risk score)
    const esgRiskSimilarity = this.calculateESGRiskSimilarity(targetRisk, candidateRisk)
    factors.push({ metric: 'ESG Risk Profile', similarity: esgRiskSimilarity, weight: 0.20 })

    // Technology risk similarity (15% of risk score)
    const techRiskSimilarity = this.calculateTechnologyRiskSimilarity(targetRisk, candidateRisk)
    factors.push({ metric: 'Technology Risk', similarity: techRiskSimilarity, weight: 0.15 })

    // Geopolitical risk similarity (10% of risk score)
    const geoRiskSimilarity = this.calculateGeopoliticalRiskSimilarity(targetRisk, candidateRisk)
    factors.push({ metric: 'Geopolitical Risk', similarity: geoRiskSimilarity, weight: 0.10 })

    const score = factors.reduce((sum, factor) => sum + (factor.similarity * factor.weight), 0) * 100
    const confidence = this.calculateRiskConfidence(targetRisk, candidateRisk)
    
    const contributingFactors = factors
      .filter(f => f.similarity > 0.7)
      .map(f => `Similar ${f.metric.toLowerCase()}`)

    return {
      score: Math.round(score * 100) / 100,
      confidence,
      contributingFactors,
      dataPoints: factors.length
    }
  }

  // Financial similarity calculation methods

  private calculateRevenueSimilarity(target: MnAFinancialProfile, candidate: MnAFinancialProfile): number {
    if (!target.estimatedRevenue || !candidate.estimatedRevenue) return 0.5

    const targetRev = target.estimatedRevenue
    const candidateRev = candidate.estimatedRevenue
    
    // Calculate similarity based on revenue ratio (closer to 1.0 = more similar)
    const ratio = Math.min(targetRev, candidateRev) / Math.max(targetRev, candidateRev)
    
    // Apply logarithmic scaling to handle large differences
    const logSimilarity = 1 - Math.abs(Math.log10(targetRev) - Math.log10(candidateRev)) / 3
    
    return Math.max(0, Math.min(1, (ratio + logSimilarity) / 2))
  }

  private calculateProfitabilitySimilarity(target: MnAFinancialProfile, candidate: MnAFinancialProfile): number {
    const metrics = ['ebitdaMargin', 'netProfitMargin', 'grossMargin', 'operatingMargin']
    let totalSimilarity = 0
    let validMetrics = 0

    for (const metric of metrics) {
      const targetValue = target.profitabilityMetrics?.[metric as keyof typeof target.profitabilityMetrics]
      const candidateValue = candidate.profitabilityMetrics?.[metric as keyof typeof candidate.profitabilityMetrics]

      if (targetValue !== undefined && candidateValue !== undefined) {
        // Calculate similarity for margin metrics (closer margins = higher similarity)
        const difference = Math.abs(targetValue - candidateValue)
        const similarity = Math.max(0, 1 - difference / 0.5) // 50% margin difference = 0 similarity
        totalSimilarity += similarity
        validMetrics++
      }
    }

    return validMetrics > 0 ? totalSimilarity / validMetrics : 0.5
  }

  private calculateGrowthSimilarity(target: MnAFinancialProfile, candidate: MnAFinancialProfile): number {
    if (!target.growthTrajectory?.projectedGrowth || !candidate.growthTrajectory?.projectedGrowth) {
      return 0.5
    }

    const targetGrowth = target.growthTrajectory.projectedGrowth
    const candidateGrowth = candidate.growthTrajectory.projectedGrowth
    
    // Calculate growth rate similarity (similar growth rates = higher similarity)
    const growthDifference = Math.abs(targetGrowth - candidateGrowth)
    const growthSimilarity = Math.max(0, 1 - growthDifference / 0.5) // 50% growth difference = 0 similarity

    // Factor in growth stability if available
    let stabilitySimilarity = 0.5
    if (target.growthTrajectory.growthStability && candidate.growthTrajectory.growthStability) {
      const stabilityDiff = Math.abs(target.growthTrajectory.growthStability - candidate.growthTrajectory.growthStability)
      stabilitySimilarity = Math.max(0, 1 - stabilityDiff)
    }

    return (growthSimilarity * 0.7) + (stabilitySimilarity * 0.3)
  }

  private calculateDebtSimilarity(target: MnAFinancialProfile, candidate: MnAFinancialProfile): number {
    const targetDebt = target.debtProfile
    const candidateDebt = candidate.debtProfile

    if (!targetDebt || !candidateDebt) return 0.5

    const similarities: number[] = []

    // Debt-to-equity ratio similarity
    if (targetDebt.debtToEquityRatio && candidateDebt.debtToEquityRatio) {
      const ratio = Math.min(targetDebt.debtToEquityRatio, candidateDebt.debtToEquityRatio) / 
                   Math.max(targetDebt.debtToEquityRatio, candidateDebt.debtToEquityRatio)
      similarities.push(ratio)
    }

    // Leverage risk similarity
    if (targetDebt.leverageRisk && candidateDebt.leverageRisk) {
      const riskLevels = { low: 1, medium: 2, high: 3 }
      const targetLevel = riskLevels[targetDebt.leverageRisk]
      const candidateLevel = riskLevels[candidateDebt.leverageRisk]
      const difference = Math.abs(targetLevel - candidateLevel)
      similarities.push(Math.max(0, 1 - difference / 2))
    }

    return similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : 0.5
  }

  private calculateValuationSimilarity(target: MnAFinancialProfile, candidate: MnAFinancialProfile): number {
    const targetVal = target.valuationMetrics
    const candidateVal = candidate.valuationMetrics

    if (!targetVal || !candidateVal) return 0.5

    const similarities: number[] = []

    // EV/Revenue multiple similarity
    if (targetVal.evToRevenue && candidateVal.evToRevenue) {
      const ratio = Math.min(targetVal.evToRevenue, candidateVal.evToRevenue) / 
                   Math.max(targetVal.evToRevenue, candidateVal.evToRevenue)
      similarities.push(ratio)
    }

    // EV/EBITDA multiple similarity
    if (targetVal.evToEbitda && candidateVal.evToEbitda) {
      const ratio = Math.min(targetVal.evToEbitda, candidateVal.evToEbitda) / 
                   Math.max(targetVal.evToEbitda, candidateVal.evToEbitda)
      similarities.push(ratio)
    }

    return similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : 0.5
  }

  private calculateCashFlowSimilarity(target: MnAFinancialProfile, candidate: MnAFinancialProfile): number {
    const targetCF = target.cashFlowPatterns
    const candidateCF = candidate.cashFlowPatterns

    if (!targetCF || !candidateCF) return 0.5

    const similarities: number[] = []

    // Cash flow volatility similarity
    if (targetCF.cashFlowVolatility !== undefined && candidateCF.cashFlowVolatility !== undefined) {
      const volatilityDiff = Math.abs(targetCF.cashFlowVolatility - candidateCF.cashFlowVolatility)
      similarities.push(Math.max(0, 1 - volatilityDiff))
    }

    // Working capital needs similarity
    if (targetCF.workingCapitalNeeds !== undefined && candidateCF.workingCapitalNeeds !== undefined) {
      const wcDiff = Math.abs(targetCF.workingCapitalNeeds - candidateCF.workingCapitalNeeds)
      similarities.push(Math.max(0, 1 - wcDiff / 0.3)) // 30% difference = 0 similarity
    }

    return similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : 0.5
  }

  // Strategic similarity calculation methods

  private calculateMarketPositionSimilarity(target: MnAStrategicProfile, candidate: MnAStrategicProfile): number {
    const targetPos = target.marketPosition
    const candidatePos = candidate.marketPosition

    if (!targetPos || !candidatePos) return 0.5

    // Position similarity scoring
    const positionScores: Record<string, number> = { leader: 4, challenger: 3, follower: 2, niche: 1 }
    const targetScore = positionScores[targetPos.position] || 2
    const candidateScore = positionScores[candidatePos.position] || 2
    
    const positionSimilarity = 1 - Math.abs(targetScore - candidateScore) / 3

    // Brand strength similarity
    let brandSimilarity = 0.5
    if (targetPos.brandStrength !== undefined && candidatePos.brandStrength !== undefined) {
      brandSimilarity = 1 - Math.abs(targetPos.brandStrength - candidatePos.brandStrength)
    }

    return (positionSimilarity * 0.6) + (brandSimilarity * 0.4)
  }

  private calculateGeographicSimilarity(target: MnAStrategicProfile, candidate: MnAStrategicProfile): number {
    const targetGeo = target.geographicPresence
    const candidateGeo = candidate.geographicPresence

    if (!targetGeo || !candidateGeo) return 0.5

    // Compare primary markets
    const targetMarkets = new Set(targetGeo.primaryMarkets.map(m => m.region))
    const candidateMarkets = new Set(candidateGeo.primaryMarkets.map(m => m.region))
    
    const intersection = new Set([...targetMarkets].filter(x => candidateMarkets.has(x)))
    const union = new Set([...targetMarkets, ...candidateMarkets])
    
    const overlapSimilarity = intersection.size / union.size

    // International presence similarity
    const intlSimilarity = targetGeo.internationalPresence === candidateGeo.internationalPresence ? 1 : 0.3

    return (overlapSimilarity * 0.7) + (intlSimilarity * 0.3)
  }

  private calculateCustomerBaseSimilarity(target: MnAStrategicProfile, candidate: MnAStrategicProfile): number {
    const targetCustomer = target.customerBase
    const candidateCustomer = candidate.customerBase

    if (!targetCustomer || !candidateCustomer) return 0.5

    const similarities: number[] = []

    // Customer concentration risk similarity
    if (targetCustomer.customerConcentration && candidateCustomer.customerConcentration) {
      const concentrationLevels = { low: 1, medium: 2, high: 3 }
      const targetLevel = concentrationLevels[targetCustomer.customerConcentration.level]
      const candidateLevel = concentrationLevels[candidateCustomer.customerConcentration.level]
      const difference = Math.abs(targetLevel - candidateLevel)
      similarities.push(Math.max(0, 1 - difference / 2))
    }

    // Customer retention similarity
    if (targetCustomer.customerRetention !== undefined && candidateCustomer.customerRetention !== undefined) {
      const retentionDiff = Math.abs(targetCustomer.customerRetention - candidateCustomer.customerRetention)
      similarities.push(Math.max(0, 1 - retentionDiff))
    }

    return similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : 0.5
  }

  private calculateTechnologySimilarity(target: MnAStrategicProfile, candidate: MnAStrategicProfile): number {
    const targetTech = target.technologyAlignment
    const candidateTech = candidate.technologyAlignment

    if (!targetTech || !candidateTech) return 0.5

    const similarities: number[] = []

    // Digital maturity similarity
    if (targetTech.digitalMaturity !== undefined && candidateTech.digitalMaturity !== undefined) {
      const maturityDiff = Math.abs(targetTech.digitalMaturity - candidateTech.digitalMaturity)
      similarities.push(Math.max(0, 1 - maturityDiff))
    }

    // Technology risk similarity
    const riskLevels = { low: 1, medium: 2, high: 3 }
    if (targetTech.technologyRisk && candidateTech.technologyRisk) {
      const targetRisk = riskLevels[targetTech.technologyRisk]
      const candidateRisk = riskLevels[candidateTech.technologyRisk]
      const riskDiff = Math.abs(targetRisk - candidateRisk)
      similarities.push(Math.max(0, 1 - riskDiff / 2))
    }

    return similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : 0.5
  }

  private calculateDistributionSimilarity(target: MnAStrategicProfile, candidate: MnAStrategicProfile): number {
    const targetDist = target.distributionChannels
    const candidateDist = candidate.distributionChannels

    if (!targetDist || !candidateDist || targetDist.length === 0 || candidateDist.length === 0) {
      return 0.5
    }

    // Compare channel types
    const targetChannels = new Set(targetDist.map(d => d.type))
    const candidateChannels = new Set(candidateDist.map(d => d.type))
    
    const intersection = new Set([...targetChannels].filter(x => candidateChannels.has(x)))
    const union = new Set([...targetChannels, ...candidateChannels])
    
    return intersection.size / union.size
  }

  // Operational similarity calculation methods

  private calculateBusinessModelSimilarity(target: MnAOperationalProfile, candidate: MnAOperationalProfile): number {
    const targetModel = target.businessModel
    const candidateModel = candidate.businessModel

    if (!targetModel || !candidateModel) return 0.5

    // Business model type similarity
    let modelSimilarity = targetModel.modelType === candidateModel.modelType ? 1 : 0.3

    // Scalability similarity
    if (targetModel.scalability && candidateModel.scalability) {
      const scalabilityLevels = { low: 1, medium: 2, high: 3 }
      const targetScale = scalabilityLevels[targetModel.scalability.level]
      const candidateScale = scalabilityLevels[candidateModel.scalability.level]
      const scaleDiff = Math.abs(targetScale - candidateScale)
      const scalabilitySimilarity = Math.max(0, 1 - scaleDiff / 2)
      
      modelSimilarity = (modelSimilarity * 0.6) + (scalabilitySimilarity * 0.4)
    }

    return modelSimilarity
  }

  private calculateScaleSimilarity(target: MnAOperationalProfile, candidate: MnAOperationalProfile): number {
    const targetScale = target.operationalScale
    const candidateScale = candidate.operationalScale

    if (!targetScale || !candidateScale) return 0.5

    // Scale level similarity
    const scaleLevels = { small: 1, medium: 2, large: 3, enterprise: 4 }
    const targetLevel = scaleLevels[targetScale.level]
    const candidateLevel = scaleLevels[candidateScale.level]
    
    const levelDiff = Math.abs(targetLevel - candidateLevel)
    return Math.max(0, 1 - levelDiff / 3)
  }

  private calculateRegulatorySimilarity(target: MnAOperationalProfile, candidate: MnAOperationalProfile): number {
    const targetReg = target.regulatoryComplexity
    const candidateReg = candidate.regulatoryComplexity

    if (!targetReg || !candidateReg) return 0.5

    // Regulatory complexity similarity
    const complexityLevels = { low: 1, medium: 2, high: 3 }
    const targetComplexity = complexityLevels[targetReg.complexity]
    const candidateComplexity = complexityLevels[candidateReg.complexity]
    
    const complexityDiff = Math.abs(targetComplexity - candidateComplexity)
    return Math.max(0, 1 - complexityDiff / 2)
  }

  private calculateEfficiencySimilarity(target: MnAOperationalProfile, candidate: MnAOperationalProfile): number {
    const targetEff = target.operationalEfficiency
    const candidateEff = candidate.operationalEfficiency

    if (targetEff === undefined || candidateEff === undefined) return 0.5

    // Efficiency score similarity
    const efficiencyDiff = Math.abs(targetEff - candidateEff)
    return Math.max(0, 1 - efficiencyDiff)
  }

  // Market similarity calculation methods

  private calculateIndustrySimilarity(target: MnAMarketProfile, candidate: MnAMarketProfile): number {
    const targetIndustry = target.industryVertical
    const candidateIndustry = candidate.industryVertical

    if (!targetIndustry || !candidateIndustry) return 0.5

    // Primary industry match
    const primaryMatch = targetIndustry.primaryIndustry === candidateIndustry.primaryIndustry ? 1 : 0

    // Sub-industry overlap
    const targetSubs = new Set(targetIndustry.subIndustries)
    const candidateSubs = new Set(candidateIndustry.subIndustries)
    const intersection = new Set([...targetSubs].filter(x => candidateSubs.has(x)))
    const union = new Set([...targetSubs, ...candidateSubs])
    const subIndustryOverlap = union.size > 0 ? intersection.size / union.size : 0

    return (primaryMatch * 0.7) + (subIndustryOverlap * 0.3)
  }

  private calculateMaturitySimilarity(target: MnAMarketProfile, candidate: MnAMarketProfile): number {
    const targetMaturity = target.marketMaturity
    const candidateMaturity = candidate.marketMaturity

    if (!targetMaturity || !candidateMaturity) return 0.5

    // Market maturity stage similarity
    const maturityLevels = { emerging: 1, growth: 2, mature: 3, declining: 4 }
    const targetLevel = maturityLevels[targetMaturity]
    const candidateLevel = maturityLevels[candidateMaturity]
    
    const levelDiff = Math.abs(targetLevel - candidateLevel)
    return Math.max(0, 1 - levelDiff / 3)
  }

  private calculateCompetitiveSimilarity(target: MnAMarketProfile, candidate: MnAMarketProfile): number {
    const targetComp = target.competitiveIntensity
    const candidateComp = candidate.competitiveIntensity

    if (!targetComp || !candidateComp) return 0.5

    // Competitive intensity similarity
    const intensityLevels = { low: 1, medium: 2, high: 3 }
    const targetIntensity = intensityLevels[targetComp.level]
    const candidateIntensity = intensityLevels[candidateComp.level]
    
    const intensityDiff = Math.abs(targetIntensity - candidateIntensity)
    return Math.max(0, 1 - intensityDiff / 2)
  }

  private calculateGrowthPotentialSimilarity(target: MnAMarketProfile, candidate: MnAMarketProfile): number {
    const targetGrowth = target.growthPotential
    const candidateGrowth = candidate.growthPotential

    if (!targetGrowth || !candidateGrowth) return 0.5

    // Growth potential level similarity
    const potentialLevels = { limited: 1, moderate: 2, high: 3, exceptional: 4 }
    const targetPotential = potentialLevels[targetGrowth.potential]
    const candidatePotential = potentialLevels[candidateGrowth.potential]
    
    const potentialDiff = Math.abs(targetPotential - candidatePotential)
    return Math.max(0, 1 - potentialDiff / 3)
  }

  // Risk similarity calculation methods

  private calculateRegulatoryRiskSimilarity(target: MnARiskProfile, candidate: MnARiskProfile): number {
    const targetRisk = target.regulatoryRisk
    const candidateRisk = candidate.regulatoryRisk

    if (!targetRisk || !candidateRisk) return 0.5

    // Risk level similarity
    const riskLevels = { low: 1, medium: 2, high: 3, critical: 4 }
    const targetLevel = riskLevels[targetRisk.level]
    const candidateLevel = riskLevels[candidateRisk.level]
    
    const levelDiff = Math.abs(targetLevel - candidateLevel)
    return Math.max(0, 1 - levelDiff / 3)
  }

  private calculateIntegrationRiskSimilarity(target: MnARiskProfile, candidate: MnARiskProfile): number {
    const targetIntegration = target.integrationComplexity
    const candidateIntegration = candidate.integrationComplexity

    if (!targetIntegration || !candidateIntegration) return 0.5

    // Integration complexity similarity
    const complexityLevels = { low: 1, medium: 2, high: 3, extreme: 4 }
    const targetComplexity = complexityLevels[targetIntegration.level]
    const candidateComplexity = complexityLevels[candidateIntegration.level]
    
    const complexityDiff = Math.abs(targetComplexity - candidateComplexity)
    return Math.max(0, 1 - complexityDiff / 3)
  }

  private calculateESGRiskSimilarity(target: MnARiskProfile, candidate: MnARiskProfile): number {
    const targetESG = target.esgFactors
    const candidateESG = candidate.esgFactors

    if (!targetESG || !candidateESG) return 0.5

    // Overall ESG score similarity
    const esgDiff = Math.abs(targetESG.overallScore - candidateESG.overallScore)
    return Math.max(0, 1 - esgDiff / 100) // ESG scores typically 0-100
  }

  private calculateTechnologyRiskSimilarity(target: MnARiskProfile, candidate: MnARiskProfile): number {
    const targetTech = target.technologyRisk
    const candidateTech = candidate.technologyRisk

    if (!targetTech || !candidateTech) return 0.5

    const similarities: number[] = []

    // Technology risk levels comparison
    const riskLevels = { low: 1, medium: 2, high: 3 }
    
    if (targetTech.obsolescenceRisk && candidateTech.obsolescenceRisk) {
      const targetLevel = riskLevels[targetTech.obsolescenceRisk]
      const candidateLevel = riskLevels[candidateTech.obsolescenceRisk]
      const diff = Math.abs(targetLevel - candidateLevel)
      similarities.push(Math.max(0, 1 - diff / 2))
    }

    if (targetTech.cybersecurityRisk && candidateTech.cybersecurityRisk) {
      const targetLevel = riskLevels[targetTech.cybersecurityRisk]
      const candidateLevel = riskLevels[candidateTech.cybersecurityRisk]
      const diff = Math.abs(targetLevel - candidateLevel)
      similarities.push(Math.max(0, 1 - diff / 2))
    }

    return similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : 0.5
  }

  private calculateGeopoliticalRiskSimilarity(target: MnARiskProfile, candidate: MnARiskProfile): number {
    const targetGeo = target.geopoliticalRisk
    const candidateGeo = candidate.geopoliticalRisk

    if (!targetGeo || !candidateGeo) return 0.5

    // Risk level similarity
    const riskLevels = { low: 1, medium: 2, high: 3, critical: 4 }
    const targetLevel = riskLevels[targetGeo.level]
    const candidateLevel = riskLevels[candidateGeo.level]
    
    const levelDiff = Math.abs(targetLevel - candidateLevel)
    return Math.max(0, 1 - levelDiff / 3)
  }

  // Confidence calculation methods

  private calculateFinancialConfidence(target: MnAFinancialProfile, candidate: MnAFinancialProfile): number {
    let dataPoints = 0
    const totalPoints = 8 // Maximum possible data points

    if (target.estimatedRevenue && candidate.estimatedRevenue) dataPoints++
    if (target.profitabilityMetrics && candidate.profitabilityMetrics) dataPoints++
    if (target.growthTrajectory && candidate.growthTrajectory) dataPoints++
    if (target.debtProfile && candidate.debtProfile) dataPoints++
    if (target.valuationMetrics && candidate.valuationMetrics) dataPoints++
    if (target.cashFlowPatterns && candidate.cashFlowPatterns) dataPoints++

    return Math.max(0.3, dataPoints / totalPoints)
  }

  private calculateStrategicConfidence(target: MnAStrategicProfile, candidate: MnAStrategicProfile): number {
    let dataPoints = 0
    const totalPoints = 5

    if (target.marketPosition && candidate.marketPosition) dataPoints++
    if (target.geographicPresence && candidate.geographicPresence) dataPoints++
    if (target.customerBase && candidate.customerBase) dataPoints++
    if (target.technologyAlignment && candidate.technologyAlignment) dataPoints++
    if (target.distributionChannels && candidate.distributionChannels) dataPoints++

    return Math.max(0.3, dataPoints / totalPoints)
  }

  private calculateOperationalConfidence(target: MnAOperationalProfile, candidate: MnAOperationalProfile): number {
    let dataPoints = 0
    const totalPoints = 4

    if (target.businessModel && candidate.businessModel) dataPoints++
    if (target.operationalScale && candidate.operationalScale) dataPoints++
    if (target.regulatoryComplexity && candidate.regulatoryComplexity) dataPoints++
    if (target.operationalEfficiency !== undefined && candidate.operationalEfficiency !== undefined) dataPoints++

    return Math.max(0.3, dataPoints / totalPoints)
  }

  private calculateMarketConfidence(target: MnAMarketProfile, candidate: MnAMarketProfile): number {
    let dataPoints = 0
    const totalPoints = 4

    if (target.industryVertical && candidate.industryVertical) dataPoints++
    if (target.marketMaturity && candidate.marketMaturity) dataPoints++
    if (target.competitiveIntensity && candidate.competitiveIntensity) dataPoints++
    if (target.growthPotential && candidate.growthPotential) dataPoints++

    return Math.max(0.3, dataPoints / totalPoints)
  }

  private calculateRiskConfidence(target: MnARiskProfile, candidate: MnARiskProfile): number {
    let dataPoints = 0
    const totalPoints = 5

    if (target.regulatoryRisk && candidate.regulatoryRisk) dataPoints++
    if (target.integrationComplexity && candidate.integrationComplexity) dataPoints++
    if (target.esgFactors && candidate.esgFactors) dataPoints++
    if (target.technologyRisk && candidate.technologyRisk) dataPoints++
    if (target.geopoliticalRisk && candidate.geopoliticalRisk) dataPoints++

    return Math.max(0.3, dataPoints / totalPoints)
  }

  // Utility methods

  private calculateWeightedOverallScore(
    scores: Record<string, number>,
    weights: MnAParameterWeights
  ): number {
    return (
      (scores.financial * weights.financial) +
      (scores.strategic * weights.strategic) +
      (scores.operational * weights.operational) +
      (scores.market * weights.market) +
      (scores.risk * weights.risk)
    )
  }

  private calculateOverallConfidence(scores: MnABenchmarkScores): ConfidenceLevel {
    const avgConfidence = (
      scores.financial.confidence +
      scores.strategic.confidence +
      scores.operational.confidence +
      scores.market.confidence +
      scores.risk.confidence
    ) / 5

    if (avgConfidence >= 0.8) return 'very_high'
    if (avgConfidence >= 0.7) return 'high'
    if (avgConfidence >= 0.5) return 'medium'
    return 'low'
  }

  private async generateScoringExplanations(
    context: ScoringContext,
    scores: MnABenchmarkScores
  ): Promise<ScoringExplanation[]> {
    // Generate detailed explanations for each scoring category
    const explanations: ScoringExplanation[] = [
      {
        category: 'Financial',
        score: scores.financial.score,
        factors: scores.financial.contributingFactors.map(factor => ({
          metric: factor,
          similarity: 0.8, // Simplified for now
          weight: 0.3,
          explanation: `Strong alignment in ${factor.toLowerCase()}`
        }))
      },
      {
        category: 'Strategic',
        score: scores.strategic.score,
        factors: scores.strategic.contributingFactors.map(factor => ({
          metric: factor,
          similarity: 0.7,
          weight: 0.25,
          explanation: `Comparable ${factor.toLowerCase()}`
        }))
      },
      // Add other categories...
    ]

    return explanations
  }

  // Public utility methods

  /**
   * Normalize scores to ensure consistency
   */
  normalizeScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score * 100) / 100))
  }

  /**
   * Get scoring methodology explanation
   */
  getScoringMethodology(): Record<string, any> {
    return {
      weights: this.defaultWeights,
      categories: {
        financial: {
          description: 'Revenue size, profitability, growth, debt, and valuation metrics',
          weight: '30%',
          factors: ['Revenue Similarity', 'Profitability Alignment', 'Growth Trajectory', 'Debt Profile', 'Valuation Multiples']
        },
        strategic: {
          description: 'Market position, geographic presence, customer base, and competitive advantages',
          weight: '25%',
          factors: ['Market Position', 'Geographic Overlap', 'Customer Base', 'Technology Alignment']
        },
        operational: {
          description: 'Business model, scale, regulatory complexity, and operational efficiency',
          weight: '20%',
          factors: ['Business Model', 'Operational Scale', 'Regulatory Environment', 'Efficiency Metrics']
        },
        market: {
          description: 'Industry dynamics, competitive landscape, and growth potential',
          weight: '15%',
          factors: ['Industry Alignment', 'Market Maturity', 'Competitive Landscape', 'Growth Potential']
        },
        risk: {
          description: 'Regulatory, operational, financial, and integration risks',
          weight: '10%',
          factors: ['Regulatory Risk', 'Integration Complexity', 'ESG Risk', 'Technology Risk']
        }
      },
      confidenceLevels: {
        very_high: '80%+ data coverage with high reliability',
        high: '70%+ data coverage with good reliability',
        medium: '50%+ data coverage with moderate reliability',
        low: 'Limited data coverage or reliability'
      }
    }
  }
}