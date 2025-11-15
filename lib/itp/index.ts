/**
 * ITP (Ideal Target Profile) Library
 *
 * Main exports for the ITP feature including:
 * - Scoring engine
 * - Service layer
 * - Types
 */

export { ITPScoringEngine, itpScoringEngine } from './scoring-engine';
export { ITPService, itpService } from './itp-service';

// Re-export types for convenience
export type {
  IdealTargetProfile,
  CreateITPRequest,
  UpdateITPRequest,
  ITPMatch,
  ITPMatchResult,
  ITPMatchStats,
  ScoringWeights,
  MatchingDetails,
  CategoryScore,
  RunMatchingRequest,
  RunMatchingResponse,
  UpdateMatchActionRequest,
  Tag,
  BusinessTag,
  TagWithDetails,
  TagStats,
  CreateTagRequest,
  UpdateTagRequest,
  TagBusinessRequest,
  ITPCardData,
  ScoringConfiguratorState,
  ITPBuilderStep,
  ITPBuilderState,
  MatchDisplayMode,
  MatchSortField,
  MatchSortDirection,
} from '@/types/itp';

export {
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_MIN_MATCH_SCORE,
  SCORE_RANGES,
  getScoreRange,
  validateScoringWeights,
  normalizeScoringWeights,
  getDefaultTagColor,
} from '@/types/itp';
