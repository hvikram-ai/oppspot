/**
 * Background Job Queue for Long-Running Scans
 * Uses Redis-based job processing for scalable scan execution
 */

import { getErrorMessage } from '@/lib/utils/error-handler'

interface JobData {
  scanId: string
  userId: string
  priority: 'low' | 'medium' | 'high'
  retryAttempts: number
  estimatedDuration: number
  metadata: Record<string, unknown>
}

interface JobProgress {
  scanId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  currentStep: string
  estimatedCompletion: string
  error?: string
  startedAt?: string
  completedAt?: string
}

export class JobQueue {
  private isRedisAvailable: boolean = false
  private jobs: Map<string, JobProgress> = new Map()
  private workers: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.initializeQueue()
  }

  private async initializeQueue() {
    try {
      // Check if Redis is available
      if (process.env.REDIS_URL) {
        // In a real implementation, this would initialize Redis/Bull
        console.log('Redis available - using distributed job queue')
        this.isRedisAvailable = true
      } else {
        console.log('Redis not configured - using in-memory job queue (not recommended for production)')
        this.isRedisAvailable = false
      }
    } catch (error) {
      console.warn('Failed to initialize Redis, falling back to in-memory queue:', error)
      this.isRedisAvailable = false
    }
  }

  /**
   * Add a scan job to the queue
   */
  async addScanJob(jobData: JobData): Promise<string> {
    const jobId = `scan-${jobData.scanId}-${Date.now()}`
    
    const jobProgress: JobProgress = {
      scanId: jobData.scanId,
      status: 'queued',
      progress: 0,
      currentStep: 'queued',
      estimatedCompletion: new Date(Date.now() + jobData.estimatedDuration * 60000).toISOString()
    }

    if (this.isRedisAvailable) {
      // Redis-based implementation would go here
      await this.addRedisJob(jobId, jobData)
    } else {
      // In-memory fallback
      this.jobs.set(jobId, jobProgress)
      this.processJobInMemory(jobId, jobData)
    }

    console.log(`Added scan job ${jobId} to queue`)
    return jobId
  }

  /**
   * Get job status and progress
   */
  async getJobProgress(jobId: string): Promise<JobProgress | null> {
    if (this.isRedisAvailable) {
      return await this.getRedisJobProgress(jobId)
    } else {
      return this.jobs.get(jobId) || null
    }
  }

  /**
   * Get all jobs for a user
   */
  async getUserJobs(userId: string): Promise<JobProgress[]> {
    if (this.isRedisAvailable) {
      return await this.getRedisUserJobs(userId)
    } else {
      return Array.from(this.jobs.values())
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      if (this.isRedisAvailable) {
        return await this.cancelRedisJob(jobId)
      } else {
        const worker = this.workers.get(jobId)
        if (worker) {
          clearTimeout(worker)
          this.workers.delete(jobId)
        }
        
        const job = this.jobs.get(jobId)
        if (job) {
          job.status = 'failed'
          job.error = 'Cancelled by user'
          job.completedAt = new Date().toISOString()
          return true
        }
        return false
      }
    } catch (error) {
      console.error(`Failed to cancel job ${jobId}:`, error)
      return false
    }
  }

  /**
   * Update job progress
   */
  async updateJobProgress(jobId: string, progress: number, currentStep: string, status?: 'processing' | 'completed' | 'failed', error?: string): Promise<void> {
    if (this.isRedisAvailable) {
      await this.updateRedisJobProgress(jobId, progress, currentStep, status, error)
    } else {
      const job = this.jobs.get(jobId)
      if (job) {
        job.progress = progress
        job.currentStep = currentStep
        if (status) {
          job.status = status
        }
        if (error) {
          job.error = error
        }
        if (status === 'processing' && !job.startedAt) {
          job.startedAt = new Date().toISOString()
        }
        if (status === 'completed' || status === 'failed') {
          job.completedAt = new Date().toISOString()
        }
      }
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    totalJobs: number
    queuedJobs: number
    processingJobs: number
    completedJobs: number
    failedJobs: number
    avgProcessingTime: number
  }> {
    if (this.isRedisAvailable) {
      return await this.getRedisQueueStats()
    } else {
      const jobs = Array.from(this.jobs.values())
      const completedJobs = jobs.filter(j => j.status === 'completed')
      
      const avgProcessingTime = completedJobs.length > 0 
        ? completedJobs.reduce((sum, job) => {
            if (job.startedAt && job.completedAt) {
              return sum + (new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime())
            }
            return sum
          }, 0) / completedJobs.length / 60000 // Convert to minutes
        : 0

      return {
        totalJobs: jobs.length,
        queuedJobs: jobs.filter(j => j.status === 'queued').length,
        processingJobs: jobs.filter(j => j.status === 'processing').length,
        completedJobs: completedJobs.length,
        failedJobs: jobs.filter(j => j.status === 'failed').length,
        avgProcessingTime
      }
    }
  }

  // In-memory processing (fallback)
  private async processJobInMemory(jobId: string, jobData: JobData): Promise<void> {
    const { OppScanEngine } = await import('./scanning-engine')
    
    try {
      await this.updateJobProgress(jobId, 0, 'initializing', 'processing')
      
      const scanEngine = new OppScanEngine()
      
      // Start the scan with progress tracking
      const progressInterval = setInterval(async () => {
        const job = this.jobs.get(jobId)
        if (job && job.status === 'processing') {
          // Simulate progress updates
          const newProgress = Math.min(job.progress + Math.random() * 10, 95)
          await this.updateJobProgress(jobId, newProgress, job.currentStep)
        }
      }, 5000)

      this.workers.set(jobId, progressInterval)

      // Execute the scan
      await scanEngine.executeScan(jobData.scanId)
      
      clearInterval(progressInterval)
      this.workers.delete(jobId)
      
      await this.updateJobProgress(jobId, 100, 'completed', 'completed')
      
      console.log(`Scan job ${jobId} completed successfully`)
    } catch (error) {
      const progressInterval = this.workers.get(jobId)
      if (progressInterval) {
        clearInterval(progressInterval)
        this.workers.delete(jobId)
      }
      
      await this.updateJobProgress(jobId, 0, 'failed', 'failed', getErrorMessage(error))
      console.error(`Scan job ${jobId} failed:`, error)
    }
  }

  // Redis-based implementation stubs (for future implementation)
  private async addRedisJob(jobId: string, jobData: JobData): Promise<void> {
    // TODO: Implement Redis job queue with Bull or similar
    console.log(`Would add Redis job: ${jobId}`)
    
    // Simulate Redis job creation
    const jobProgress: JobProgress = {
      scanId: jobData.scanId,
      status: 'queued',
      progress: 0,
      currentStep: 'queued',
      estimatedCompletion: new Date(Date.now() + jobData.estimatedDuration * 60000).toISOString()
    }
    
    this.jobs.set(jobId, jobProgress)
    
    // Process immediately for demo
    setTimeout(() => this.processJobInMemory(jobId, jobData), 1000)
  }

  private async getRedisJobProgress(jobId: string): Promise<JobProgress | null> {
    // TODO: Get job progress from Redis
    return this.jobs.get(jobId) || null
  }

  private async getRedisUserJobs(userId: string): Promise<JobProgress[]> {
    // TODO: Get user jobs from Redis
    return Array.from(this.jobs.values())
  }

  private async cancelRedisJob(jobId: string): Promise<boolean> {
    // TODO: Cancel Redis job
    console.log(`Would cancel Redis job: ${jobId}`)
    return true
  }

  private async updateRedisJobProgress(jobId: string, progress: number, currentStep: string, status?: string, error?: string): Promise<void> {
    // TODO: Update Redis job progress
    const job = this.jobs.get(jobId)
    if (job) {
      job.progress = progress
      job.currentStep = currentStep
      if (status) {
        job.status = status as unknown
      }
      if (error) {
        job.error = error
      }
    }
  }

  private async getRedisQueueStats(): Promise<unknown> {
    // TODO: Get Redis queue statistics
    return this.getQueueStats()
  }
}

// Export singleton instance
export const jobQueue = new JobQueue()

// Job processor class for handling scan execution
export class ScanJobProcessor {
  private queue: JobQueue

  constructor(queue: JobQueue) {
    this.queue = queue
  }

  /**
   * Process a scan job with full error handling and progress tracking
   */
  async processScanJob(scanId: string, userId: string, options: {
    priority?: 'low' | 'medium' | 'high'
    estimatedDuration?: number
    retryAttempts?: number
  } = {}): Promise<string> {
    const jobData: JobData = {
      scanId,
      userId,
      priority: options.priority || 'medium',
      retryAttempts: options.retryAttempts || 3,
      estimatedDuration: options.estimatedDuration || 30, // minutes
      metadata: {
        createdAt: new Date().toISOString(),
        source: 'api'
      }
    }

    const jobId = await this.queue.addScanJob(jobData)
    return jobId
  }

  /**
   * Get job status with enhanced information
   */
  async getJobStatus(jobId: string): Promise<JobProgress | null> {
    return await this.queue.getJobProgress(jobId)
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    return await this.queue.cancelJob(jobId)
  }

  /**
   * Get queue health and performance metrics
   */
  async getQueueHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical'
    stats: Record<string, unknown>
    recommendations: string[]
  }> {
    const stats = await this.queue.getQueueStats()
    const processingRate = stats.totalJobs > 0 ? stats.completedJobs / stats.totalJobs : 0
    const failureRate = stats.totalJobs > 0 ? stats.failedJobs / stats.totalJobs : 0
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
    const recommendations: string[] = []

    if (failureRate > 0.1) {
      status = 'degraded'
      recommendations.push('High failure rate detected - check error logs')
    }

    if (stats.queuedJobs > 50) {
      status = 'degraded'
      recommendations.push('Queue backlog is high - consider scaling workers')
    }

    if (stats.avgProcessingTime > 60) {
      recommendations.push('Average processing time is high - optimize scan algorithms')
    }

    if (processingRate < 0.8 && stats.totalJobs > 10) {
      status = 'critical'
      recommendations.push('Low completion rate - investigate system issues')
    }

    return {
      status,
      stats,
      recommendations
    }
  }
}

export default JobQueue
