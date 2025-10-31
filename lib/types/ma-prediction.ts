// M&A Target Prediction Types
// Generated for feature 011-m-a-target

export type LikelihoodCategory = 'Low' | 'Medium' | 'High' | 'Very High';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type FactorType = 'financial' | 'operational' | 'market' | 'historical';
export type ImpactDirection = 'positive' | 'negative' | 'neutral';
export type StrategicRationale =
  | 'horizontal_integration'
  | 'vertical_integration'
  | 'technology_acquisition'
  | 'market_expansion'
  | 'talent_acquisition'
  | 'other';

export interface MAPrediction {
  id: string;
  company_id: string;
  prediction_score: number; // 0-100
  likelihood_category: LikelihoodCategory;
  confidence_level: ConfidenceLevel;
  analysis_version: string;
  algorithm_type: string;
  created_at: string;
  updated_at: string;
  data_last_refreshed: string;
  is_active: boolean;
  calculation_time_ms?: number;
}

export interface MAPredictionFactor {
  id: string;
  prediction_id: string;
  factor_type: FactorType;
  factor_name: string;
  factor_description: string;
  impact_weight: number; // 0-100
  impact_direction?: ImpactDirection;
  supporting_value?: Record<string, unknown>;
  rank: number; // 1-5
  created_at: string;
}

export interface MAValuationEstimate {
  id: string;
  prediction_id: string;
  min_valuation_gbp: number;
  max_valuation_gbp: number;
  currency: string;
  valuation_method: string;
  confidence_level: ConfidenceLevel;
  key_assumptions?: Record<string, unknown>;
  created_at: string;
}

export interface MAAcquirerProfile {
  id: string;
  prediction_id: string;
  potential_acquirer_id?: string;
  industry_match: string;
  size_ratio_description: string;
  geographic_proximity: string;
  strategic_rationale: StrategicRationale;
  strategic_rationale_description: string;
  match_score: number; // 0-100
  rank: number; // 1-10
  created_at: string;
}

export interface MAHistoricalDeal {
  id: string;
  target_company_name: string;
  target_company_id?: string;
  acquirer_company_name: string;
  acquirer_company_id?: string;
  deal_date: string;
  deal_value_gbp?: number;
  deal_type?: string;
  target_sic_code?: string;
  target_industry_description?: string;
  target_employee_count_at_deal?: number;
  target_revenue_at_deal_gbp?: number;
  target_age_years?: number;
  acquirer_sic_code?: string;
  acquirer_industry_description?: string;
  acquirer_size_category?: string;
  deal_rationale?: StrategicRationale;
  deal_rationale_notes?: string;
  data_source: string;
  source_url?: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

// Composite type for full prediction with related data
export interface MAPredictionDetail extends MAPrediction {
  factors: MAPredictionFactor[];
  valuation?: MAValuationEstimate;
  acquirer_profiles: MAAcquirerProfile[];
  company: {
    id: string;
    name: string;
    company_number: string;
    [key: string]: unknown; // Allow other business fields
  };
}

// Analysis result from individual analyzers
export interface AnalysisResult {
  score: number; // 0-100
  factors: Array<{
    factor_type: FactorType;
    factor_name: string;
    factor_description: string;
    impact_weight: number;
    impact_direction?: ImpactDirection;
    supporting_value?: Record<string, unknown>;
  }>;
}

// Batch processing types
export interface BatchResult {
  batch_id: string;
  total_companies: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
}

export interface BatchStatus extends BatchResult {
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  estimated_completion?: string;
  error_summary?: {
    insufficient_data: number;
    api_timeouts: number;
    unknown_errors: number;
  };
}

// Queue types
export interface QueueJob {
  id: string;
  company_id: string;
  trigger_type: 'data_update' | 'manual_request' | 'scheduled_batch';
  trigger_metadata?: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_started_at?: string;
  processing_completed_at?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
}
