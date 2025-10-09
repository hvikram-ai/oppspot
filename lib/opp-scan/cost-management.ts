/**
 * Cost Management Service
 * Tracks and controls API costs for data source integrations
 */

import { createClient } from '@/lib/supabase/client'

export interface CostBudget {
  id: string
  user_id: string
  org_id?: string
  scan_id?: string
  budget_type: 'user' | 'organization' | 'scan'
  total_budget: number
  remaining_budget: number
  currency: string
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time'
  period_start: string
  period_end: string
  auto_renewal: boolean
  budget_alerts: {
    warning_threshold: number // Percentage
    critical_threshold: number // Percentage
    email_notifications: boolean
  }
  created_at: string
  updated_at: string
}

export interface CostTransaction {
  id: string
  user_id: string
  org_id?: string
  scan_id?: string
  data_source: string
  transaction_type: 'api_call' | 'data_enrichment' | 'analysis' | 'report_generation'
  cost_amount: number
  currency: string
  request_count: number
  data_volume?: number // MB processed
  transaction_metadata: {
    endpoint?: string
    response_size?: number
    processing_time?: number
    success: boolean
    error_message?: string
  }
  created_at: string
}

export interface CostSummary {
  total_spent: number
  transactions_count: number
  successful_transactions: number
  failed_transactions: number
  cost_by_source: { [key: string]: number }
  cost_by_period: { [key: string]: number }
  average_cost_per_request: number
  most_expensive_source: string
  budget_utilization: number // Percentage
  projected_monthly_cost: number
}

export class CostManagementService {
  private supabase = createClient()

  /**
   * Create a new cost budget
   */
  async createBudget(budget: Omit<CostBudget, 'id' | 'created_at' | 'updated_at'>): Promise<CostBudget> {
    const { data, error } = await this.supabase
      .from('cost_budgets')
      // @ts-ignore - Supabase type inference issue
      .insert({
        ...budget,
        remaining_budget: budget.total_budget,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create budget: ${error.message}`)
    }

    return data
  }

  /**
   * Get user's active budgets
   */
  async getUserBudgets(userId: string, budgetType?: 'user' | 'organization' | 'scan'): Promise<CostBudget[]> {
    let query = this.supabase
      .from('cost_budgets')
      .select('*')
      .eq('user_id', userId)
      .gte('period_end', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (budgetType) {
      query = query.eq('budget_type', budgetType)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch budgets: ${error.message}`)
    }

    return data || []
  }

  /**
   * Record a cost transaction
   */
  async recordTransaction(transaction: Omit<CostTransaction, 'id' | 'created_at'>): Promise<CostTransaction> {
    const { data, error } = await this.supabase
      // @ts-ignore - Supabase type inference issue
      .from('cost_transactions')
      .insert({
        ...transaction,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to record transaction: ${error.message}`)
    }

    // Update budget if transaction was successful
    if (transaction.transaction_metadata.success) {
      await this.updateBudgetSpending(transaction.user_id, transaction.cost_amount, transaction.scan_id)
    }

    return data
  }

  /**
   * Check if user can afford a scan before execution
   */
  async checkScanAffordability(params: {
    userId: string
    scanId?: string
    dataSources: string[]
    estimatedRequests: number
  }): Promise<{
    canAfford: boolean
    estimatedCost: number
    budgetStatus: {
      available_budget: number
      budget_after_scan: number
      budget_utilization: number
    }
    costBreakdown: Array<{
      source: string
      requests: number
      cost_per_request: number
      total_cost: number
    }>
    warnings: string[]
  }> {
    // Get cost estimates from data sources
    const costEstimate = this.estimateScanCost(params.dataSources, params.estimatedRequests)
    
    // Get user's available budget
    const budgets = await this.getUserBudgets(params.userId)
    const availableBudget = budgets.reduce((sum, budget) => sum + budget.remaining_budget, 0)
    
    const canAfford = availableBudget >= costEstimate.totalCost
    const budgetAfterScan = availableBudget - costEstimate.totalCost
    const budgetUtilization = availableBudget > 0 ? 
      ((availableBudget - budgetAfterScan) / availableBudget) * 100 : 100

    const warnings: string[] = []
    
    if (!canAfford) {
      warnings.push(`Insufficient budget. Need £${costEstimate.totalCost.toFixed(2)}, available: £${availableBudget.toFixed(2)}`)
    } else if (budgetUtilization > 80) {
      warnings.push(`High budget utilization: ${budgetUtilization.toFixed(1)}%`)
    }

    if (costEstimate.totalCost > 1000) {
      warnings.push(`High scan cost: £${costEstimate.totalCost.toFixed(2)}. Consider reducing scope.`)
    }

    return {
      canAfford,
      estimatedCost: costEstimate.totalCost,
      budgetStatus: {
        available_budget: availableBudget,
        budget_after_scan: budgetAfterScan,
        budget_utilization: budgetUtilization
      },
      costBreakdown: costEstimate.costBreakdown,
      warnings
    }
  }

  /**
   * Get cost summary for user
   */
  async getCostSummary(params: {
    userId: string
    orgId?: string
    scanId?: string
    periodStart?: string
    periodEnd?: string
  }): Promise<CostSummary> {
    let query = this.supabase
      .from('cost_transactions')
      .select('*')
      .eq('user_id', params.userId)

    if (params.orgId) {
      query = query.eq('org_id', params.orgId)
    }

    if (params.scanId) {
      query = query.eq('scan_id', params.scanId)
    }

    if (params.periodStart) {
      query = query.gte('created_at', params.periodStart)
    }

    if (params.periodEnd) {
      query = query.lte('created_at', params.periodEnd)
    }

    const { data: transactions, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`)
    }

    return this.calculateCostSummary(transactions || [], params.userId)
  }

  /**
   * Set up budget alerts
   */
  async setupBudgetAlerts(budgetId: string, alerts: {
    warning_threshold: number
    critical_threshold: number
    email_notifications: boolean
  }): Promise<void> {
    const { error } = await this.supabase
      .from('cost_budgets')
      // @ts-ignore - Type inference issue
      .update({
        budget_alerts: alerts,
        updated_at: new Date().toISOString()
      })
      .eq('id', budgetId)

    if (error) {
      throw new Error(`Failed to setup budget alerts: ${error.message}`)
    }
  }

  /**
   * Check and trigger budget alerts
   */
  async checkBudgetAlerts(userId: string): Promise<{
    alerts: Array<{
      budget_id: string
      alert_type: 'warning' | 'critical'
      message: string
      current_utilization: number
      remaining_budget: number
    }>
  }> {
    const budgets = await this.getUserBudgets(userId)
    const alerts = []

    for (const budget of budgets) {
      const utilization = ((budget.total_budget - budget.remaining_budget) / budget.total_budget) * 100
      
      if (budget.budget_alerts.email_notifications) {
        if (utilization >= budget.budget_alerts.critical_threshold) {
          alerts.push({
            budget_id: budget.id,
            alert_type: 'critical' as const,
            message: `CRITICAL: Budget ${budget.budget_type} is ${utilization.toFixed(1)}% utilized`,
            current_utilization: utilization,
            remaining_budget: budget.remaining_budget
          })
        } else if (utilization >= budget.budget_alerts.warning_threshold) {
          alerts.push({
            budget_id: budget.id,
            alert_type: 'warning' as const,
            message: `WARNING: Budget ${budget.budget_type} is ${utilization.toFixed(1)}% utilized`,
            current_utilization: utilization,
            remaining_budget: budget.remaining_budget
          })
        }
      }
    }

    return { alerts }
  }

  /**
   * Generate cost optimization recommendations
   */
  async getCostOptimizationRecommendations(userId: string): Promise<{
    recommendations: Array<{
      type: 'data_source' | 'scan_frequency' | 'scan_depth' | 'budget'
      priority: 'high' | 'medium' | 'low'
      title: string
      description: string
      potential_savings: number
      implementation_effort: 'easy' | 'moderate' | 'complex'
    }>
    total_potential_savings: number
  }> {
    const summary = await this.getCostSummary({ userId })
    const recommendations = []
    let totalPotentialSavings = 0

    // Analyze cost by data source
    const expensiveSources = Object.entries(summary.cost_by_source)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)

    for (const [source, cost] of expensiveSources) {
      if (cost > summary.total_spent * 0.3) {
        const potentialSavings = cost * 0.2 // 20% savings
        recommendations.push({
          type: 'data_source',
          priority: 'high',
          title: `Optimize ${source} usage`,
          description: `${source} accounts for ${((cost / summary.total_spent) * 100).toFixed(1)}% of costs. Consider reducing request frequency or using alternative sources.`,
          potential_savings: potentialSavings,
          implementation_effort: 'moderate'
        })
        totalPotentialSavings += potentialSavings
      }
    }

    // Check for high failure rates
    const failureRate = summary.failed_transactions / summary.transactions_count
    if (failureRate > 0.1) {
      const potentialSavings = summary.total_spent * failureRate * 0.8
      recommendations.push({
        type: 'data_source',
        priority: 'high',
        title: 'Reduce API failures',
        description: `${(failureRate * 100).toFixed(1)}% of API calls are failing. Improving error handling could reduce costs.`,
        potential_savings: potentialSavings,
        implementation_effort: 'easy'
      })
      totalPotentialSavings += potentialSavings
    }

    // Budget recommendations
    if (summary.projected_monthly_cost > 1000) {
      recommendations.push({
        type: 'budget',
        priority: 'medium',
        title: 'Set up budget alerts',
        description: 'Your projected monthly cost is high. Set up automated budget alerts to prevent overspending.',
        potential_savings: summary.projected_monthly_cost * 0.15,
        implementation_effort: 'easy'
      })
    }

    return {
      recommendations,
      total_potential_savings: totalPotentialSavings
    }
  }

  // Private helper methods

  private async updateBudgetSpending(userId: string, amount: number, scanId?: string): Promise<void> {
    const budgets = await this.getUserBudgets(userId)
    
    for (const budget of budgets) {
      // Check if this budget applies to the transaction
      if (scanId && budget.budget_type === 'scan' && budget.scan_id !== scanId) {
        continue
      }

      const newRemainingBudget = Math.max(0, budget.remaining_budget - amount)
      
      await this.supabase
        .from('cost_budgets')
        .update({
          remaining_budget: newRemainingBudget,
          updated_at: new Date().toISOString()
        })
        .eq('id', budget.id)

      // Check for budget alerts after updating
      const utilization = ((budget.total_budget - newRemainingBudget) / budget.total_budget) * 100
      
      if (utilization >= budget.budget_alerts.critical_threshold || 
          utilization >= budget.budget_alerts.warning_threshold) {
        // Trigger alert (in a real implementation, this would send notifications)
        console.warn(`Budget alert for user ${userId}: ${utilization.toFixed(1)}% utilized`)
      }

      break // Only update the first applicable budget
    }
  }

  private estimateScanCost(dataSources: string[], estimatedRequests: number): {
    totalCost: number
    costBreakdown: Array<{
      source: string
      requests: number
      cost_per_request: number
      total_cost: number
    }>
  } {
    // Cost estimates based on typical API pricing
    const sourceCosts: { [key: string]: number } = {
      'companies_house': 0, // Free
      'irish_cro': 2, // €2 per request
      'financial_data': 25, // £25 per company
      'digital_footprint': 10, // £10 per analysis
      'patents_ip': 8, // £8 per search
      'news_media': 5, // £5 per company
      'employee_data': 15, // £15 per company
      'competitive_intelligence': 20, // £20 per analysis
      'regulatory_filings': 12, // £12 per search
      'market_data': 18 // £18 per analysis
    }

    const costBreakdown = dataSources.map(source => {
      const costPerRequest = sourceCosts[source] || 10 // Default cost
      const requestsForSource = Math.ceil(estimatedRequests / dataSources.length)
      const totalCost = requestsForSource * costPerRequest

      return {
        source,
        requests: requestsForSource,
        cost_per_request: costPerRequest,
        total_cost: totalCost
      }
    })

    const totalCost = costBreakdown.reduce((sum, item) => sum + item.total_cost, 0)

    return {
      totalCost,
      costBreakdown
    }
  }

  private calculateCostSummary(transactions: CostTransaction[], userId: string): CostSummary {
    const totalSpent = transactions.reduce((sum, t) => sum + t.cost_amount, 0)
    const successfulTransactions = transactions.filter(t => t.transaction_metadata.success).length
    const failedTransactions = transactions.length - successfulTransactions

    const costBySource: { [key: string]: number } = {}
    const costByPeriod: { [key: string]: number } = {}

    transactions.forEach(transaction => {
      // Cost by source
      costBySource[transaction.data_source] = 
        (costBySource[transaction.data_source] || 0) + transaction.cost_amount

      // Cost by period (monthly)
      const month = transaction.created_at.substring(0, 7) // YYYY-MM
      costByPeriod[month] = (costByPeriod[month] || 0) + transaction.cost_amount
    })

    const mostExpensiveSource = Object.keys(costBySource).reduce((a, b) => 
      costBySource[a] > costBySource[b] ? a : b, 'none')

    const averageCostPerRequest = transactions.length > 0 ? 
      totalSpent / transactions.reduce((sum, t) => sum + t.request_count, 1) : 0

    // Project monthly cost based on recent activity
    const currentMonth = new Date().toISOString().substring(0, 7)
    const currentMonthSpent = costByPeriod[currentMonth] || 0
    const dayOfMonth = new Date().getDate()
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const projectedMonthlyCost = dayOfMonth > 0 ? (currentMonthSpent / dayOfMonth) * daysInMonth : 0

    return {
      total_spent: totalSpent,
      transactions_count: transactions.length,
      successful_transactions: successfulTransactions,
      failed_transactions: failedTransactions,
      cost_by_source: costBySource,
      cost_by_period: costByPeriod,
      average_cost_per_request: averageCostPerRequest,
      most_expensive_source: mostExpensiveSource,
      budget_utilization: 0, // Would need budget data to calculate
      projected_monthly_cost: projectedMonthlyCost
    }
  }
}

export default CostManagementService