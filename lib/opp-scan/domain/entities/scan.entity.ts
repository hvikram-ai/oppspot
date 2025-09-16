/**
 * Scan Domain Entity
 * Represents the core business object for acquisition intelligence scans
 */

import { DomainEvent } from '../events/domain-event.base'
import { 
  ScanCreatedEvent, 
  ScanStartedEvent, 
  ScanProgressUpdatedEvent,
  ScanCompletedEvent,
  ScanFailedEvent,
  ScanCancelledEvent
} from '../events/scan.events'
import { 
  ScanConfiguration, 
  ScanStatus, 
  ScanStage, 
  CostBreakdown,
  ScanError,
  ErrorSeverity 
} from '../../core/interfaces'

export class ScanEntity {
  private _domainEvents: DomainEvent[] = []
  
  constructor(
    private readonly _id: string,
    private readonly _configuration: ScanConfiguration,
    private _status: ScanStatus = 'configuring',
    private _progress: number = 0,
    private _currentStage: ScanStage = 'initialization',
    private _companiesDiscovered: number = 0,
    private _companiesAnalyzed: number = 0,
    private _errors: ScanError[] = [],
    private _costs: CostBreakdown = { totalCost: 0, currency: 'GBP', costBySource: {}, requestCounts: {} },
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
    private _startedAt?: Date,
    private _completedAt?: Date,
    private _estimatedCompletion?: Date
  ) {
    this.validateConfiguration(_configuration)
    
    // Raise domain event for new scan creation
    if (this._createdAt.getTime() === this._updatedAt.getTime()) {
      this.addDomainEvent(new ScanCreatedEvent(this))
    }
  }

  // Getters
  get id(): string { return this._id }
  get configuration(): ScanConfiguration { return this._configuration }
  get status(): ScanStatus { return this._status }
  get progress(): number { return this._progress }
  get currentStage(): ScanStage { return this._currentStage }
  get companiesDiscovered(): number { return this._companiesDiscovered }
  get companiesAnalyzed(): number { return this._companiesAnalyzed }
  get errors(): readonly ScanError[] { return this._errors }
  get costs(): CostBreakdown { return this._costs }
  get createdAt(): Date { return this._createdAt }
  get updatedAt(): Date { return this._updatedAt }
  get startedAt(): Date | undefined { return this._startedAt }
  get completedAt(): Date | undefined { return this._completedAt }
  get estimatedCompletion(): Date | undefined { return this._estimatedCompletion }
  get domainEvents(): readonly DomainEvent[] { return this._domainEvents }

  // Business methods
  start(estimatedCompletion?: Date): void {
    this.validateCanStart()
    
    this._status = 'scanning'
    this._currentStage = 'initialization'
    this._progress = 0
    this._startedAt = new Date()
    this._estimatedCompletion = estimatedCompletion
    this._updatedAt = new Date()
    
    this.addDomainEvent(new ScanStartedEvent(
      this._id,
      this._configuration.userId,
      this._startedAt,
      estimatedCompletion
    ))
  }

  updateProgress(
    progress: number, 
    stage: ScanStage, 
    companiesDiscovered?: number,
    companiesAnalyzed?: number
  ): void {
    this.validateCanUpdateProgress()
    this.validateProgress(progress)
    
    const oldProgress = this._progress
    const oldStage = this._currentStage
    
    this._progress = progress
    this._currentStage = stage
    
    if (companiesDiscovered !== undefined && companiesDiscovered >= this._companiesDiscovered) {
      this._companiesDiscovered = companiesDiscovered
    }
    
    if (companiesAnalyzed !== undefined && companiesAnalyzed >= this._companiesAnalyzed) {
      this._companiesAnalyzed = companiesAnalyzed
    }
    
    this._updatedAt = new Date()
    
    // Update estimated completion based on progress
    this.updateEstimatedCompletion()
    
    this.addDomainEvent(new ScanProgressUpdatedEvent(
      this._id,
      oldProgress,
      progress,
      oldStage,
      stage,
      this._companiesDiscovered,
      this._companiesAnalyzed
    ))
  }

  complete(finalCosts: CostBreakdown): void {
    this.validateCanComplete()
    
    this._status = 'completed'
    this._progress = 100
    this._currentStage = 'finalization'
    this._completedAt = new Date()
    this._costs = finalCosts
    this._updatedAt = new Date()
    
    this.addDomainEvent(new ScanCompletedEvent(
      this._id,
      this._completedAt,
      this.getDuration(),
      this._companiesDiscovered,
      this._companiesAnalyzed,
      finalCosts
    ))
  }

  fail(error: ScanError): void {
    this.validateCanFail()
    
    this._status = 'failed'
    this._completedAt = new Date()
    this._updatedAt = new Date()
    
    this.addError(error)
    
    this.addDomainEvent(new ScanFailedEvent(
      this._id,
      error,
      this.getDuration(),
      this._progress,
      this._companiesDiscovered
    ))
  }

  cancel(reason: string): void {
    this.validateCanCancel()
    
    this._status = 'cancelled'
    this._completedAt = new Date()
    this._updatedAt = new Date()
    
    this.addDomainEvent(new ScanCancelledEvent(
      this._id,
      reason,
      this.getDuration(),
      this._progress,
      this._companiesDiscovered
    ))
  }

  pause(): void {
    this.validateCanPause()
    
    this._status = 'paused'
    this._updatedAt = new Date()
  }

  resume(): void {
    this.validateCanResume()
    
    this._status = 'scanning'
    this._updatedAt = new Date()
  }

  addError(error: ScanError): void {
    this._errors.push(error)
    this._updatedAt = new Date()
    
    // If critical error, consider failing the scan
    if (error.severity === 'critical' && this._status === 'scanning') {
      this.fail(error)
    }
  }

  updateCosts(costs: CostBreakdown): void {
    this._costs = {
      ...costs,
      totalCost: Math.max(this._costs.totalCost, costs.totalCost) // Ensure costs only increase
    }
    this._updatedAt = new Date()
  }

  // Business logic methods
  isInProgress(): boolean {
    return ['scanning', 'analyzing'].includes(this._status)
  }

  isCompleted(): boolean {
    return this._status === 'completed'
  }

  isFailed(): boolean {
    return this._status === 'failed'
  }

  isCancelled(): boolean {
    return this._status === 'cancelled'
  }

  canBeCancelled(): boolean {
    return ['configuring', 'queued', 'scanning', 'analyzing', 'paused'].includes(this._status)
  }

  canBePaused(): boolean {
    return ['scanning', 'analyzing'].includes(this._status)
  }

  canBeResumed(): boolean {
    return this._status === 'paused'
  }

  hasErrors(): boolean {
    return this._errors.length > 0
  }

  hasCriticalErrors(): boolean {
    return this._errors.some(error => error.severity === 'critical')
  }

  getHighSeverityErrors(): readonly ScanError[] {
    return this._errors.filter(error => error.severity === 'high' || error.severity === 'critical')
  }

  getDuration(): number {
    if (!this._startedAt) return 0
    
    const endTime = this._completedAt || new Date()
    return endTime.getTime() - this._startedAt.getTime()
  }

  getEfficiencyScore(): number {
    if (this._companiesDiscovered === 0) return 0
    return (this._companiesAnalyzed / this._companiesDiscovered) * 100
  }

  getCostEfficiency(): number {
    if (this._costs.totalCost === 0 || this._companiesAnalyzed === 0) return 0
    return this._companiesAnalyzed / this._costs.totalCost
  }

  getEstimatedTimeRemaining(): number | null {
    if (!this._estimatedCompletion || this.isCompleted() || this.isFailed()) return null
    return Math.max(0, this._estimatedCompletion.getTime() - new Date().getTime())
  }

  // Validation methods
  private validateConfiguration(config: ScanConfiguration): void {
    if (!config.id || config.id.trim().length === 0) {
      throw new Error('Scan configuration must have a valid ID')
    }
    
    if (!config.userId || config.userId.trim().length === 0) {
      throw new Error('Scan configuration must have a valid user ID')
    }
    
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Scan configuration must have a valid name')
    }
    
    if (!config.selectedIndustries || config.selectedIndustries.length === 0) {
      throw new Error('Scan configuration must have at least one selected industry')
    }
    
    if (!config.selectedRegions || config.selectedRegions.length === 0) {
      throw new Error('Scan configuration must have at least one selected region')
    }
    
    if (!config.dataSources || config.dataSources.length === 0) {
      throw new Error('Scan configuration must have at least one data source')
    }
  }

  private validateCanStart(): void {
    if (this._status !== 'configuring' && this._status !== 'failed') {
      throw new Error(`Cannot start scan in ${this._status} status`)
    }
  }

  private validateCanUpdateProgress(): void {
    if (!this.isInProgress() && this._status !== 'paused') {
      throw new Error(`Cannot update progress for scan in ${this._status} status`)
    }
  }

  private validateCanComplete(): void {
    if (!this.isInProgress()) {
      throw new Error(`Cannot complete scan in ${this._status} status`)
    }
  }

  private validateCanFail(): void {
    if (this.isCompleted() || this.isFailed() || this.isCancelled()) {
      throw new Error(`Cannot fail scan in ${this._status} status`)
    }
  }

  private validateCanCancel(): void {
    if (!this.canBeCancelled()) {
      throw new Error(`Cannot cancel scan in ${this._status} status`)
    }
  }

  private validateCanPause(): void {
    if (!this.canBePaused()) {
      throw new Error(`Cannot pause scan in ${this._status} status`)
    }
  }

  private validateCanResume(): void {
    if (!this.canBeResumed()) {
      throw new Error(`Cannot resume scan in ${this._status} status`)
    }
  }

  private validateProgress(progress: number): void {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100')
    }
    
    if (progress < this._progress) {
      throw new Error('Progress cannot decrease')
    }
  }

  private updateEstimatedCompletion(): void {
    if (this._progress > 0 && this._startedAt && !this._completedAt) {
      const elapsed = new Date().getTime() - this._startedAt.getTime()
      const totalEstimated = (elapsed / this._progress) * 100
      const remainingEstimated = totalEstimated - elapsed
      
      this._estimatedCompletion = new Date(new Date().getTime() + remainingEstimated)
    }
  }

  // Domain event management
  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  markEventsAsHandled(): void {
    this._domainEvents.length = 0
  }

  // Factory methods
  static create(
    id: string,
    configuration: ScanConfiguration,
    estimatedCompletion?: Date
  ): ScanEntity {
    const scan = new ScanEntity(id, configuration)
    
    if (estimatedCompletion) {
      scan._estimatedCompletion = estimatedCompletion
    }
    
    return scan
  }

  static fromSnapshot(
    id: string,
    configuration: ScanConfiguration,
    status: ScanStatus,
    progress: number,
    currentStage: ScanStage,
    companiesDiscovered: number,
    companiesAnalyzed: number,
    errors: ScanError[],
    costs: CostBreakdown,
    createdAt: Date,
    updatedAt: Date,
    startedAt?: Date,
    completedAt?: Date,
    estimatedCompletion?: Date
  ): ScanEntity {
    return new ScanEntity(
      id,
      configuration,
      status,
      progress,
      currentStage,
      companiesDiscovered,
      companiesAnalyzed,
      errors,
      costs,
      createdAt,
      updatedAt,
      startedAt,
      completedAt,
      estimatedCompletion
    )
  }

  // Serialization
  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      configuration: this._configuration,
      status: this._status,
      progress: this._progress,
      currentStage: this._currentStage,
      companiesDiscovered: this._companiesDiscovered,
      companiesAnalyzed: this._companiesAnalyzed,
      errors: this._errors,
      costs: this._costs,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      startedAt: this._startedAt?.toISOString(),
      completedAt: this._completedAt?.toISOString(),
      estimatedCompletion: this._estimatedCompletion?.toISOString()
    }
  }

  static fromJSON(data: Record<string, unknown>): ScanEntity {
    return ScanEntity.fromSnapshot(
      data.id,
      data.configuration,
      data.status,
      data.progress,
      data.currentStage,
      data.companiesDiscovered,
      data.companiesAnalyzed,
      data.errors || [],
      data.costs || { totalCost: 0, currency: 'GBP', costBySource: {}, requestCounts: {} },
      new Date(data.createdAt),
      new Date(data.updatedAt),
      data.startedAt ? new Date(data.startedAt) : undefined,
      data.completedAt ? new Date(data.completedAt) : undefined,
      data.estimatedCompletion ? new Date(data.estimatedCompletion) : undefined
    )
  }
}