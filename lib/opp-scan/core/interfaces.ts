/**
 * Core Interfaces and Abstractions
 * Defines contracts for all major system components
 */

// ==========================================
// DOMAIN TYPES
// ==========================================

export interface CompanyEntity {
  readonly id: string
  readonly name: string
  readonly registrationNumber?: string
  readonly country: string
  readonly industryCodes: readonly string[]
  readonly website?: string
  readonly description?: string
  readonly employeeCount?: string
  readonly revenueEstimate?: number
  readonly foundingYear?: number
  readonly address?: Address
  readonly contactInfo?: ContactInfo
  readonly confidenceScore: number
  readonly sourceMetadata: SourceMetadata
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface Address {
  readonly street?: string
  readonly city?: string
  readonly region?: string
  readonly postalCode?: string
  readonly country: string
}

export interface ContactInfo {
  readonly phone?: string
  readonly email?: string
  readonly website?: string
}

export interface SourceMetadata {
  readonly source: string
  readonly discoveredAt: Date
  readonly searchTerms?: readonly string[]
  readonly confidence: number
  readonly rawData?: Record<string, unknown>
}

export interface ScanConfiguration {
  readonly id: string
  readonly userId: string
  readonly orgId?: string
  readonly name: string
  readonly description?: string
  readonly selectedIndustries: readonly IndustrySelection[]
  readonly selectedRegions: readonly RegionSelection[]
  readonly dataSources: readonly string[]
  readonly scanDepth: ScanDepth
  readonly requiredCapabilities: readonly string[]
  readonly strategicObjectives?: Record<string, unknown>
  readonly budget?: BudgetConstraints
}

export interface IndustrySelection {
  readonly sicCode: string
  readonly industry: string
  readonly subcategory?: string
}

export interface RegionSelection {
  readonly id: string
  readonly name: string
  readonly country: string
}

export type ScanDepth = 'basic' | 'detailed' | 'comprehensive'

export interface BudgetConstraints {
  readonly maxCost: number
  readonly currency: string
  readonly alertThresholds: {
    readonly warning: number
    readonly critical: number
  }
}

// ==========================================
// DATA SOURCE ABSTRACTIONS
// ==========================================

export interface IDataSourceProvider {
  readonly id: string
  readonly name: string
  readonly capabilities: readonly DataSourceCapability[]
  readonly supportedRegions: readonly string[]
  readonly costModel: CostModel
  readonly reliability: number

  search(criteria: SearchCriteria, options?: SearchOptions): AsyncIterator<CompanyEntity>
  getCompanyDetails(id: string): Promise<CompanyEntity | null>
  getRateLimit(): RateLimitInfo
  getHealthStatus(): Promise<HealthStatus>
  testConnection(): Promise<ConnectionTestResult>
}

export interface DataSourceCapability {
  readonly type: DataType
  readonly confidence: number
  readonly costPerRequest: number
}

export type DataType = 
  | 'company_details' 
  | 'officers' 
  | 'financial_data' 
  | 'filings' 
  | 'patents_ip'
  | 'digital_footprint'
  | 'news_sentiment'

export interface SearchCriteria {
  readonly industries?: readonly IndustrySelection[]
  readonly regions?: readonly RegionSelection[]
  readonly companyTypes?: readonly string[]
  readonly minIncorporationYear?: number
  readonly maxIncorporationYear?: number
  readonly minEmployeeCount?: number
  readonly maxEmployeeCount?: number
  readonly keywords?: readonly string[]
}

export interface SearchOptions {
  readonly maxResults?: number
  readonly includeInactive?: boolean
  readonly minConfidence?: number
  readonly timeout?: number
}

export interface CostModel {
  readonly freeRequestsPerMonth: number
  readonly costPerRequest: number
  readonly bulkDiscounts?: readonly BulkDiscount[]
  readonly currency: string
}

export interface BulkDiscount {
  readonly minQuantity: number
  readonly discountPercentage: number
}

export interface RateLimitInfo {
  readonly requestsPerSecond: number
  readonly requestsPerMinute: number
  readonly requestsPerHour?: number
  readonly remainingRequests?: number
  readonly resetTime?: Date
}

export interface HealthStatus {
  readonly isHealthy: boolean
  readonly responseTime: number
  readonly lastChecked: Date
  readonly error?: string
  readonly uptime: number
}

export interface ConnectionTestResult {
  readonly success: boolean
  readonly message: string
  readonly responseTime: number
  readonly features?: readonly string[]
}

// ==========================================
// SCAN ENGINE ABSTRACTIONS
// ==========================================

export interface IScanEngine {
  executeScan(configuration: ScanConfiguration): Promise<ScanResult>
  pauseScan(scanId: string): Promise<void>
  resumeScan(scanId: string): Promise<void>
  cancelScan(scanId: string): Promise<void>
  getScanProgress(scanId: string): Promise<ScanProgress>
}

export interface ScanResult {
  readonly scanId: string
  readonly status: ScanStatus
  readonly progress: ScanProgress
  readonly companies: readonly CompanyEntity[]
  readonly analysis: ScanAnalysis
  readonly costs: CostBreakdown
  readonly errors: readonly ScanError[]
  readonly completedAt?: Date
  readonly duration: number
}

export interface ScanProgress {
  readonly scanId: string
  readonly status: ScanStatus
  readonly percentage: number
  readonly currentStage: ScanStage
  readonly estimatedCompletion?: Date
  readonly processedCompanies: number
  readonly totalCompanies: number
  readonly errors: number
}

export type ScanStatus = 
  | 'configuring'
  | 'queued' 
  | 'scanning'
  | 'analyzing'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled'

export type ScanStage = 
  | 'initialization'
  | 'data_collection'
  | 'data_processing'
  | 'deduplication'
  | 'analysis'
  | 'report_generation'
  | 'finalization'

export interface ScanAnalysis {
  readonly summary: AnalysisSummary
  readonly financialMetrics: FinancialMetrics
  readonly riskAssessment: RiskAssessment
  readonly marketIntelligence: MarketIntelligence
}

export interface AnalysisSummary {
  readonly totalTargets: number
  readonly analyzedTargets: number
  readonly avgOverallScore: number
  readonly highQualityTargets: number
  readonly recommendations: readonly string[]
}

// ==========================================
// REPOSITORY ABSTRACTIONS
// ==========================================

export interface IScanRepository {
  findById(id: string): Promise<any | null>
  findByUserId(userId: string): Promise<any[]>
  findByStatus(status: ScanStatus): Promise<any[]>
  save(scan: any): Promise<void>
  update(scan: any): Promise<void>
  delete(id: string): Promise<void>
}

export interface ICompanyRepository {
  findById(id: string): Promise<any | null>
  findByUserId(userId: string): Promise<any[]>
  save(company: any): Promise<void>
  update(company: any): Promise<void>
  delete(id: string): Promise<void>
}

// ==========================================
// SERVICE ABSTRACTIONS
// ==========================================

export interface IDataCollectionService {
  collectData(params: any): Promise<any>
}

export interface ICompanyAnalysisService {
  analyzeCompany(company: any): Promise<any>
}

export interface IScanOrchestrationService {
  orchestrateScan(scanId: string): Promise<any>
}

export interface ICacheService {
  get(key: string): Promise<any>
  set(key: string, value: any, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
}

export interface IRateLimitingService {
  checkLimit(key: string): Promise<boolean>
  increment(key: string): Promise<void>
}

export interface ICostManagementService {
  trackCost(scanId: string, cost: number): Promise<void>
  getCost(scanId: string): Promise<number>
}

// ==========================================
// EVENT STORE
// ==========================================

export interface IEventStore {
  append(streamId: string, events: any[]): Promise<void>
  getEvents(streamId: string): Promise<any[]>
}

// ==========================================
// CONTAINER
// ==========================================

export interface IContainer {
  register<T>(name: string, factory: () => T): void
  resolve<T>(name: string): T
}

// ==========================================
// USE CASE
// ==========================================

export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>
}

// ==========================================
// PIPELINE ABSTRACTIONS
// ==========================================

export interface IScanPipeline {
  readonly stages: readonly IPipelineStage[]
  execute(context: ScanContext): Promise<PipelineResult>
  addStage(stage: IPipelineStage): void
  removeStage(stageName: string): void
}

export interface IPipelineStage {
  readonly name: string
  readonly order: number
  readonly canSkip: boolean
  execute(context: ScanContext): Promise<StageResult>
  rollback?(context: ScanContext): Promise<void>
  validate?(context: ScanContext): Promise<ValidationResult>
}

export interface ScanContext {
  readonly scanId: string
  readonly configuration: ScanConfiguration
  readonly userData: Map<string, unknown>
  readonly logger: ILogger
  readonly cancellationToken: CancellationToken
  
  // Mutable state
  companies: CompanyEntity[]
  errors: ScanError[]
  progress: number
  currentStage: string
  costs: CostBreakdown
}

export interface StageResult {
  readonly success: boolean
  readonly duration: number
  readonly itemsProcessed: number
  readonly errors: readonly ScanError[]
  readonly metadata?: Record<string, unknown>
}

export interface PipelineResult {
  readonly success: boolean
  readonly totalDuration: number
  readonly stageResults: readonly StageResult[]
  readonly finalContext: ScanContext
}

export interface ValidationResult {
  readonly isValid: boolean
  readonly errors: readonly string[]
  readonly warnings: readonly string[]
}

// ==========================================
// COST MANAGEMENT ABSTRACTIONS
// ==========================================

export interface ICostTracker {
  trackUsage(usage: UsageEvent): Promise<void>
  getBudgetStatus(userId: string): Promise<BudgetStatus>
  checkAffordability(userId: string, estimatedCost: number): Promise<AffordabilityCheck>
  getOptimizationRecommendations(userId: string): Promise<readonly CostOptimization[]>
  createBudget(budget: CreateBudgetRequest): Promise<Budget>
  updateBudget(budgetId: string, updates: Partial<Budget>): Promise<Budget>
}

export interface UsageEvent {
  readonly userId: string
  readonly orgId?: string
  readonly scanId?: string
  readonly dataSource: string
  readonly transactionType: TransactionType
  readonly cost: number
  readonly currency: string
  readonly requestCount: number
  readonly dataVolume?: number
  readonly metadata: Record<string, unknown>
}

export type TransactionType = 'api_call' | 'data_enrichment' | 'analysis' | 'report_generation'

export interface Budget {
  readonly id: string
  readonly userId: string
  readonly orgId?: string
  readonly budgetType: BudgetType
  readonly totalBudget: number
  readonly remainingBudget: number
  readonly currency: string
  readonly period: BudgetPeriod
  readonly alerts: BudgetAlerts
  readonly isActive: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

export type BudgetType = 'user' | 'organization' | 'scan'
export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time'

export interface BudgetAlerts {
  readonly warningThreshold: number
  readonly criticalThreshold: number
  readonly emailNotifications: boolean
}

export interface BudgetStatus {
  readonly totalBudget: number
  readonly remainingBudget: number
  readonly utilizationPercentage: number
  readonly projectedMonthlySpend: number
  readonly alerts: readonly BudgetAlert[]
}

export interface AffordabilityCheck {
  readonly canAfford: boolean
  readonly estimatedCost: number
  readonly budgetImpact: BudgetImpact
  readonly recommendations: readonly string[]
}

export interface BudgetImpact {
  readonly currentUtilization: number
  readonly postTransactionUtilization: number
  readonly remainingBudget: number
}

// ==========================================
// JOB QUEUE ABSTRACTIONS
// ==========================================

export interface IJobQueue {
  enqueue<T>(job: JobDefinition<T>): Promise<JobHandle>
  dequeue(): Promise<JobDefinition<unknown> | null>
  getJobStatus(jobId: string): Promise<JobStatus>
  cancelJob(jobId: string): Promise<boolean>
  getQueueStats(): Promise<QueueStatistics>
}

export interface JobDefinition<T = unknown> {
  readonly id: string
  readonly type: string
  readonly payload: T
  readonly priority: JobPriority
  readonly retryCount: number
  readonly maxRetries: number
  readonly timeout: number
  readonly scheduledAt?: Date
  readonly metadata: Record<string, unknown>
}

export type JobPriority = 'low' | 'normal' | 'high' | 'critical'

export interface JobHandle {
  readonly id: string
  readonly estimatedCompletion: Date
  readonly queuePosition: number
}

export interface JobStatus {
  readonly id: string
  readonly status: JobState
  readonly progress: number
  readonly result?: unknown
  readonly error?: string
  readonly createdAt: Date
  readonly startedAt?: Date
  readonly completedAt?: Date
}

export type JobState = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'

// ==========================================
// INFRASTRUCTURE ABSTRACTIONS
// ==========================================

export interface ILogger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, error?: Error, meta?: Record<string, unknown>): void
  createChildLogger(context: Record<string, unknown>): ILogger
}

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  exists(key: string): Promise<boolean>
}

export interface IEventBus {
  publish<T>(event: DomainEvent<T>): Promise<void>
  subscribe<T>(eventType: string, handler: EventHandler<T>): void
  unsubscribe<T>(eventType: string, handler: EventHandler<T>): void
}

export interface DomainEvent<T = unknown> {
  readonly id: string
  readonly type: string
  readonly payload: T
  readonly timestamp: Date
  readonly correlationId?: string
  readonly causationId?: string
  readonly metadata: Record<string, unknown>
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void> | void

export interface CancellationToken {
  readonly isCancelled: boolean
  onCancelled(callback: () => void): void
  throwIfCancelled(): void
}

// ==========================================
// ERROR TYPES
// ==========================================

export interface ScanError {
  readonly id: string
  readonly type: ErrorType
  readonly severity: ErrorSeverity
  readonly message: string
  readonly source?: string
  readonly timestamp: Date
  readonly metadata?: Record<string, unknown>
  readonly isRetryable: boolean
}

export type ErrorType = 
  | 'api_error'
  | 'network_error' 
  | 'rate_limit_error'
  | 'validation_error'
  | 'business_error'
  | 'system_error'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface CostBreakdown {
  readonly totalCost: number
  readonly currency: string
  readonly costBySource: Record<string, number>
  readonly requestCounts: Record<string, number>
  readonly estimatedSavings?: number
}

export interface FinancialMetrics {
  readonly avgRevenue: number
  readonly avgEbitdaMargin: number
  readonly avgGrowthRate: number
  readonly totalMarketValue: number
}

export interface RiskAssessment {
  readonly avgRiskScore: number
  readonly highRiskCompanies: number
  readonly criticalRiskFactors: readonly string[]
  readonly mitigationStrategies: readonly string[]
}

export interface MarketIntelligence {
  readonly marketSize: number
  readonly growthRate: number
  readonly competitiveIntensity: number
  readonly keyTrends: readonly string[]
}

export interface CostOptimization {
  readonly type: OptimizationType
  readonly title: string
  readonly description: string
  readonly potentialSavings: number
  readonly implementationEffort: ImplementationEffort
  readonly priority: OptimizationPriority
}

export type OptimizationType = 'data_source' | 'scan_frequency' | 'scan_depth' | 'budget'
export type ImplementationEffort = 'low' | 'medium' | 'high'
export type OptimizationPriority = 'low' | 'medium' | 'high' | 'critical'

export interface CreateBudgetRequest {
  readonly userId: string
  readonly orgId?: string
  readonly budgetType: BudgetType
  readonly totalBudget: number
  readonly currency: string
  readonly period: BudgetPeriod
  readonly alerts: BudgetAlerts
}

export interface BudgetAlert {
  readonly type: 'warning' | 'critical'
  readonly message: string
  readonly threshold: number
  readonly currentUtilization: number
}

export interface QueueStatistics {
  readonly totalJobs: number
  readonly queuedJobs: number
  readonly processingJobs: number
  readonly completedJobs: number
  readonly failedJobs: number
  readonly averageProcessingTime: number
  readonly throughput: number
}