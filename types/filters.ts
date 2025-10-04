/**
 * Advanced Filters Type Definitions
 * Based on SourceScrub specification with 11 filter categories
 */

// ============================================
// Filter Category: Keywords
// ============================================
export interface KeywordsFilter {
  includeKeywords?: string[];
  excludeKeywords?: string[];
}

// ============================================
// Filter Category: Similar Targets
// ============================================
export interface SimilarTargetsFilter {
  similarToCompanyIds?: string[];
  similarityThreshold?: number; // 0-1
}

// ============================================
// Filter Category: Firmographics
// ============================================
export interface FirmographicsFilter {
  locations?: string[];
  ownership?: OwnershipType[];
  industries?: string[];
  sicCodes?: string[];
  naicsCodes?: string[];
  productsServices?: string[];
  endMarkets?: string[];
  foundedYearMin?: number;
  foundedYearMax?: number;
}

export type OwnershipType =
  | 'private'
  | 'public'
  | 'vc_backed'
  | 'pe_backed'
  | 'family_owned'
  | 'government'
  | 'nonprofit';

// ============================================
// Filter Category: Size
// ============================================
export interface SizeFilter {
  // Employee count
  employeeCountMin?: number;
  employeeCountMax?: number;
  employeeRanges?: EmployeeRange[];

  // Revenue
  revenueMin?: number;
  revenueMax?: number;
  revenueCurrency?: Currency;
  revenueType?: 'estimated' | 'verified';
  includeRevenueUnreported?: boolean;

  // Valuation
  valuationMin?: number;
  valuationMax?: number;
  valuationCurrency?: Currency;
  includeValuationUnreported?: boolean;
}

export type EmployeeRange =
  | '1-10'
  | '11-50'
  | '51-200'
  | '201-500'
  | '501-1000'
  | '1001-5000'
  | '5001+';

export type Currency = 'GBP' | 'USD' | 'EUR';

// ============================================
// Filter Category: Growth
// ============================================
export interface GrowthFilter {
  // Employee growth rates (percentage)
  employeeGrowth3moMin?: number;
  employeeGrowth3moMax?: number;
  employeeGrowth6moMin?: number;
  employeeGrowth6moMax?: number;
  employeeGrowth12moMin?: number;
  employeeGrowth12moMax?: number;

  // Growth signals
  growthIntentMin?: number;
  growthIntentMax?: number;
  jobOpeningsMin?: number;
  jobOpeningsMax?: number;

  // Web traffic changes (percentage)
  webTrafficRankChangePctMin?: number;
  webTrafficRankChangePctMax?: number;
  webTrafficRankChangeAbsMin?: number;
  webTrafficRankChangeAbsMax?: number;
}

// ============================================
// Filter Category: Market Presence
// ============================================
export interface MarketPresenceFilter {
  // Web metrics
  webPageViewsMin?: number;
  webPageViewsMax?: number;
  webTrafficRankMin?: number;
  webTrafficRankMax?: number;

  // Sources and conferences
  sourcesCountMin?: number;
  sourcesCountMax?: number;
  conferenceCountMin?: number;
  conferenceCountMax?: number;
  topListCountMin?: number;
  topListCountMax?: number;
  buyersGuideCountMin?: number;
  buyersGuideCountMax?: number;
}

// ============================================
// Filter Category: Funding
// ============================================
export interface FundingFilter {
  // Total funding
  fundingTotalMin?: number;
  fundingTotalMax?: number;

  // Latest round
  fundingLatestMin?: number;
  fundingLatestMax?: number;
  fundingCurrency?: Currency;

  // Investors
  investors?: string[];

  // Round types
  latestRound?: FundingRound[];

  // Investment date
  investmentDateFrom?: string; // ISO date
  investmentDateTo?: string; // ISO date

  includeUnfunded?: boolean;
}

export type FundingRound =
  | 'pre_seed'
  | 'seed'
  | 'series_a'
  | 'series_b'
  | 'series_c'
  | 'series_d'
  | 'series_e'
  | 'series_f'
  | 'series_g'
  | 'series_h'
  | 'growth'
  | 'private_equity'
  | 'debt';

// ============================================
// Filter Category: My Workflow
// ============================================
export interface WorkflowFilter {
  // Lists
  onLists?: string[]; // List IDs
  onListsOperator?: 'any' | 'all' | 'none';

  // Tags
  hasTags?: string[]; // Tag IDs
  hasTagsOperator?: 'any' | 'all' | 'none';
  taggedWithin?: string; // e.g., '7d', '30d', '90d'

  // Scoring and ownership
  customScoreMin?: number;
  customScoreMax?: number;
  profileOwners?: string[]; // User IDs

  // Contact tracking
  lastContactedFrom?: string; // ISO date
  lastContactedTo?: string; // ISO date
  hasBeenContacted?: boolean;

  // Priority
  priority?: Priority[];
}

export type Priority = 'high' | 'medium' | 'low';

// ============================================
// Filter Category: CRM
// ============================================
export interface CRMFilter {
  crmSyncStatus?: CRMSyncStatus[];
}

export type CRMSyncStatus = 'synced' | 'not_synced' | 'pending' | 'failed';

// ============================================
// Filter Category: Options
// ============================================
export interface OptionsFilter {
  profilePlusOnly?: boolean;
  activeCompaniesOnly?: boolean;
  companiesWithContactInfoOnly?: boolean;
}

// ============================================
// Combined Filters Interface
// ============================================
export interface AdvancedFilters {
  keywords?: KeywordsFilter;
  similarTargets?: SimilarTargetsFilter;
  firmographics?: FirmographicsFilter;
  size?: SizeFilter;
  growth?: GrowthFilter;
  marketPresence?: MarketPresenceFilter;
  funding?: FundingFilter;
  workflow?: WorkflowFilter;
  crm?: CRMFilter;
  options?: OptionsFilter;
}

// ============================================
// Filter State Management
// ============================================
export interface FilterState {
  filters: AdvancedFilters;
  activeFilterCount: number;
  isCollapsed: boolean;
  lastUpdated?: Date;
}

// ============================================
// Filter Validation
// ============================================
export interface FilterValidationError {
  category: string;
  field: string;
  message: string;
}

export interface FilterValidationResult {
  valid: boolean;
  errors: FilterValidationError[];
}

// ============================================
// Filter Options (for dropdowns)
// ============================================
export interface FilterOptions {
  industries: string[];
  ownershipTypes: OwnershipType[];
  fundingRounds: FundingRound[];
  investors: string[];
  productsServices: string[];
  endMarkets: string[];
  employeeRanges: EmployeeRange[];
  priorities: Priority[];
  crmSyncStatuses: CRMSyncStatus[];

  // Ranges
  employeeCountRange: { min: number; max: number };
  revenueRange: { min: number; max: number };
  fundingRange: { min: number; max: number };
  foundedYearRange: { min: number; max: number };
}

// ============================================
// Search Results with Filters
// ============================================
export interface FilteredSearchRequest {
  filters: AdvancedFilters;
  pagination: {
    page: number;
    perPage: number;
  };
  sorting: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface FilteredSearchResponse {
  businesses: Business[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  appliedFilters: AdvancedFilters;
  executionTimeMs: number;
}

// ============================================
// Business Interface (simplified)
// ============================================
interface Business {
  id: string;
  name: string;
  description: string;
  location: string;
  categories: string[];
  employeeCount: number;
  employeeRange: EmployeeRange;
  revenueEstimated: number;
  fundingTotalRaised: number;
  customScore: number;
  // ... other fields
}

// ============================================
// Filter Analytics
// ============================================
export interface FilterAnalytics {
  filterId: string;
  filterCategory: string;
  appliedAt: Date;
  resultCount: number;
  executionTimeMs: number;
  userId: string;
}

// ============================================
// Helper Types
// ============================================
export type FilterCategory =
  | 'keywords'
  | 'similarTargets'
  | 'firmographics'
  | 'size'
  | 'growth'
  | 'marketPresence'
  | 'funding'
  | 'workflow'
  | 'crm'
  | 'options';

export type FilterFieldType =
  | 'text'
  | 'number'
  | 'range'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'currency';

export interface FilterFieldDefinition {
  category: FilterCategory;
  field: string;
  label: string;
  type: FilterFieldType;
  placeholder?: string;
  options?: string[] | number[];
  min?: number;
  max?: number;
  required?: boolean;
  helpText?: string;
}

// ============================================
// Exports
// ============================================
export type {
  Business, // Re-export for convenience
};
