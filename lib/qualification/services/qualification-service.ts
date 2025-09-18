import { createClient } from '@/lib/supabase/server'
import { BANTFramework } from '../frameworks/bant-framework'
import { MEDDICFramework } from '../frameworks/meddic-framework'
import { LeadRoutingEngine } from '../routing/lead-routing-engine'
import { ThresholdAlertSystem } from '../alerts/threshold-alert-system'
import { ChecklistEngine } from '../checklists/checklist-engine'
import { LeadRecyclingEngine } from '../recycling/lead-recycling-engine'
import type {
  BANTQualification,
  MEDDICQualification,
  QualificationChecklist,
  LeadAssignment,
  AdvancedAlertConfig
} from '@/types/qualification'

export class QualificationService {
  private supabase: any
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
    this.recyclingEngine = new LeadRecyclingEngine()
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
    data: any
  ): Promise<{
    qualification: BANTQualification | MEDDICQualification | null
    assignment: LeadAssignment | null
    alerts: any[]
    checklist: QualificationChecklist | null
  }> {
    try {
      let qualification = null
      let assignment = null
      let alerts: any[] = []
      let checklist = null

      // Determine which framework to use
      if (framework === 'AUTO') {
        framework = await this.determineOptimalFramework(companyId)
      }

      // Calculate qualification score
      if (framework === 'BANT') {
        qualification = await this.bantFramework.calculateBANTScore(
          leadId,
          companyId,
          data
        )
      } else if (framework === 'MEDDIC') {
        qualification = await this.meddicFramework.calculateMEDDIC({
          lead_id: leadId,
          company_id: companyId,
          data
        })
      }

      if (qualification) {
        // Check for alerts
        alerts = await this.checkQualificationAlerts(leadId, qualification)

        // Route the lead if qualified
        if (qualification.qualification_status === 'qualified' ||
            (qualification as any).forecast_category === 'commit') {
          assignment = await this.routingEngine.routeLead({
            id: leadId,
            company_id: companyId,
            score: qualification.overall_score,
            framework,
            qualification_status: qualification.qualification_status ||
                                (qualification as any).forecast_category
          })
        }

        // Create or update checklist
        checklist = await this.checklistEngine.createOrUpdateChecklist(
          leadId,
          framework,
          qualification
        )

        // Check if lead needs recycling
        if (qualification.qualification_status === 'disqualified' ||
            (qualification as any).forecast_category === 'omitted') {
          await this.recyclingEngine.evaluateLead(leadId, qualification)
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
      const { data: company } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', companyId)
        .single()

      if (!company) {
        return 'BANT' // Default to BANT
      }

      // Complex enterprise deals -> MEDDIC
      // Simpler, transactional deals -> BANT
      const indicators = {
        enterprise: 0,
        transactional: 0
      }

      // Company size indicator
      if (company.employee_count > 500) {
        indicators.enterprise += 2
      } else if (company.employee_count > 100) {
        indicators.enterprise += 1
      } else {
        indicators.transactional += 1
      }

      // Revenue indicator
      if (company.revenue > 50000000) {
        indicators.enterprise += 2
      } else if (company.revenue > 10000000) {
        indicators.enterprise += 1
      } else {
        indicators.transactional += 1
      }

      // Industry complexity
      const complexIndustries = ['financial', 'healthcare', 'government', 'enterprise_software']
      if (complexIndustries.includes(company.industry?.toLowerCase())) {
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
  ): Promise<any[]> {
    try {
      const alerts: any[] = []
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
            alerts.push(alert)
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
  async getQualificationDashboard(orgId?: string): Promise<any> {
    try {
      const supabase = await this.getSupabase()

      // Get BANT qualifications
      const { data: bantQualifications } = await supabase
        .from('bant_qualifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      // Get MEDDIC qualifications
      const { data: meddicQualifications } = await supabase
        .from('meddic_qualifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      // Get active assignments
      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select('*')
        .in('status', ['assigned', 'accepted', 'working'])
        .order('created_at', { ascending: false })
        .limit(50)

      // Get recent alerts
      const { data: recentAlerts } = await supabase
        .from('alert_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      // Calculate statistics
      const allQualifications = [...(bantQualifications || []), ...(meddicQualifications || [])]

      const stats = {
        totalLeads: allQualifications.length,
        qualified: allQualifications.filter(q =>
          q.qualification_status === 'qualified' || q.forecast_category === 'commit'
        ).length,
        nurture: allQualifications.filter(q =>
          q.qualification_status === 'nurture' || q.forecast_category === 'best_case'
        ).length,
        disqualified: allQualifications.filter(q =>
          q.qualification_status === 'disqualified' || q.forecast_category === 'omitted'
        ).length,
        avgBANTScore: bantQualifications?.length ?
          bantQualifications.reduce((sum, q) => sum + q.overall_score, 0) / bantQualifications.length : 0,
        avgMEDDICScore: meddicQualifications?.length ?
          meddicQualifications.reduce((sum, q) => sum + q.overall_score, 0) / meddicQualifications.length : 0,
        activeAssignments: assignments?.length || 0,
        recentAlerts: recentAlerts?.length || 0
      }

      return {
        stats,
        bantQualifications: bantQualifications || [],
        meddicQualifications: meddicQualifications || [],
        assignments: assignments || [],
        recentAlerts: recentAlerts || []
      }
    } catch (error) {
      console.error('Error getting dashboard data:', error)
      return null
    }
  }

  /**
   * Get qualification history for a lead
   */
  async getQualificationHistory(leadId: string): Promise<any> {
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
        bant: bant.data || [],
        meddic: meddic.data || [],
        assignments: assignments.data || [],
        alerts: alerts.data || [],
        checklists: checklists.data || [],
        recycling: recycling.data || []
      }
    } catch (error) {
      console.error('Error getting qualification history:', error)
      return null
    }
  }

  /**
   * Bulk qualify multiple leads
   */
  async bulkQualifyLeads(
    leads: Array<{ leadId: string; companyId: string; data: any }>,
    framework: 'BANT' | 'MEDDIC' | 'AUTO'
  ): Promise<any[]> {
    const results = []

    for (const lead of leads) {
      const result = await this.qualifyLead(
        lead.leadId,
        lead.companyId,
        framework,
        lead.data
      )
      results.push({
        leadId: lead.leadId,
        ...result
      })

      // Add small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }

  /**
   * Re-qualify leads based on new criteria
   */
  async requalifyLeads(criteria: any): Promise<any> {
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
      if (criteria.daysOld !== undefined) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - criteria.daysOld)
        query = query.lte('created_at', cutoffDate.toISOString())
      }

      const { data: leads } = await query

      if (!leads || leads.length === 0) {
        return { message: 'No leads found matching criteria', count: 0 }
      }

      // Re-qualify each lead
      const results = []
      for (const lead of leads) {
        // Get existing qualification data
        const { data: bantData } = await supabase
          .from('bant_qualifications')
          .select('*')
          .eq('lead_id', lead.id)
          .single()

        if (bantData) {
          // Recalculate with existing data
          const result = await this.qualifyLead(
            lead.id,
            lead.company_id,
            'AUTO',
            {
              budget: bantData.budget_details,
              authority: bantData.authority_details,
              need: bantData.need_details,
              timeline: bantData.timeline_details
            }
          )
          results.push(result)
        }
      }

      return {
        message: `Re-qualified ${results.length} leads`,
        count: results.length,
        results
      }
    } catch (error) {
      console.error('Error re-qualifying leads:', error)
      return { message: 'Error re-qualifying leads', error }
    }
  }

  /**
   * Get qualification recommendations
   */
  async getQualificationRecommendations(leadId: string): Promise<any> {
    try {
      const history = await this.getQualificationHistory(leadId)
      const recommendations = []

      // Analyze BANT scores
      if (history.bant.length > 0) {
        const latest = history.bant[0]

        if (latest.budget_score < 50) {
          recommendations.push({
            type: 'budget',
            priority: 'high',
            action: 'Confirm budget availability',
            reason: 'Budget score is below threshold'
          })
        }

        if (latest.authority_score < 50) {
          recommendations.push({
            type: 'authority',
            priority: 'high',
            action: 'Identify and engage decision makers',
            reason: 'No clear decision maker identified'
          })
        }

        if (latest.need_score < 60) {
          recommendations.push({
            type: 'need',
            priority: 'medium',
            action: 'Clarify pain points and use cases',
            reason: 'Need not clearly established'
          })
        }

        if (latest.timeline_score < 40) {
          recommendations.push({
            type: 'timeline',
            priority: 'medium',
            action: 'Establish decision timeline',
            reason: 'No clear timeline for decision'
          })
        }
      }

      // Analyze MEDDIC scores
      if (history.meddic.length > 0) {
        const latest = history.meddic[0]

        if (!latest.economic_buyer_details?.identified) {
          recommendations.push({
            type: 'economic_buyer',
            priority: 'critical',
            action: 'Identify economic buyer',
            reason: 'Economic buyer not identified'
          })
        }

        if (latest.champion_score < 50) {
          recommendations.push({
            type: 'champion',
            priority: 'high',
            action: 'Develop internal champion',
            reason: 'No strong internal champion'
          })
        }

        if (latest.metrics_score < 60) {
          recommendations.push({
            type: 'metrics',
            priority: 'medium',
            action: 'Quantify success metrics',
            reason: 'Success metrics not clearly defined'
          })
        }
      }

      // Check for stalled deals
      if (history.assignments.length > 0) {
        const latestAssignment = history.assignments[0]
        const daysSinceAssignment = Math.floor(
          (Date.now() - new Date(latestAssignment.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysSinceAssignment > 7 && latestAssignment.status !== 'completed') {
          recommendations.push({
            type: 'engagement',
            priority: 'high',
            action: 'Re-engage with prospect',
            reason: `No progress in ${daysSinceAssignment} days`
          })
        }
      }

      return {
        leadId,
        recommendations,
        totalRecommendations: recommendations.length,
        criticalActions: recommendations.filter(r => r.priority === 'critical').length,
        highPriorityActions: recommendations.filter(r => r.priority === 'high').length
      }
    } catch (error) {
      console.error('Error getting recommendations:', error)
      return { leadId, recommendations: [], error }
    }
  }

  /**
   * Export qualification data
   */
  async exportQualificationData(format: 'csv' | 'json', filters?: any): Promise<any> {
    try {
      const data = await this.getQualificationDashboard()

      if (format === 'json') {
        return JSON.stringify(data, null, 2)
      } else if (format === 'csv') {
        // Convert to CSV format
        const csvData = this.convertToCSV(data.bantQualifications)
        return csvData
      }

      return null
    } catch (error) {
      console.error('Error exporting data:', error)
      return null
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
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