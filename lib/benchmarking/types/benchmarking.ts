/**
 * Benchmarking System Type Definitions
 * Core interfaces and types for the benchmarking feature
 */

// ============================================
// Core Data Types
// ============================================

export interface CompanyMetrics {
  id?: string
  company_id: string
  metric_date: string // ISO date string

  // Financial metrics
  revenue?: number
  gross_profit?: number
  operating_profit?: number
  net_profit?: number
  ebitda?: number
  total_assets?: number
  total_liabilities?: number
  shareholders_equity?: number
  cash_flow?: number
  working_capital?: number

  // Operational metrics
  employee_count?: number
  customer_count?: number
  transaction_volume?: number

  // Efficiency metrics
  revenue_per_employee?: number
  profit_margin?: number
  gross_margin?: number
  operating_margin?: number
  asset_turnover?: number
  current_ratio?: number
  quick_ratio?: number
  debt_to_equity?: number
  return_on_assets?: number
  return_on_equity?: number

  // Growth metrics
  revenue_growth_yoy?: number
  revenue_growth_qoq?: number
  customer_growth_yoy?: number
  employee_growth_yoy?: number

  // Metadata
  data_source?: string
  data_quality_score?: number
  created_at?: string
  updated_at?: string
}

export interface IndustryBenchmark {
  id?: string
  industry_code: string
  industry_name?: string
  metric_name: string
  metric_date: string

  // Statistical values
  mean_value?: number
  median_value?: number
  min_value?: number
  max_value?: number
  std_deviation?: number

  // Percentiles
  p10_value?: number
  p25_value?: number
  p75_value?: number
  p90_value?: number
  p95_value?: number

  // Sample info
  sample_size?: number
  company_size_category?: 'all' | 'micro' | 'small' | 'medium' | 'large'
  geographic_scope?: string
  data_quality_score?: number
}

export interface PeerGroup {
  id?: string
  name: string
  description?: string
  org_id?: string

  // Configuration
  selection_criteria: PeerSelectionCriteria
  auto_update?: boolean
  update_frequency?: 'daily' | 'weekly' | 'monthly'

  // Metadata
  member_count?: number
  homogeneity_score?: number
  avg_similarity_score?: number
  created_at?: string
  updated_at?: string
}

export interface PeerSelectionCriteria {
  industry_codes?: string[]
  size_range?: {
    min_revenue?: number
    max_revenue?: number
    min_employees?: number
    max_employees?: number
  }
  geography?: string[]
  growth_stage?: 'startup' | 'scaleup' | 'growth' | 'mature' | 'decline'
  custom_filters?: Array<{
    field: string
    operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains'
    value: any
  }>
}

export interface PeerGroupMember {
  id?: string
  peer_group_id: string
  company_id: string
  inclusion_reason?: string
  similarity_score?: number
  is_core_peer?: boolean
  is_aspirational?: boolean
  is_competitor?: boolean
  added_at?: string
  is_active?: boolean
}

// ============================================
// Comparison Results
// ============================================

export interface BenchmarkComparison {
  id?: string
  company_id: string
  comparison_date: string
  comparison_type: 'industry' | 'peer_group' | 'custom' | 'mixed'

  // Scope
  peer_group_id?: string
  industry_code?: string
  custom_company_ids?: string[]

  // Overall results
  overall_score?: number // 0-100
  percentile_rank?: number // 1-100
  quartile?: 1 | 2 | 3 | 4

  // Detailed results
  comparison_results: ComparisonResults
  percentile_rankings: Record<string, number>
  gap_analysis: GapAnalysis
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  recommendations: Recommendation[]

  // AI insights
  ai_insights?: string
  ai_confidence_score?: number

  created_at?: string
}

export interface ComparisonResults {
  financial_metrics?: MetricComparison[]
  operational_metrics?: MetricComparison[]
  growth_metrics?: MetricComparison[]
  efficiency_metrics?: MetricComparison[]
}

export interface MetricComparison {
  metric_name: string
  metric_label: string
  company_value: number
  benchmark_value: number // Could be median, mean, etc.
  percentile: number
  vs_benchmark: number // Ratio: company/benchmark
  trend?: 'improving' | 'stable' | 'declining'
  significance?: 'strength' | 'neutral' | 'weakness'
}

export interface GapAnalysis {
  performance_gaps: Array<{
    metric: string
    current_value: number
    target_value: number
    gap_size: number
    gap_percentage: number
    priority: 'high' | 'medium' | 'low'
  }>
  capability_gaps?: string[]
  resource_gaps?: string[]
  estimated_time_to_close?: number // months
}

export interface Recommendation {
  title: string
  description: string
  category: 'quick_win' | 'strategic' | 'operational' | 'financial'
  priority: 'high' | 'medium' | 'low'
  estimated_impact: 'high' | 'medium' | 'low'
  estimated_effort: 'high' | 'medium' | 'low'
  timeline?: string
}

// ============================================
// Growth Benchmarks
// ============================================

export interface GrowthBenchmark {
  id?: string
  company_id: string
  period_start: string
  period_end: string
  period_type: 'month' | 'quarter' | 'year' | 'custom'

  // Growth rates
  revenue_cagr?: number
  revenue_growth?: number
  customer_cagr?: number
  customer_growth?: number
  employee_cagr?: number
  employee_growth?: number

  // Growth quality
  organic_growth_rate?: number
  acquisition_growth_rate?: number
  profitable_growth_score?: number
  growth_consistency_score?: number
  growth_efficiency_ratio?: number

  // Comparative
  vs_industry_percentile?: number
  vs_peers_percentile?: number
  growth_trajectory?: 'accelerating' | 'steady' | 'decelerating' | 'volatile'
  growth_stage?: 'startup' | 'scaleup' | 'growth' | 'mature' | 'decline'
}

// ============================================
// Efficiency Scores
// ============================================

export interface EfficiencyScores {
  id?: string
  company_id: string
  calculation_date: string

  // Dimension scores (0-100)
  operational_efficiency?: number
  financial_efficiency?: number
  labor_efficiency?: number
  asset_efficiency?: number
  digital_efficiency?: number
  overall_efficiency?: number

  // Detailed breakdown
  efficiency_breakdown?: Record<string, number>
  improvement_areas?: ImprovementArea[]
  best_practices?: string[]
  automation_opportunities?: AutomationOpportunity[]
}

export interface ImprovementArea {
  area: string
  current_performance: number
  target_performance: number
  potential_savings?: number
  implementation_difficulty: 'easy' | 'medium' | 'hard'
}

export interface AutomationOpportunity {
  process: string
  current_manual_effort: number // hours/month
  automation_potential: number // percentage
  estimated_roi: number
  recommended_tools?: string[]
}

// ============================================
// Market Position
// ============================================

export interface MarketPosition {
  id?: string
  company_id: string
  analysis_date: string

  // Market metrics
  market_share?: number
  market_rank?: number
  total_competitors?: number
  competitive_strength_score?: number

  // Strategic positioning
  strategic_group?: string
  market_segment?: string
  value_proposition_score?: number
  differentiation_index?: number
  brand_strength_score?: number

  // Analysis
  positioning_analysis?: any
  competitive_advantages?: string[]
  competitive_threats?: string[]
  strategic_gaps?: string[]

  // Market dynamics
  market_growth_rate?: number
  market_maturity?: 'emerging' | 'growing' | 'mature' | 'declining'
  disruption_risk?: number
}

// ============================================
// Alerts
// ============================================

export interface BenchmarkAlert {
  id?: string
  company_id: string
  alert_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'

  // Alert details
  metric_name?: string
  previous_value?: number
  current_value?: number
  threshold_value?: number
  change_percentage?: number

  // Context
  peer_average?: number
  industry_median?: number

  // Content
  title: string
  message?: string
  recommendations?: string[]

  // Lifecycle
  triggered_at?: string
  acknowledged_at?: string
  resolved_at?: string
}

// ============================================
// API Request/Response Types
// ============================================

export interface CalculateBenchmarksRequest {
  company_id: string
  comparison_type?: 'industry' | 'peer_group' | 'both'
  peer_group_id?: string
  industry_code?: string
  metrics_to_compare?: string[]
  include_ai_insights?: boolean
  force_refresh?: boolean
}

export interface CalculateBenchmarksResponse {
  success: boolean
  comparison?: BenchmarkComparison
  peer_group?: PeerGroup
  alerts?: BenchmarkAlert[]
  cached?: boolean
  error?: string
}

export interface IdentifyPeersRequest {
  company_id: string
  max_peers?: number
  criteria?: PeerSelectionCriteria
  include_competitors?: boolean
  include_aspirational?: boolean
}

export interface IdentifyPeersResponse {
  success: boolean
  peers: Array<{
    company_id: string
    company_name: string
    similarity_score: number
    matching_criteria: string[]
    is_competitor?: boolean
    is_aspirational?: boolean
  }>
  total_candidates?: number
  selection_method?: string
}

export interface GetIndustryBenchmarksRequest {
  industry_code: string
  metrics?: string[]
  date_range?: {
    start: string
    end: string
  }
  company_size?: 'all' | 'micro' | 'small' | 'medium' | 'large'
  geographic_scope?: string
}

export interface GetIndustryBenchmarksResponse {
  success: boolean
  benchmarks: IndustryBenchmark[]
  sample_size?: number
  last_updated?: string
}

// ============================================
// Utility Types
// ============================================

export type MetricName =
  | 'revenue'
  | 'profit_margin'
  | 'gross_margin'
  | 'operating_margin'
  | 'return_on_assets'
  | 'return_on_equity'
  | 'current_ratio'
  | 'debt_to_equity'
  | 'revenue_per_employee'
  | 'revenue_growth_yoy'
  | 'customer_growth_yoy'
  | string

export type ComparisonPeriod = 'current' | 'ytd' | 'last_year' | 'last_quarter' | 'custom'

export interface BenchmarkConfig {
  enable_ai_insights: boolean
  cache_duration_hours: number
  min_peer_group_size: number
  max_peer_group_size: number
  default_metrics: MetricName[]
  percentile_thresholds: {
    excellent: number // e.g., 90
    good: number // e.g., 75
    average: number // e.g., 50
    below_average: number // e.g., 25
    poor: number // e.g., 10
  }
}

// ============================================
// Enums for Database Values
// ============================================

export const ComparisonType = {
  INDUSTRY: 'industry',
  PEER_GROUP: 'peer_group',
  CUSTOM: 'custom',
  MIXED: 'mixed'
} as const

export const Severity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const

export const GrowthStage = {
  STARTUP: 'startup',
  SCALEUP: 'scaleup',
  GROWTH: 'growth',
  MATURE: 'mature',
  DECLINE: 'decline'
} as const

export const CompanySize = {
  MICRO: 'micro', // < 10 employees
  SMALL: 'small', // 10-49 employees
  MEDIUM: 'medium', // 50-249 employees
  LARGE: 'large', // 250+ employees
  ENTERPRISE: 'enterprise' // 1000+ employees
} as const