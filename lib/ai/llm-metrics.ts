/**
 * LLM Performance Monitoring and Metrics System
 * 
 * Provides comprehensive monitoring for LLM operations including
 * performance metrics, cost tracking, error monitoring, and usage analytics
 */

import { LLMMonitor, GenerationMetrics, LLMError } from './llm-interface'

interface MetricEntry {
  timestamp: number
  provider: string
  model: string
  operation: string
  duration: number
  tokens: number
  cost: number
  success: boolean
  error?: string
}

interface PerformanceStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  successRate: number
  averageResponseTime: number
  totalTokens: number
  totalCost: number
  tokensPerSecond: number
  requestsPerHour: number
  errorsByType: Record<string, number>
  modelUsage: Record<string, number>
  providerUsage: Record<string, number>
}

interface HealthMetrics {
  provider: string
  available: boolean
  latency: number
  uptime: number
  lastError?: string
  modelStatus: Record<string, {
    available: boolean
    lastUsed: number
    avgResponseTime: number
    errorCount: number
  }>
}

/**
 * In-memory LLM monitoring implementation
 */
export class LLMMetricsCollector implements LLMMonitor {
  private metrics: MetricEntry[] = []
  private maxEntries: number = 10000
  private healthData: Map<string, HealthMetrics> = new Map()

  constructor(maxEntries?: number) {
    if (maxEntries) this.maxEntries = maxEntries
  }

  /**
   * Record a generation operation
   */
  recordGeneration(metrics: GenerationMetrics): void {
    const entry: MetricEntry = {
      timestamp: Date.now(),
      provider: metrics.provider,
      model: metrics.model,
      operation: 'generation',
      duration: metrics.responseTime,
      tokens: metrics.tokensGenerated,
      cost: metrics.cost,
      success: true
    }

    this.addMetric(entry)
    this.updateHealthData(metrics.provider, metrics.model, metrics.responseTime, true)
  }

  /**
   * Record an error
   */
  recordError(error: LLMError): void {
    const entry: MetricEntry = {
      timestamp: Date.now(),
      provider: error.provider,
      model: error.model || 'unknown',
      operation: 'generation',
      duration: 0,
      tokens: 0,
      cost: 0,
      success: false,
      error: error.name
    }

    this.addMetric(entry)
    this.updateHealthData(error.provider, error.model || 'unknown', 0, false)
  }

  /**
   * Get performance statistics for a timeframe
   */
  async getStats(timeframe: string = '1h'): Promise<PerformanceStats> {
    const now = Date.now()
    const timeframMs = this.parseTimeframe(timeframe)
    const since = now - timeframMs

    const relevantMetrics = this.metrics.filter(m => m.timestamp >= since)

    if (relevantMetrics.length === 0) {
      return this.getEmptyStats()
    }

    const totalRequests = relevantMetrics.length
    const successfulRequests = relevantMetrics.filter(m => m.success).length
    const failedRequests = totalRequests - successfulRequests
    const successRate = successfulRequests / totalRequests

    const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0)
    const averageResponseTime = totalDuration / totalRequests

    const totalTokens = relevantMetrics.reduce((sum, m) => sum + m.tokens, 0)
    const totalCost = relevantMetrics.reduce((sum, m) => sum + m.cost, 0)

    const tokensPerSecond = totalTokens / (timeframMs / 1000)
    const requestsPerHour = (totalRequests / timeframMs) * 3600000

    // Error analysis
    const errorsByType = relevantMetrics
      .filter(m => !m.success && m.error)
      .reduce((acc, m) => {
        acc[m.error!] = (acc[m.error!] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    // Model usage analysis
    const modelUsage = relevantMetrics.reduce((acc, m) => {
      acc[m.model] = (acc[m.model] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Provider usage analysis
    const providerUsage = relevantMetrics.reduce((acc, m) => {
      acc[m.provider] = (acc[m.provider] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate,
      averageResponseTime,
      totalTokens,
      totalCost,
      tokensPerSecond,
      requestsPerHour,
      errorsByType,
      modelUsage,
      providerUsage
    }
  }

  /**
   * Get detailed health metrics for all providers
   */
  getHealthMetrics(): HealthMetrics[] {
    return Array.from(this.healthData.values())
  }

  /**
   * Get provider-specific metrics
   */
  async getProviderStats(provider: string, timeframe: string = '1h'): Promise<PerformanceStats> {
    const allStats = await this.getStats(timeframe)
    const now = Date.now()
    const timeframMs = this.parseTimeframe(timeframe)
    const since = now - timeframMs

    const providerMetrics = this.metrics.filter(
      m => m.timestamp >= since && m.provider === provider
    )

    if (providerMetrics.length === 0) {
      return this.getEmptyStats()
    }

    // Calculate provider-specific stats
    const totalRequests = providerMetrics.length
    const successfulRequests = providerMetrics.filter(m => m.success).length
    const totalDuration = providerMetrics.reduce((sum, m) => sum + m.duration, 0)
    const totalTokens = providerMetrics.reduce((sum, m) => sum + m.tokens, 0)
    const totalCost = providerMetrics.reduce((sum, m) => sum + m.cost, 0)

    return {
      totalRequests,
      successfulRequests,
      failedRequests: totalRequests - successfulRequests,
      successRate: successfulRequests / totalRequests,
      averageResponseTime: totalDuration / totalRequests,
      totalTokens,
      totalCost,
      tokensPerSecond: totalTokens / (timeframMs / 1000),
      requestsPerHour: (totalRequests / timeframMs) * 3600000,
      errorsByType: providerMetrics
        .filter(m => !m.success && m.error)
        .reduce((acc, m) => {
          acc[m.error!] = (acc[m.error!] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      modelUsage: providerMetrics.reduce((acc, m) => {
        acc[m.model] = (acc[m.model] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      providerUsage: { [provider]: totalRequests }
    }
  }

  /**
   * Get cost analysis
   */
  getCostAnalysis(timeframe: string = '24h') {
    const now = Date.now()
    const timeframMs = this.parseTimeframe(timeframe)
    const since = now - timeframMs

    const relevantMetrics = this.metrics.filter(m => m.timestamp >= since && m.success)

    const totalCost = relevantMetrics.reduce((sum, m) => sum + m.cost, 0)
    const totalTokens = relevantMetrics.reduce((sum, m) => sum + m.tokens, 0)
    
    const costByProvider = relevantMetrics.reduce((acc, m) => {
      acc[m.provider] = (acc[m.provider] || 0) + m.cost
      return acc
    }, {} as Record<string, number>)

    const costByModel = relevantMetrics.reduce((acc, m) => {
      acc[m.model] = (acc[m.model] || 0) + m.cost
      return acc
    }, {} as Record<string, number>)

    const avgCostPerToken = totalTokens > 0 ? totalCost / totalTokens : 0
    const avgCostPerRequest = relevantMetrics.length > 0 ? totalCost / relevantMetrics.length : 0

    return {
      timeframe,
      totalCost,
      totalTokens,
      totalRequests: relevantMetrics.length,
      avgCostPerToken,
      avgCostPerRequest,
      costByProvider,
      costByModel
    }
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(timeframe: string = '24h', intervals: number = 24) {
    const now = Date.now()
    const timeframMs = this.parseTimeframe(timeframe)
    const intervalMs = timeframMs / intervals
    const since = now - timeframMs

    const trends = []
    for (let i = 0; i < intervals; i++) {
      const intervalStart = since + (i * intervalMs)
      const intervalEnd = intervalStart + intervalMs
      
      const intervalMetrics = this.metrics.filter(
        m => m.timestamp >= intervalStart && m.timestamp < intervalEnd
      )

      const successCount = intervalMetrics.filter(m => m.success).length
      const totalRequests = intervalMetrics.length
      const avgResponseTime = totalRequests > 0 
        ? intervalMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests 
        : 0
      const totalTokens = intervalMetrics.reduce((sum, m) => sum + m.tokens, 0)

      trends.push({
        timestamp: intervalStart,
        requests: totalRequests,
        successRate: totalRequests > 0 ? successCount / totalRequests : 0,
        avgResponseTime,
        tokens: totalTokens,
        tokensPerSecond: totalTokens / (intervalMs / 1000)
      })
    }

    return trends
  }

  /**
   * Clear old metrics to prevent memory bloat
   */
  cleanup(maxAge: number = 86400000): void { // 24 hours default
    const cutoff = Date.now() - maxAge
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff)
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.metrics, null, 2)
    } else {
      const headers = 'timestamp,provider,model,operation,duration,tokens,cost,success,error'
      const rows = this.metrics.map(m => 
        `${m.timestamp},${m.provider},${m.model},${m.operation},${m.duration},${m.tokens},${m.cost},${m.success},${m.error || ''}`
      )
      return [headers, ...rows].join('\n')
    }
  }

  private addMetric(entry: MetricEntry): void {
    this.metrics.push(entry)
    
    // Maintain max entries limit
    if (this.metrics.length > this.maxEntries) {
      this.metrics = this.metrics.slice(-this.maxEntries)
    }
  }

  private updateHealthData(provider: string, model: string, responseTime: number, success: boolean): void {
    let health = this.healthData.get(provider)
    
    if (!health) {
      health = {
        provider,
        available: true,
        latency: 0,
        uptime: 100,
        modelStatus: {}
      }
      this.healthData.set(provider, health)
    }

    // Update model status
    if (!health.modelStatus[model]) {
      health.modelStatus[model] = {
        available: true,
        lastUsed: Date.now(),
        avgResponseTime: responseTime,
        errorCount: 0
      }
    } else {
      const modelStatus = health.modelStatus[model]
      modelStatus.lastUsed = Date.now()
      modelStatus.avgResponseTime = (modelStatus.avgResponseTime + responseTime) / 2
      
      if (!success) {
        modelStatus.errorCount++
        if (modelStatus.errorCount > 5) {
          modelStatus.available = false
        }
      } else {
        modelStatus.errorCount = Math.max(0, modelStatus.errorCount - 1)
        if (modelStatus.errorCount === 0) {
          modelStatus.available = true
        }
      }
    }

    // Update provider latency
    health.latency = (health.latency + responseTime) / 2
    health.available = success
  }

  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/^(\d+)([smhd])$/)
    if (!match) return 3600000 // Default 1 hour

    const value = parseInt(match[1])
    const unit = match[2]

    switch (unit) {
      case 's': return value * 1000
      case 'm': return value * 60 * 1000
      case 'h': return value * 60 * 60 * 1000
      case 'd': return value * 24 * 60 * 60 * 1000
      default: return 3600000
    }
  }

  private getEmptyStats(): PerformanceStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 0,
      averageResponseTime: 0,
      totalTokens: 0,
      totalCost: 0,
      tokensPerSecond: 0,
      requestsPerHour: 0,
      errorsByType: {},
      modelUsage: {},
      providerUsage: {}
    }
  }
}

/**
 * Monitored LLM Provider wrapper
 *
 * Wraps any LLM provider with monitoring capabilities
 */
export class MonitoredLLMProvider<T extends {
  complete: (prompt: string, options?: Record<string, unknown>) => Promise<string>
  estimateTokens?: (text: string) => number
  calculateCost?: (tokens: number) => number
  constructor: { name: string }
}> {
  private monitor: LLMMetricsCollector
  private provider: T

  constructor(provider: T, monitor?: LLMMetricsCollector) {
    this.provider = provider
    this.monitor = monitor || new LLMMetricsCollector()
  }

  async complete(prompt: string, options: Record<string, unknown> = {}): Promise<string> {
    const startTime = Date.now()
    let success = false
    let response = ''

    try {
      response = await this.provider.complete(prompt, options)
      success = true

      const endTime = Date.now()
      const responseTime = endTime - startTime
      const tokens = this.provider.estimateTokens ? this.provider.estimateTokens(response) : 0
      const cost = this.provider.calculateCost ? this.provider.calculateCost(tokens) : 0

      this.monitor.recordGeneration({
        tokensGenerated: tokens,
        responseTime,
        model: options.model || 'default',
        cost,
        provider: this.provider.constructor.name.toLowerCase()
      })

      return response
    } catch (error) {
      this.monitor.recordError({
        provider: this.provider.constructor.name.toLowerCase(),
        model: options.model || 'default',
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.constructor.name : 'Error'
      } as unknown)
      
      throw error
    }
  }

  getMetrics() {
    return this.monitor
  }

  async getStats(timeframe?: string) {
    return this.monitor.getStats(timeframe)
  }

  getHealthMetrics() {
    return this.monitor.getHealthMetrics()
  }

  getCostAnalysis(timeframe?: string) {
    return this.monitor.getCostAnalysis(timeframe)
  }
}

// Global metrics collector
let globalMetrics: LLMMetricsCollector | null = null

export function getGlobalMetrics(): LLMMetricsCollector {
  if (!globalMetrics) {
    globalMetrics = new LLMMetricsCollector()
  }
  return globalMetrics
}

export function createMonitoredProvider<T extends {
  complete: (prompt: string, options?: Record<string, unknown>) => Promise<string>
  estimateTokens?: (text: string) => number
  calculateCost?: (tokens: number) => number
  constructor: { name: string }
}>(
  provider: T,
  monitor?: LLMMetricsCollector
): T & MonitoredLLMProvider<T> {
  const monitoredProvider = new MonitoredLLMProvider(provider, monitor || getGlobalMetrics())
  
  return new Proxy(monitoredProvider, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver)
      }
      
      if (prop in target.provider) {
        const value = Reflect.get(target.provider, prop, receiver)
        
        if (typeof value === 'function') {
          return value.bind(target.provider)
        }
        
        return value
      }
      
      return undefined
    }
  }) as T & MonitoredLLMProvider<T>
}

/**
 * Performance alert system
 */
export class PerformanceAlerts {
  private metrics: LLMMetricsCollector
  private thresholds = {
    maxResponseTime: 30000, // 30 seconds
    minSuccessRate: 0.95,   // 95%
    maxCostPerHour: 10.0,   // $10/hour
    maxErrorRate: 0.05      // 5%
  }

  constructor(metrics: LLMMetricsCollector) {
    this.metrics = metrics
  }

  async checkAlerts(): Promise<string[]> {
    const stats = await this.metrics.getStats('1h')
    const alerts: string[] = []

    if (stats.averageResponseTime > this.thresholds.maxResponseTime) {
      alerts.push(`High response time: ${stats.averageResponseTime}ms (threshold: ${this.thresholds.maxResponseTime}ms)`)
    }

    if (stats.successRate < this.thresholds.minSuccessRate) {
      alerts.push(`Low success rate: ${(stats.successRate * 100).toFixed(1)}% (threshold: ${(this.thresholds.minSuccessRate * 100)}%)`)
    }

    const errorRate = stats.failedRequests / stats.totalRequests
    if (errorRate > this.thresholds.maxErrorRate) {
      alerts.push(`High error rate: ${(errorRate * 100).toFixed(1)}% (threshold: ${(this.thresholds.maxErrorRate * 100)}%)`)
    }

    if (stats.totalCost > this.thresholds.maxCostPerHour) {
      alerts.push(`High cost: $${stats.totalCost.toFixed(2)}/hour (threshold: $${this.thresholds.maxCostPerHour})`)
    }

    return alerts
  }

  setThresholds(newThresholds: Partial<typeof this.thresholds>) {
    this.thresholds = { ...this.thresholds, ...newThresholds }
  }
}