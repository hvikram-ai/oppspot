// Financial & Revenue Quality Analytics - TypeScript Types
// Feature: 012-oppspot-docs-financial
// Description: Comprehensive type definitions for all financial entities,
//              API contracts, CSV formats, and validation schemas

import { z } from 'zod';

// ==============================================================================
// ENUMS
// ==============================================================================

export enum InvoiceStatus {
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

export enum CustomerStatus {
  ACTIVE = 'active',
  CHURNED = 'churned',
  REACTIVATED = 'reactivated',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  WIRE_TRANSFER = 'wire_transfer',
  ACH = 'ach',
  CHECK = 'check',
  OTHER = 'other',
}

export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum FinancialRole {
  EDITOR = 'editor',
  ADMIN = 'admin',
}

export enum SizeBand {
  UNDER_1M = '<$1M',
  FROM_1M_TO_10M = '$1M-$10M',
  FROM_10M_TO_50M = '$10M-$50M',
  OVER_50M = '$50M+',
}

// ==============================================================================
// DATABASE ENTITY TYPES
// ==============================================================================

export interface Customer {
  id: string;
  company_id: string;
  external_ref: string;
  name: string;
  acquisition_date: string; // ISO date
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  company_id: string;
  customer_id: string;
  external_ref: string;
  plan_name: string;
  start_date: string; // ISO date
  end_date: string | null; // ISO date or null for active
  mrr: number;
  currency: string; // ISO 4217 (3 chars)
  is_active: boolean;
  checksum: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  external_ref: string;
  issued_at: string;
  due_at: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  checksum: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_id: string;
  paid_at: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod | string;
  checksum: string;
  created_at: string;
}

export interface COGSEntry {
  id: string;
  company_id: string;
  occurred_at: string; // ISO date
  amount: number;
  currency: string;
  category: string;
  checksum: string;
  created_at: string;
}

export interface SalesMarketingCost {
  id: string;
  company_id: string;
  occurred_at: string; // ISO date
  amount: number;
  currency: string;
  channel: string;
  checksum: string;
  created_at: string;
}

export interface KPISnapshot {
  id: string;
  company_id: string;
  period_date: string; // ISO date (YYYY-MM-DD)
  arr: number | null;
  mrr: number | null;
  grr: number | null; // percentage
  nrr: number | null; // percentage
  cac: number | null;
  ltv: number | null;
  gross_margin: number | null; // percentage
  arpu: number | null;
  churn_rate: number | null; // percentage
  expansion_rate: number | null; // percentage
  contraction_rate: number | null; // percentage
  created_at: string;
  updated_at: string;
}

export interface CohortMetric {
  id: string;
  company_id: string;
  cohort_month: string; // ISO date (YYYY-MM-DD)
  period_month: string; // ISO date (YYYY-MM-DD)
  retained_customers: number;
  churned_customers: number;
  retention_rate: number; // percentage
  revenue_retained: number;
  notes: string | null;
  created_at: string;
}

export interface RevenueConcentration {
  id: string;
  company_id: string;
  period_date: string; // ISO date
  hhi: number; // 0-10000
  top1_pct: number; // percentage
  top3_pct: number; // percentage
  top5_pct: number; // percentage
  top10_pct: number; // percentage
  gini: number | null; // 0-1
  notes: string | null;
  created_at: string;
}

export interface ARAPAging {
  id: string;
  company_id: string;
  snapshot_date: string; // ISO date
  ar_0_30: number;
  ar_31_60: number;
  ar_61_90: number;
  ar_90_plus: number;
  ap_0_30: number | null;
  ap_31_60: number | null;
  ap_61_90: number | null;
  ap_90_plus: number | null;
  dso: number | null;
  dpo: number | null;
  created_at: string;
}

export interface Anomaly {
  id: string;
  company_id: string;
  metric_key: string;
  period_date: string; // ISO date
  severity: AnomalySeverity;
  message: string;
  value_before: number | null;
  value_after: number | null;
  detector_key: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface SectorBenchmark {
  id: string;
  sector: string;
  size_band: SizeBand;
  region: string | null;
  metric_key: string;
  p25: number | null;
  p50: number; // median
  p75: number | null;
  updated_at: string;
}

export interface FinancialRoleAssignment {
  id: string;
  user_id: string;
  company_id: string;
  role: FinancialRole;
  granted_at: string;
  granted_by: string | null;
}

// ==============================================================================
// CSV ROW TYPES (for upload parsing)
// ==============================================================================

export interface SubscriptionRow {
  customer_id: string;
  plan: string;
  currency: string;
  start_date: string;
  end_date?: string;
  mrr: string | number;
  status?: string;
}

export interface InvoiceRow {
  customer_id: string;
  issued_at: string;
  due_at?: string;
  amount: string | number;
  currency: string;
  status: string;
}

export interface PaymentRow {
  invoice_id: string;
  paid_at: string;
  amount: string | number;
  currency: string;
  payment_method: string;
}

export interface COGSRow {
  occurred_at: string;
  amount: string | number;
  currency: string;
  category: string;
}

export interface SalesMarketingRow {
  occurred_at: string;
  amount: string | number;
  currency: string;
  channel: string;
}

// ==============================================================================
// ZOD VALIDATION SCHEMAS
// ==============================================================================

export const CurrencySchema = z.string().length(3, 'Currency must be 3-letter ISO 4217 code');

export const CustomerRowSchema = z.object({
  customer_id: z.string().min(1, 'Customer ID required'),
  name: z.string().min(1, 'Customer name required'),
  email: z.string().email('Valid email required').optional(),
  acquisition_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  status: z.enum(['active', 'churned', 'reactivated']).optional(),
});

export const SubscriptionRowSchema = z.object({
  customer_id: z.string().min(1, 'Customer ID required'),
  plan: z.string().min(1, 'Plan name required'),
  currency: CurrencySchema,
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  mrr: z.coerce.number().positive('MRR must be positive'),
  status: z.enum(['active', 'churned']).optional(),
});

export const InvoiceRowSchema = z.object({
  customer_id: z.string().min(1, 'Customer ID required'),
  issued_at: z.string().min(1, 'Issue date required'),
  due_at: z.string().optional(),
  amount: z.coerce.number().nonnegative('Amount must be non-negative'),
  currency: CurrencySchema,
  status: z.enum(['open', 'paid', 'void', 'uncollectible']),
});

export const PaymentRowSchema = z.object({
  invoice_id: z.string().min(1, 'Invoice ID required'),
  paid_at: z.string().min(1, 'Payment date required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: CurrencySchema,
  payment_method: z.string().min(1, 'Payment method required'),
});

export const COGSRowSchema = z.object({
  occurred_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  amount: z.coerce.number(), // Can be negative
  currency: CurrencySchema,
  category: z.string().min(1, 'Category required'),
});

export const SalesMarketingRowSchema = z.object({
  occurred_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: CurrencySchema,
  channel: z.string().min(1, 'Channel required'),
});

// ==============================================================================
// API REQUEST TYPES
// ==============================================================================

export interface UploadCSVRequest {
  subscriptions?: File;
  invoices?: File;
  payments?: File;
  cogs?: File;
  sales_marketing?: File;
}

export interface GetSummaryRequest {
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  window?: 'monthly' | 'quarterly';
}

export interface GetCohortsRequest {
  window?: '12m' | '18m' | '24m';
}

export interface GetConcentrationRequest {
  period?: string; // YYYY-MM-DD
}

export interface GetARAPAgingRequest {
  date?: string; // YYYY-MM-DD
}

export interface RecomputeRequest {
  start_month: string; // YYYY-MM-DD
  end_month: string; // YYYY-MM-DD
  force?: boolean;
}

export interface ExportPDFRequest {
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
}

// ==============================================================================
// API RESPONSE TYPES
// ==============================================================================

export interface UploadCSVResponse {
  data: {
    upload_id: string;
    affected_months: string[]; // ISO dates
    files_processed: {
      subscriptions?: number;
      invoices?: number;
      payments?: number;
      cogs?: number;
      sales_marketing?: number;
    };
  };
  meta: {
    uploaded_at: string;
  };
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: unknown;
}

export interface UploadErrorResponse {
  error: {
    code: string;
    message: string;
    details?: {
      validation_errors?: ValidationError[];
      mixed_currencies?: {
        expected: string;
        found: string[];
      };
    };
  };
}

export interface GetSummaryResponse {
  data: {
    snapshots: KPISnapshot[];
    trends: {
      arr_change_pct: number;
      mrr_change_pct: number;
      nrr_change_pct: number;
    };
  };
  meta: {
    last_calculated_at: string;
    period_count: number;
  };
}

export interface CohortData {
  [cohortMonth: string]: {
    [periodMonth: string]: {
      logo_retention: number; // percentage
      revenue_retention: number; // percentage
      retained_customers: number;
      cohort_size: number;
    };
  };
}

export interface GetCohortsResponse {
  data: {
    cohorts: CohortData;
    summary: {
      avg_retention_rate: number;
      best_cohort: string; // YYYY-MM-DD
      worst_cohort: string; // YYYY-MM-DD
    };
  };
  meta: {
    window: string;
    cohort_count: number;
  };
}

export interface TopCustomer {
  customer_id: string;
  customer_name: string;
  revenue: number;
  revenue_pct: number;
}

export interface GetConcentrationResponse {
  data: {
    period_date: string;
    hhi: number;
    top1_pct: number;
    top3_pct: number;
    top5_pct: number;
    top10_pct: number;
    risk_flag: boolean;
    top_customers: TopCustomer[];
  };
  meta: {
    total_revenue: number;
    customer_count: number;
  };
}

export interface AgingBucket {
  bucket: '0-30' | '31-60' | '61-90' | '90+';
  ar_amount: number;
  ap_amount: number | null;
}

export interface GetARAPAgingResponse {
  data: {
    snapshot_date: string;
    buckets: AgingBucket[];
    dso: number | null;
    dpo: number | null;
    anomalies: Anomaly[];
  };
  meta: {
    total_ar: number;
    total_ap: number | null;
  };
}

export interface RecomputeResponse {
  data: {
    recalculated_periods: string[]; // ISO dates
    performance: {
      total_time_ms: number;
      kpi_time_ms: number;
      cohort_time_ms: number;
      concentration_time_ms: number;
      ar_ap_time_ms: number;
    };
  };
  meta: {
    triggered_at: string;
    completed_at: string;
  };
}

export interface BenchmarkComparison {
  metric_key: string;
  metric_name: string;
  company_value: number;
  sector_median: number;
  delta_pct: number;
  percentile: number | null; // Where company ranks (0-100)
  indicator: 'above' | 'at' | 'below';
}

export interface GetBenchmarksResponse {
  data: {
    sector: string;
    size_band: SizeBand;
    comparisons: BenchmarkComparison[];
  };
  meta: {
    benchmark_date: string;
  };
}

// ==============================================================================
// API ERROR TYPES
// ==============================================================================

export interface APIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export enum APIErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MIXED_CURRENCIES = 'MIXED_CURRENCIES',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// ==============================================================================
// CALCULATOR INPUT/OUTPUT TYPES
// ==============================================================================

export interface CalculateKPIInput {
  companyId: string;
  periodDate: string; // YYYY-MM-DD
}

export interface CalculateKPIOutput {
  arr: number | null;
  mrr: number | null;
  grr: number | null;
  nrr: number | null;
  cac: number | null;
  ltv: number | null;
  gross_margin: number | null;
  arpu: number | null;
  churn_rate: number | null;
  expansion_rate: number | null;
  contraction_rate: number | null;
}

export interface CalculateCohortInput {
  companyId: string;
  cohortMonth: string; // YYYY-MM-DD
  periodMonth: string; // YYYY-MM-DD
}

export interface CalculateCohortOutput {
  retained_customers: number;
  churned_customers: number;
  retention_rate: number;
  revenue_retained: number;
}

export interface CalculateConcentrationInput {
  companyId: string;
  periodDate: string; // YYYY-MM-DD
}

export interface CalculateConcentrationOutput {
  hhi: number;
  top1_pct: number;
  top3_pct: number;
  top5_pct: number;
  top10_pct: number;
  top_customers: Array<{
    customer_id: string;
    revenue: number;
    revenue_pct: number;
  }>;
}

export interface CalculateARAPAgingInput {
  companyId: string;
  snapshotDate: string; // YYYY-MM-DD
}

export interface CalculateARAPAgingOutput {
  ar_0_30: number;
  ar_31_60: number;
  ar_61_90: number;
  ar_90_plus: number;
  ap_0_30: number | null;
  ap_31_60: number | null;
  ap_61_90: number | null;
  ap_90_plus: number | null;
  dso: number | null;
  dpo: number | null;
}

// ==============================================================================
// UTILITY TYPES
// ==============================================================================

export type CSVFileType =
  | 'subscriptions'
  | 'invoices'
  | 'payments'
  | 'cogs'
  | 'sales_marketing';

export interface ParsedCSVResult<T> {
  success: boolean;
  data: T[];
  errors: ValidationError[];
  rowCount: number;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

// ==============================================================================
// CONSTANTS
// ==============================================================================

export const ANOMALY_THRESHOLDS = {
  CONCENTRATION_SINGLE_CUSTOMER_PCT: 25, // FR-016
  AR_AGING_90_PLUS_SPIKE_PCT: 50, // FR-021
  DASHBOARD_LOAD_TARGET_MS: 1000, // FR-053
  RECALCULATION_TARGET_MS: 5000, // FR-040
  API_SUMMARY_TARGET_MS: 300,
  COHORT_GRID_TARGET_MS: 600,
} as const;

export const SIZE_BAND_THRESHOLDS = {
  BAND_1_MAX: 1_000_000, // <$1M
  BAND_2_MAX: 10_000_000, // $1M-$10M
  BAND_3_MAX: 50_000_000, // $10M-$50M
  // $50M+ has no upper limit
} as const;

export const KPI_FORMULAS = {
  ARR: '12 × MRR',
  MRR: 'Sum of active subscriptions\' monthly amounts',
  GRR: '(Start MRR − Churn MRR) / Start MRR',
  NRR: '(Start MRR + Expansion − Contraction − Churn) / Start MRR',
  CAC: 'Sales & Marketing Costs / New Customers Acquired',
  LTV: '(ARPU × Gross Margin %) / Monthly Churn Rate',
  GROSS_MARGIN: '(Revenue − COGS) / Revenue',
  ARPU: 'MRR / Active Customers',
} as const;
