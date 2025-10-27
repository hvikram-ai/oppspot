/**
 * Advanced Filter Service
 * Builds and executes complex queries based on SourceScrub-inspired filter system
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import type {
  AdvancedFilters,
  FilteredSearchRequest,
  FilteredSearchResponse,
  FilterValidationResult,
  FilterOptions,
} from '@/types/filters';

// Type aliases for database tables
type SearchableBusinessRow = Database['public']['Tables']['businesses']['Row'] & {
  computed_employee_range: string | null;
  tags_count: number;
  lists_count: number;
  search_vector: unknown;
};

type FilterOptionsRow = {
  available_industries: string[] | null;
  available_ownership_types: string[] | null;
  available_funding_rounds: string[] | null;
  available_investors: string[] | null;
  available_products: string[] | null;
  available_end_markets: string[] | null;
  min_employee_count: number | null;
  max_employee_count: number | null;
  min_revenue: number | null;
  max_revenue: number | null;
  min_funding: number | null;
  max_funding: number | null;
  min_founded_year: number | null;
  max_founded_year: number | null;
};

export class AdvancedFilterService {
  /**
   * Execute a filtered search with pagination and sorting
   */
  async executeSearch(
    request: FilteredSearchRequest
  ): Promise<FilteredSearchResponse> {
    const startTime = Date.now();
    const supabase = await createClient();

    try {
      // Build the query
      const { query, countQuery, params } = this.buildQuery(request.filters);

      // Get total count - simplified approach using regular count query
      // Note: The RPC function would need to be properly typed in Database types
      const { count: totalCount, error: countError } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      const count = totalCount || 0;

      // Execute main query with pagination
      const offset = (request.pagination.page - 1) * request.pagination.perPage;

      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('*')
        .order(request.sorting.field as keyof Database['public']['Tables']['businesses']['Row'], { ascending: request.sorting.direction === 'asc' })
        .range(offset, offset + request.pagination.perPage - 1)
        .returns<SearchableBusinessRow[]>();

      if (error) throw error;

      const executionTimeMs = Date.now() - startTime;
      const totalPages = Math.ceil(count / request.pagination.perPage);

      return {
        businesses: (businesses || []) as unknown as FilteredSearchResponse['businesses'],
        total: count,
        page: request.pagination.page,
        perPage: request.pagination.perPage,
        totalPages,
        appliedFilters: request.filters,
        executionTimeMs,
      };
    } catch (error) {
      console.error('Advanced filter search error:', error);
      throw new Error('Failed to execute filtered search');
    }
  }

  /**
   * Build SQL query from filters
   */
  buildQuery(filters: AdvancedFilters): {
    query: string;
    countQuery: string;
    params: Record<string, unknown>;
  } {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    // 1. Keywords Filter
    if (filters.keywords) {
      if (filters.keywords.includeKeywords?.length) {
        const keywords = filters.keywords.includeKeywords.join(' & ');
        conditions.push(`search_vector @@ to_tsquery('english', '${keywords}')`);
      }
      if (filters.keywords.excludeKeywords?.length) {
        const keywords = filters.keywords.excludeKeywords.join(' | ');
        conditions.push(`NOT (search_vector @@ to_tsquery('english', '${keywords}'))`);
      }
    }

    // 2. Similar Targets Filter (using vector similarity)
    if (filters.similarTargets?.similarToCompanyIds?.length) {
      // This requires a separate subquery with vector similarity
      const threshold = filters.similarTargets.similarityThreshold || 0.7;
      conditions.push(
        `id IN (SELECT business_id FROM find_similar_to_companies('${filters.similarTargets.similarToCompanyIds.join(',')}', ${threshold}))`
      );
    }

    // 3. Firmographics Filter
    if (filters.firmographics) {
      const f = filters.firmographics;

      if (f.locations?.length) {
        conditions.push(`location = ANY(ARRAY[${f.locations.map(l => `'${l}'`).join(',')}])`);
      }

      if (f.ownership?.length) {
        conditions.push(`ownership_type = ANY(ARRAY[${f.ownership.map(o => `'${o}'`).join(',')}])`);
      }

      if (f.industries?.length) {
        conditions.push(`categories && ARRAY[${f.industries.map(i => `'${i}'`).join(',')}]`);
      }

      if (f.sicCodes?.length) {
        conditions.push(`sic_codes && ARRAY[${f.sicCodes.map(s => `'${s}'`).join(',')}]`);
      }

      if (f.productsServices?.length) {
        conditions.push(`products_services && ARRAY[${f.productsServices.map(p => `'${p}'`).join(',')}]`);
      }

      if (f.endMarkets?.length) {
        conditions.push(`end_markets && ARRAY[${f.endMarkets.map(m => `'${m}'`).join(',')}]`);
      }

      if (f.foundedYearMin !== undefined) {
        conditions.push(`founded_year >= ${f.foundedYearMin}`);
      }

      if (f.foundedYearMax !== undefined) {
        conditions.push(`founded_year <= ${f.foundedYearMax}`);
      }
    }

    // 4. Size Filter
    if (filters.size) {
      const s = filters.size;

      // Employee count
      if (s.employeeCountMin !== undefined) {
        conditions.push(`employee_count >= ${s.employeeCountMin}`);
      }
      if (s.employeeCountMax !== undefined) {
        conditions.push(`employee_count <= ${s.employeeCountMax}`);
      }

      // Employee ranges
      if (s.employeeRanges?.length) {
        conditions.push(`employee_range = ANY(ARRAY[${s.employeeRanges.map(r => `'${r}'`).join(',')}])`);
      }

      // Revenue
      if (s.revenueMin !== undefined || s.revenueMax !== undefined) {
        const revenueField = s.revenueType === 'verified' ? 'revenue_verified' : 'revenue_estimated';

        if (s.revenueMin !== undefined) {
          conditions.push(`${revenueField} >= ${s.revenueMin}`);
        }
        if (s.revenueMax !== undefined) {
          conditions.push(`${revenueField} <= ${s.revenueMax}`);
        }

        if (!s.includeRevenueUnreported) {
          conditions.push(`${revenueField} IS NOT NULL`);
        }
      }

      // Valuation
      if (s.valuationMin !== undefined || s.valuationMax !== undefined) {
        if (s.valuationMin !== undefined) {
          conditions.push(`latest_valuation >= ${s.valuationMin}`);
        }
        if (s.valuationMax !== undefined) {
          conditions.push(`latest_valuation <= ${s.valuationMax}`);
        }

        if (!s.includeValuationUnreported) {
          conditions.push(`latest_valuation IS NOT NULL`);
        }
      }
    }

    // 5. Growth Filter
    if (filters.growth) {
      const g = filters.growth;

      // Employee growth rates
      if (g.employeeGrowth3moMin !== undefined) {
        conditions.push(`employee_growth_3mo >= ${g.employeeGrowth3moMin}`);
      }
      if (g.employeeGrowth3moMax !== undefined) {
        conditions.push(`employee_growth_3mo <= ${g.employeeGrowth3moMax}`);
      }

      if (g.employeeGrowth6moMin !== undefined) {
        conditions.push(`employee_growth_6mo >= ${g.employeeGrowth6moMin}`);
      }
      if (g.employeeGrowth6moMax !== undefined) {
        conditions.push(`employee_growth_6mo <= ${g.employeeGrowth6moMax}`);
      }

      if (g.employeeGrowth12moMin !== undefined) {
        conditions.push(`employee_growth_12mo >= ${g.employeeGrowth12moMin}`);
      }
      if (g.employeeGrowth12moMax !== undefined) {
        conditions.push(`employee_growth_12mo <= ${g.employeeGrowth12moMax}`);
      }

      // Growth signals
      if (g.growthIntentMin !== undefined) {
        conditions.push(`growth_intent >= ${g.growthIntentMin}`);
      }
      if (g.growthIntentMax !== undefined) {
        conditions.push(`growth_intent <= ${g.growthIntentMax}`);
      }

      if (g.jobOpeningsMin !== undefined) {
        conditions.push(`job_openings_count >= ${g.jobOpeningsMin}`);
      }
      if (g.jobOpeningsMax !== undefined) {
        conditions.push(`job_openings_count <= ${g.jobOpeningsMax}`);
      }

      // Web traffic changes
      if (g.webTrafficRankChangePctMin !== undefined) {
        conditions.push(`web_traffic_rank_change_pct >= ${g.webTrafficRankChangePctMin}`);
      }
      if (g.webTrafficRankChangePctMax !== undefined) {
        conditions.push(`web_traffic_rank_change_pct <= ${g.webTrafficRankChangePctMax}`);
      }
    }

    // 6. Market Presence Filter
    if (filters.marketPresence) {
      const m = filters.marketPresence;

      if (m.webPageViewsMin !== undefined) {
        conditions.push(`web_page_views >= ${m.webPageViewsMin}`);
      }
      if (m.webPageViewsMax !== undefined) {
        conditions.push(`web_page_views <= ${m.webPageViewsMax}`);
      }

      if (m.webTrafficRankMin !== undefined) {
        conditions.push(`web_traffic_rank >= ${m.webTrafficRankMin}`);
      }
      if (m.webTrafficRankMax !== undefined) {
        conditions.push(`web_traffic_rank <= ${m.webTrafficRankMax}`);
      }

      if (m.sourcesCountMin !== undefined) {
        conditions.push(`sources_count >= ${m.sourcesCountMin}`);
      }
      if (m.sourcesCountMax !== undefined) {
        conditions.push(`sources_count <= ${m.sourcesCountMax}`);
      }

      if (m.conferenceCountMin !== undefined) {
        conditions.push(`conference_count >= ${m.conferenceCountMin}`);
      }
      if (m.conferenceCountMax !== undefined) {
        conditions.push(`conference_count <= ${m.conferenceCountMax}`);
      }
    }

    // 7. Funding Filter
    if (filters.funding) {
      const f = filters.funding;

      if (f.fundingTotalMin !== undefined) {
        conditions.push(`funding_total_raised >= ${f.fundingTotalMin}`);
      }
      if (f.fundingTotalMax !== undefined) {
        conditions.push(`funding_total_raised <= ${f.fundingTotalMax}`);
      }

      if (f.fundingLatestMin !== undefined) {
        conditions.push(`funding_latest_amount >= ${f.fundingLatestMin}`);
      }
      if (f.fundingLatestMax !== undefined) {
        conditions.push(`funding_latest_amount <= ${f.fundingLatestMax}`);
      }

      if (f.investors?.length) {
        conditions.push(`investors && ARRAY[${f.investors.map(i => `'${i}'`).join(',')}]`);
      }

      if (f.latestRound?.length) {
        conditions.push(`funding_latest_round = ANY(ARRAY[${f.latestRound.map(r => `'${r}'`).join(',')}])`);
      }

      if (f.investmentDateFrom) {
        conditions.push(`funding_latest_date >= '${f.investmentDateFrom}'`);
      }
      if (f.investmentDateTo) {
        conditions.push(`funding_latest_date <= '${f.investmentDateTo}'`);
      }

      if (!f.includeUnfunded) {
        conditions.push(`funding_total_raised IS NOT NULL AND funding_total_raised > 0`);
      }
    }

    // 8. Workflow Filter
    if (filters.workflow) {
      const w = filters.workflow;

      // Lists
      if (w.onLists?.length) {
        const operator = w.onListsOperator || 'any';
        if (operator === 'any') {
          conditions.push(
            `id IN (SELECT business_id FROM list_companies WHERE list_id = ANY(ARRAY[${w.onLists.map(l => `'${l}'`).join(',')}]))`
          );
        } else if (operator === 'all') {
          conditions.push(
            `id IN (SELECT business_id FROM list_companies WHERE list_id = ANY(ARRAY[${w.onLists.map(l => `'${l}'`).join(',')}]) GROUP BY business_id HAVING COUNT(DISTINCT list_id) = ${w.onLists.length})`
          );
        } else if (operator === 'none') {
          conditions.push(
            `id NOT IN (SELECT business_id FROM list_companies WHERE list_id = ANY(ARRAY[${w.onLists.map(l => `'${l}'`).join(',')}]))`
          );
        }
      }

      // Tags
      if (w.hasTags?.length) {
        const operator = w.hasTagsOperator || 'any';
        if (operator === 'any') {
          conditions.push(
            `id IN (SELECT business_id FROM business_tags WHERE tag_id = ANY(ARRAY[${w.hasTags.map(t => `'${t}'`).join(',')}]))`
          );
        } else if (operator === 'all') {
          conditions.push(
            `id IN (SELECT business_id FROM business_tags WHERE tag_id = ANY(ARRAY[${w.hasTags.map(t => `'${t}'`).join(',')}]) GROUP BY business_id HAVING COUNT(DISTINCT tag_id) = ${w.hasTags.length})`
          );
        } else if (operator === 'none') {
          conditions.push(
            `id NOT IN (SELECT business_id FROM business_tags WHERE tag_id = ANY(ARRAY[${w.hasTags.map(t => `'${t}'`).join(',')}]))`
          );
        }
      }

      // Tagged within
      if (w.taggedWithin) {
        const interval = this.parseTimeInterval(w.taggedWithin);
        conditions.push(
          `id IN (SELECT business_id FROM business_tags WHERE tagged_at >= NOW() - INTERVAL '${interval}')`
        );
      }

      // Custom score
      if (w.customScoreMin !== undefined) {
        conditions.push(`custom_score >= ${w.customScoreMin}`);
      }
      if (w.customScoreMax !== undefined) {
        conditions.push(`custom_score <= ${w.customScoreMax}`);
      }

      // Profile owners
      if (w.profileOwners?.length) {
        conditions.push(`profile_owner_id = ANY(ARRAY[${w.profileOwners.map(p => `'${p}'`).join(',')}])`);
      }

      // Last contacted
      if (w.lastContactedFrom) {
        conditions.push(`last_contacted_date >= '${w.lastContactedFrom}'`);
      }
      if (w.lastContactedTo) {
        conditions.push(`last_contacted_date <= '${w.lastContactedTo}'`);
      }
      if (w.hasBeenContacted !== undefined) {
        if (w.hasBeenContacted) {
          conditions.push(`last_contacted_date IS NOT NULL`);
        } else {
          conditions.push(`last_contacted_date IS NULL`);
        }
      }

      // Priority
      if (w.priority?.length) {
        conditions.push(`priority = ANY(ARRAY[${w.priority.map(p => `'${p}'`).join(',')}])`);
      }
    }

    // 9. CRM Filter
    if (filters.crm?.crmSyncStatus?.length) {
      conditions.push(
        `crm_sync_status = ANY(ARRAY[${filters.crm.crmSyncStatus.map(s => `'${s}'`).join(',')}])`
      );
    }

    // 10. Options Filter
    if (filters.options) {
      const o = filters.options;

      if (o.profilePlusOnly) {
        conditions.push(`is_profile_plus = true`);
      }

      if (o.activeCompaniesOnly) {
        conditions.push(`is_active = true`);
      }

      if (o.companiesWithContactInfoOnly) {
        conditions.push(`has_contact_info = true`);
      }
    }

    // Build final query
    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    return {
      query: whereClause,
      countQuery: `SELECT COUNT(*) FROM searchable_businesses WHERE ${whereClause}`,
      params,
    };
  }

  /**
   * Validate filters before executing
   */
  validateFilters(filters: AdvancedFilters): FilterValidationResult {
    const errors: Array<{ category: string; field: string; message: string }> = [];

    // Validate size ranges
    if (filters.size) {
      if (
        filters.size.employeeCountMin !== undefined &&
        filters.size.employeeCountMax !== undefined &&
        filters.size.employeeCountMin > filters.size.employeeCountMax
      ) {
        errors.push({
          category: 'size',
          field: 'employeeCount',
          message: 'Minimum employee count cannot be greater than maximum',
        });
      }

      if (
        filters.size.revenueMin !== undefined &&
        filters.size.revenueMax !== undefined &&
        filters.size.revenueMin > filters.size.revenueMax
      ) {
        errors.push({
          category: 'size',
          field: 'revenue',
          message: 'Minimum revenue cannot be greater than maximum',
        });
      }
    }

    // Validate growth ranges
    if (filters.growth) {
      const growthFields = [
        { min: 'employeeGrowth3moMin', max: 'employeeGrowth3moMax', label: '3-month employee growth' },
        { min: 'employeeGrowth6moMin', max: 'employeeGrowth6moMax', label: '6-month employee growth' },
        { min: 'employeeGrowth12moMin', max: 'employeeGrowth12moMax', label: '12-month employee growth' },
      ];

      for (const field of growthFields) {
        const min = filters.growth[field.min as keyof typeof filters.growth] as number | undefined;
        const max = filters.growth[field.max as keyof typeof filters.growth] as number | undefined;

        if (min !== undefined && max !== undefined && min > max) {
          errors.push({
            category: 'growth',
            field: field.min,
            message: `Minimum ${field.label} cannot be greater than maximum`,
          });
        }
      }
    }

    // Validate funding ranges
    if (filters.funding) {
      if (
        filters.funding.fundingTotalMin !== undefined &&
        filters.funding.fundingTotalMax !== undefined &&
        filters.funding.fundingTotalMin > filters.funding.fundingTotalMax
      ) {
        errors.push({
          category: 'funding',
          field: 'fundingTotal',
          message: 'Minimum funding cannot be greater than maximum',
        });
      }
    }

    // Validate dates
    if (filters.funding?.investmentDateFrom && filters.funding?.investmentDateTo) {
      if (new Date(filters.funding.investmentDateFrom) > new Date(filters.funding.investmentDateTo)) {
        errors.push({
          category: 'funding',
          field: 'investmentDate',
          message: 'Start date cannot be after end date',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get available filter options for dropdowns
   */
  async getFilterOptions(): Promise<FilterOptions> {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from('filter_options')
        .select('*')
        .returns<FilterOptionsRow[]>()
        .single();

      if (error) throw error;

      if (!data) {
        return this.getDefaultFilterOptions();
      }

      return {
        industries: data.available_industries || [],
        ownershipTypes: ['private', 'public', 'vc_backed', 'pe_backed', 'family_owned', 'government', 'nonprofit'],
        fundingRounds: ['pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'series_d', 'series_e', 'growth', 'private_equity', 'debt'],
        investors: data.available_investors || [],
        productsServices: data.available_products || [],
        endMarkets: data.available_end_markets || [],
        employeeRanges: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001+'],
        priorities: ['high', 'medium', 'low'],
        crmSyncStatuses: ['synced', 'not_synced', 'pending', 'failed'],
        employeeCountRange: {
          min: data.min_employee_count || 0,
          max: data.max_employee_count || 10000,
        },
        revenueRange: {
          min: data.min_revenue || 0,
          max: data.max_revenue || 1000000000,
        },
        fundingRange: {
          min: data.min_funding || 0,
          max: data.max_funding || 1000000000,
        },
        foundedYearRange: {
          min: data.min_founded_year || 1900,
          max: new Date().getFullYear(),
        },
      };
    } catch (error) {
      console.error('Error fetching filter options:', error);
      // Return defaults if materialized view not ready
      return this.getDefaultFilterOptions();
    }
  }

  /**
   * Count active filters in a filter object
   */
  countActiveFilters(filters: AdvancedFilters): number {
    let count = 0;

    // Helper to count non-empty values in an object
    const countNonEmpty = (obj: Record<string, unknown> | undefined): number => {
      if (!obj) return 0;
      return Object.values(obj).filter(v => {
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'boolean') return true;
        if (typeof v === 'number') return true;
        if (typeof v === 'string') return v.length > 0;
        return v !== null && v !== undefined;
      }).length;
    };

    count += countNonEmpty(filters.keywords as Record<string, unknown> | undefined);
    count += countNonEmpty(filters.similarTargets as Record<string, unknown> | undefined);
    count += countNonEmpty(filters.firmographics as Record<string, unknown> | undefined);
    count += countNonEmpty(filters.size as Record<string, unknown> | undefined);
    count += countNonEmpty(filters.growth as Record<string, unknown> | undefined);
    count += countNonEmpty(filters.marketPresence as Record<string, unknown> | undefined);
    count += countNonEmpty(filters.funding as Record<string, unknown> | undefined);
    count += countNonEmpty(filters.workflow as Record<string, unknown> | undefined);
    count += countNonEmpty(filters.crm as Record<string, unknown> | undefined);
    count += countNonEmpty(filters.options as Record<string, unknown> | undefined);

    return count;
  }

  /**
   * Parse time interval string (e.g., "7d", "30d", "90d") to PostgreSQL interval
   */
  private parseTimeInterval(interval: string): string {
    const match = interval.match(/^(\d+)([dwmy])$/);
    if (!match) return '30 days'; // default

    const [, amount, unit] = match;
    const unitMap: Record<string, string> = {
      d: 'days',
      w: 'weeks',
      m: 'months',
      y: 'years',
    };

    return `${amount} ${unitMap[unit] || 'days'}`;
  }

  /**
   * Get default filter options when materialized view is not available
   */
  private getDefaultFilterOptions(): FilterOptions {
    return {
      industries: [],
      ownershipTypes: ['private', 'public', 'vc_backed', 'pe_backed', 'family_owned', 'government', 'nonprofit'],
      fundingRounds: ['pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'series_d', 'series_e', 'growth', 'private_equity', 'debt'],
      investors: [],
      productsServices: [],
      endMarkets: [],
      employeeRanges: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001+'],
      priorities: ['high', 'medium', 'low'],
      crmSyncStatuses: ['synced', 'not_synced', 'pending', 'failed'],
      employeeCountRange: { min: 0, max: 10000 },
      revenueRange: { min: 0, max: 1000000000 },
      fundingRange: { min: 0, max: 1000000000 },
      foundedYearRange: { min: 1900, max: new Date().getFullYear() },
    };
  }
}

// Export singleton instance
export const advancedFilterService = new AdvancedFilterService();
