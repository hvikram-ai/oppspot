/**
 * Ideal Target Profile (ITP) Type Definitions
 *
 * ITPs allow users to define reusable target company profiles with:
 * - Comprehensive filtering criteria (11 categories)
 * - AI-powered match scoring (0-100)
 * - Auto-tagging and workflow automation
 */

import type { AdvancedFilters } from './filters';
import type { Business } from './database';

// ============================================================================
// IDEAL TARGET PROFILE TYPES
// ============================================================================

/**
 * Scoring weights for each filter category
 * Weights should sum to 1.0 for normalized scoring
 */
export interface ScoringWeights {
  firmographics?: number; // Default: 0.2
  size?: number;           // Default: 0.2
  growth?: number;         // Default: 0.2
  funding?: number;        // Default: 0.15
  marketPresence?: number; // Default: 0.15
  workflow?: number;       // Default: 0.1
}

/**
 * Main Ideal Target Profile entity
 */
export interface IdealTargetProfile {
  id: string;
  user_id: string;

  // Basic info
  name: string;
  description?: string;

  // Criteria (reuses AdvancedFilters from types/filters.ts)
  criteria: AdvancedFilters;

  // Scoring configuration
  scoring_weights: ScoringWeights;
  min_match_score: number; // 0-100

  // Auto-actions
  auto_tag?: string;
  auto_add_to_list_id?: string;

  // State
  is_active: boolean;
  is_favorite: boolean;

  // Usage tracking
  matched_count: number;
  last_matched_at?: string;
  execution_count: number;
  last_executed_at?: string;

  // Audit
  created_at: string;
  updated_at: string;
}

/**
 * Payload for creating a new ITP
 */
export interface CreateITPRequest {
  name: string;
  description?: string;
  criteria: AdvancedFilters;
  scoring_weights?: ScoringWeights;
  min_match_score?: number;
  auto_tag?: string;
  auto_add_to_list_id?: string;
}

/**
 * Payload for updating an existing ITP
 */
export interface UpdateITPRequest {
  name?: string;
  description?: string;
  criteria?: AdvancedFilters;
  scoring_weights?: ScoringWeights;
  min_match_score?: number;
  auto_tag?: string;
  auto_add_to_list_id?: string;
  is_active?: boolean;
  is_favorite?: boolean;
}

/**
 * Response when listing user's ITPs
 */
export interface ListITPsResponse {
  itps: IdealTargetProfile[];
  total: number;
}

/**
 * Detailed ITP response with match statistics
 */
export interface ITPWithStats extends IdealTargetProfile {
  stats: ITPMatchStats;
}

// ============================================================================
// MATCH SCORING TYPES
// ============================================================================

/**
 * Per-category scoring breakdown
 */
export interface CategoryScore {
  score: number;      // 0-1 range (normalized)
  weight: number;     // Weight applied to this category
  matched: string[];  // Criteria that matched (e.g., ["location", "industry"])
  partial?: string[]; // Criteria that partially matched
  missed?: string[];  // Criteria that didn't match
}

/**
 * Complete scoring details for a match
 */
export interface MatchingDetails {
  overall_score: number; // 0-100 (weighted average)
  category_scores: {
    [categoryName: string]: CategoryScore;
  };
}

/**
 * A single ITP match record
 */
export interface ITPMatch {
  id: string;
  itp_id: string;
  business_id: string;

  // Scoring
  match_score: number; // 0-100
  matching_details: MatchingDetails;

  // User feedback
  user_action?: 'accepted' | 'rejected' | 'pending';
  user_notes?: string;
  action_taken_at?: string;

  // Tracking
  matched_at: string;
}

/**
 * Match result with business data
 */
export interface ITPMatchResult {
  match: ITPMatch;
  business: Business;
  itp_name: string;
}

/**
 * Request to run ITP matching
 */
export interface RunMatchingRequest {
  business_ids?: string[]; // If provided, match only these businesses. Otherwise match all.
  force_rematch?: boolean; // Re-score businesses that already have matches
}

/**
 * Response after running matching
 */
export interface RunMatchingResponse {
  itp_id: string;
  new_matches: number;
  total_matches: number;
  execution_time_ms: number;
  highest_score?: number;
}

/**
 * Request to update user action on a match
 */
export interface UpdateMatchActionRequest {
  user_action: 'accepted' | 'rejected' | 'pending';
  user_notes?: string;
}

// ============================================================================
// MATCH STATISTICS TYPES
// ============================================================================

/**
 * Statistics for an ITP's matches
 */
export interface ITPMatchStats {
  total_matches: number;
  pending_matches: number;
  accepted_matches: number;
  rejected_matches: number;
  avg_match_score: number;
  top_match_score: number;
  recent_matches: number; // Last 7 days
}

/**
 * Response when fetching match history
 */
export interface ListMatchesResponse {
  matches: ITPMatchResult[];
  stats: ITPMatchStats;
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Filters for querying matches
 */
export interface MatchFilters {
  min_score?: number;
  max_score?: number;
  user_action?: 'accepted' | 'rejected' | 'pending';
  date_from?: string;
  date_to?: string;
}

// ============================================================================
// TAG TYPES
// ============================================================================

/**
 * Tag entity
 */
export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;  // Hex color code (e.g., "#3b82f6")
  icon?: string;  // Icon name
  description?: string;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Business-tag association
 */
export interface BusinessTag {
  id: string;
  business_id: string;
  tag_id: string;
  user_id: string;
  applied_by_itp_id?: string;
  is_auto_applied: boolean;
  notes?: string;
  applied_at: string;
}

/**
 * Tag with full details for display
 */
export interface TagWithDetails extends Tag {
  stats: TagStats;
}

/**
 * Statistics for a tag
 */
export interface TagStats {
  total_businesses: number;
  auto_applied_count: number;
  manual_applied_count: number;
  itps_using_tag: number;
}

/**
 * Request to create a tag
 */
export interface CreateTagRequest {
  name: string;
  color?: string;
  icon?: string;
  description?: string;
}

/**
 * Request to update a tag
 */
export interface UpdateTagRequest {
  name?: string;
  color?: string;
  icon?: string;
  description?: string;
}

/**
 * Request to tag a business
 */
export interface TagBusinessRequest {
  tag_name: string;  // Can be existing or new tag
  color?: string;    // For new tags
  notes?: string;
}

/**
 * Response when listing tags
 */
export interface ListTagsResponse {
  tags: Tag[];
  total: number;
}

/**
 * Tag with business count
 */
export interface TagWithCount extends Tag {
  business_count: number;
}

// ============================================================================
// UI-SPECIFIC TYPES
// ============================================================================

/**
 * ITP card display state
 */
export interface ITPCardData {
  itp: IdealTargetProfile;
  stats: ITPMatchStats;
  is_running?: boolean;  // True when matching is in progress
}

/**
 * Scoring configurator state
 */
export interface ScoringConfiguratorState {
  weights: ScoringWeights;
  min_score: number;
  is_valid: boolean;  // True if weights sum to ~1.0
}

/**
 * ITP builder wizard step
 */
export type ITPBuilderStep =
  | 'basic_info'
  | 'criteria'
  | 'scoring'
  | 'automation'
  | 'review';

/**
 * ITP builder state
 */
export interface ITPBuilderState {
  current_step: ITPBuilderStep;
  itp: Partial<CreateITPRequest>;
  errors: {
    [field: string]: string;
  };
}

/**
 * Match card display mode
 */
export type MatchDisplayMode = 'compact' | 'detailed';

/**
 * Match list sort options
 */
export type MatchSortField = 'match_score' | 'matched_at' | 'business_name';

/**
 * Match list sort direction
 */
export type MatchSortDirection = 'asc' | 'desc';

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Default scoring weights (sum to 1.0)
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  firmographics: 0.2,
  size: 0.2,
  growth: 0.2,
  funding: 0.15,
  marketPresence: 0.15,
  workflow: 0.1,
};

/**
 * Default minimum match score
 */
export const DEFAULT_MIN_MATCH_SCORE = 70;

/**
 * Score ranges for color coding
 */
export const SCORE_RANGES = {
  EXCELLENT: { min: 90, max: 100, color: 'green', label: 'Excellent Match' },
  GOOD: { min: 75, max: 89, color: 'blue', label: 'Good Match' },
  FAIR: { min: 60, max: 74, color: 'yellow', label: 'Fair Match' },
  POOR: { min: 0, max: 59, color: 'gray', label: 'Poor Match' },
} as const;

/**
 * Helper to get score range
 */
export function getScoreRange(score: number) {
  if (score >= 90) return SCORE_RANGES.EXCELLENT;
  if (score >= 75) return SCORE_RANGES.GOOD;
  if (score >= 60) return SCORE_RANGES.FAIR;
  return SCORE_RANGES.POOR;
}

/**
 * Validate scoring weights sum to 1.0 (within tolerance)
 */
export function validateScoringWeights(weights: ScoringWeights): boolean {
  const sum = Object.values(weights).reduce((acc, val) => acc + (val || 0), 0);
  const tolerance = 0.01;
  return Math.abs(sum - 1.0) < tolerance;
}

/**
 * Normalize scoring weights to sum to 1.0
 */
export function normalizeScoringWeights(weights: ScoringWeights): ScoringWeights {
  const sum = Object.values(weights).reduce((acc, val) => acc + (val || 0), 0);
  if (sum === 0) return DEFAULT_SCORING_WEIGHTS;

  const normalized: ScoringWeights = {};
  for (const [key, value] of Object.entries(weights)) {
    if (value !== undefined) {
      normalized[key as keyof ScoringWeights] = value / sum;
    }
  }
  return normalized;
}

/**
 * Get default tag color based on tag name
 */
export function getDefaultTagColor(tagName: string): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
  ];

  // Hash tag name to consistently pick a color
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
