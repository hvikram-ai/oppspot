/**
 * Scan Orchestration Service
 * Replaces the monolithic ScanningEngine with focused, composable pipeline stages
 */

import {
  IScanOrchestrationService,
  IDataCollectionService,
  ICompanyAnalysisService,
  ICostManagementService,
  IScanRepository,
  IEventBus,
  ScanConfiguration,
  ScanResult,
  CompanyEntity,
  CompanyAnalysisResult
} from '../../core/interfaces'
import { ScanEntity } from '../../domain/entities/scan.entity'

export class ScanOrchestrationService implements IScanOrchestrationService {
  constructor(
    private readonly dataCollectionService: IDataCollectionService,
    private readonly analysisService: ICompanyAnalysisService,
    private readonly costService: ICostManagementService & {
      calculateFinalCosts?: (scanId: string) => Promise<any>
      getCurrentCosts?: (scanId: string) => Promise<any>
      estimateCost?: (config: ScanConfiguration) => Promise<any>
    },
    private readonly scanRepository: IScanRepository & {
      findActiveScans?: () => Promise<any[]>
    },
    private readonly eventBus: IEventBus
  ) {}

  async executeScan(scanId: string): Promise<ScanResult> {
    const scan = await this.scanRepository.findById(scanId)
    if (!scan) {
      throw new Error(`Scan ${scanId} not found`)
    }

    const startTime = Date.now()
    
    try {
      // Phase 1: Initialization
      scan.updateProgress(5, 'initialization')
      await this.saveAndPublishEvents(scan)

      // Phase 2: Data Collection (parallel execution)
      scan.updateProgress(10, 'data_collection')
      await this.saveAndPublishEvents(scan)

      const companies = await this.dataCollectionService.collectData(
        scan.configuration,
        (progress) => this.updateProgress(scan, 10 + progress * 0.5, 'data_collection')
      )

      console.log(`Data collection completed: ${companies.length} companies discovered`)

      // Phase 3: Data Processing & Enrichment
      scan.updateProgress(60, 'data_processing', companies.length, 0)
      await this.saveAndPublishEvents(scan)

      // Phase 4: Company Analysis (parallel with batch processing)
      scan.updateProgress(70, 'analysis', companies.length, 0)
      await this.saveAndPublishEvents(scan)

      const analysisResults = await this.analysisService.analyzeCompanies(
        companies,
        scan.configuration,
        (progress) => this.updateProgress(scan, 70 + progress * 0.2, 'analysis', companies.length, Math.floor(progress / 100 * companies.length))
      )

      console.log(`Analysis completed: ${analysisResults.length} companies analyzed`)

      // Phase 5: Finalization & Cost Calculation
      scan.updateProgress(95, 'finalization', companies.length, analysisResults.length)
      await this.saveAndPublishEvents(scan)

      const finalCosts = this.costService.calculateFinalCosts
        ? await this.costService.calculateFinalCosts(scanId)
        : { totalCost: 0, breakdown: {} }
      scan.complete(finalCosts)

      scan.updateProgress(100, 'finalization', companies.length, analysisResults.length)
      await this.saveAndPublishEvents(scan)

      const duration = Date.now() - startTime

      return {
        scanId,
        companiesDiscovered: companies.length,
        companiesAnalyzed: analysisResults.length,
        highQualityTargets: this.countHighQualityTargets(analysisResults),
        duration,
        totalCost: finalCosts.totalCost,
        costEfficiency: scan.getCostEfficiency(),
        errorRate: this.calculateErrorRate(companies, analysisResults),
        completedAt: new Date()
      }

    } catch (error) {
      console.error(`Scan ${scanId} failed:`, error)
      
      scan.fail({
        message: error instanceof Error ? error.message : 'Unknown error',
        severity: 'critical',
        isRetryable: false,
        timestamp: new Date(),
        context: { 
          service: 'ScanOrchestrationService',
          phase: scan.currentStage,
          progress: scan.progress
        }
      })

      await this.saveAndPublishEvents(scan)
      throw error
    }
  }

  async pauseScan(scanId: string): Promise<void> {
    const scan = await this.scanRepository.findById(scanId)
    if (!scan) {
      throw new Error(`Scan ${scanId} not found`)
    }

    if (!scan.canBePaused()) {
      throw new Error(`Cannot pause scan in ${scan.status} status`)
    }

    scan.pause()
    await this.saveAndPublishEvents(scan)
  }

  async resumeScan(scanId: string): Promise<void> {
    const scan = await this.scanRepository.findById(scanId)
    if (!scan) {
      throw new Error(`Scan ${scanId} not found`)
    }

    if (!scan.canBeResumed()) {
      throw new Error(`Cannot resume scan in ${scan.status} status`)
    }

    scan.resume()
    await this.saveAndPublishEvents(scan)
    
    // Continue execution from where it left off
    await this.executeScan(scanId)
  }

  async cancelScan(scanId: string, reason: string): Promise<void> {
    const scan = await this.scanRepository.findById(scanId)
    if (!scan) {
      throw new Error(`Scan ${scanId} not found`)
    }

    if (!scan.canBeCancelled()) {
      throw new Error(`Cannot cancel scan in ${scan.status} status`)
    }

    scan.cancel(reason)
    await this.saveAndPublishEvents(scan)
  }

  async getScanProgress(scanId: string): Promise<ScanProgressInfo> {
    const scan = await this.scanRepository.findById(scanId)
    if (!scan) {
      throw new Error(`Scan ${scanId} not found`)
    }

    const currentCosts = this.costService.getCurrentCosts
      ? await this.costService.getCurrentCosts(scanId)
      : { totalCost: 0, breakdown: {} }
    const estimatedTimeRemaining = scan.getEstimatedTimeRemaining()

    return {
      scanId,
      status: scan.status,
      progress: scan.progress,
      currentStage: scan.currentStage,
      companiesDiscovered: scan.companiesDiscovered,
      companiesAnalyzed: scan.companiesAnalyzed,
      currentCosts,
      estimatedTimeRemaining,
      errors: scan.getHighSeverityErrors(),
      createdAt: scan.createdAt,
      startedAt: scan.startedAt,
      updatedAt: scan.updatedAt
    }
  }

  async getActiveScanStatistics(): Promise<ActiveScanStatistics> {
    const activeScans = this.scanRepository.findActiveScans
      ? await this.scanRepository.findActiveScans()
      : []

    let totalCompaniesDiscovered = 0
    let totalCompaniesAnalyzed = 0
    let totalCosts = 0
    const stageBreakdown: Record<string, number> = {}

    for (const scan of activeScans) {
      totalCompaniesDiscovered += scan.companiesDiscovered
      totalCompaniesAnalyzed += scan.companiesAnalyzed

      const scanCosts = this.costService.getCurrentCosts
        ? await this.costService.getCurrentCosts(scan.id)
        : { totalCost: 0 }
      totalCosts += scanCosts.totalCost

      const stage = scan.currentStage
      stageBreakdown[stage] = (stageBreakdown[stage] || 0) + 1
    }

    return {
      activeScanCount: activeScans.length,
      totalCompaniesDiscovered,
      totalCompaniesAnalyzed,
      totalCosts,
      currency: 'GBP',
      stageBreakdown,
      averageProgress: activeScans.length > 0 
        ? activeScans.reduce((sum, scan) => sum + scan.progress, 0) / activeScans.length 
        : 0
    }
  }

  async validateConfiguration(configuration: ScanConfiguration): Promise<ConfigurationValidation> {
    const issues: string[] = []
    const warnings: string[] = []
    const costEstimate = this.costService.estimateCost
      ? await this.costService.estimateCost(configuration)
      : { totalCost: 0, breakdown: {} }

    // Validate required fields
    if (!configuration.selectedIndustries?.length) {
      issues.push('At least one industry must be selected')
    }

    if (!configuration.selectedRegions?.length) {
      issues.push('At least one region must be selected')
    }

    if (!configuration.dataSources?.length) {
      issues.push('At least one data source must be selected')
    }

    // Validate limits
    if (configuration.selectedIndustries?.length > 20) {
      warnings.push('Large number of industries may result in extended processing time')
    }

    if (configuration.selectedRegions?.length > 10) {
      warnings.push('Large number of regions may result in extended processing time')
    }

    if (costEstimate.totalCost > 1000) {
      warnings.push(`Estimated cost is high: £${costEstimate.totalCost.toFixed(2)}`)
    }

    // Validate data source availability
    for (const sourceId of configuration.dataSources) {
      // In real implementation, would check if data source is available/healthy
      // const isHealthy = await this.dataSourceHealthCheck.check(sourceId)
      // if (!isHealthy) {
      //   issues.push(`Data source ${sourceId} is currently unavailable`)
      // }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      costEstimate,
      estimatedDuration: this.estimateScanDuration(configuration, costEstimate)
    }
  }

  private async updateProgress(
    scan: ScanEntity, 
    progress: number, 
    stage: 'initialization' | 'data_collection' | 'data_processing' | 'analysis' | 'finalization',
    companiesDiscovered?: number,
    companiesAnalyzed?: number
  ): Promise<void> {
    scan.updateProgress(progress, stage, companiesDiscovered, companiesAnalyzed)
    await this.saveAndPublishEvents(scan)
  }

  private async saveAndPublishEvents(scan: ScanEntity): Promise<void> {
    await this.scanRepository.save(scan)
    if (scan.domainEvents.length > 0) {
      await this.eventBus.publishMany(scan.domainEvents)
      scan.markEventsAsHandled()
    }
  }

  private countHighQualityTargets(analysisResults: CompanyAnalysisResult[]): number {
    return analysisResults.filter(result => 
      result.overallScore >= 80 && 
      result.riskAssessment.riskLevel !== 'critical'
    ).length
  }

  private calculateErrorRate(companies: CompanyEntity[], analysisResults: CompanyAnalysisResult[]): number {
    if (companies.length === 0) return 0
    const errorCount = companies.length - analysisResults.length
    return (errorCount / companies.length) * 100
  }

  private estimateScanDuration(
    configuration: ScanConfiguration, 
    costEstimate: CostEstimate
  ): number {
    // Base duration estimate in milliseconds
    const baseTimePerCompany = 100 // 100ms per company
    const estimatedCompanies = Object.values(costEstimate.estimatedRequestCounts)
      .reduce((sum, sourceCounts) => sum + (sourceCounts.company_detail || 0), 0)
    
    let duration = estimatedCompanies * baseTimePerCompany
    
    // Add overhead for scan depth
    switch (configuration.scanDepth) {
      case 'comprehensive':
        duration *= 2.0
        break
      case 'detailed':
        duration *= 1.5
        break
      case 'standard':
        duration *= 1.0
        break
      case 'basic':
        duration *= 0.7
        break
    }
    
    // Add overhead for multiple data sources
    duration += (configuration.dataSources.length - 1) * 10000 // 10s per additional source
    
    return Math.max(60000, duration) // Minimum 1 minute
  }
}

interface ScanProgressInfo {
  scanId: string
  status: string
  progress: number
  currentStage: string
  companiesDiscovered: number
  companiesAnalyzed: number
  currentCosts: any
  estimatedTimeRemaining: number | null
  errors: unknown[]
  createdAt: Date
  startedAt?: Date
  updatedAt: Date
}

interface ActiveScanStatistics {
  activeScanCount: number
  totalCompaniesDiscovered: number
  totalCompaniesAnalyzed: number
  totalCosts: number
  currency: string
  stageBreakdown: Record<string, number>
  averageProgress: number
}

interface ConfigurationValidation {
  isValid: boolean
  issues: string[]
  warnings: string[]
  costEstimate: any
  estimatedDuration: number
}