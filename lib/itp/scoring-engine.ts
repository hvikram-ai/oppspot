/**
 * ITP Scoring Engine
 *
 * Calculates match scores (0-100) for businesses against ITP criteria.
 * Uses weighted scoring across multiple filter categories.
 */

import type { Business } from '@/types/database';
import type {
  AdvancedFilters,
  FirmographicsFilter,
  SizeFilter,
  GrowthFilter,
  FundingFilter,
  MarketPresenceFilter,
  WorkflowFilter,
} from '@/types/filters';
import type {
  ScoringWeights,
  MatchingDetails,
  CategoryScore,
} from '@/types/itp';
import { DEFAULT_SCORING_WEIGHTS } from '@/types/itp';

// Extended Business interface with optional fields used in ITP scoring
interface BusinessExtended extends Business {
  ownership_type?: string;
  founded_year?: number;
  products_services?: string[];
  employee_range?: string;
  revenue_estimated?: number;
  revenue_verified?: number;
  latest_valuation?: number;
  employee_growth_3mo?: number;
  employee_growth_6mo?: number;
  employee_growth_12mo?: number;
  job_openings_count?: number;
  web_traffic_rank_change_pct?: number;
  funding_total_raised?: number;
  funding_latest_round?: string;
  investors?: string[];
  web_page_views?: number;
  web_traffic_rank?: number;
  sources_count?: number;
  conference_count?: number;
  custom_score?: number;
  priority?: string;
}

/**
 * Main scoring engine class
 */
export class ITPScoringEngine {
  /**
   * Calculate overall match score for a business against ITP criteria
   */
  calculateMatchScore(
    business: Business,
    criteria: AdvancedFilters,
    weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
  ): { score: number; details: MatchingDetails } {
    const categoryScores: MatchingDetails['category_scores'] = {};

    // Score each category if criteria is provided
    if (criteria.firmographics) {
      categoryScores.firmographics = this.scoreFirmographics(
        business,
        criteria.firmographics
      );
    }

    if (criteria.size) {
      categoryScores.size = this.scoreSize(business, criteria.size);
    }

    if (criteria.growth) {
      categoryScores.growth = this.scoreGrowth(business, criteria.growth);
    }

    if (criteria.funding) {
      categoryScores.funding = this.scoreFunding(business, criteria.funding);
    }

    if (criteria.marketPresence) {
      categoryScores.marketPresence = this.scoreMarketPresence(
        business,
        criteria.marketPresence
      );
    }

    if (criteria.workflow) {
      categoryScores.workflow = this.scoreWorkflow(business, criteria.workflow);
    }

    // Apply weights to each category score
    Object.keys(categoryScores).forEach((category) => {
      categoryScores[category].weight =
        weights[category as keyof ScoringWeights] || 0;
    });

    // Calculate weighted average
    const { weightedSum, totalWeight } = this.calculateWeightedSum(categoryScores);

    const normalizedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const score = Math.round(normalizedScore * 100);

    return {
      score: Math.max(0, Math.min(100, score)), // Clamp to 0-100
      details: {
        overall_score: score,
        category_scores: categoryScores,
      },
    };
  }

  // ============================================================================
  // CATEGORY SCORING METHODS
  // ============================================================================

  /**
   * Score firmographics (location, industry, ownership, etc.)
   */
  private scoreFirmographics(
    business: Business,
    filter: FirmographicsFilter
  ): CategoryScore {
    const matched: string[] = [];
    const missed: string[] = [];
    let totalCriteria = 0;
    let matchedCriteria = 0;

    // Location matching
    if (filter.locations && filter.locations.length > 0) {
      totalCriteria++;
      const businessLocation = business.location?.toLowerCase() || '';
      const locationMatch = filter.locations.some((loc) =>
        businessLocation.includes(loc.toLowerCase())
      );

      if (locationMatch) {
        matched.push('location');
        matchedCriteria++;
      } else {
        missed.push('location');
      }
    }

    // Industry/categories matching
    if (filter.industries && filter.industries.length > 0) {
      totalCriteria++;
      const businessIndustries = business.categories || [];
      const industryMatch = filter.industries.some((ind) =>
        businessIndustries.some((cat: string) =>
          cat.toLowerCase().includes(ind.toLowerCase())
        )
      );

      if (industryMatch) {
        matched.push('industry');
        matchedCriteria++;
      } else {
        missed.push('industry');
      }
    }

    // Ownership type matching
    if (filter.ownership && filter.ownership.length > 0) {
      totalCriteria++;
      const businessOwnership = (business as BusinessExtended).ownership_type?.toLowerCase();
      const ownershipMatch = filter.ownership.some(
        (own) => businessOwnership === own.toLowerCase()
      );

      if (ownershipMatch) {
        matched.push('ownership');
        matchedCriteria++;
      } else {
        missed.push('ownership');
      }
    }

    // Founded year range
    if (filter.foundedYearMin || filter.foundedYearMax) {
      totalCriteria++;
      const foundedYear = (business as BusinessExtended).founded_year;

      if (foundedYear) {
        const min = filter.foundedYearMin || 0;
        const max = filter.foundedYearMax || 9999;
        const yearMatch = foundedYear >= min && foundedYear <= max;

        if (yearMatch) {
          matched.push('founded_year');
          matchedCriteria++;
        } else {
          missed.push('founded_year');
        }
      } else {
        missed.push('founded_year');
      }
    }

    // Products/services matching
    if (filter.productsServices && filter.productsServices.length > 0) {
      totalCriteria++;
      const businessProducts = (business as BusinessExtended).products_services || [];
      const productMatch = filter.productsServices.some((prod) =>
        businessProducts.some((bp: string) =>
          bp.toLowerCase().includes(prod.toLowerCase())
        )
      );

      if (productMatch) {
        matched.push('products_services');
        matchedCriteria++;
      } else {
        missed.push('products_services');
      }
    }

    return {
      score: totalCriteria > 0 ? matchedCriteria / totalCriteria : 1,
      weight: 0, // Set by caller
      matched,
      missed: missed.length > 0 ? missed : undefined,
    };
  }

  /**
   * Score size (employee count, revenue)
   */
  private scoreSize(business: Business, filter: SizeFilter): CategoryScore {
    const matched: string[] = [];
    const partial: string[] = [];
    const missed: string[] = [];
    let totalCriteria = 0;
    let matchedCriteria = 0;

    // Employee count range
    if (filter.employeeRanges && filter.employeeRanges.length > 0) {
      totalCriteria++;
      const empCount = business.employee_count;
      const empRange = (business as BusinessExtended).employee_range;

      if (empCount || empRange) {
        const rangeMatch = filter.employeeRanges.includes(empRange);
        if (rangeMatch) {
          matched.push('employee_range');
          matchedCriteria++;
        } else {
          missed.push('employee_range');
        }
      } else {
        missed.push('employee_range');
      }
    }

    // Revenue range (estimated)
    if (filter.revenueMin !== undefined || filter.revenueMax !== undefined) {
      totalCriteria++;
      const revenue =
        (business as BusinessExtended).revenue_estimated || (business as BusinessExtended).revenue_verified;

      if (revenue) {
        const min = filter.revenueMin || 0;
        const max = filter.revenueMax || Number.MAX_SAFE_INTEGER;
        const revenueMatch = revenue >= min && revenue <= max;

        if (revenueMatch) {
          matched.push('revenue');
          matchedCriteria++;
        } else {
          // Check if close (within 20%)
          const midpoint = (min + max) / 2;
          const tolerance = midpoint * 0.2;
          if (revenue >= min - tolerance && revenue <= max + tolerance) {
            partial.push('revenue');
            matchedCriteria += 0.5;
          } else {
            missed.push('revenue');
          }
        }
      } else {
        missed.push('revenue');
      }
    }

    // Valuation range
    if (filter.valuationMin || filter.valuationMax) {
      totalCriteria++;
      const valuation = (business as BusinessExtended).latest_valuation;

      if (valuation) {
        const min = filter.valuationMin || 0;
        const max = filter.valuationMax || Number.MAX_SAFE_INTEGER;
        const valuationMatch = valuation >= min && valuation <= max;

        if (valuationMatch) {
          matched.push('valuation');
          matchedCriteria++;
        } else {
          missed.push('valuation');
        }
      } else {
        missed.push('valuation');
      }
    }

    return {
      score: totalCriteria > 0 ? matchedCriteria / totalCriteria : 1,
      weight: 0,
      matched,
      partial: partial.length > 0 ? partial : undefined,
      missed: missed.length > 0 ? missed : undefined,
    };
  }

  /**
   * Score growth (employee growth, job openings, traffic)
   */
  private scoreGrowth(business: Business, filter: GrowthFilter): CategoryScore {
    const matched: string[] = [];
    const missed: string[] = [];
    let totalCriteria = 0;
    let matchedCriteria = 0;

    // Employee growth (3 month)
    if (filter.employeeGrowth3moMin !== undefined) {
      totalCriteria++;
      const growth3mo = (business as BusinessExtended).employee_growth_3mo;

      if (growth3mo !== null && growth3mo !== undefined) {
        if (growth3mo >= filter.employeeGrowth3moMin) {
          matched.push('employee_growth_3mo');
          matchedCriteria++;
        } else {
          missed.push('employee_growth_3mo');
        }
      } else {
        missed.push('employee_growth_3mo');
      }
    }

    // Employee growth (6 month)
    if (filter.employeeGrowth6moMin !== undefined) {
      totalCriteria++;
      const growth6mo = (business as BusinessExtended).employee_growth_6mo;

      if (growth6mo !== null && growth6mo !== undefined) {
        if (growth6mo >= filter.employeeGrowth6moMin) {
          matched.push('employee_growth_6mo');
          matchedCriteria++;
        } else {
          missed.push('employee_growth_6mo');
        }
      } else {
        missed.push('employee_growth_6mo');
      }
    }

    // Employee growth (12 month)
    if (filter.employeeGrowth12moMin !== undefined) {
      totalCriteria++;
      const growth12mo = (business as BusinessExtended).employee_growth_12mo;

      if (growth12mo !== null && growth12mo !== undefined) {
        if (growth12mo >= filter.employeeGrowth12moMin) {
          matched.push('employee_growth_12mo');
          matchedCriteria++;
        } else {
          missed.push('employee_growth_12mo');
        }
      } else {
        missed.push('employee_growth_12mo');
      }
    }

    // Job openings
    if (filter.jobOpeningsMin !== undefined) {
      totalCriteria++;
      const jobOpenings = (business as BusinessExtended).job_openings_count;

      if (jobOpenings !== null && jobOpenings !== undefined) {
        if (jobOpenings >= filter.jobOpeningsMin) {
          matched.push('job_openings');
          matchedCriteria++;
        } else {
          missed.push('job_openings');
        }
      } else {
        missed.push('job_openings');
      }
    }

    // Web traffic growth
    if (filter.trafficGrowthMin !== undefined) {
      totalCriteria++;
      const trafficGrowth = (business as BusinessExtended).web_traffic_rank_change_pct;

      if (trafficGrowth !== null && trafficGrowth !== undefined) {
        if (trafficGrowth >= filter.trafficGrowthMin) {
          matched.push('traffic_growth');
          matchedCriteria++;
        } else {
          missed.push('traffic_growth');
        }
      } else {
        missed.push('traffic_growth');
      }
    }

    return {
      score: totalCriteria > 0 ? matchedCriteria / totalCriteria : 1,
      weight: 0,
      matched,
      missed: missed.length > 0 ? missed : undefined,
    };
  }

  /**
   * Score funding (total raised, rounds, investors)
   */
  private scoreFunding(business: Business, filter: FundingFilter): CategoryScore {
    const matched: string[] = [];
    const missed: string[] = [];
    let totalCriteria = 0;
    let matchedCriteria = 0;

    // Total funding raised
    if (filter.fundingTotalMin !== undefined || filter.fundingTotalMax !== undefined) {
      totalCriteria++;
      const totalFunding = (business as BusinessExtended).funding_total_raised;

      if (totalFunding) {
        const min = filter.fundingTotalMin || 0;
        const max = filter.fundingTotalMax || Number.MAX_SAFE_INTEGER;
        const fundingMatch = totalFunding >= min && totalFunding <= max;

        if (fundingMatch) {
          matched.push('total_funding');
          matchedCriteria++;
        } else {
          missed.push('total_funding');
        }
      } else {
        // No funding data could mean bootstrapped (valid for some ITPs)
        if (filter.fundingTotalMin === 0) {
          matched.push('total_funding');
          matchedCriteria++;
        } else {
          missed.push('total_funding');
        }
      }
    }

    // Latest funding round
    if (filter.latestRound && filter.latestRound.length > 0) {
      totalCriteria++;
      const latestRound = (business as BusinessExtended).funding_latest_round?.toLowerCase();

      if (latestRound) {
        const roundMatch = filter.latestRound.some(
          (round) => latestRound === round.toLowerCase()
        );

        if (roundMatch) {
          matched.push('latest_round');
          matchedCriteria++;
        } else {
          missed.push('latest_round');
        }
      } else {
        missed.push('latest_round');
      }
    }

    // Investors
    if (filter.investors && filter.investors.length > 0) {
      totalCriteria++;
      const businessInvestors = (business as BusinessExtended).investors || [];

      if (businessInvestors.length > 0) {
        const investorMatch = filter.investors.some((inv) =>
          businessInvestors.some((bi: string) =>
            bi.toLowerCase().includes(inv.toLowerCase())
          )
        );

        if (investorMatch) {
          matched.push('investors');
          matchedCriteria++;
        } else {
          missed.push('investors');
        }
      } else {
        missed.push('investors');
      }
    }

    return {
      score: totalCriteria > 0 ? matchedCriteria / totalCriteria : 1,
      weight: 0,
      matched,
      missed: missed.length > 0 ? missed : undefined,
    };
  }

  /**
   * Score market presence (traffic, sources, conferences)
   */
  private scoreMarketPresence(
    business: Business,
    filter: MarketPresenceFilter
  ): CategoryScore {
    const matched: string[] = [];
    const missed: string[] = [];
    let totalCriteria = 0;
    let matchedCriteria = 0;

    // Web page views
    if (filter.pageViewsMin !== undefined) {
      totalCriteria++;
      const pageViews = (business as BusinessExtended).web_page_views;

      if (pageViews !== null && pageViews !== undefined) {
        if (pageViews >= filter.pageViewsMin) {
          matched.push('page_views');
          matchedCriteria++;
        } else {
          missed.push('page_views');
        }
      } else {
        missed.push('page_views');
      }
    }

    // Traffic rank
    if (filter.trafficRankMax !== undefined) {
      totalCriteria++;
      const trafficRank = (business as BusinessExtended).web_traffic_rank;

      if (trafficRank !== null && trafficRank !== undefined) {
        if (trafficRank <= filter.trafficRankMax) {
          matched.push('traffic_rank');
          matchedCriteria++;
        } else {
          missed.push('traffic_rank');
        }
      } else {
        missed.push('traffic_rank');
      }
    }

    // Sources count
    if (filter.sourcesMin !== undefined) {
      totalCriteria++;
      const sources = (business as BusinessExtended).sources_count;

      if (sources !== null && sources !== undefined) {
        if (sources >= filter.sourcesMin) {
          matched.push('sources_count');
          matchedCriteria++;
        } else {
          missed.push('sources_count');
        }
      } else {
        missed.push('sources_count');
      }
    }

    // Conference count
    if (filter.conferenceMin !== undefined) {
      totalCriteria++;
      const conferences = (business as BusinessExtended).conference_count;

      if (conferences !== null && conferences !== undefined) {
        if (conferences >= filter.conferenceMin) {
          matched.push('conference_count');
          matchedCriteria++;
        } else {
          missed.push('conference_count');
        }
      } else {
        missed.push('conference_count');
      }
    }

    return {
      score: totalCriteria > 0 ? matchedCriteria / totalCriteria : 1,
      weight: 0,
      matched,
      missed: missed.length > 0 ? missed : undefined,
    };
  }

  /**
   * Score workflow (lists, tags, custom score, priority)
   */
  private scoreWorkflow(
    business: Business,
    filter: WorkflowFilter
  ): CategoryScore {
    const matched: string[] = [];
    const missed: string[] = [];
    let totalCriteria = 0;
    let matchedCriteria = 0;

    // Custom score range
    if (filter.customScoreMin !== undefined || filter.customScoreMax !== undefined) {
      totalCriteria++;
      const customScore = (business as BusinessExtended).custom_score;

      if (customScore !== null && customScore !== undefined) {
        const min = filter.customScoreMin || 0;
        const max = filter.customScoreMax || 100;
        const scoreMatch = customScore >= min && customScore <= max;

        if (scoreMatch) {
          matched.push('custom_score');
          matchedCriteria++;
        } else {
          missed.push('custom_score');
        }
      } else {
        missed.push('custom_score');
      }
    }

    // Priority
    if (filter.priority && filter.priority.length > 0) {
      totalCriteria++;
      const businessPriority = (business as BusinessExtended).priority?.toLowerCase();

      if (businessPriority) {
        const priorityMatch = filter.priority.some(
          (p) => p.toLowerCase() === businessPriority
        );

        if (priorityMatch) {
          matched.push('priority');
          matchedCriteria++;
        } else {
          missed.push('priority');
        }
      } else {
        missed.push('priority');
      }
    }

    return {
      score: totalCriteria > 0 ? matchedCriteria / totalCriteria : 1,
      weight: 0,
      matched,
      missed: missed.length > 0 ? missed : undefined,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate weighted sum of category scores
   */
  private calculateWeightedSum(categoryScores: {
    [key: string]: CategoryScore;
  }): { weightedSum: number; totalWeight: number } {
    let weightedSum = 0;
    let totalWeight = 0;

    Object.values(categoryScores).forEach((catScore) => {
      const weight = catScore.weight || 0;
      totalWeight += weight;
      weightedSum += catScore.score * weight;
    });

    return { weightedSum, totalWeight };
  }
}

/**
 * Singleton instance
 */
export const itpScoringEngine = new ITPScoringEngine();
