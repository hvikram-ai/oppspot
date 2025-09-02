/**
 * Similarity Analysis Domain Interfaces
 * Defines contracts for the Similar Company feature
 */

import { CompanyEntity, SourceMetadata, FinancialMetrics } from './interfaces'

// ==========================================
// SIMILARITY ANALYSIS DOMAIN TYPES
// ==========================================

export interface SimilarityEntity {
  readonly id: string
  readonly targetCompany: CompanyEntity
  readonly similarCompanies: readonly SimilarCompanyMatch[]
  readonly analysisConfiguration: SimilarityConfiguration
  readonly overallSummary: SimilarityAnalysisSummary
  readonly mnaInsights: M&AInsights
  readonly generatedAt: Date
  readonly userId: string
  readonly orgId?: string
  readonly status: SimilarityAnalysisStatus
  readonly cached: boolean
  readonly expiresAt?: Date
}

export interface SimilarCompanyMatch {
  readonly company: CompanyEntity
  readonly overallScore: number
  readonly confidence: number
  readonly benchmarkScores: M&ABenchmarkScores
  readonly explanation: SimilarityExplanation
  readonly riskFactors: readonly RiskFactor[]
  readonly opportunities: readonly OpportunityArea[]
  readonly rank: number
  readonly marketPosition: MarketPositioning
}

export interface SimilarityConfiguration {
  readonly analysisDepth: SimilarityDepth
  readonly parameterWeights: M&AParameterWeights
  readonly filterCriteria: SimilarityFilterCriteria
  readonly maxResults: number
  readonly includeExplanations: boolean
  readonly webSearchEnabled: boolean
  readonly financialDataRequired: boolean
  readonly competitorAnalysis: boolean
}

export type SimilarityDepth = 'quick' | 'detailed' | 'comprehensive'
export type SimilarityAnalysisStatus = 'pending' | 'searching' | 'analyzing' | 'completed' | 'failed' | 'expired'

export interface SimilarityFilterCriteria {
  readonly minRevenueRange?: number
  readonly maxRevenueRange?: number
  readonly targetRegions?: readonly string[]
  readonly excludeIndustries?: readonly string[]
  readonly minEmployeeCount?: number
  readonly maxEmployeeCount?: number
  readonly publicCompaniesOnly?: boolean
  readonly minFoundingYear?: number
  readonly maxFoundingYear?: number
}

export interface M&AParameterWeights {
  readonly financial: number           // 30%
  readonly strategic: number          // 25%
  readonly operational: number        // 20%
  readonly market: number             // 15%
  readonly risk: number              // 10%
}

// ==========================================
// M&A BENCHMARK ENTITIES
// ==========================================

export interface M&ABenchmarkEntity {
  readonly id: string
  readonly companyId: string
  readonly benchmarkScores: M&ABenchmarkScores
  readonly financialProfile: M&AFinancialProfile
  readonly strategicProfile: M&AStrategicProfile
  readonly operationalProfile: M&AOperationalProfile
  readonly marketProfile: M&AMarketProfile
  readonly riskProfile: M&ARiskProfile
  readonly lastUpdated: Date
  readonly dataQuality: BenchmarkDataQuality
  readonly sourceReliability: number
}

export interface M&ABenchmarkScores {
  readonly financial: ParameterScore
  readonly strategic: ParameterScore
  readonly operational: ParameterScore
  readonly market: ParameterScore
  readonly risk: ParameterScore
  readonly overall: number
}

export interface ParameterScore {
  readonly score: number
  readonly confidence: number
  readonly contributingFactors: readonly string[]
  readonly dataPoints: number
}

export interface M&AFinancialProfile {
  readonly revenueRange: RevenueRange
  readonly growthTrajectory: GrowthTrajectory
  readonly profitabilityMetrics: ProfitabilityMetrics
  readonly debtProfile: DebtProfile
  readonly valuationMetrics?: ValuationMetrics
  readonly cashFlowPatterns: CashFlowPatterns
}

export interface M&AStrategicProfile {
  readonly marketPosition: MarketPositioning
  readonly customerBase: CustomerBaseProfile
  readonly geographicPresence: GeographicProfile
  readonly technologyAlignment: TechnologyProfile
  readonly distributionChannels: readonly DistributionChannel[]
  readonly partnerships: readonly PartnershipProfile[]
  readonly competitiveDifferentiation: readonly string[]
}

export interface M&AOperationalProfile {
  readonly businessModel: BusinessModelProfile
  readonly operationalScale: OperationalScale
  readonly regulatoryComplexity: RegulatoryProfile
  readonly supplyChainDependencies: readonly SupplyChainElement[]
  readonly humanCapital: HumanCapitalProfile
  readonly operationalEfficiency: EfficiencyMetrics
}

export interface M&AMarketProfile {
  readonly industryVertical: IndustryProfile
  readonly marketMaturity: MarketMaturity
  readonly competitiveIntensity: CompetitiveIntensity
  readonly barrierToEntry: BarrierAnalysis
  readonly cyclicalityFactors: CyclicalityProfile
  readonly growthPotential: GrowthPotentialProfile
}

export interface M&ARiskProfile {
  readonly regulatoryRisk: RiskAssessment
  readonly integrationComplexity: IntegrationRisk
  readonly esgFactors: ESGProfile
  readonly geopoliticalRisk: GeopoliticalRisk
  readonly technologyRisk: TechnologyRisk
  readonly overallRiskScore: number
}

// ==========================================
// SUPPORTING DATA STRUCTURES
// ==========================================

export interface RevenueRange {
  readonly lower: number
  readonly upper: number
  readonly currency: string
  readonly estimatedRevenue?: number
  readonly revenueGrowthRate?: number
}

export interface GrowthTrajectory {
  readonly historicalGrowth: readonly number[]
  readonly projectedGrowth: number
  readonly growthStability: number
  readonly seasonalityFactors: readonly SeasonalityFactor[]
}

export interface ProfitabilityMetrics {
  readonly ebitdaMargin?: number
  readonly netProfitMargin?: number
  readonly grossMargin?: number
  readonly operatingMargin?: number
  readonly returnOnAssets?: number
  readonly returnOnEquity?: number
}

export interface DebtProfile {
  readonly debtToEquityRatio?: number
  readonly debtToEbitda?: number
  readonly interestCoverage?: number
  readonly creditRating?: string
  readonly leverageRisk: 'low' | 'medium' | 'high'
}

export interface ValuationMetrics {
  readonly enterpriseValue?: number
  readonly evToRevenue?: number
  readonly evToEbitda?: number
  readonly priceToEarnings?: number
  readonly priceToBook?: number
  readonly marketCap?: number
}

export interface CashFlowPatterns {
  readonly operatingCashFlow?: number
  readonly freeCashFlow?: number
  readonly cashFlowVolatility: number
  readonly workingCapitalNeeds: number
}

export interface MarketPositioning {
  readonly position: 'leader' | 'challenger' | 'follower' | 'niche'
  readonly marketShare?: number
  readonly competitiveAdvantage: readonly string[]
  readonly brandStrength: number
  readonly customerLoyalty: number
}

export interface CustomerBaseProfile {
  readonly customerSegments: readonly CustomerSegment[]
  readonly customerConcentration: ConcentrationRisk
  readonly customerRetention: number
  readonly averageContractValue?: number
  readonly acquisitionCost?: number
}

export interface GeographicProfile {
  readonly primaryMarkets: readonly GeographicMarket[]
  readonly internationalPresence: boolean
  readonly expansionPotential: readonly ExpansionOpportunity[]
  readonly regulatoryComplexity: RegionalComplexity
}

export interface TechnologyProfile {
  readonly technologyStack: readonly TechnologyElement[]
  readonly digitalMaturity: number
  readonly innovationCapacity: number
  readonly intellectualProperty: readonly IPAsset[]
  readonly technologyRisk: TechnologyRiskLevel
}

export interface BusinessModelProfile {
  readonly modelType: BusinessModelType
  readonly revenueStreams: readonly RevenueStream[]
  readonly scalability: ScalabilityProfile
  readonly capitalIntensity: CapitalIntensity
  readonly cyclicality: CyclicalityLevel
}

export interface HumanCapitalProfile {
  readonly keyPersonnelRisk: PersonnelRisk
  readonly talentQuality: number
  readonly retentionRate: number
  readonly skillsAlignment: SkillsAlignment
  readonly managementDepth: number
}

export interface IndustryProfile {
  readonly primaryIndustry: string
  readonly subIndustries: readonly string[]
  readonly industryGrowthRate: number
  readonly industryMaturity: IndustryMaturity
  readonly consolidationTrend: ConsolidationTrend
}

export interface RiskAssessment {
  readonly level: RiskLevel
  readonly factors: readonly string[]
  readonly mitigationStrategies: readonly string[]
  readonly impact: RiskImpact
  readonly probability: RiskProbability
}

// ==========================================
// EXPLANATION AND INSIGHT ENTITIES
// ==========================================

export interface SimilarityExplanation {
  readonly summary: string
  readonly keyReasons: readonly string[]
  readonly financialRationale: string
  readonly strategicRationale: string
  readonly riskConsiderations: string
  readonly confidenceLevel: ConfidenceLevel
  readonly dataQualityNote?: string
}

export interface M&AInsights {
  readonly executiveSummary: string
  readonly keyOpportunities: readonly OpportunityInsight[]
  readonly riskHighlights: readonly RiskInsight[]
  readonly strategicRecommendations: readonly StrategyRecommendation[]
  readonly valuationConsiderations: readonly ValuationInsight[]
  readonly integrationConsiderations: readonly IntegrationInsight[]
}

export interface OpportunityInsight {
  readonly category: OpportunityCategory
  readonly title: string
  readonly description: string
  readonly impact: 'low' | 'medium' | 'high'
  readonly timeframe: 'immediate' | 'short' | 'medium' | 'long'
  readonly confidence: ConfidenceLevel
}

export interface RiskInsight {
  readonly category: RiskCategory
  readonly title: string
  readonly description: string
  readonly severity: RiskSeverity
  readonly probability: RiskProbability
  readonly mitigation: string[]
}

export interface StrategyRecommendation {
  readonly priority: 'high' | 'medium' | 'low'
  readonly title: string
  readonly rationale: string
  readonly expectedOutcome: string
  readonly implementation: ImplementationGuidance
}

export interface SimilarityAnalysisSummary {
  readonly totalCompaniesAnalyzed: number
  readonly averageSimilarityScore: number
  readonly topSimilarityScore: number
  readonly distributionByIndustry: Record<string, number>
  readonly distributionByRegion: Record<string, number>
  readonly analysisCompleteness: number
  readonly dataQualityScore: number
}

// ==========================================
// REPOSITORY ABSTRACTIONS
// ==========================================

export interface ISimilarityRepository {
  save(similarity: SimilarityEntity): Promise<void>
  findById(id: string): Promise<SimilarityEntity | null>
  findByTargetCompany(companyName: string, userId: string): Promise<SimilarityEntity[]>
  findByUser(userId: string, limit?: number): Promise<SimilarityEntity[]>
  delete(id: string): Promise<void>
  cleanupExpired(): Promise<number>
}

export interface IM&ABenchmarkRepository {
  save(benchmark: M&ABenchmarkEntity): Promise<void>
  findByCompanyId(companyId: string): Promise<M&ABenchmarkEntity | null>
  findBatch(companyIds: string[]): Promise<M&ABenchmarkEntity[]>
  update(id: string, updates: Partial<M&ABenchmarkEntity>): Promise<void>
  delete(id: string): Promise<void>
}

// ==========================================
// SERVICE ABSTRACTIONS
// ==========================================

export interface IWebSearchService {
  searchCompanies(query: CompanySearchQuery): Promise<CompanySearchResult[]>
  enrichCompanyData(company: CompanyEntity): Promise<EnrichedCompanyData>
  getCompetitors(companyName: string): Promise<CompanyEntity[]>
  validateCompanyExists(companyName: string): Promise<CompanyValidationResult>
}

export interface ISimilarityAnalysisService {
  analyzeSimilarity(
    targetCompany: CompanyEntity,
    candidates: CompanyEntity[],
    configuration: SimilarityConfiguration
  ): Promise<SimilarCompanyMatch[]>
  
  calculateBenchmarkScores(
    targetCompany: CompanyEntity,
    candidate: CompanyEntity
  ): Promise<M&ABenchmarkScores>
  
  generateExplanation(
    targetCompany: CompanyEntity,
    candidate: CompanyEntity,
    scores: M&ABenchmarkScores
  ): Promise<SimilarityExplanation>
}

export interface IM&AInsightService {
  generateInsights(
    targetCompany: CompanyEntity,
    matches: SimilarCompanyMatch[]
  ): Promise<M&AInsights>
  
  assessIntegrationRisk(
    acquirer: CompanyEntity,
    target: CompanyEntity
  ): Promise<IntegrationRisk>
  
  estimateValuation(
    company: CompanyEntity,
    comparables: CompanyEntity[]
  ): Promise<ValuationEstimate>
}

// ==========================================
// SUPPORTING TYPES AND ENUMS
// ==========================================

export type BusinessModelType = 'b2b' | 'b2c' | 'marketplace' | 'subscription' | 'transaction' | 'hybrid'
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'very_high'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type RiskSeverity = 'minor' | 'moderate' | 'major' | 'critical'
export type RiskProbability = 'unlikely' | 'possible' | 'likely' | 'certain'
export type RiskImpact = 'minimal' | 'moderate' | 'significant' | 'severe'
export type MarketMaturity = 'emerging' | 'growth' | 'mature' | 'declining'
export type IndustryMaturity = 'startup' | 'growth' | 'mature' | 'decline'
export type ConsolidationTrend = 'fragmenting' | 'stable' | 'consolidating' | 'mature'
export type OpportunityCategory = 'synergy' | 'expansion' | 'efficiency' | 'innovation' | 'market'
export type RiskCategory = 'financial' | 'operational' | 'strategic' | 'regulatory' | 'technology'
export type TechnologyRiskLevel = 'low' | 'medium' | 'high'
export type CyclicalityLevel = 'none' | 'low' | 'moderate' | 'high'
export type PersonnelRisk = 'low' | 'medium' | 'high'

export interface CompanySearchQuery {
  readonly query: string
  readonly industry?: string
  readonly region?: string
  readonly sizeRange?: SizeRange
  readonly maxResults?: number
}

export interface CompanySearchResult {
  readonly company: CompanyEntity
  readonly relevanceScore: number
  readonly source: string
  readonly additionalData: Record<string, any>
}

export interface EnrichedCompanyData {
  readonly company: CompanyEntity
  readonly financialData?: FinancialMetrics
  readonly socialPresence?: SocialPresence
  readonly technologyProfile?: TechnologyProfile
  readonly newsAnalysis?: NewsAnalysis
}

export interface CompanyValidationResult {
  readonly exists: boolean
  readonly confidence: number
  readonly suggestedMatches?: CompanyEntity[]
  readonly validationSource: string
}

export interface SizeRange {
  readonly minEmployees?: number
  readonly maxEmployees?: number
  readonly minRevenue?: number
  readonly maxRevenue?: number
}

// Additional supporting interfaces...
export interface CustomerSegment {
  readonly segment: string
  readonly percentage: number
  readonly value: number
}

export interface ConcentrationRisk {
  readonly level: 'low' | 'medium' | 'high'
  readonly topCustomerPercentage?: number
  readonly top5CustomerPercentage?: number
}

export interface GeographicMarket {
  readonly region: string
  readonly revenuePercentage: number
  readonly marketPotential: number
}

export interface ExpansionOpportunity {
  readonly region: string
  readonly potential: 'low' | 'medium' | 'high'
  readonly barriers: string[]
}

export interface RegionalComplexity {
  readonly level: 'low' | 'medium' | 'high'
  readonly factors: string[]
}

export interface TechnologyElement {
  readonly name: string
  readonly category: string
  readonly importance: 'low' | 'medium' | 'high'
}

export interface IPAsset {
  readonly type: 'patent' | 'trademark' | 'copyright' | 'trade_secret'
  readonly description: string
  readonly value: 'low' | 'medium' | 'high'
}

export interface RevenueStream {
  readonly name: string
  readonly percentage: number
  readonly type: 'recurring' | 'one_time' | 'variable'
}

export interface ScalabilityProfile {
  readonly level: 'low' | 'medium' | 'high'
  readonly constrainingFactors: string[]
  readonly scalabilityDrivers: string[]
}

export interface CapitalIntensity {
  readonly level: 'low' | 'medium' | 'high'
  readonly capexToRevenue?: number
  readonly assetTurnover?: number
}

export interface SkillsAlignment {
  readonly level: 'poor' | 'fair' | 'good' | 'excellent'
  readonly gapAreas: string[]
  readonly strengthAreas: string[]
}

export interface SeasonalityFactor {
  readonly period: string
  readonly impact: number
  readonly description: string
}

export interface DistributionChannel {
  readonly type: string
  readonly revenueContribution: number
  readonly effectiveness: 'low' | 'medium' | 'high'
}

export interface PartnershipProfile {
  readonly type: string
  readonly strategic: boolean
  readonly revenueImpact: number
}

export interface OperationalScale {
  readonly level: 'small' | 'medium' | 'large' | 'enterprise'
  readonly complexityFactors: string[]
  readonly scaleAdvantages: string[]
}

export interface RegulatoryProfile {
  readonly complexity: 'low' | 'medium' | 'high'
  readonly keyRegulations: string[]
  readonly complianceCost: 'low' | 'medium' | 'high'
}

export interface SupplyChainElement {
  readonly type: string
  readonly criticality: 'low' | 'medium' | 'high'
  readonly concentration: ConcentrationRisk
}

export interface EfficiencyMetrics {
  readonly operationalEfficiency: number
  readonly assetUtilization: number
  readonly processMaturity: 'basic' | 'developing' | 'advanced' | 'optimized'
}

export interface CompetitiveIntensity {
  readonly level: 'low' | 'medium' | 'high'
  readonly keyCompetitors: number
  readonly pricePressure: 'low' | 'medium' | 'high'
}

export interface BarrierAnalysis {
  readonly entry: 'low' | 'medium' | 'high'
  readonly exit: 'low' | 'medium' | 'high'
  readonly keyBarriers: string[]
}

export interface CyclicalityProfile {
  readonly level: CyclicalityLevel
  readonly driverFactors: string[]
  readonly historicalVolatility: number
}

export interface GrowthPotentialProfile {
  readonly potential: 'limited' | 'moderate' | 'high' | 'exceptional'
  readonly driverFactors: string[]
  readonly timeframe: 'short' | 'medium' | 'long'
}

export interface IntegrationRisk {
  readonly level: 'low' | 'medium' | 'high' | 'extreme'
  readonly factors: string[]
  readonly mitigationStrategies: string[]
  readonly estimatedCost?: number
  readonly timeframe?: string
}

export interface ESGProfile {
  readonly environmentalScore: number
  readonly socialScore: number
  readonly governanceScore: number
  readonly overallScore: number
  readonly riskFactors: string[]
}

export interface GeopoliticalRisk {
  readonly level: RiskLevel
  readonly factors: string[]
  readonly affectedRegions: string[]
  readonly mitigation: string[]
}

export interface TechnologyRisk {
  readonly obsolescenceRisk: TechnologyRiskLevel
  readonly cybersecurityRisk: TechnologyRiskLevel
  readonly dependencyRisk: TechnologyRiskLevel
  readonly keyVulnerabilities: string[]
}

export interface RiskFactor {
  readonly category: RiskCategory
  readonly description: string
  readonly impact: RiskImpact
  readonly probability: RiskProbability
  readonly mitigation?: string
}

export interface OpportunityArea {
  readonly category: OpportunityCategory
  readonly description: string
  readonly impact: 'low' | 'medium' | 'high'
  readonly timeframe: 'immediate' | 'short' | 'medium' | 'long'
}

export interface ValuationInsight {
  readonly metric: string
  readonly value: number
  readonly benchmark: number
  readonly interpretation: string
}

export interface IntegrationInsight {
  readonly area: string
  readonly complexity: 'low' | 'medium' | 'high'
  readonly recommendations: string[]
  readonly timeline: string
}

export interface ImplementationGuidance {
  readonly timeline: string
  readonly resources: string[]
  readonly dependencies: string[]
  readonly successMetrics: string[]
}

export interface ValuationEstimate {
  readonly lowEstimate: number
  readonly highEstimate: number
  readonly mostLikelyEstimate: number
  readonly methodology: string[]
  readonly assumptions: string[]
  readonly confidence: ConfidenceLevel
}

export interface SocialPresence {
  readonly platforms: Record<string, SocialPlatformData>
  readonly overallEngagement: number
  readonly brandSentiment: 'negative' | 'neutral' | 'positive'
}

export interface SocialPlatformData {
  readonly followers: number
  readonly engagement: number
  readonly activityLevel: 'low' | 'medium' | 'high'
}

export interface NewsAnalysis {
  readonly sentiment: 'negative' | 'neutral' | 'positive'
  readonly volume: 'low' | 'medium' | 'high'
  readonly keyTopics: string[]
  readonly recentEvents: string[]
}

export interface BenchmarkDataQuality {
  readonly completeness: number
  readonly accuracy: number
  readonly freshness: number
  readonly overall: number
}