/**
 * ESG Benchmarking Copilot Types
 * Type definitions for Environmental, Social, and Governance analytics
 */

// ============================================================================
// ENUMS
// ============================================================================

export type ESGCategory = 'environmental' | 'social' | 'governance';

export type ESGLevel = 'lagging' | 'par' | 'leading';

export type ESGReportStatus = 'queued' | 'running' | 'success' | 'error';

export type ESGSentimentLabel = 'positive' | 'neutral' | 'negative';

export type ESGSubcategory =
  // Environmental
  | 'Climate & Emissions'
  | 'Energy'
  | 'Water'
  | 'Waste'
  | 'Biodiversity'
  | 'Pollution'
  // Social
  | 'Workforce'
  | 'Diversity'
  | 'Health & Safety'
  | 'Privacy'
  | 'Product Safety'
  | 'Supply Chain'
  | 'Community'
  // Governance
  | 'Board'
  | 'Ethics'
  | 'ESG Oversight'
  | 'Risk Management'
  | 'Shareholder Rights';

// ============================================================================
// CORE ENTITIES
// ============================================================================

export interface ESGTemplate {
  id: string;
  key: string;
  title: string;
  description: string | null;
  category: ESGCategory;
  subcategory: ESGSubcategory | null;
  metric_keys: string[];
  weights: Record<string, number>;
  version: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ESGMetric {
  id: string;
  company_id: string;
  period_year: number;
  category: ESGCategory;
  subcategory: ESGSubcategory | null;
  metric_key: string;
  metric_name: string;

  // Value (one will be populated)
  value_numeric: number | null;
  value_text: string | null;
  value_boolean: boolean | null;
  unit: string | null;

  // Source
  source: string | null;
  citation: ESGCitation | null;
  confidence: number | null;

  // Benchmarking
  benchmark_percentile: number | null;
  benchmark_sector: string | null;
  benchmark_size_band: string | null;
  benchmark_region: string | null;

  created_at: string;
  updated_at: string;
}

export interface ESGCitation {
  document_id?: string;
  page_number?: number;
  chunk_index?: number;
  excerpt?: string;
}

export interface ESGBenchmark {
  id: string;
  metric_key: string;
  sector: string;
  size_band: string | null;  // 'small', 'medium', 'large', 'enterprise'
  region: string | null;     // 'UK', 'IE', 'EU', 'Global'

  // Percentiles
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;

  sample_size: number | null;
  data_year: number | null;
  updated_at: string;
}

export interface ESGScore {
  id: string;
  company_id: string;
  period_year: number;
  category: ESGCategory;
  subcategory: ESGSubcategory | null;

  score: number;  // 0-100
  level: ESGLevel;

  details: ESGScoreDetails | null;
  metrics_count: number;
  metrics_with_data: number;

  computed_at: string;
}

export interface ESGScoreDetails {
  weights?: Record<string, number>;
  metric_scores?: Record<string, number>;
  gaps?: string[];
  improvements?: string[];
  benchmark_position?: string;
}

export interface ESGDisclosure {
  id: string;
  company_id: string;
  document_id: string | null;

  page_number: number | null;
  chunk_index: number | null;

  category: ESGCategory | null;
  subcategory: ESGSubcategory | null;
  metric_key: string | null;

  excerpt: string;
  normalized_value: any;

  confidence: number | null;
  ai_model: string | null;
  extraction_method: string | null;  // 'ai', 'manual', 'structured'

  created_at: string;
  updated_at: string;
}

export interface ESGSentiment {
  id: string;
  company_id: string;
  period_year: number;

  source: string;  // 'news', 'social_media', 'reports', 'pr'
  source_url: string | null;
  title: string | null;
  excerpt: string | null;

  label: ESGSentimentLabel;
  score: number | null;  // -1 to 1

  related_categories: ESGCategory[] | null;
  related_metrics: string[] | null;

  published_at: string | null;
  created_at: string;
}

export interface ESGReport {
  id: string;
  company_id: string;
  period_year: number;

  template_version: string;
  status: ESGReportStatus;

  filename: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;

  meta: ESGReportMeta | null;
  error_message: string | null;

  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface ESGReportMeta {
  sections?: string[];
  metrics_included?: number;
  benchmark_count?: number;
  sentiment_count?: number;
  generation_time_ms?: number;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ESGSummaryResponse {
  company_id: string;
  period_year: number;
  overall_score?: number;
  category_scores: {
    environmental: ESGCategoryScore;
    social: ESGCategoryScore;
    governance: ESGCategoryScore;
  };
  highlights: ESGHighlight[];
  sentiment_summary?: ESGSentimentSummary;
  last_updated: string;
}

export interface ESGCategoryScore {
  score: number;
  level: ESGLevel;
  subcategories: {
    [key: string]: {
      score: number;
      level: ESGLevel;
      metrics_count: number;
      data_completeness: number;
    };
  };
  benchmark_position?: number;  // Percentile
}

export interface ESGHighlight {
  type: 'strength' | 'weakness' | 'gap';
  category: ESGCategory;
  subcategory?: ESGSubcategory;
  metric_key?: string;
  message: string;
  value?: number;
  benchmark?: number;
}

export interface ESGSentimentSummary {
  overall_sentiment: ESGSentimentLabel;
  average_score: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  recent_items: ESGSentiment[];
  trend?: 'improving' | 'stable' | 'declining';
}

export interface ESGMetricsListResponse {
  metrics: (ESGMetric & {
    benchmark?: ESGBenchmark;
    template?: Partial<ESGTemplate>;
  })[];
  total: number;
  by_category: {
    environmental: number;
    social: number;
    governance: number;
  };
}

export interface ESGRecomputeRequest {
  period_year: number;
  force?: boolean;
  include_sentiment?: boolean;
}

export interface ESGRecomputeResponse {
  success: boolean;
  message: string;
  metrics_updated: number;
  scores_computed: number;
  duration_ms: number;
}

// ============================================================================
// METRIC DEFINITIONS
// ============================================================================

export interface ESGMetricDefinition {
  key: string;
  name: string;
  description: string;
  category: ESGCategory;
  subcategory: ESGSubcategory;
  unit?: string;
  data_type: 'numeric' | 'text' | 'boolean';
  good_direction?: 'higher' | 'lower';  // For scoring
  weight?: number;
  extraction_hints?: string[];
}

// Comprehensive metric definitions
export const ESG_METRIC_DEFINITIONS: Record<string, ESGMetricDefinition> = {
  // Environmental - Climate & Emissions
  ghg_scope1_tco2e: {
    key: 'ghg_scope1_tco2e',
    name: 'GHG Scope 1 Emissions',
    description: 'Direct greenhouse gas emissions in tonnes CO2 equivalent',
    category: 'environmental',
    subcategory: 'Climate & Emissions',
    unit: 'tCO2e',
    data_type: 'numeric',
    good_direction: 'lower',
    weight: 1.5,
  },
  ghg_scope2_tco2e: {
    key: 'ghg_scope2_tco2e',
    name: 'GHG Scope 2 Emissions',
    description: 'Indirect GHG emissions from purchased energy in tCO2e',
    category: 'environmental',
    subcategory: 'Climate & Emissions',
    unit: 'tCO2e',
    data_type: 'numeric',
    good_direction: 'lower',
    weight: 1.3,
  },
  ghg_scope3_tco2e: {
    key: 'ghg_scope3_tco2e',
    name: 'GHG Scope 3 Emissions',
    description: 'Value chain emissions in tCO2e',
    category: 'environmental',
    subcategory: 'Climate & Emissions',
    unit: 'tCO2e',
    data_type: 'numeric',
    good_direction: 'lower',
    weight: 1.2,
  },

  // Environmental - Energy
  energy_consumption_kwh: {
    key: 'energy_consumption_kwh',
    name: 'Total Energy Consumption',
    description: 'Total energy consumed in kilowatt-hours',
    category: 'environmental',
    subcategory: 'Energy',
    unit: 'kWh',
    data_type: 'numeric',
    good_direction: 'lower',
    weight: 1.0,
  },
  renewable_energy_pct: {
    key: 'renewable_energy_pct',
    name: 'Renewable Energy %',
    description: 'Percentage of energy from renewable sources',
    category: 'environmental',
    subcategory: 'Energy',
    unit: '%',
    data_type: 'numeric',
    good_direction: 'higher',
    weight: 1.2,
  },

  // Social - Workforce
  employee_turnover_pct: {
    key: 'employee_turnover_pct',
    name: 'Employee Turnover Rate',
    description: 'Annual employee turnover percentage',
    category: 'social',
    subcategory: 'Workforce',
    unit: '%',
    data_type: 'numeric',
    good_direction: 'lower',
    weight: 1.0,
  },
  training_hours_avg: {
    key: 'training_hours_avg',
    name: 'Average Training Hours',
    description: 'Average training hours per employee per year',
    category: 'social',
    subcategory: 'Workforce',
    unit: 'hours',
    data_type: 'numeric',
    good_direction: 'higher',
    weight: 0.8,
  },

  // Social - Diversity
  gender_diversity_pct: {
    key: 'gender_diversity_pct',
    name: 'Gender Diversity',
    description: 'Percentage of women in workforce',
    category: 'social',
    subcategory: 'Diversity',
    unit: '%',
    data_type: 'numeric',
    good_direction: 'higher',
    weight: 1.2,
  },

  // Social - Health & Safety
  trir: {
    key: 'trir',
    name: 'Total Recordable Incident Rate',
    description: 'TRIR per 200,000 hours worked',
    category: 'social',
    subcategory: 'Health & Safety',
    unit: 'rate',
    data_type: 'numeric',
    good_direction: 'lower',
    weight: 1.5,
  },

  // Governance - Board
  board_independence_pct: {
    key: 'board_independence_pct',
    name: 'Board Independence',
    description: 'Percentage of independent board members',
    category: 'governance',
    subcategory: 'Board',
    unit: '%',
    data_type: 'numeric',
    good_direction: 'higher',
    weight: 1.3,
  },
  board_diversity_pct: {
    key: 'board_diversity_pct',
    name: 'Board Diversity',
    description: 'Percentage of diverse board members',
    category: 'governance',
    subcategory: 'Board',
    unit: '%',
    data_type: 'numeric',
    good_direction: 'higher',
    weight: 1.2,
  },

  // Governance - Ethics
  ethics_policy_exists: {
    key: 'ethics_policy_exists',
    name: 'Ethics Policy',
    description: 'Existence of formal ethics and anti-corruption policy',
    category: 'governance',
    subcategory: 'Ethics',
    data_type: 'boolean',
    good_direction: 'higher',
    weight: 1.0,
  },

  // Governance - ESG Oversight
  esg_committee_exists: {
    key: 'esg_committee_exists',
    name: 'ESG Committee',
    description: 'Existence of board-level ESG committee',
    category: 'governance',
    subcategory: 'ESG Oversight',
    data_type: 'boolean',
    good_direction: 'higher',
    weight: 1.2,
  },
};
