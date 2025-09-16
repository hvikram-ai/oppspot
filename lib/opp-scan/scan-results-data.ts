import { createClient } from '@/lib/supabase/client'

// Types for comprehensive data structure
export interface ScanResultsData {
  scan: ScanData
  targets: TargetCompany[]
  financialData: FinancialAnalysis[]
  riskData: RiskAssessment[]
  marketIntelligence: MarketIntelligence[]
  dueDiligence: DueDiligence[]
  valuationModels: ValuationModel[]
  scanReports: ScanReport[]
  summary: ScanSummary
}

export interface ScanData {
  id: string
  user_id: string
  org_id?: string
  name: string
  description?: string
  status: 'configuring' | 'scanning' | 'analyzing' | 'completed' | 'failed' | 'paused'
  progress_percentage: number
  current_step: string
  targets_identified: number
  targets_analyzed: number
  selected_industries?: Array<{ code: string; name: string }>
  selected_regions?: Array<{ id: string; name: string; country: string }>
  market_maturity?: string[]
  required_capabilities?: string[]
  strategic_objectives?: Record<string, unknown>
  data_sources?: string[]
  scan_depth: 'basic' | 'detailed' | 'comprehensive'
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
}

export interface TargetCompany {
  id: string
  scan_id: string
  business_id?: string
  company_name: string
  companies_house_number?: string
  registration_country: string
  website?: string
  industry_codes: string[]
  business_description?: string
  year_incorporated?: number
  employee_count_range?: string
  registered_address?: {
    street?: string
    city?: string
    region?: string
    postal_code?: string
    country: string
  }
  phone?: string
  email?: string
  discovery_source: string
  discovery_method?: string
  discovery_confidence: number
  overall_score: number
  strategic_fit_score: number
  financial_health_score: number
  risk_score: number
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'excluded' | 'shortlisted'
  created_at: string
  updated_at: string
  analyzed_at?: string
}

export interface FinancialAnalysis {
  id: string
  target_company_id: string
  analysis_year?: number
  revenue?: number
  gross_profit?: number
  ebitda?: number
  net_income?: number
  total_assets?: number
  total_liabilities?: number
  shareholders_equity?: number
  cash_and_equivalents?: number
  total_debt?: number
  gross_margin?: number
  ebitda_margin?: number
  net_margin?: number
  roe?: number // Return on Equity
  roa?: number // Return on Assets
  debt_to_equity?: number
  current_ratio?: number
  quick_ratio?: number
  revenue_growth_3y?: number
  profit_growth_3y?: number
  employee_growth_3y?: number
  altman_z_score?: number
  credit_rating?: string
  financial_distress_signals?: string[]
  estimated_revenue_multiple?: number
  estimated_ebitda_multiple?: number
  estimated_enterprise_value?: number
  valuation_method?: string
  valuation_confidence?: 'low' | 'medium' | 'high'
  data_sources?: Record<string, unknown>
  data_quality_score: number
  last_financial_update?: string
  created_at: string
  updated_at: string
}

export interface RiskAssessment {
  id: string
  target_company_id: string
  financial_risk_score: number
  financial_risk_factors?: string[]
  operational_risk_score: number
  key_person_dependency: boolean
  customer_concentration_risk?: number
  supplier_concentration_risk?: number
  operational_risk_factors?: string[]
  regulatory_risk_score: number
  compliance_status?: Record<string, unknown>
  pending_investigations?: string[]
  regulatory_risk_factors?: string[]
  market_risk_score: number
  competitive_position?: 'leader' | 'strong' | 'moderate' | 'weak' | 'unknown'
  market_share_estimate?: number
  competitive_threats?: string[]
  market_risk_factors?: string[]
  technology_risk_score: number
  ip_portfolio_strength?: 'strong' | 'moderate' | 'weak' | 'none' | 'unknown'
  technology_obsolescence_risk?: number
  cybersecurity_assessment?: Record<string, unknown>
  technology_risk_factors?: string[]
  esg_risk_score: number
  environmental_compliance?: Record<string, unknown>
  social_responsibility_issues?: string[]
  governance_concerns?: string[]
  esg_risk_factors?: string[]
  overall_risk_score: number
  risk_category: 'low' | 'moderate' | 'high' | 'critical'
  risk_mitigation_strategies?: string[]
  red_flags?: string[]
  assessment_method: string
  confidence_level: number
  created_at: string
  updated_at: string
}

export interface MarketIntelligence {
  id: string
  scan_id: string
  industry_sector: string
  geographic_scope?: Record<string, unknown>
  market_size_gbp?: number
  market_growth_rate?: number
  market_maturity?: 'emerging' | 'growth' | 'mature' | 'declining'
  total_competitors?: number
  market_concentration?: 'fragmented' | 'moderate' | 'concentrated' | 'monopolistic'
  top_competitors?: string[]
  barriers_to_entry?: 'low' | 'moderate' | 'high' | 'very_high'
  key_trends?: string[]
  growth_drivers?: string[]
  challenges?: string[]
  ma_activity_level?: 'low' | 'moderate' | 'high' | 'very_high'
  recent_transactions?: string[]
  average_valuation_multiples?: Record<string, unknown>
  regulatory_environment?: 'favorable' | 'stable' | 'changing' | 'restrictive'
  upcoming_regulations?: string[]
  data_sources?: Record<string, unknown>
  analysis_date: string
  confidence_level: number
  created_at: string
  updated_at: string
}

export interface DueDiligence {
  id: string
  target_company_id: string
  documents_analyzed?: string[]
  document_completeness_score: number
  missing_documents?: string[]
  corporate_structure?: Record<string, unknown>
  subsidiary_companies?: string[]
  legal_entity_type?: string
  jurisdiction?: string
  key_contracts?: string[]
  contract_risk_assessment?: Record<string, unknown>
  intellectual_property?: string[]
  employee_structure?: Record<string, unknown>
  employment_contracts_review?: Record<string, unknown>
  pension_obligations?: number
  hr_compliance_status?: Record<string, unknown>
  operational_metrics?: Record<string, unknown>
  it_infrastructure_assessment?: Record<string, unknown>
  supply_chain_analysis?: Record<string, unknown>
  customer_analysis?: Record<string, unknown>
  environmental_assessments?: string[]
  sustainability_metrics?: Record<string, unknown>
  esg_compliance?: Record<string, unknown>
  legal_issues?: string[]
  compliance_violations?: string[]
  financial_irregularities?: string[]
  operational_concerns?: string[]
  due_diligence_score: number
  recommendation: 'proceed' | 'proceed_with_conditions' | 'further_investigation' | 'reject'
  key_findings?: string[]
  next_steps?: string[]
  analysis_depth: 'preliminary' | 'standard' | 'comprehensive'
  automation_confidence: number
  manual_review_required: boolean
  created_at: string
  updated_at: string
}

export interface ValuationModel {
  id: string
  target_company_id: string
  model_type: 'dcf' | 'comparable_company' | 'precedent_transaction' | 'asset_based' | 'sum_of_parts'
  base_case_valuation?: number
  bull_case_valuation?: number
  bear_case_valuation?: number
  key_assumptions?: Record<string, unknown>
  sensitivity_analysis?: Record<string, unknown>
  valuation_date: string
  model_confidence: 'low' | 'medium' | 'high'
  created_by?: string
  reviewed_by?: string
  created_at: string
  updated_at: string
}

export interface ScanReport {
  id: string
  scan_id: string
  user_id: string
  report_type: 'executive_summary' | 'detailed_analysis' | 'target_comparison' | 'market_overview' | 'due_diligence_summary' | 'valuation_analysis' | 'risk_assessment' | 'compliance_report'
  report_title: string
  report_description?: string
  content?: Record<string, unknown>
  format: 'pdf' | 'excel' | 'powerpoint' | 'html'
  file_size?: number
  download_url?: string
  created_at: string
  updated_at: string
  generated_at?: string
  expires_at?: string
}

export interface ScanSummary {
  totalTargets: number
  analyzedTargets: number
  completionPercentage: number
  avgOverallScore: number
  avgStrategicFitScore: number
  avgFinancialHealthScore: number
  avgRiskScore: number
  highQualityTargets: number // Score > 80
  mediumQualityTargets: number // Score 60-80
  lowQualityTargets: number // Score < 60
  lowRiskTargets: number
  moderateRiskTargets: number
  highRiskTargets: number
  criticalRiskTargets: number
  totalEstimatedValue: number
  industryBreakdown: { [key: string]: number }
  regionBreakdown: { [key: string]: number }
  sizeBreakdown: { [key: string]: number }
  topOpportunities: TargetCompany[]
  riskAlerts: Array<{ target: TargetCompany; risks: string[] }>
  keyInsights: string[]
  nextActions: string[]
}

/**
 * Comprehensive data fetching for scan results
 */
export class ScanResultsDataService {
  private supabase = createClient()

  async loadScanResults(scanId: string): Promise<ScanResultsData | null> {
    try {
      // Load scan metadata first
      const scan = await this.loadScanData(scanId)
      if (!scan) return null

      // Load all related data in parallel for performance
      const [
        targets,
        financialData,
        riskData,
        marketIntelligence,
        dueDiligence,
        valuationModels,
        scanReports
      ] = await Promise.all([
        this.loadTargetCompanies(scanId),
        this.loadFinancialAnalysis(scanId),
        this.loadRiskAssessments(scanId),
        this.loadMarketIntelligence(scanId),
        this.loadDueDiligence(scanId),
        this.loadValuationModels(scanId),
        this.loadScanReports(scanId)
      ])

      // Generate comprehensive summary
      const summary = this.generateScanSummary(targets, financialData, riskData)

      return {
        scan,
        targets,
        financialData,
        riskData,
        marketIntelligence,
        dueDiligence,
        valuationModels,
        scanReports,
        summary
      }
    } catch (error) {
      console.error('Error loading scan results:', error)
      return null
    }
  }

  private async loadScanData(scanId: string): Promise<ScanData | null> {
    const { data, error } = await this.supabase
      .from('acquisition_scans')
      .select('*')
      .eq('id', scanId)
      .single()

    if (error) {
      console.error('Error loading scan data:', error)
      return null
    }

    return data
  }

  private async loadTargetCompanies(scanId: string): Promise<TargetCompany[]> {
    const { data, error } = await this.supabase
      .from('target_companies')
      .select('*')
      .eq('scan_id', scanId)
      .order('overall_score', { ascending: false })

    if (error) {
      console.error('Error loading target companies:', error)
      return []
    }

    return data || []
  }

  private async loadFinancialAnalysis(scanId: string): Promise<FinancialAnalysis[]> {
    // First get all target IDs for this scan
    const { data: targets, error: targetsError } = await this.supabase
      .from('target_companies')
      .select('id')
      .eq('scan_id', scanId)

    if (targetsError || !targets) return []

    const targetIds = targets.map(t => t.id)
    if (targetIds.length === 0) return []

    const { data, error } = await this.supabase
      .from('financial_analysis')
      .select('*')
      .in('target_company_id', targetIds)

    if (error) {
      console.error('Error loading financial analysis:', error)
      return []
    }

    return data || []
  }

  private async loadRiskAssessments(scanId: string): Promise<RiskAssessment[]> {
    // First get all target IDs for this scan
    const { data: targets, error: targetsError } = await this.supabase
      .from('target_companies')
      .select('id')
      .eq('scan_id', scanId)

    if (targetsError || !targets) return []

    const targetIds = targets.map(t => t.id)
    if (targetIds.length === 0) return []

    const { data, error } = await this.supabase
      .from('risk_assessments')
      .select('*')
      .in('target_company_id', targetIds)

    if (error) {
      console.error('Error loading risk assessments:', error)
      return []
    }

    return data || []
  }

  private async loadMarketIntelligence(scanId: string): Promise<MarketIntelligence[]> {
    const { data, error } = await this.supabase
      .from('market_intelligence')
      .select('*')
      .eq('scan_id', scanId)

    if (error) {
      console.error('Error loading market intelligence:', error)
      return []
    }

    return data || []
  }

  private async loadDueDiligence(scanId: string): Promise<DueDiligence[]> {
    // First get all target IDs for this scan
    const { data: targets, error: targetsError } = await this.supabase
      .from('target_companies')
      .select('id')
      .eq('scan_id', scanId)

    if (targetsError || !targets) return []

    const targetIds = targets.map(t => t.id)
    if (targetIds.length === 0) return []

    const { data, error } = await this.supabase
      .from('due_diligence')
      .select('*')
      .in('target_company_id', targetIds)

    if (error) {
      console.error('Error loading due diligence:', error)
      return []
    }

    return data || []
  }

  private async loadValuationModels(scanId: string): Promise<ValuationModel[]> {
    // First get all target IDs for this scan
    const { data: targets, error: targetsError } = await this.supabase
      .from('target_companies')
      .select('id')
      .eq('scan_id', scanId)

    if (targetsError || !targets) return []

    const targetIds = targets.map(t => t.id)
    if (targetIds.length === 0) return []

    const { data, error } = await this.supabase
      .from('valuation_models')
      .select('*')
      .in('target_company_id', targetIds)

    if (error) {
      console.error('Error loading valuation models:', error)
      return []
    }

    return data || []
  }

  private async loadScanReports(scanId: string): Promise<ScanReport[]> {
    const { data, error } = await this.supabase
      .from('scan_reports')
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading scan reports:', error)
      return []
    }

    return data || []
  }

  private generateScanSummary(
    targets: TargetCompany[],
    financialData: FinancialAnalysis[],
    riskData: RiskAssessment[]
  ): ScanSummary {
    const totalTargets = targets.length
    const analyzedTargets = targets.filter(t => t.analysis_status === 'completed').length
    const completionPercentage = totalTargets > 0 ? (analyzedTargets / totalTargets) * 100 : 0

    // Calculate averages
    const avgOverallScore = totalTargets > 0 ? 
      targets.reduce((sum, t) => sum + t.overall_score, 0) / totalTargets : 0
    const avgStrategicFitScore = totalTargets > 0 ? 
      targets.reduce((sum, t) => sum + t.strategic_fit_score, 0) / totalTargets : 0
    const avgFinancialHealthScore = totalTargets > 0 ? 
      targets.reduce((sum, t) => sum + t.financial_health_score, 0) / totalTargets : 0
    const avgRiskScore = totalTargets > 0 ? 
      targets.reduce((sum, t) => sum + t.risk_score, 0) / totalTargets : 0

    // Quality breakdown
    const highQualityTargets = targets.filter(t => t.overall_score > 80).length
    const mediumQualityTargets = targets.filter(t => t.overall_score >= 60 && t.overall_score <= 80).length
    const lowQualityTargets = targets.filter(t => t.overall_score < 60).length

    // Risk breakdown
    const lowRiskTargets = riskData.filter(r => r.risk_category === 'low').length
    const moderateRiskTargets = riskData.filter(r => r.risk_category === 'moderate').length
    const highRiskTargets = riskData.filter(r => r.risk_category === 'high').length
    const criticalRiskTargets = riskData.filter(r => r.risk_category === 'critical').length

    // Total estimated value
    const totalEstimatedValue = financialData.reduce((sum, f) => 
      sum + (f.estimated_enterprise_value || 0), 0)

    // Industry breakdown
    const industryBreakdown: { [key: string]: number } = {}
    targets.forEach(target => {
      target.industry_codes.forEach(code => {
        industryBreakdown[code] = (industryBreakdown[code] || 0) + 1
      })
    })

    // Size breakdown
    const sizeBreakdown: { [key: string]: number } = {}
    targets.forEach(target => {
      const size = target.employee_count_range || 'Unknown'
      sizeBreakdown[size] = (sizeBreakdown[size] || 0) + 1
    })

    // Top opportunities
    const topOpportunities = targets
      .filter(t => t.overall_score > 70)
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 10)

    // Risk alerts
    const riskAlerts = riskData
      .filter(r => r.red_flags && r.red_flags.length > 0)
      .map(risk => {
        const target = targets.find(t => t.id === risk.target_company_id)
        return target ? {
          target,
          risks: risk.red_flags || []
        } : null
      })
      .filter(alert => alert !== null) as Array<{ target: TargetCompany; risks: string[] }>

    // Generate key insights
    const keyInsights = this.generateKeyInsights(targets, financialData, riskData)
    const nextActions = this.generateNextActions(targets, riskData)

    return {
      totalTargets,
      analyzedTargets,
      completionPercentage,
      avgOverallScore,
      avgStrategicFitScore,
      avgFinancialHealthScore,
      avgRiskScore,
      highQualityTargets,
      mediumQualityTargets,
      lowQualityTargets,
      lowRiskTargets,
      moderateRiskTargets,
      highRiskTargets,
      criticalRiskTargets,
      totalEstimatedValue,
      industryBreakdown,
      regionBreakdown: {}, // TODO: Implement based on registered_address
      sizeBreakdown,
      topOpportunities,
      riskAlerts,
      keyInsights,
      nextActions
    }
  }

  private generateKeyInsights(
    targets: TargetCompany[],
    financialData: FinancialAnalysis[],
    riskData: RiskAssessment[]
  ): string[] {
    const insights: string[] = []

    // Market concentration insights
    if (targets.length > 10) {
      const highScoreCount = targets.filter(t => t.overall_score > 80).length
      const percentage = (highScoreCount / targets.length) * 100
      insights.push(`${percentage.toFixed(0)}% of targets show strong acquisition potential (score > 80)`)
    }

    // Financial insights
    const highGrowthTargets = financialData.filter(f => (f.revenue_growth_3y || 0) > 0.2).length
    if (highGrowthTargets > 0) {
      insights.push(`${highGrowthTargets} companies show strong growth (>20% revenue CAGR)`)
    }

    // Risk insights
    const highRiskCount = riskData.filter(r => r.risk_category === 'high' || r.risk_category === 'critical').length
    if (highRiskCount > 0) {
      insights.push(`${highRiskCount} targets require additional due diligence due to elevated risk levels`)
    }

    return insights
  }

  private generateNextActions(targets: TargetCompany[], riskData: RiskAssessment[]): string[] {
    const actions: string[] = []

    // Priority targets for immediate follow-up
    const priorityTargets = targets.filter(t => 
      t.overall_score > 85 && t.analysis_status === 'completed'
    ).length
    if (priorityTargets > 0) {
      actions.push(`Initiate detailed due diligence for ${priorityTargets} high-priority targets`)
    }

    // Risk mitigation
    const criticalRisks = riskData.filter(r => r.risk_category === 'critical').length
    if (criticalRisks > 0) {
      actions.push(`Address critical risk factors for ${criticalRisks} companies before proceeding`)
    }

    // Analysis completion
    const pendingAnalysis = targets.filter(t => t.analysis_status === 'pending' || t.analysis_status === 'analyzing').length
    if (pendingAnalysis > 0) {
      actions.push(`Complete analysis for remaining ${pendingAnalysis} targets`)
    }

    return actions
  }
}

export const scanResultsDataService = new ScanResultsDataService()