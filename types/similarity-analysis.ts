// Enhanced similarity analysis types with new scoring dimensions

export interface ScoringWeights {
  financial: number
  strategic: number
  operational: number
  market: number
  risk: number
  esg: number
}

export interface ESGScoring {
  environmental_score: number
  social_score: number
  governance_score: number
  overall_esg_score: number
  esg_factors: ESGFactor[]
  sustainability_rating?: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D'
}

export interface ESGFactor {
  category: 'environmental' | 'social' | 'governance'
  factor: string
  score: number
  impact: 'positive' | 'negative' | 'neutral'
  description: string
  data_source?: string
}

export interface TechnologyProfile {
  digital_maturity_score: number
  tech_stack_similarity: number
  innovation_score: number
  ip_portfolio_strength: number
  rd_investment_ratio: number
  technology_factors: TechnologyFactor[]
}

export interface TechnologyFactor {
  category: 'infrastructure' | 'applications' | 'data' | 'security' | 'innovation'
  technology: string
  adoption_level: number
  strategic_importance: 'critical' | 'important' | 'moderate' | 'low'
  compatibility_score: number
}

export interface CulturalFit {
  leadership_style_similarity: number
  work_culture_alignment: number
  values_compatibility: number
  communication_style_match: number
  change_readiness_score: number
  cultural_factors: CulturalFactor[]
}

export interface CulturalFactor {
  dimension: 'leadership' | 'culture' | 'values' | 'communication' | 'change'
  assessment: string
  score: number
  compatibility: 'high' | 'medium' | 'low'
  potential_issues: string[]
  integration_recommendations: string[]
}

export interface SynergyPotential {
  revenue_synergies: SynergyDetail
  cost_synergies: SynergyDetail
  operational_synergies: SynergyDetail
  total_synergy_value: number
  synergy_realization_timeline: SynergyTimeline[]
  synergy_risk_factors: string[]
}

export interface SynergyDetail {
  potential_value: number
  confidence_level: number
  realization_probability: number
  time_to_realize_months: number
  key_drivers: string[]
  implementation_challenges: string[]
}

export interface SynergyTimeline {
  year: number
  revenue_synergies: number
  cost_synergies: number
  cumulative_value: number
  key_milestones: string[]
}

export interface EnhancedSimilarityMatch {
  // Existing fields
  id: string
  company_name: string
  overall_score: number
  confidence: number
  rank: number
  financial_score: number
  strategic_score: number
  operational_score: number
  market_score: number
  risk_score: number
  
  // Enhanced scoring dimensions
  esg_scoring: ESGScoring
  technology_profile: TechnologyProfile
  cultural_fit: CulturalFit
  synergy_potential: SynergyPotential
  
  // Enhanced factors with explanations
  financial_factors: ScoringFactor[]
  strategic_factors: ScoringFactor[]
  operational_factors: ScoringFactor[]
  market_factors: ScoringFactor[]
  risk_factors: ScoringFactor[]
  
  // Confidence scores for each dimension
  financial_confidence: number
  strategic_confidence: number
  operational_confidence: number
  market_confidence: number
  risk_confidence: number
  esg_confidence: number
  
  // Additional metadata
  company_data: EnhancedCompanyData
  competitive_landscape: CompetitiveLandscape
  market_dynamics: MarketDynamics
  valuation_metrics: ValuationMetrics
}

export interface ScoringFactor {
  factor: string
  value: number | string
  weight: number
  impact: 'positive' | 'negative' | 'neutral'
  confidence: number
  explanation: string
  data_source?: string
  benchmark_comparison?: {
    industry_average: number
    peer_group_average: number
    percentile_rank: number
  }
}

export interface EnhancedCompanyData {
  // Basic information
  country: string
  industry: string
  sub_industry: string
  founded: string
  employees: string
  revenue: string
  headquarters: string
  
  // Financial metrics
  market_cap?: number
  enterprise_value?: number
  revenue_growth_rate?: number
  ebitda_margin?: number
  debt_to_equity?: number
  
  // Business model
  business_model: string
  target_customers: string
  key_products_services: string[]
  distribution_channels: string[]
  
  // Technology & Innovation
  technology_focus: string[]
  patents_count?: number
  rd_spending?: number
  digital_transformation_stage?: string
  
  // ESG & Governance
  board_composition: string
  diversity_metrics: Record<string, unknown>
  sustainability_initiatives: string[]
  regulatory_compliance_score?: number
}

export interface CompetitiveLandscape {
  market_position: 'leader' | 'challenger' | 'follower' | 'niche'
  key_competitors: CompetitorInfo[]
  competitive_advantages: string[]
  competitive_threats: string[]
  market_share_percentage?: number
  competitive_moat_strength: number
}

export interface CompetitorInfo {
  name: string
  market_share?: number
  strengths: string[]
  weaknesses: string[]
  threat_level: 'high' | 'medium' | 'low'
}

export interface MarketDynamics {
  market_size_usd: number
  growth_rate_cagr: number
  market_maturity: 'emerging' | 'growth' | 'mature' | 'declining'
  key_trends: string[]
  disruption_risks: string[]
  regulatory_environment: 'favorable' | 'neutral' | 'challenging'
}

export interface ValuationMetrics {
  current_valuation?: number
  valuation_method: string
  ev_revenue_multiple?: number
  ev_ebitda_multiple?: number
  comparable_transactions: ComparableTransaction[]
  valuation_range: {
    low: number
    mid: number
    high: number
  }
}

export interface ComparableTransaction {
  date: string
  target_company: string
  acquirer: string
  transaction_value: number
  ev_revenue_multiple: number
  ev_ebitda_multiple?: number
  strategic_rationale: string
}

export interface EnhancedSimilarityAnalysis {
  // Existing fields
  id: string
  target_company_name: string
  target_company_data: EnhancedCompanyData
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_companies_analyzed: number
  average_similarity_score: number
  top_similarity_score: number
  created_at: string
  completed_at?: string
  
  // Enhanced analysis configuration
  analysis_configuration: {
    weights: ScoringWeights
    regions: string[]
    industries: string[]
    min_company_size?: string
    max_company_size?: string
    include_esg: boolean
    include_technology_analysis: boolean
    include_cultural_fit: boolean
    include_synergy_analysis: boolean
  }
  
  // Enhanced results
  similar_company_matches: EnhancedSimilarityMatch[]
  
  // AI-generated insights
  executive_summary: string
  key_opportunities: string[]
  risk_highlights: string[]
  strategic_recommendations: string[]
  ai_insights: AIInsights
  
  // Market analysis
  market_landscape: MarketLandscape
  acquisition_timing: AcquisitionTiming
  integration_complexity: IntegrationComplexity
  
  // Enhanced summary statistics
  summary: EnhancedAnalysisSummary
}

export interface AIInsights {
  key_findings: string[]
  investment_thesis: string
  deal_structure_recommendations: string[]
  due_diligence_priorities: string[]
  integration_recommendations: string[]
  risk_mitigation_strategies: string[]
  market_timing_insights: string[]
  competitive_positioning: string
}

export interface MarketLandscape {
  consolidation_trend: 'high' | 'medium' | 'low'
  acquisition_activity_level: 'very_active' | 'active' | 'moderate' | 'quiet'
  average_transaction_multiples: {
    ev_revenue: number
    ev_ebitda: number
  }
  key_strategic_buyers: string[]
  financial_buyers_interest: 'high' | 'medium' | 'low'
  regulatory_considerations: string[]
}

export interface AcquisitionTiming {
  market_timing_score: number
  optimal_timing_window: string
  market_conditions: 'favorable' | 'neutral' | 'challenging'
  seasonality_factors: string[]
  macroeconomic_considerations: string[]
  company_specific_timing: string[]
}

export interface IntegrationComplexity {
  complexity_score: number
  key_integration_challenges: string[]
  critical_success_factors: string[]
  estimated_integration_timeline: string
  integration_cost_estimate: number
  cultural_integration_difficulty: 'low' | 'medium' | 'high'
  operational_integration_difficulty: 'low' | 'medium' | 'high'
  technology_integration_difficulty: 'low' | 'medium' | 'high'
}

export interface EnhancedAnalysisSummary {
  totalMatches: number
  averageScore: number
  topScore: number
  scoreDistribution: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
  confidenceDistribution: {
    high: number
    medium: number
    low: number
  }
  esgScoreDistribution?: {
    a_grade: number
    b_grade: number
    c_grade: number
    d_grade: number
  }
  synergyPotential: {
    high: number
    medium: number
    low: number
  }
  geographicDistribution: { [country: string]: number }
  industryDistribution: { [industry: string]: number }
}