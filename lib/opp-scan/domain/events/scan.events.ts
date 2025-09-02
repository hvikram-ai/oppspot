/**
 * Scan Domain Events
 * Events related to scan lifecycle and progress
 */

import { DomainEvent, IntegrationEvent } from './domain-event.base'
import { ScanStage, CostBreakdown, ScanError } from '../../core/interfaces'

// ==========================================
// SCAN LIFECYCLE EVENTS
// ==========================================

export class ScanCreatedEvent extends DomainEvent<ScanCreatedEventPayload> {
  constructor(scan: { id: string; configuration: any }, correlationId?: string) {
    super(
      'scan.created',
      {
        scanId: scan.id,
        userId: scan.configuration.userId,
        name: scan.configuration.name,
        industries: scan.configuration.selectedIndustries,
        regions: scan.configuration.selectedRegions,
        dataSources: scan.configuration.dataSources,
        scanDepth: scan.configuration.scanDepth
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Scan'
  }
}

export interface ScanCreatedEventPayload {
  scanId: string
  userId: string
  name: string
  industries: readonly any[]
  regions: readonly any[]
  dataSources: readonly string[]
  scanDepth: string
}

export class ScanStartedEvent extends DomainEvent<ScanStartedEventPayload> {
  constructor(
    scanId: string,
    userId: string,
    startedAt: Date,
    estimatedCompletion?: Date,
    correlationId?: string
  ) {
    super(
      'scan.started',
      {
        scanId,
        userId,
        startedAt,
        estimatedCompletion
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Scan'
  }
}

export interface ScanStartedEventPayload {
  scanId: string
  userId: string
  startedAt: Date
  estimatedCompletion?: Date
}

export class ScanProgressUpdatedEvent extends DomainEvent<ScanProgressUpdatedEventPayload> {
  constructor(
    scanId: string,
    oldProgress: number,
    newProgress: number,
    oldStage: ScanStage,
    newStage: ScanStage,
    companiesDiscovered: number,
    companiesAnalyzed: number,
    correlationId?: string
  ) {
    super(
      'scan.progress.updated',
      {
        scanId,
        oldProgress,
        newProgress,
        progressDelta: newProgress - oldProgress,
        oldStage,
        newStage,
        companiesDiscovered,
        companiesAnalyzed,
        analysisRate: companiesDiscovered > 0 ? (companiesAnalyzed / companiesDiscovered) * 100 : 0
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Scan'
  }
}

export interface ScanProgressUpdatedEventPayload {
  scanId: string
  oldProgress: number
  newProgress: number
  progressDelta: number
  oldStage: ScanStage
  newStage: ScanStage
  companiesDiscovered: number
  companiesAnalyzed: number
  analysisRate: number
}

export class ScanCompletedEvent extends DomainEvent<ScanCompletedEventPayload> {
  constructor(
    scanId: string,
    completedAt: Date,
    duration: number,
    companiesDiscovered: number,
    companiesAnalyzed: number,
    finalCosts: CostBreakdown,
    correlationId?: string
  ) {
    super(
      'scan.completed',
      {
        scanId,
        completedAt,
        duration,
        companiesDiscovered,
        companiesAnalyzed,
        finalCosts,
        successRate: companiesDiscovered > 0 ? (companiesAnalyzed / companiesDiscovered) * 100 : 0,
        costEfficiency: finalCosts.totalCost > 0 ? companiesAnalyzed / finalCosts.totalCost : 0
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Scan'
  }
}

export interface ScanCompletedEventPayload {
  scanId: string
  completedAt: Date
  duration: number
  companiesDiscovered: number
  companiesAnalyzed: number
  finalCosts: CostBreakdown
  successRate: number
  costEfficiency: number
}

export class ScanFailedEvent extends DomainEvent<ScanFailedEventPayload> {
  constructor(
    scanId: string,
    error: ScanError,
    duration: number,
    progressAtFailure: number,
    companiesDiscovered: number,
    correlationId?: string
  ) {
    super(
      'scan.failed',
      {
        scanId,
        error,
        duration,
        progressAtFailure,
        companiesDiscovered,
        isRetryable: error.isRetryable,
        failureStage: this.determineFailureStage(progressAtFailure)
      },
      correlationId
    )
  }

  private determineFailureStage(progress: number): string {
    if (progress < 10) return 'initialization'
    if (progress < 30) return 'data_collection'
    if (progress < 60) return 'data_processing'
    if (progress < 90) return 'analysis'
    return 'finalization'
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Scan'
  }
}

export interface ScanFailedEventPayload {
  scanId: string
  error: ScanError
  duration: number
  progressAtFailure: number
  companiesDiscovered: number
  isRetryable: boolean
  failureStage: string
}

export class ScanCancelledEvent extends DomainEvent<ScanCancelledEventPayload> {
  constructor(
    scanId: string,
    reason: string,
    duration: number,
    progressAtCancellation: number,
    companiesDiscovered: number,
    correlationId?: string
  ) {
    super(
      'scan.cancelled',
      {
        scanId,
        reason,
        duration,
        progressAtCancellation,
        companiesDiscovered,
        cancellationStage: this.determineCancellationStage(progressAtCancellation)
      },
      correlationId
    )
  }

  private determineCancellationStage(progress: number): string {
    if (progress < 10) return 'initialization'
    if (progress < 30) return 'data_collection'
    if (progress < 60) return 'data_processing'
    if (progress < 90) return 'analysis'
    return 'finalization'
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Scan'
  }
}

export interface ScanCancelledEventPayload {
  scanId: string
  reason: string
  duration: number
  progressAtCancellation: number
  companiesDiscovered: number
  cancellationStage: string
}

// ==========================================
// SCAN STAGE EVENTS
// ==========================================

export class ScanStageStartedEvent extends DomainEvent<ScanStageStartedEventPayload> {
  constructor(
    scanId: string,
    stage: ScanStage,
    expectedDuration?: number,
    correlationId?: string
  ) {
    super(
      'scan.stage.started',
      {
        scanId,
        stage,
        expectedDuration,
        startedAt: new Date()
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Scan'
  }
}

export interface ScanStageStartedEventPayload {
  scanId: string
  stage: ScanStage
  expectedDuration?: number
  startedAt: Date
}

export class ScanStageCompletedEvent extends DomainEvent<ScanStageCompletedEventPayload> {
  constructor(
    scanId: string,
    stage: ScanStage,
    duration: number,
    itemsProcessed: number,
    errors: readonly ScanError[],
    correlationId?: string
  ) {
    super(
      'scan.stage.completed',
      {
        scanId,
        stage,
        duration,
        itemsProcessed,
        errorCount: errors.length,
        successRate: this.calculateSuccessRate(itemsProcessed, errors.length)
      },
      correlationId
    )
  }

  private calculateSuccessRate(itemsProcessed: number, errorCount: number): number {
    const totalItems = itemsProcessed + errorCount
    return totalItems > 0 ? (itemsProcessed / totalItems) * 100 : 100
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Scan'
  }
}

export interface ScanStageCompletedEventPayload {
  scanId: string
  stage: ScanStage
  duration: number
  itemsProcessed: number
  errorCount: number
  successRate: number
}

// ==========================================
// SCAN COST EVENTS
// ==========================================

export class ScanCostUpdatedEvent extends DomainEvent<ScanCostUpdatedEventPayload> {
  constructor(
    scanId: string,
    oldCosts: CostBreakdown,
    newCosts: CostBreakdown,
    correlationId?: string
  ) {
    super(
      'scan.cost.updated',
      {
        scanId,
        oldTotalCost: oldCosts.totalCost,
        newTotalCost: newCosts.totalCost,
        costIncrease: newCosts.totalCost - oldCosts.totalCost,
        currency: newCosts.currency,
        updatedSources: this.getUpdatedSources(oldCosts, newCosts)
      },
      correlationId
    )
  }

  private getUpdatedSources(oldCosts: CostBreakdown, newCosts: CostBreakdown): string[] {
    const updated: string[] = []
    
    for (const [source, newCost] of Object.entries(newCosts.costBySource)) {
      const oldCost = oldCosts.costBySource[source] || 0
      if (newCost !== oldCost) {
        updated.push(source)
      }
    }
    
    return updated
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Scan'
  }
}

export interface ScanCostUpdatedEventPayload {
  scanId: string
  oldTotalCost: number
  newTotalCost: number
  costIncrease: number
  currency: string
  updatedSources: readonly string[]
}

export class ScanBudgetExceededEvent extends DomainEvent<ScanBudgetExceededEventPayload> {
  constructor(
    scanId: string,
    budgetLimit: number,
    actualCost: number,
    exceedingSource: string,
    correlationId?: string
  ) {
    super(
      'scan.budget.exceeded',
      {
        scanId,
        budgetLimit,
        actualCost,
        overageAmount: actualCost - budgetLimit,
        overagePercentage: ((actualCost - budgetLimit) / budgetLimit) * 100,
        exceedingSource
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Scan'
  }
}

export interface ScanBudgetExceededEventPayload {
  scanId: string
  budgetLimit: number
  actualCost: number
  overageAmount: number
  overagePercentage: number
  exceedingSource: string
}

// ==========================================
// SCAN ERROR EVENTS
// ==========================================

export class ScanErrorOccurredEvent extends DomainEvent<ScanErrorOccurredEventPayload> {
  constructor(
    scanId: string,
    error: ScanError,
    stage: ScanStage,
    correlationId?: string
  ) {
    super(
      'scan.error.occurred',
      {
        scanId,
        error,
        stage,
        isRetryable: error.isRetryable,
        requiresIntervention: error.severity === 'critical'
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Scan'
  }
}

export interface ScanErrorOccurredEventPayload {
  scanId: string
  error: ScanError
  stage: ScanStage
  isRetryable: boolean
  requiresIntervention: boolean
}

// ==========================================
// INTEGRATION EVENTS
// ==========================================

export class ScanCompletedIntegrationEvent extends IntegrationEvent<ScanCompletedIntegrationEventPayload> {
  constructor(
    scanId: string,
    userId: string,
    results: ScanResults,
    correlationId?: string
  ) {
    super(
      'integration.scan.completed',
      {
        scanId,
        userId,
        results,
        recommendations: this.generateRecommendations(results)
      },
      correlationId
    )
  }

  private generateRecommendations(results: ScanResults): readonly string[] {
    const recommendations: string[] = []
    
    if (results.highQualityTargets > 0) {
      recommendations.push(`${results.highQualityTargets} high-quality targets identified for immediate follow-up`)
    }
    
    if (results.costEfficiency < 0.5) {
      recommendations.push('Consider optimizing data source selection to improve cost efficiency')
    }
    
    if (results.errorRate > 10) {
      recommendations.push('High error rate detected - review data source configurations')
    }
    
    return recommendations
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Scan'
  }
}

export interface ScanCompletedIntegrationEventPayload {
  scanId: string
  userId: string
  results: ScanResults
  recommendations: readonly string[]
}

export interface ScanResults {
  companiesDiscovered: number
  companiesAnalyzed: number
  highQualityTargets: number
  totalCost: number
  duration: number
  errorRate: number
  costEfficiency: number
}

export class ScanFailedIntegrationEvent extends IntegrationEvent<ScanFailedIntegrationEventPayload> {
  constructor(
    scanId: string,
    userId: string,
    error: ScanError,
    partialResults: Partial<ScanResults>,
    correlationId?: string
  ) {
    super(
      'integration.scan.failed',
      {
        scanId,
        userId,
        error,
        partialResults,
        shouldRetry: error.isRetryable && error.severity !== 'critical',
        supportTicketRequired: error.severity === 'critical'
      },
      correlationId
    )
  }

  protected getEventVersion(): string {
    return '1.0'
  }

  protected getAggregateType(): string {
    return 'Scan'
  }
}

export interface ScanFailedIntegrationEventPayload {
  scanId: string
  userId: string
  error: ScanError
  partialResults: Partial<ScanResults>
  shouldRetry: boolean
  supportTicketRequired: boolean
}

// ==========================================
// EVENT FACTORY
// ==========================================

export class ScanEventFactory {
  static scanCreated(scan: { id: string; configuration: any }, correlationId?: string): ScanCreatedEvent {
    return new ScanCreatedEvent(scan, correlationId)
  }

  static scanStarted(
    scanId: string,
    userId: string,
    startedAt: Date,
    estimatedCompletion?: Date,
    correlationId?: string
  ): ScanStartedEvent {
    return new ScanStartedEvent(scanId, userId, startedAt, estimatedCompletion, correlationId)
  }

  static progressUpdated(
    scanId: string,
    oldProgress: number,
    newProgress: number,
    oldStage: ScanStage,
    newStage: ScanStage,
    companiesDiscovered: number,
    companiesAnalyzed: number,
    correlationId?: string
  ): ScanProgressUpdatedEvent {
    return new ScanProgressUpdatedEvent(
      scanId,
      oldProgress,
      newProgress,
      oldStage,
      newStage,
      companiesDiscovered,
      companiesAnalyzed,
      correlationId
    )
  }

  static scanCompleted(
    scanId: string,
    completedAt: Date,
    duration: number,
    companiesDiscovered: number,
    companiesAnalyzed: number,
    finalCosts: CostBreakdown,
    correlationId?: string
  ): ScanCompletedEvent {
    return new ScanCompletedEvent(
      scanId,
      completedAt,
      duration,
      companiesDiscovered,
      companiesAnalyzed,
      finalCosts,
      correlationId
    )
  }

  static scanFailed(
    scanId: string,
    error: ScanError,
    duration: number,
    progressAtFailure: number,
    companiesDiscovered: number,
    correlationId?: string
  ): ScanFailedEvent {
    return new ScanFailedEvent(scanId, error, duration, progressAtFailure, companiesDiscovered, correlationId)
  }

  static scanCancelled(
    scanId: string,
    reason: string,
    duration: number,
    progressAtCancellation: number,
    companiesDiscovered: number,
    correlationId?: string
  ): ScanCancelledEvent {
    return new ScanCancelledEvent(scanId, reason, duration, progressAtCancellation, companiesDiscovered, correlationId)
  }
}