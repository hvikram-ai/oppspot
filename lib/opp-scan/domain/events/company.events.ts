/**
 * Company Domain Events
 * Events related to company lifecycle and changes
 */

import { DomainEvent, IntegrationEvent } from './domain-event.base'
import type { CompanyEntity } from '../entities/company.entity'

// ==========================================
// COMPANY LIFECYCLE EVENTS
// ==========================================

export class CompanyCreatedEvent extends DomainEvent<CompanyCreatedEventPayload> {
  constructor(company: CompanyEntity, correlationId?: string) {
    super(
      'company.created',
      {
        companyId: company.id,
        name: company.name,
        country: company.country,
        industryCodes: company.industryCodes,
        confidenceScore: company.confidenceScore,
        sourceMetadata: company.sourceMetadata
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Company'
  }
}

export interface CompanyCreatedEventPayload {
  companyId: string
  name: string
  country: string
  industryCodes: readonly string[]
  confidenceScore: number
  sourceMetadata: {
    source: string
    discoveredAt: Date
    confidence: number
  }
}

export class CompanyUpdatedEvent extends DomainEvent<CompanyUpdatedEventPayload> {
  constructor(
    company: CompanyEntity, 
    changes: CompanyUpdateChanges, 
    correlationId?: string
  ) {
    super(
      'company.updated',
      {
        companyId: company.id,
        name: company.name,
        changes,
        updatedAt: company.updatedAt
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Company'
  }
}

export interface CompanyUpdatedEventPayload {
  companyId: string
  name: string
  changes: CompanyUpdateChanges
  updatedAt: Date
}

export interface CompanyUpdateChanges {
  fieldName: string
  oldValue: unknown
  newValue: unknown
  changeReason?: string
}

export class CompanyConfidenceUpdatedEvent extends DomainEvent<CompanyConfidenceUpdatedEventPayload> {
  constructor(
    companyId: string,
    oldScore: number,
    newScore: number,
    reason: string,
    correlationId?: string
  ) {
    super(
      'company.confidence.updated',
      {
        companyId,
        oldConfidenceScore: oldScore,
        newConfidenceScore: newScore,
        reason,
        scoreDelta: newScore - oldScore
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Company'
  }
}

export interface CompanyConfidenceUpdatedEventPayload {
  companyId: string
  oldConfidenceScore: number
  newConfidenceScore: number
  reason: string
  scoreDelta: number
}

// ==========================================
// COMPANY DATA ENRICHMENT EVENTS
// ==========================================

export class CompanyEnrichmentStartedEvent extends DomainEvent<CompanyEnrichmentStartedEventPayload> {
  constructor(
    companyId: string,
    dataSources: readonly string[],
    enrichmentType: EnrichmentType,
    correlationId?: string
  ) {
    super(
      'company.enrichment.started',
      {
        companyId,
        dataSources,
        enrichmentType,
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Company'
  }
}

export interface CompanyEnrichmentStartedEventPayload {
  companyId: string
  dataSources: readonly string[]
  enrichmentType: EnrichmentType
  estimatedCompletion: Date
}

export type EnrichmentType = 'financial' | 'contact' | 'digital_footprint' | 'risk_assessment' | 'comprehensive'

export class CompanyEnrichmentCompletedEvent extends DomainEvent<CompanyEnrichmentCompletedEventPayload> {
  constructor(
    companyId: string,
    results: EnrichmentResults,
    correlationId?: string
  ) {
    super(
      'company.enrichment.completed',
      {
        companyId,
        results,
        processingTime: results.processingTime,
        dataQualityScore: results.dataQualityScore
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Company'
  }
}

export interface CompanyEnrichmentCompletedEventPayload {
  companyId: string
  results: EnrichmentResults
  processingTime: number
  dataQualityScore: number
}

export interface EnrichmentResults {
  successfulSources: readonly string[]
  failedSources: readonly FailedEnrichmentSource[]
  enrichedFields: readonly string[]
  dataQualityScore: number
  processingTime: number
  costs: {
    totalCost: number
    costBySource: Record<string, number>
  }
}

export interface FailedEnrichmentSource {
  source: string
  error: string
  isRetryable: boolean
}

export class CompanyEnrichmentFailedEvent extends DomainEvent<CompanyEnrichmentFailedEventPayload> {
  constructor(
    companyId: string,
    error: EnrichmentError,
    correlationId?: string
  ) {
    super(
      'company.enrichment.failed',
      {
        companyId,
        error,
        isRetryable: error.isRetryable,
        retryCount: error.retryCount || 0
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Company'
  }
}

export interface CompanyEnrichmentFailedEventPayload {
  companyId: string
  error: EnrichmentError
  isRetryable: boolean
  retryCount: number
}

export interface EnrichmentError {
  message: string
  source?: string
  errorCode?: string
  isRetryable: boolean
  retryCount?: number
  metadata?: Record<string, unknown>
}

// ==========================================
// COMPANY ANALYSIS EVENTS
// ==========================================

export class CompanyAnalysisCompletedEvent extends DomainEvent<CompanyAnalysisCompletedEventPayload> {
  constructor(
    companyId: string,
    analysis: CompanyAnalysisResult,
    correlationId?: string
  ) {
    super(
      'company.analysis.completed',
      {
        companyId,
        analysis,
        overallScore: analysis.overallScore,
        riskLevel: analysis.riskAssessment.riskLevel
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Company'
  }
}

export interface CompanyAnalysisCompletedEventPayload {
  companyId: string
  analysis: CompanyAnalysisResult
  overallScore: number
  riskLevel: RiskLevel
}

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
  metrics: {
    revenueGrowth?: number
    profitabilityScore?: number
    debtToEquityRatio?: number
    cashFlowScore?: number
  }
  indicators: readonly string[]
  concerns: readonly string[]
}

export interface RiskAssessmentResult {
  overallRiskScore: number
  riskLevel: RiskLevel
  riskFactors: readonly RiskFactor[]
  mitigationStrategies: readonly string[]
  redFlags: readonly string[]
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'

export interface RiskFactor {
  category: RiskCategory
  severity: RiskSeverity
  description: string
  impact: number
  likelihood: number
}

export type RiskCategory = 
  | 'financial'
  | 'operational'
  | 'regulatory'
  | 'market'
  | 'technology'
  | 'esg'

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface StrategicFitResult {
  score: number
  alignmentFactors: readonly AlignmentFactor[]
  synergyOpportunities: readonly string[]
  integrationComplexity: ComplexityLevel
}

export interface AlignmentFactor {
  category: string
  score: number
  description: string
  weight: number
}

export type ComplexityLevel = 'low' | 'medium' | 'high' | 'very_high'

export interface MarketPositionResult {
  competitivePosition: CompetitivePosition
  marketShare: number
  growthPotential: number
  competitiveAdvantages: readonly string[]
  threats: readonly string[]
}

export type CompetitivePosition = 'leader' | 'strong' | 'moderate' | 'weak' | 'niche'

// ==========================================
// INTEGRATION EVENTS
// ==========================================

export class CompanyDiscoveredIntegrationEvent extends IntegrationEvent<CompanyDiscoveredIntegrationEventPayload> {
  constructor(
    company: CompanyEntity,
    scanId: string,
    correlationId?: string
  ) {
    super(
      'integration.company.discovered',
      {
        companyId: company.id,
        scanId,
        name: company.name,
        country: company.country,
        confidenceScore: company.confidenceScore,
        source: company.sourceMetadata.source
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Company'
  }
}

export interface CompanyDiscoveredIntegrationEventPayload {
  companyId: string
  scanId: string
  name: string
  country: string
  confidenceScore: number
  source: string
}

export class CompanyAnalysisCompletedIntegrationEvent extends IntegrationEvent<CompanyAnalysisCompletedIntegrationEventPayload> {
  constructor(
    companyId: string,
    scanId: string,
    analysis: CompanyAnalysisResult,
    correlationId?: string
  ) {
    super(
      'integration.company.analysis.completed',
      {
        companyId,
        scanId,
        overallScore: analysis.overallScore,
        riskLevel: analysis.riskAssessment.riskLevel,
        recommendedAction: CompanyAnalysisCompletedIntegrationEvent.determineRecommendedAction(analysis)
      },
      correlationId
    )
  }

  private static determineRecommendedAction(analysis: CompanyAnalysisResult): RecommendedAction {
    if (analysis.overallScore >= 80 && analysis.riskAssessment.riskLevel !== 'critical') {
      return 'proceed'
    }
    if (analysis.overallScore >= 60 && analysis.riskAssessment.riskLevel !== 'high') {
      return 'investigate_further'
    }
    if (analysis.riskAssessment.riskLevel === 'critical' || analysis.overallScore < 40) {
      return 'reject'
    }
    return 'monitor'
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Company'
  }
}

export interface CompanyAnalysisCompletedIntegrationEventPayload {
  companyId: string
  scanId: string
  overallScore: number
  riskLevel: RiskLevel
  recommendedAction: RecommendedAction
}

export type RecommendedAction = 'proceed' | 'investigate_further' | 'monitor' | 'reject'

// ==========================================
// EVENT FACTORY
// ==========================================

export class CompanyEventFactory {
  static companyCreated(company: CompanyEntity, correlationId?: string): CompanyCreatedEvent {
    return new CompanyCreatedEvent(company, correlationId)
  }

  static companyUpdated(
    company: CompanyEntity,
    changes: CompanyUpdateChanges,
    correlationId?: string
  ): CompanyUpdatedEvent {
    return new CompanyUpdatedEvent(company, changes, correlationId)
  }

  static confidenceUpdated(
    companyId: string,
    oldScore: number,
    newScore: number,
    reason: string,
    correlationId?: string
  ): CompanyConfidenceUpdatedEvent {
    return new CompanyConfidenceUpdatedEvent(companyId, oldScore, newScore, reason, correlationId)
  }

  static enrichmentStarted(
    companyId: string,
    dataSources: readonly string[],
    enrichmentType: EnrichmentType,
    correlationId?: string
  ): CompanyEnrichmentStartedEvent {
    return new CompanyEnrichmentStartedEvent(companyId, dataSources, enrichmentType, correlationId)
  }

  static enrichmentCompleted(
    companyId: string,
    results: EnrichmentResults,
    correlationId?: string
  ): CompanyEnrichmentCompletedEvent {
    return new CompanyEnrichmentCompletedEvent(companyId, results, correlationId)
  }

  static enrichmentFailed(
    companyId: string,
    error: EnrichmentError,
    correlationId?: string
  ): CompanyEnrichmentFailedEvent {
    return new CompanyEnrichmentFailedEvent(companyId, error, correlationId)
  }

  static analysisCompleted(
    companyId: string,
    analysis: CompanyAnalysisResult,
    correlationId?: string
  ): CompanyAnalysisCompletedEvent {
    return new CompanyAnalysisCompletedEvent(companyId, analysis, correlationId)
  }
}