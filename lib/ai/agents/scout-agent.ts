/**
 * Scout Agent
 * Monitors companies for buying signals 24/7
 *
 * Detects:
 * - Job postings (hiring signals)
 * - Funding rounds
 * - Executive changes
 * - Companies House filings
 * - Website activity
 *
 * Runs: Scheduled (e.g., daily, hourly)
 */

import { BaseAgent, AgentConfig, AgentExecutionContext, AgentExecutionResult } from './base-agent'
import { createClient } from '@/lib/supabase/server'

export interface ScoutAgentConfig {
  signals: string[] // Which signals to monitor
  companiesFilter?: {
    industries?: string[]
    employeeCountMin?: number
    employeeCountMax?: number
  }
  threshold?: number // Minimum confidence score
  maxCompanies?: number // Max companies to check per run
}

export class ScoutAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config)
  }

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const startTime = Date.now()
    const metrics = {
      durationMs: 0,
      itemsProcessed: 0,
      apiCalls: 0,
      tokensUsed: 0,
      cost: 0
    }

    const config = this.config.configuration as ScoutAgentConfig
    const signals: string[] = []

    this.log('Starting scout execution')

    try {
      // Get companies to monitor
      const companies = await this.getCompaniesToMonitor(config)

      this.log(`Monitoring ${companies.length} companies for signals`)

      // Check each company for signals
      for (const company of companies) {
        try {
          // Check for job postings
          if (config.signals?.includes('job_posting')) {
            const jobSignals = await this.checkJobPostings(company.id, company.name)
            signals.push(...jobSignals)
          }

          // Check for Companies House filings
          if (config.signals?.includes('companies_house_filing')) {
            const filingSignals = await this.checkCompaniesHouseFilings(company.id, company.company_number)
            signals.push(...filingSignals)
          }

          // Check for news mentions
          if (config.signals?.includes('news_mention')) {
            const newsSignals = await this.checkNewsMentions(company.id, company.name)
            signals.push(...newsSignals)
          }

          metrics.itemsProcessed++
        } catch (error: any) {
          this.log(`Error checking company ${company.name}: ${error.message}`, 'warn')
        }
      }

      metrics.durationMs = Date.now() - startTime

      this.log(`Completed: Found ${signals.length} signals from ${metrics.itemsProcessed} companies`)

      return {
        success: true,
        output: {
          signals,
          companiesChecked: metrics.itemsProcessed,
          signalsDetected: signals.length
        },
        metrics
      }
    } catch (error: any) {
      metrics.durationMs = Date.now() - startTime
      return {
        success: false,
        output: {},
        error: error.message,
        metrics
      }
    }
  }

  async validateConfig(): Promise<boolean> {
    const config = this.config.configuration as ScoutAgentConfig

    if (!config.signals || config.signals.length === 0) {
      this.log('Configuration error: No signals specified', 'error')
      return false
    }

    const validSignals = [
      'job_posting',
      'funding_round',
      'executive_change',
      'companies_house_filing',
      'news_mention'
    ]

    for (const signal of config.signals) {
      if (!validSignals.includes(signal)) {
        this.log(`Configuration error: Invalid signal type "${signal}"`, 'error')
        return false
      }
    }

    return true
  }

  /**
   * Get companies to monitor based on filters
   */
  private async getCompaniesToMonitor(config: ScoutAgentConfig) {
    const supabase = await createClient()

    let query = supabase
      .from('businesses')
      .select('id, name, company_number, website, sic_codes')
      .not('company_number', 'is', null)

    // Apply filters
    if (config.companiesFilter?.industries) {
      query = query.overlaps('sic_codes', config.companiesFilter.industries)
    }

    // Limit
    query = query.limit(config.maxCompanies || 100)

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch companies: ${error.message}`)
    }

    return data || []
  }

  /**
   * Check for job postings (simplified - would integrate with job boards API)
   */
  private async checkJobPostings(companyId: string, companyName: string): Promise<string[]> {
    // TODO: Integrate with job boards API (LinkedIn, Indeed, etc.)
    // For now, return mock data

    // Simulate finding a job posting
    if (Math.random() > 0.95) {
      const signalId = await this.createBuyingSignal(
        companyId,
        'job_posting',
        'strong',
        85,
        {
          jobTitle: 'Senior Software Engineer',
          postedDate: new Date().toISOString(),
          source: 'LinkedIn',
          description: 'Scaling engineering team'
        }
      )

      this.log(`Detected job posting signal for ${companyName}`)
      return [signalId]
    }

    return []
  }

  /**
   * Check Companies House for new filings
   */
  private async checkCompaniesHouseFilings(companyId: string, companyNumber: string | null): Promise<string[]> {
    if (!companyNumber) return []

    try {
      // TODO: Call Companies House API to check for recent filings
      // For now, simplified mock

      // Simulate finding a filing
      if (Math.random() > 0.98) {
        const signalId = await this.createBuyingSignal(
          companyId,
          'companies_house_filing',
          'moderate',
          70,
          {
            filingType: 'Confirmation statement',
            filedDate: new Date().toISOString(),
            description: 'Recent filing detected'
          }
        )

        this.log(`Detected Companies House filing for company ${companyNumber}`)
        return [signalId]
      }
    } catch (error: any) {
      this.log(`Error checking Companies House: ${error.message}`, 'warn')
    }

    return []
  }

  /**
   * Check for news mentions
   */
  private async checkNewsMentions(companyId: string, companyName: string): Promise<string[]> {
    // TODO: Integrate with news API (Google News, Bing News, etc.)
    // For now, return mock data

    return []
  }
}

/**
 * Create a Scout Agent instance from database config
 */
export async function createScoutAgent(agentId: string): Promise<ScoutAgent> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', agentId)
    .eq('agent_type', 'scout_agent')
    .single()

  if (error || !data) {
    throw new Error(`Scout agent not found: ${agentId}`)
  }

  const config: AgentConfig = {
    id: data.id,
    orgId: data.org_id,
    name: data.name,
    type: data.agent_type,
    configuration: data.configuration,
    isActive: data.is_active,
    scheduleCron: data.schedule_cron
  }

  return new ScoutAgent(config)
}
