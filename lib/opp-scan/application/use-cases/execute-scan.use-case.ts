/**
 * Execute Scan Use Case
 * Orchestrates the complete scan execution process
 */

import { ScanEntity } from '../../domain/entities/scan.entity'
import { 
  IScanRepository,
  ICompanyRepository,
  IDataCollectionService,
  ICompanyAnalysisService,
  ICostManagementService,
  IEventBus,
  ScanConfiguration,
  ScanResult,
  UseCase
} from '../../core/interfaces'
import { ScanEventFactory } from '../../domain/events/scan.events'

export class ExecuteScanUseCase implements UseCase<ExecuteScanRequest, ExecuteScanResponse> {
  constructor(
    private readonly scanRepository: IScanRepository,
    private readonly companyRepository: ICompanyRepository,
    private readonly dataCollectionService: IDataCollectionService,
    private readonly analysisService: ICompanyAnalysisService,
    private readonly costService: ICostManagementService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(request: ExecuteScanRequest): Promise<ExecuteScanResponse> {
    const { scanId } = request

    try {
      // Retrieve scan entity
      const scan = await this.scanRepository.findById(scanId)
      if (!scan) {
        throw new Error(`Scan with ID ${scanId} not found`)
      }

      // Validate scan can be started
      if (!this.canStartScan(scan)) {
        throw new Error(`Cannot start scan in ${scan.status} status`)
      }

      // Start the scan
      const estimatedCompletion = await this.estimateCompletion(scan.configuration)
      scan.start(estimatedCompletion)

      // Save and publish events
      await this.scanRepository.save(scan)
      await this.eventBus.publishMany(scan.domainEvents)
      scan.markEventsAsHandled()

      // Execute scan pipeline
      const result = await this.executeScanPipeline(scan)

      return {
        success: true,
        scanId,
        result
      }
    } catch (error) {
      // Handle scan failure
      const scan = await this.scanRepository.findById(scanId)
      if (scan) {
        scan.fail({
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'critical',
          isRetryable: false,
          timestamp: new Date(),
          context: { useCase: 'ExecuteScanUseCase' }
        })
        
        await this.scanRepository.save(scan)
        await this.eventBus.publishMany(scan.domainEvents)
        scan.markEventsAsHandled()
      }

      return {
        success: false,
        scanId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private canStartScan(scan: ScanEntity): boolean {
    return ['configuring', 'failed'].includes(scan.status)
  }

  private async estimateCompletion(config: ScanConfiguration): Promise<Date> {
    // Base estimation: 2 minutes per data source + industry/region complexity
    const baseTimePerSource = 2 * 60 * 1000 // 2 minutes in ms
    const complexityMultiplier = Math.max(1, config.selectedIndustries.length * config.selectedRegions.length / 10)
    
    const estimatedDuration = config.dataSources.length * baseTimePerSource * complexityMultiplier
    
    return new Date(Date.now() + estimatedDuration)
  }

  private async executeScanPipeline(scan: ScanEntity): Promise<ScanResult> {
    const startTime = Date.now()
    
    // Phase 1: Data Collection
    await this.updateScanProgress(scan, 10, 'data_collection')
    const companies = await this.dataCollectionService.collectData(
      scan.configuration
    )

    // Phase 2: Data Processing & Analysis
    await this.updateScanProgress(scan, 60, 'analysis')
    const analysisResults = []
    for (let i = 0; i < companies.length; i++) {
      try {
        const result = await this.analysisService.analyzeCompany(companies[i])
        analysisResults.push(result)
      } catch (error) {
        console.error(`Failed to analyze company ${companies[i].id}:`, error)
      }
    }

    // Phase 3: Cost Calculation & Finalization
    await this.updateScanProgress(scan, 90, 'finalization')
    const costServiceExtended = this.costService as ICostManagementService & {
      calculateFinalCosts?: (scanId: string) => Promise<any>
    }
    const finalCosts = costServiceExtended.calculateFinalCosts
      ? await costServiceExtended.calculateFinalCosts(scan.id)
      : { totalCost: 0, breakdown: {} }
    
    // Complete the scan
    scan.complete(finalCosts)
    await this.updateScanProgress(scan, 100, 'finalization')

    // Save final state
    await this.scanRepository.save(scan)
    await this.eventBus.publishMany(scan.domainEvents)
    scan.markEventsAsHandled()

    const duration = Date.now() - startTime

    return {
      scanId: scan.id,
      status: 'completed',
      totalTargets: companies.length,
      analyzedTargets: analysisResults.length,
      highQualityTargets: analysisResults.filter((r: { score?: number; overallScore?: number }) => (r.score || r.overallScore || 0) >= 80).length,
      duration,
      costs: finalCosts,
      completedAt: new Date()
    } as unknown as ScanResult
  }

  private async updateScanProgress(
    scan: ScanEntity,
    progress: number,
    stage: 'initialization' | 'data_collection' | 'data_processing' | 'analysis' | 'finalization'
  ): Promise<void> {
    scan.updateProgress(progress, stage)
    await this.scanRepository.save(scan)
    await this.eventBus.publishMany(scan.domainEvents)
    scan.markEventsAsHandled()
  }

  private calculateErrorRate(discovered: unknown[], analyzed: unknown[]): number {
    if (discovered.length === 0) return 0
    const errorCount = discovered.length - analyzed.length
    return (errorCount / discovered.length) * 100
  }
}

export interface ExecuteScanRequest {
  scanId: string
}

export interface ExecuteScanResponse {
  success: boolean
  scanId: string
  result?: ScanResult
  error?: string
}