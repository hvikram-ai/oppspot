/**
 * SaaS Valuation Model Types
 *
 * TypeScript interfaces for AI-powered SaaS company valuation
 * Supports revenue multiple, DCF, and comparable company analysis
 * Target: Generate "$75M-$120M" ranges to anchor M&A negotiations
 */

// ============================================================================
// ENUMS
// ============================================================================

export type ValuationMethod = 'revenue_multiple' | 'dcf' | 'hybrid';

export type ValuationStatus =
  | 'draft'
  | 'extracting'
  | 'calculating'
  | 'complete'
  | 'error';

export type ExtractionMethod =
  | 'manual'
  | 'ai_extracted'
  | 'companies_house'
  | 'hybrid';

export type ScenarioType =
  | 'base'
  | 'optimistic'
  | 'pessimistic'
  | 'conservative'
  | 'custom';

export type ComparableSource =
  | 'public_markets'
  | 'manual'
  | 'ai_research'
  | 'industry_report';

export type CompanyStage = 'public' | 'late_stage' | 'growth' | 'early_stage';

export type ExportFormat = 'pdf' | 'excel' | 'powerpoint';

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Main valuation model entity
 */
export interface ValuationModel {
  id: string;
  data_room_id: string;
  created_by: string;

  // Model metadata
  model_name: string;
  company_name: string;
  valuation_date: string; // ISO date string
  currency: string; // ISO 4217 currency code (USD, GBP, EUR)
  fiscal_year_end?: string | null;

  // Financial inputs
  arr?: number | null; // Annual Recurring Revenue
  mrr?: number | null; // Monthly Recurring Revenue
  revenue_growth_rate?: number | null; // % (e.g., 45.0 for 45%)
  gross_margin?: number | null; // % (e.g., 75.0 for 75%)
  net_revenue_retention?: number | null; // % (e.g., 110.0 for 110%)
  cac_payback_months?: number | null; // Months
  burn_rate?: number | null; // Monthly cash burn
  runway_months?: number | null; // Cash runway
  ebitda?: number | null; // Earnings before interest, taxes, depreciation
  employees?: number | null; // Headcount

  // Valuation methodology
  valuation_method: ValuationMethod;

  // Calculated outputs
  revenue_multiple_low?: number | null; // e.g., 8.0x
  revenue_multiple_mid?: number | null; // e.g., 10.0x
  revenue_multiple_high?: number | null; // e.g., 12.0x
  estimated_valuation_low?: number | null; // Low estimate
  estimated_valuation_mid?: number | null; // Base case
  estimated_valuation_high?: number | null; // High estimate
  valuation_confidence?: number | null; // 0.0 to 1.0

  // Data sources
  source_documents?: string[] | null; // Array of document IDs
  extraction_method: ExtractionMethod;
  data_quality_score?: number | null; // 0.0 to 1.0

  // AI analysis
  ai_insights?: AIInsights | null;
  ai_model?: string | null;
  ai_processing_time_ms?: number | null;

  // Calculation details
  calculation_details?: CalculationDetails | null;
  assumptions?: Record<string, unknown> | null;

  // Status
  status: ValuationStatus;
  error_message?: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/**
 * AI-generated insights about the valuation
 */
export interface AIInsights {
  reasoning: string; // Why this valuation range was chosen
  risks: string[]; // Identified risks to valuation
  opportunities: string[]; // Upside opportunities
  assumptions: string[]; // Key assumptions made
  comparable_companies: string[]; // Companies used for benchmarking
  confidence_factors: {
    data_completeness: number; // 0.0 to 1.0
    market_comparability: number; // 0.0 to 1.0
    financial_health: number; // 0.0 to 1.0
  };
}

/**
 * Detailed calculation breakdown for transparency
 */
export interface CalculationDetails {
  methodology: string;
  inputs_used: string[]; // Which inputs were used
  inputs_missing: string[]; // Which inputs were estimated or missing
  base_multiple: number;
  adjustments: MultipleAdjustment[];
  final_multiple: number;
  valuation_formula: string; // e.g., "ARR × Multiple"
  comparable_stats?: {
    count: number;
    median_multiple: number;
    avg_multiple: number;
    std_dev: number;
  };
}

/**
 * Adjustments to base revenue multiple
 */
export interface MultipleAdjustment {
  factor: string; // e.g., "High Growth Rate", "Strong NRR"
  impact: number; // +/- adjustment (e.g., +1.5x)
  reasoning: string;
}

/**
 * Comparable company for benchmarking
 */
export interface ValuationComparable {
  id: string;
  valuation_model_id: string;

  // Company identification
  company_name: string;
  ticker_symbol?: string | null;
  industry: string;
  geography?: string | null;
  company_stage?: CompanyStage | null;

  // Financial metrics
  arr?: number | null;
  revenue?: number | null;
  revenue_growth_rate?: number | null;
  gross_margin?: number | null;
  ebitda_margin?: number | null;
  employees?: number | null;

  // Valuation data
  revenue_multiple: number; // Required
  market_cap?: number | null;
  valuation?: number | null;
  valuation_date?: string | null;

  // Source attribution
  source: ComparableSource;
  source_url?: string | null;
  source_document_id?: string | null;
  data_quality_score: number; // 0.0 to 1.0

  // Relevance and weighting
  relevance_score: number; // 0.0 to 1.0
  weight: number; // Weight in average calculation

  // Metadata
  notes?: string | null;
  created_at: string;
}

/**
 * Sensitivity analysis scenario
 */
export interface ValuationScenario {
  id: string;
  valuation_model_id: string;

  // Scenario metadata
  scenario_name: string;
  scenario_type: ScenarioType;
  description?: string | null;

  // Adjusted assumptions
  assumptions: ScenarioAssumptions;

  // Calculated results
  revenue_multiple?: number | null;
  estimated_valuation?: number | null;

  // Sensitivity analysis
  probability?: number | null; // 0.0 to 1.0
  upside_downside?: number | null; // % difference from base

  // Audit
  created_at: string;
  updated_at: string;
}

/**
 * Adjusted financial assumptions for scenario
 */
export interface ScenarioAssumptions {
  arr?: number;
  mrr?: number;
  revenue_growth_rate?: number;
  gross_margin?: number;
  net_revenue_retention?: number;
  cac_payback_months?: number;
  burn_rate?: number;
  runway_months?: number;
  ebitda?: number;
  employees?: number;
  // Allow additional custom fields
  [key: string]: number | undefined;
}

/**
 * Export record for audit trail
 */
export interface ValuationExport {
  id: string;
  valuation_model_id: string;

  // Export metadata
  export_format: ExportFormat;
  file_name: string;
  storage_path?: string | null;
  file_size_bytes?: number | null;

  // Content configuration
  include_scenarios: boolean;
  include_comparables: boolean;
  include_methodology: boolean;

  // Audit
  exported_by: string;
  exported_at: string;
}

// ============================================================================
// VIEW TYPES
// ============================================================================

/**
 * Enriched valuation model with aggregated statistics
 */
export interface ValuationModelWithStats extends ValuationModel {
  data_room_name?: string | null;
  created_by_name?: string | null;
  comparables_count: number;
  scenarios_count: number;
  exports_count: number;
  avg_comparable_multiple?: number | null;
  max_comparable_multiple?: number | null;
  min_comparable_multiple?: number | null;
}

// ============================================================================
// INPUT/OUTPUT DTOs
// ============================================================================

/**
 * Input for creating a new valuation model
 */
export interface CreateValuationModelInput {
  data_room_id: string;
  model_name: string;
  company_name: string;
  valuation_date?: string; // Defaults to today
  currency?: string; // Defaults to USD
  fiscal_year_end?: string;

  // Financial inputs (optional - can be extracted from documents)
  arr?: number;
  mrr?: number;
  revenue_growth_rate?: number;
  gross_margin?: number;
  net_revenue_retention?: number;
  cac_payback_months?: number;
  burn_rate?: number;
  runway_months?: number;
  ebitda?: number;
  employees?: number;

  // Data extraction settings
  source_documents?: string[]; // Document IDs to extract from
  extraction_method?: ExtractionMethod;

  // Methodology
  valuation_method?: ValuationMethod;

  // Custom assumptions
  assumptions?: Record<string, unknown>;
}

/**
 * Input for updating a valuation model
 */
export interface UpdateValuationModelInput {
  model_name?: string;
  company_name?: string;
  valuation_date?: string;
  currency?: string;
  fiscal_year_end?: string;

  // Financial inputs
  arr?: number;
  mrr?: number;
  revenue_growth_rate?: number;
  gross_margin?: number;
  net_revenue_retention?: number;
  cac_payback_months?: number;
  burn_rate?: number;
  runway_months?: number;
  ebitda?: number;
  employees?: number;

  // Methodology
  valuation_method?: ValuationMethod;

  // Assumptions
  assumptions?: Record<string, unknown>;
}

/**
 * Output from valuation calculation
 */
export interface ValuationCalculationResult {
  success: boolean;
  valuation_model_id: string;

  // Calculated valuation range
  valuation_low: number;
  valuation_mid: number;
  valuation_high: number;

  // Revenue multiples used
  multiple_low: number;
  multiple_mid: number;
  multiple_high: number;

  // Confidence and quality
  confidence: number; // 0.0 to 1.0
  data_quality_score: number; // 0.0 to 1.0

  // AI insights
  ai_insights: AIInsights;

  // Calculation breakdown
  calculation_details: CalculationDetails;

  // Performance metrics
  processing_time_ms: number;
  ai_model_used: string;

  // Errors or warnings
  warnings?: string[];
  error_message?: string;
}

/**
 * Input for financial data extraction from documents
 */
export interface ExtractFinancialsInput {
  document_ids: string[]; // Document IDs to analyze
  company_name: string;
  fiscal_year_end?: string;
  currency?: string;
}

/**
 * Output from financial data extraction
 */
export interface ExtractedFinancials {
  success: boolean;

  // Extracted metrics
  arr?: number | null;
  mrr?: number | null;
  revenue?: number | null;
  revenue_growth_rate?: number | null;
  gross_margin?: number | null;
  net_revenue_retention?: number | null;
  cac_payback_months?: number | null;
  burn_rate?: number | null;
  runway_months?: number | null;
  ebitda?: number | null;
  employees?: number | null;

  // Data quality
  confidence_scores: Record<string, number>; // Per-metric confidence
  data_quality_score: number; // Overall 0.0 to 1.0
  source_documents: string[]; // Document IDs used

  // AI processing
  ai_reasoning: string;
  ai_model_used: string;
  processing_time_ms: number;

  // Extraction details
  extraction_method: ExtractionMethod;
  warnings?: string[];
  error_message?: string;
}

/**
 * Input for creating a comparable company
 */
export interface CreateComparableInput {
  valuation_model_id: string;
  company_name: string;
  industry: string;
  revenue_multiple: number;

  // Optional fields
  ticker_symbol?: string;
  geography?: string;
  company_stage?: CompanyStage;
  arr?: number;
  revenue?: number;
  revenue_growth_rate?: number;
  gross_margin?: number;
  ebitda_margin?: number;
  employees?: number;
  market_cap?: number;
  valuation?: number;
  valuation_date?: string;
  source: ComparableSource;
  source_url?: string;
  source_document_id?: string;
  data_quality_score?: number;
  relevance_score?: number;
  weight?: number;
  notes?: string;
}

/**
 * Input for creating a scenario
 */
export interface CreateScenarioInput {
  valuation_model_id: string;
  scenario_name: string;
  scenario_type: ScenarioType;
  description?: string;
  assumptions: ScenarioAssumptions;
  probability?: number;
}

/**
 * Query filters for listing valuations
 */
export interface ListValuationsFilters {
  data_room_id?: string;
  status?: ValuationStatus | ValuationStatus[];
  valuation_method?: ValuationMethod;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string; // Search company_name or model_name
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Validation result for financial inputs
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Currency conversion rate
 */
export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  date: string;
}

/**
 * Industry benchmark data
 */
export interface IndustryBenchmark {
  industry: string;
  geography?: string;
  company_stage?: CompanyStage;

  // Benchmarks
  median_revenue_multiple: number;
  avg_revenue_multiple: number;
  p25_revenue_multiple: number; // 25th percentile
  p75_revenue_multiple: number; // 75th percentile

  // Sample size
  companies_count: number;
  data_date: string;
}

/**
 * Valuation summary for quick display
 */
export interface ValuationSummary {
  id: string;
  model_name: string;
  company_name: string;
  valuation_range: string; // e.g., "$75M-$120M"
  valuation_mid: number;
  currency: string;
  confidence: number;
  status: ValuationStatus;
  created_at: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class ValuationError extends Error {
  constructor(
    message: string,
    public code: ValuationErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValuationError';
  }
}

export enum ValuationErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  CALCULATION_FAILED = 'CALCULATION_FAILED',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  INVALID_CURRENCY = 'INVALID_CURRENCY',
  AI_ERROR = 'AI_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
}
