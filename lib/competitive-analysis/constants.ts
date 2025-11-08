/**
 * Constants for Competitive Intelligence Feature
 *
 * Centralizes magic numbers, configuration values, and business logic constants
 * to improve maintainability and make changes easier.
 */

// ================================================================
// DATA FRESHNESS & STALENESS
// ================================================================

/** Number of days before analysis data is considered stale */
export const STALE_DATA_THRESHOLD_DAYS = 30;

/** Number of days before showing "urgent refresh" warning */
export const URGENT_REFRESH_THRESHOLD_DAYS = 60;

/** Number of days before showing "critical refresh" warning */
export const CRITICAL_REFRESH_THRESHOLD_DAYS = 90;

// ================================================================
// REFRESH & AI OPERATIONS
// ================================================================

/** Estimated seconds per competitor for data refresh */
export const REFRESH_ESTIMATE_SECONDS_PER_COMPETITOR = 20;

/** Fixed overhead seconds for refresh operation */
export const REFRESH_OVERHEAD_SECONDS = 30;

/** Delay between competitor scraping to avoid rate limiting (milliseconds) */
export const COMPETITOR_SCRAPING_DELAY_MS = 500;

/** Timeout for web scraping per website (milliseconds) */
export const WEB_SCRAPING_TIMEOUT_MS = 30000; // 30 seconds

/** Timeout for AI analysis per competitor (milliseconds) */
export const AI_ANALYSIS_TIMEOUT_MS = 30000; // 30 seconds

/** Maximum retries for failed web requests */
export const MAX_WEB_REQUEST_RETRIES = 3;

/** Exponential backoff base delay (milliseconds) */
export const RETRY_BASE_DELAY_MS = 1000;

// ================================================================
// RATE LIMITING
// ================================================================

/** Maximum refresh operations per user per hour */
export const RATE_LIMIT_REFRESH_PER_HOUR = 5;

/** Maximum export operations per user per hour */
export const RATE_LIMIT_EXPORT_PER_HOUR = 10;

/** Maximum share invitations per user per hour */
export const RATE_LIMIT_SHARE_PER_HOUR = 20;

/** Maximum API requests per IP per minute */
export const RATE_LIMIT_API_PER_MINUTE = 100;

// ================================================================
// RESOURCE LIMITS
// ================================================================

/** Maximum competitors per analysis (free tier) */
export const MAX_COMPETITORS_FREE_TIER = 5;

/** Maximum competitors per analysis (premium tier) */
export const MAX_COMPETITORS_PREMIUM_TIER = 20;

/** Maximum features in feature matrix */
export const MAX_FEATURES_PER_ANALYSIS = 200;

/** Maximum analyses per user (free tier) */
export const MAX_ANALYSES_FREE_TIER = 3;

/** Maximum analyses per user (premium tier) */
export const MAX_ANALYSES_PREMIUM_TIER = 50;

// ================================================================
// PAGINATION
// ================================================================

/** Default page size for analyses list */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum page size for analyses list */
export const MAX_PAGE_SIZE = 100;

/** Default page size for competitors */
export const COMPETITORS_PAGE_SIZE = 50;

/** Default page size for feature matrix */
export const FEATURES_PAGE_SIZE = 100;

// ================================================================
// INPUT VALIDATION
// ================================================================

/** Maximum length for analysis title */
export const MAX_TITLE_LENGTH = 200;

/** Minimum length for analysis title */
export const MIN_TITLE_LENGTH = 1;

/** Maximum length for company name */
export const MAX_COMPANY_NAME_LENGTH = 200;

/** Maximum length for website URL */
export const MAX_URL_LENGTH = 500;

/** Maximum length for description */
export const MAX_DESCRIPTION_LENGTH = 2000;

/** Maximum length for notes */
export const MAX_NOTES_LENGTH = 1000;

/** Maximum length for market segment */
export const MAX_MARKET_SEGMENT_LENGTH = 200;

/** Allowed URL schemes */
export const ALLOWED_URL_SCHEMES = ['https://'] as const;

// ================================================================
// SCORING ALGORITHM WEIGHTS
// ================================================================

/** Weight for overlap in feature parity calculation (70%) */
export const FEATURE_PARITY_OVERLAP_WEIGHT = 0.7;

/** Weight for differentiation in feature parity calculation (30%) */
export const FEATURE_PARITY_DIFFERENTIATION_WEIGHT = 0.3;

/** Weight for feature differentiation in moat score (35%) */
export const MOAT_FEATURE_DIFFERENTIATION_WEIGHT = 0.35;

/** Weight for pricing power in moat score (25%) */
export const MOAT_PRICING_POWER_WEIGHT = 0.25;

/** Weight for brand recognition in moat score (20%) */
export const MOAT_BRAND_RECOGNITION_WEIGHT = 0.20;

/** Weight for customer lock-in in moat score (10%) */
export const MOAT_CUSTOMER_LOCKIN_WEIGHT = 0.10;

/** Weight for network effects in moat score (10%) */
export const MOAT_NETWORK_EFFECTS_WEIGHT = 0.10;

// ================================================================
// CONFIDENCE LEVELS
// ================================================================

/** Minimum features for high confidence score */
export const HIGH_CONFIDENCE_MIN_TOTAL_FEATURES = 50;

/** Minimum target features for high confidence */
export const HIGH_CONFIDENCE_MIN_TARGET_FEATURES = 20;

/** Minimum features for medium confidence score */
export const MEDIUM_CONFIDENCE_MIN_TOTAL_FEATURES = 20;

/** Minimum target features for medium confidence */
export const MEDIUM_CONFIDENCE_MIN_TARGET_FEATURES = 10;

// ================================================================
// SCORING THRESHOLDS
// ================================================================

/** High parity threshold (80%+) - Commodity risk */
export const HIGH_PARITY_THRESHOLD = 80;

/** Medium parity threshold (60-80%) */
export const MEDIUM_PARITY_THRESHOLD = 60;

/** Low differentiation risk threshold (<20%) */
export const LOW_DIFFERENTIATION_THRESHOLD = 20;

/** Weak pricing power threshold (<40%) */
export const WEAK_PRICING_POWER_THRESHOLD = 40;

/** Strong pricing power threshold (>80%) */
export const STRONG_PRICING_POWER_THRESHOLD = 80;

/** High moat score threshold (80%+) */
export const HIGH_MOAT_THRESHOLD = 80;

/** Medium moat score threshold (60-80%) */
export const MEDIUM_MOAT_THRESHOLD = 60;

// ================================================================
// CACHING & PERFORMANCE
// ================================================================

/** Cache TTL for competitor data (24 hours in seconds) */
export const COMPETITOR_DATA_CACHE_TTL = 24 * 60 * 60;

/** Cache TTL for dashboard data (5 minutes in seconds) */
export const DASHBOARD_CACHE_TTL = 5 * 60;

/** Cache TTL for parity scores (10 minutes in seconds) */
export const PARITY_SCORE_CACHE_TTL = 10 * 60;

// ================================================================
// FILE EXPORT
// ================================================================

/** Maximum file size for PDF export (10 MB in bytes) */
export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum file size for Excel export (5 MB in bytes) */
export const MAX_EXCEL_SIZE_BYTES = 5 * 1024 * 1024;

/** Maximum file size for PowerPoint export (20 MB in bytes) */
export const MAX_PPTX_SIZE_BYTES = 20 * 1024 * 1024;

/** Export file name date format */
export const EXPORT_FILENAME_DATE_FORMAT = 'yyyy-MM-dd';

// ================================================================
// STATUS VALUES
// ================================================================

/** Valid analysis status values */
export const ANALYSIS_STATUSES = ['draft', 'active', 'archived'] as const;

/** Valid pricing tiers */
export const PRICING_TIERS = ['starter', 'professional', 'enterprise'] as const;

/** Valid pricing models */
export const PRICING_MODELS = ['per_user', 'per_year', 'per_month', 'custom'] as const;

/** Valid pricing positioning */
export const PRICING_POSITIONING = ['premium', 'parity', 'discount'] as const;

/** Valid access levels */
export const ACCESS_LEVELS = ['view', 'edit'] as const;

/** Valid geographic focus options */
export const GEOGRAPHIC_FOCUS_OPTIONS = [
  'global',
  'north_america',
  'europe',
  'asia_pacific',
  'latin_america',
  'middle_east_africa',
] as const;

// ================================================================
// UI DISPLAY
// ================================================================

/** Number of recent analyses to show in dashboard */
export const RECENT_ANALYSES_LIMIT = 5;

/** Number of top competitors to highlight */
export const TOP_COMPETITORS_LIMIT = 3;

/** Debounce delay for search input (milliseconds) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Toast notification duration (milliseconds) */
export const TOAST_DURATION_MS = 5000;

/** Progress modal polling interval (milliseconds) */
export const PROGRESS_POLL_INTERVAL_MS = 5000;

// ================================================================
// TYPE EXPORTS
// ================================================================

export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];
export type PricingTier = (typeof PRICING_TIERS)[number];
export type PricingModel = (typeof PRICING_MODELS)[number];
export type PricingPositioning = (typeof PRICING_POSITIONING)[number];
export type AccessLevel = (typeof ACCESS_LEVELS)[number];
export type GeographicFocus = (typeof GEOGRAPHIC_FOCUS_OPTIONS)[number];
