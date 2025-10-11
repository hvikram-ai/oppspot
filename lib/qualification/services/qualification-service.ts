import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BANTFramework } from '../frameworks/bant-framework'
import { MEDDICFramework } from '../frameworks/meddic-framework'
import { LeadRoutingEngine } from '../routing/lead-routing-engine'
import { ThresholdAlertSystem } from '../alerts/threshold-alert-system'
import { ChecklistEngine } from '../checklists/checklist-engine'
import { LeadRecyclingEngine } from '../recycling/lead-recycling-engine'
import type { Row } from '@/lib/supabase/helpers'
import type {
  BANTQualification,
  MEDDICQualification,
  QualificationChecklist,
  LeadAssignment,
  AdvancedAlertConfig
} from '@/types/qualification'

// Union type for mixed qualification arrays
type AnyQualification = BANTQualification | MEDDICQualification

// Qualification input data
export interface QualificationInput {
  budget?: number
  authority?: string[]
  need?: string
  timeline?: string
  [key: string]: unknown
}

// Alert result
export interface QualificationAlert {
  id?: string
  leadId: string
  configId: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  triggeredAt: Date
  resolved?: boolean
}

// Bulk qualification lead
export interface BulkQualificationLead {
  leadId: string
  companyId: string
  data: QualificationInput
}

// Bulk qualification result
export interface BulkQualificationResult {
  leadId: string
  success: boolean
  qualification?: BANTQualification | MEDDICQualification | null
  assignment?: LeadAssignment | null
  alerts?: QualificationAlert[]
  error?: string
}

// Requalification criteria
export interface RequalificationCriteria {
  minScore?: number
  maxScore?: number
  framework?: 'BANT' | 'MEDDIC'
  status?: string
  dateFrom?: Date
  dateTo?: Date
}

// Requalification result
export interface RequalificationResult {
  requalifiedCount: number
  successCount: number
  failedCount: number
  results: Array<{
    leadId: string
    success: boolean
    newScore?: number
    error?: string
  }>
}

// Export filters
export interface ExportFilters {
  framework?: 'BANT' | 'MEDDIC'
  minScore?: number
  maxScore?: number
  dateFrom?: Date
  dateTo?: Date
}

// Qualification result
export interface QualificationResult {
  qualification: BANTQualification | MEDDICQualification | null
  assignment: LeadAssignment | null
  alerts: QualificationAlert[]
  checklist: QualificationChecklist | null
}

// Dashboard data
export interface QualificationDashboard {
  bantQualifications: BANTQualification[]
  meddicQualifications: MEDDICQualification[]
  assignments: LeadAssignment[]
  alerts: QualificationAlert[]
  checklists: QualificationChecklist[]
  analytics: {
    totalLeads: number
    qualifiedLeads: number
    disqualifiedLeads: number
    averageScore: number
    conversionRate: number
  }
}

// Qualification history
export interface QualificationHistory {
  bant: BANTQualification[]
  meddic: MEDDICQualification[]
  assignments: LeadAssignment[]
  alerts: QualificationAlert[]
  checklists: QualificationChecklist[]
  recycling: Array<Record<string, unknown>>
}

// Qualification recommendation
export interface QualificationRecommendation {
  type: 'action' | 'insight' | 'warning'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  actionItems: string[]
}

export class QualificationService {
  private supabase: SupabaseClient | null = null
  private bantFramework: BANTFramework
  private meddicFramework: MEDDICFramework
  private routingEngine: LeadRoutingEngine
  private alertSystem: ThresholdAlertSystem
  private checklistEngine: ChecklistEngine
  private recyclingEngine: LeadRecyclingEngine

  constructor() {
    this.bantFramework = new BANTFramework()
    this.meddicFramework = new MEDDICFramework()
    this.routingEngine = new LeadRoutingEngine()
    this.alertSystem = new ThresholdAlertSystem()
    this.checklistEngine = new ChecklistEngine()
    this.recyclingEngine = LeadRecyclingEngine.getInstance()
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Qualify a lead using the specified framework
   */
  async qualifyLead(
    leadId: string,
    companyId: string,
    framework: 'BANT' | 'MEDDIC' | 'AUTO',
    data: QualificationInput
  ): Promise<QualificationResult> {
    try {
      let qualification = null
      let assignment = null
      let alerts: QualificationAlert[] = []
      let checklist = null

      // Determine which framework to use
      if (framework === 'AUTO') {
        framework = await this.determineOptimalFramework(companyId)
      }

      // Calculate qualification score
      if (framework === 'BANT') {
        qualification = await this.bantFramework.calculateBANT({
          lead_id: leadId,
          company_id: companyId,
          ...data
        } as any) as any
      } else if (framework === 'MEDDIC') {
        qualification = await this.meddicFramework.calculateMEDDIC({
          lead_id: leadId,
          company_id: companyId,
          ...data
        } as any) as any
      }

      if (qualification) {
        // Check for alerts
        alerts = await this.checkQualificationAlerts(leadId, qualification as any)

        // Route the lead if qualified
        const isMEDDIC = 'forecast_category' in qualification
        const qualStatus = (qualification as any).qualification_status
        const isQualified = qualStatus === 'qualified' ||
                           (isMEDDIC && (qualification as any).forecast_category === 'commit')

        if (isQualified) {
          assignment = await this.routingEngine.routeLead({
            lead_id: leadId,
            company_id: companyId,
            overall_score: (qualification as any).overall_score,
            framework,
            status: qualStatus ||
                    (isMEDDIC ? (qualification as any).forecast_category : undefined)
          } as any) as any
        }

        // Create or update checklist (simplified - would need checklist ID in real implementation)
        checklist = null

        // Check if lead needs recycling
        const needsRecycling = qualStatus === 'disqualified' ||
                              (isMEDDIC && (qualification as any).forecast_category === 'omitted')

        if (needsRecycling) {
          await this.recyclingEngine.recycleLead({
            lead_id: leadId,
            reason: qualStatus || 'disqualified',
            score: (qualification as any).overall_score
          } as any)
        }
      }

      return {
        qualification,
        assignment,
        alerts,
        checklist
      }
    } catch (error) {
      console.error('Error qualifying lead:', error)
      return {
        qualification: null,
        assignment: null,
        alerts: [],
        checklist: null
      }
    }
  }

  /**
   * Determine the optimal qualification framework based on company characteristics
   */
  private async determineOptimalFramework(companyId: string): Promise<'BANT' | 'MEDDIC'> {
    try {
      const supabase = await this.getSupabase()

      // Get company details
      const { data: company, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', companyId)
        .single()

      if (error) {
        console.error('Error fetching company for framework determination:', error)
      }

      if (!company) {
        return 'BANT' // Default to BANT
      }

      // Complex enterprise deals -> MEDDIC
      // Simpler, transactional deals -> BANT
      const indicators = {
        enterprise: 0,
        transactional: 0
      }

      // Extract metadata fields
      const metadata = company.metadata as Record<string, any> || {}
      const employeeCount = typeof metadata.employee_count === 'number' ? metadata.employee_count : 0
      const revenue = typeof metadata.revenue === 'number' ? metadata.revenue : 0
      const industry = typeof metadata.industry === 'string' ? metadata.industry : ''

      // Company size indicator
      if (employeeCount > 500) {
        indicators.enterprise += 2
      } else if (employeeCount > 100) {
        indicators.enterprise += 1
      } else {
        indicators.transactional += 1
      }

      // Revenue indicator
      if (revenue > 50000000) {
        indicators.enterprise += 2
      } else if (revenue > 10000000) {
        indicators.enterprise += 1
      } else {
        indicators.transactional += 1
      }

      // Industry complexity
      const complexIndustries = ['financial', 'healthcare', 'government', 'enterprise_software']
      if (complexIndustries.includes(industry.toLowerCase())) {
        indicators.enterprise += 1
      }

      return indicators.enterprise > indicators.transactional ? 'MEDDIC' : 'BANT'
    } catch (error) {
      console.error('Error determining framework:', error)
      return 'BANT'
    }
  }

  /**
   * Check for qualification alerts
   */
  private async checkQualificationAlerts(
    leadId: string,
    qualification: BANTQualification | MEDDICQualification
  ): Promise<QualificationAlert[]> {
    try {
      const alerts: QualificationAlert[] = []
      const configs = await this.alertSystem.getAlertConfigs()

      for (const config of configs) {
        const shouldTrigger = await this.alertSystem.checkAlertTrigger(
          leadId,
          config.id!,
          qualification.overall_score
        )

        if (shouldTrigger) {
          const alert = await this.alertSystem.triggerAlert(
            config.id!,
            leadId,
            qualification.overall_score
          )
          if (alert) {
            alerts.push(alert as unknown as QualificationAlert)
          }
        }
      }

      return alerts
    } catch (error) {
      console.error('Error checking alerts:', error)
      return []
    }
  }

  /**
   * Get qualification dashboard data
   */
  async getQualificationDashboard(orgId?: string): Promise<QualificationDashboard> {
    try {
      const supabase = await this.getSupabase()

      // Get BANT qualifications
      const { data: bantQualifications } = await supabase
        .from('bant_qualifications' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      // Get MEDDIC qualifications
      const { data: meddicQualifications } = await supabase
        .from('meddic_qualifications' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      // Get active assignments
      const { data: assignments } = await supabase
        .from('lead_assignments' as any)
        .select('*')
        .in('status', ['assigned', 'accepted', 'working'])
        .order('created_at', { ascending: false })
        .limit(50)

      // Get recent alerts
      const { data: recentAlerts } = await supabase
        .from('alert_history' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      // Calculate statistics
      const allQualifications: AnyQualification[] = [
        ...(bantQualifications || []),
        ...(meddicQualifications || [])
      ]

      const stats = {
        totalLeads: allQualifications.length,
        qualified: allQualifications.filter((q) => {
          // Check BANT qualification
          if ('qualification_status' in q) {
            return q.qualification_status === 'qualified'
          }
          // Check MEDDIC qualification
          if ('forecast_category' in q) {
            return q.forecast_category === 'commit'
          }
          return false
        }).length,
        nurture: allQualifications.filter((q) => {
          if ('qualification_status' in q) {
            return q.qualification_status === 'nurture'
          }
          if ('forecast_category' in q) {
            return q.forecast_category === 'best_case'
          }
          return false
        }).length,
        disqualified: allQualifications.filter((q) => {
          if ('qualification_status' in q) {
            return q.qualification_status === 'disqualified'
          }
          if ('forecast_category' in q) {
            return q.forecast_category === 'omitted'
          }
          return false
        }).length,
        avgBANTScore: bantQualifications?.length ?
          bantQualifications.reduce((sum: number, q) => sum + (q.overall_score || 0), 0) / bantQualifications.length : 0,
        avgMEDDICScore: meddicQualifications?.length ?
          meddicQualifications.reduce((sum: number, q) => sum + (q.overall_score || 0), 0) / meddicQualifications.length : 0,
        activeAssignments: assignments?.length || 0,
        recentAlerts: recentAlerts?.length || 0
      }

      return {
        bantQualifications: (bantQualifications || []) as BANTQualification[],
        meddicQualifications: (meddicQualifications || []) as MEDDICQualification[],
        assignments: (assignments || []) as LeadAssignment[],
        alerts: (recentAlerts || []) as QualificationAlert[],
        checklists: [],
        analytics: {
          totalLeads: stats.totalLeads,
          qualifiedLeads: stats.qualified,
          disqualifiedLeads: stats.disqualified,
          averageScore: (stats.avgBANTScore + stats.avgMEDDICScore) / 2,
          conversionRate: stats.totalLeads > 0 ? (stats.qualified / stats.totalLeads) * 100 : 0
        }
      }
    } catch (error) {
      console.error('Error getting dashboard data:', error)
      throw new Error('Failed to get qualification dashboard')
    }
  }

  /**
   * Get qualification history for a lead
   */
  async getQualificationHistory(leadId: string): Promise<QualificationHistory> {
    try {
      const supabase = await this.getSupabase()

      const [bant, meddic, assignments, alerts, checklists, recycling] = await Promise.all([
        supabase.from('bant_qualifications')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false }),
        supabase.from('meddic_qualifications')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false }),
        supabase.from('lead_assignments')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false }),
        supabase.from('alert_history')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false }),
        supabase.from('qualification_checklists')
          .select('*, checklist_items(*)')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false }),
        supabase.from('lead_recycling_history')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
      ])

      return {
        bant: (bant.data || []) as BANTQualification[],
        meddic: (meddic.data || []) as MEDDICQualification[],
        assignments: (assignments.data || []) as LeadAssignment[],
        alerts: (alerts.data || []) as QualificationAlert[],
        checklists: (checklists.data || []) as QualificationChecklist[],
        recycling: recycling.data || []
      }
    } catch (error) {
      console.error('Error getting qualification history:', error)
      throw new Error('Failed to get qualification history')
    }
  }

  /**
   * Bulk qualify multiple leads
   */
  async bulkQualifyLeads(
    leads: BulkQualificationLead[],
    framework: 'BANT' | 'MEDDIC' | 'AUTO'
  ): Promise<BulkQualificationResult[]> {
    const results: BulkQualificationResult[] = []

    for (const lead of leads) {
      try {
        const result = await this.qualifyLead(
          lead.leadId,
          lead.companyId,
          framework,
          lead.data
        )
        results.push({
          leadId: lead.leadId,
          success: true,
          qualification: result.qualification,
          assignment: result.assignment,
          alerts: result.alerts
        })
      } catch (error) {
        results.push({
          leadId: lead.leadId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Add small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }

  /**
   * Re-qualify leads based on new criteria
   */
  async requalifyLeads(criteria: RequalificationCriteria): Promise<RequalificationResult> {
    try {
      const supabase = await this.getSupabase()

      // Get leads matching criteria
      let query = supabase.from('lead_scores').select('*')

      if (criteria.minScore !== undefined) {
        query = query.gte('overall_score', criteria.minScore)
      }
      if (criteria.maxScore !== undefined) {
        query = query.lte('overall_score', criteria.maxScore)
      }
      if (criteria.dateFrom) {
        query = query.gte('created_at', criteria.dateFrom.toISOString())
      }
      if (criteria.dateTo) {
        query = query.lte('created_at', criteria.dateTo.toISOString())
      }

      const { data: leads } = await query

      if (!leads || leads.length === 0) {
        return {
          requalifiedCount: 0,
          successCount: 0,
          failedCount: 0,
          results: []
        }
      }

      // Re-qualify each lead
      const results: Array<{ leadId: string; success: boolean; newScore?: number; error?: string }> = []
      let successCount = 0
      let failedCount = 0

      for (const lead of leads as Array<{ id: string; company_id: string }>) {
        try {
          // Get existing qualification data
          const { data: bantData } = await supabase
            .from('bant_qualifications' as any)
            .select('*')
            .eq('lead_id', lead.id)
            .single()

          const typedBantData = bantData as any

          if (typedBantData) {
            // Recalculate with existing data
            const result = await this.qualifyLead(
              lead.id,
              lead.company_id,
              'AUTO',
              {
                budget: typedBantData.budget_score || 0,
                authority: typedBantData.authority_score || 0,
                need: typedBantData.need_score || 0,
                timeline: typedBantData.timeline_score || 0
              }
            )
            results.push({
              leadId: lead.id,
              success: true,
              newScore: result.qualification?.overall_score
            })
            successCount++
          }
        } catch (error) {
          results.push({
            leadId: lead.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          failedCount++
        }
      }

      return {
        requalifiedCount: leads.length,
        successCount,
        failedCount,
        results
      }
    } catch (error) {
      console.error('Error re-qualifying leads:', error)
      return {
        requalifiedCount: 0,
        successCount: 0,
        failedCount: 0,
        results: []
      }
    }
  }

  /**
   * Get qualification recommendations
   */
  async getQualificationRecommendations(leadId: string): Promise<QualificationRecommendation[]> {
    try {
      const history = await this.getQualificationHistory(leadId)
      const recommendations: QualificationRecommendation[] = []

      // Analyze BANT scores
      if (history.bant.length > 0) {
        const latest = history.bant[0]

        if (latest.budget_score < 50) {
          recommendations.push({
            type: 'action',
            title: 'Confirm Budget',
            description: 'Budget score is below threshold',
            priority: 'high',
            actionItems: ['Confirm budget availability', 'Discuss budget allocation']
          })
        }

        if (latest.authority_score < 50) {
          recommendations.push({
            type: 'action',
            title: 'Identify Decision Makers',
            description: 'No clear decision maker identified',
            priority: 'high',
            actionItems: ['Identify decision makers', 'Engage with stakeholders']
          })
        }

        if (latest.need_score < 60) {
          recommendations.push({
            type: 'insight',
            title: 'Clarify Needs',
            description: 'Need not clearly established',
            priority: 'medium',
            actionItems: ['Clarify pain points', 'Document use cases']
          })
        }

        if (latest.timeline_score < 40) {
          recommendations.push({
            type: 'action',
            title: 'Establish Timeline',
            description: 'No clear timeline for decision',
            priority: 'medium',
            actionItems: ['Establish decision timeline', 'Set follow-up dates']
          })
        }
      }

      // Analyze MEDDIC scores
      if (history.meddic.length > 0) {
        const latest = history.meddic[0]
        const economicBuyer = latest.economic_buyer_details as any

        if (!economicBuyer?.identified) {
          recommendations.push({
            type: 'warning',
            title: 'Identify Economic Buyer',
            description: 'Economic buyer not identified',
            priority: 'high',
            actionItems: ['Identify economic buyer', 'Establish contact']
          })
        }

        if (latest.champion_score < 50) {
          recommendations.push({
            type: 'action',
            title: 'Develop Champion',
            description: 'No strong internal champion',
            priority: 'high',
            actionItems: ['Identify potential champions', 'Build relationship']
          })
        }

        if (latest.metrics_score < 60) {
          recommendations.push({
            type: 'insight',
            title: 'Quantify Metrics',
            description: 'Success metrics not clearly defined',
            priority: 'medium',
            actionItems: ['Define success metrics', 'Establish measurement criteria']
          })
        }
      }

      // Check for stalled deals
      if (history.assignments.length > 0) {
        const latestAssignment = history.assignments[0]
        const createdAt = (latestAssignment as any).created_at
        const daysSinceAssignment = Math.floor(
          (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysSinceAssignment > 7 && latestAssignment.status !== 'completed') {
          recommendations.push({
            type: 'warning',
            title: 'Re-engage Prospect',
            description: `No progress in ${daysSinceAssignment} days`,
            priority: 'high',
            actionItems: ['Schedule follow-up call', 'Send engagement email']
          })
        }
      }

      return recommendations
    } catch (error) {
      console.error('Error getting recommendations:', error)
      return []
    }
  }

  /**
   * Export qualification data
   */
  async exportQualificationData(format: 'csv' | 'json', filters?: ExportFilters): Promise<string> {
    try {
      const data = await this.getQualificationDashboard()

      if (format === 'json') {
        return JSON.stringify(data, null, 2)
      } else if (format === 'csv') {
        // Convert to CSV format
        const csvData = this.convertToCSV(data.bantQualifications as unknown as Array<Record<string, unknown>>)
        return csvData
      }

      return ''
    } catch (error) {
      console.error('Error exporting data:', error)
      return ''
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: Array<Record<string, unknown>>): string {
    if (!data || data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(',')

    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header]
        if (typeof value === 'object') {
          return JSON.stringify(value)
        }
        return value
      }).join(',')
    })

    return [csvHeaders, ...csvRows].join('\n')
  }
}