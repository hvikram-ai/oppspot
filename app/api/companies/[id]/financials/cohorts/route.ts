/**
 * GET /api/companies/[id]/financials/cohorts
 *
 * Retrieve cohort retention grid for a company
 *
 * Query parameters:
 * - cohort_count: Number of cohorts to retrieve (1-24, default: 12)
 *
 * Returns:
 * - cohorts: Array of cohorts with retention data by month offset
 * - month_offsets: Array of month offsets (0, 1, 2, ..., N)
 * - meta: Metadata (cohort count, max month offset)
 *
 * Performance target: < 600ms (FR-053)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CohortCalculator } from '@/lib/financials/calculators/cohort-calculator';
import type { CohortMetric } from '@/lib/financials/types';

interface CohortsResponse {
  data: {
    cohorts: Array<{
      cohort_month: string;
      initial_customers: number;
      retention_by_month: Array<{
        month_offset: number;
        customers_active: number;
        mrr_retained: number;
        retention_rate_pct: number;
      }>;
    }>;
    month_offsets: number[];
  };
  meta: {
    cohort_count: number;
    max_month_offset: number;
  };
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CohortsResponse | ErrorResponse>> {
  const { id } = await params;
  const companyId = id;

  try {
    // Initialize Supabase client
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const cohortCountParam = searchParams.get('cohort_count');
    const cohortCount = cohortCountParam ? parseInt(cohortCountParam, 10) : 12;

    // Validate cohort_count parameter (1-24)
    if (cohortCount < 1 || cohortCount > 24) {
      return NextResponse.json(
        { error: 'cohort_count must be between 1 and 24' },
        { status: 400 }
      );
    }

    // Check access to company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, org_id')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch cohort metrics
    const { data: cohortMetrics, error: metricsError } = await supabase
      .from('cohort_metrics')
      .select('*')
      .eq('company_id', companyId)
      .order('cohort_month', { ascending: false })
      .order('month_offset', { ascending: true });

    if (metricsError) {
      console.error('Error fetching cohort metrics:', metricsError);
      return NextResponse.json(
        {
          error: 'Failed to fetch cohort metrics',
          details: metricsError.message,
        },
        { status: 500 }
      );
    }

    // Return empty data if no metrics exist
    if (!cohortMetrics || cohortMetrics.length === 0) {
      return NextResponse.json({
        data: {
          cohorts: [],
          month_offsets: [],
        },
        meta: {
          cohort_count: 0,
          max_month_offset: 0,
        },
      });
    }

    // Use CohortCalculator to generate retention grid
    const calculator = new CohortCalculator();
    const grid = calculator.generateRetentionGrid(cohortMetrics as CohortMetric[]);

    // Limit to requested cohort count
    const limitedCohorts = grid.cohorts.slice(0, cohortCount);

    return NextResponse.json({
      data: {
        cohorts: limitedCohorts,
        month_offsets: grid.month_offsets,
      },
      meta: {
        cohort_count: limitedCohorts.length,
        max_month_offset: grid.month_offsets.length > 0 ? grid.month_offsets[grid.month_offsets.length - 1] : 0,
      },
    });
  } catch (error) {
    console.error('Cohorts error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
