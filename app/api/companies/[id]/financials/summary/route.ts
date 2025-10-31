/**
 * GET /api/companies/[id]/financials/summary
 *
 * Retrieve KPI metrics summary for a company
 *
 * Query parameters:
 * - period: Number of months to retrieve (1-24, default: 12)
 *
 * Returns:
 * - snapshots: Array of KPI snapshots (ARR, MRR, NRR, GRR, etc.)
 * - trends: Percentage changes between periods
 * - meta: Metadata (last calculated time, period count)
 *
 * Performance target: < 300ms (FR-053)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { KPISnapshot } from '@/lib/financials/types';

interface SummaryResponse {
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

interface ErrorResponse {
  error: string;
  details?: unknown;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<SummaryResponse | ErrorResponse>> {
  const companyId = params.id;

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
    const periodParam = searchParams.get('period');
    const period = periodParam ? parseInt(periodParam, 10) : 12;

    // Validate period parameter (1-24 months)
    if (period < 1 || period > 24) {
      return NextResponse.json(
        { error: 'Period must be between 1 and 24 months' },
        { status: 400 }
      );
    }

    // Check access to company (RLS will handle this, but verify explicitly)
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

    // Fetch KPI snapshots for the requested period
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('kpi_snapshots')
      .select('*')
      .eq('company_id', companyId)
      .order('period_date', { ascending: false })
      .limit(period);

    if (snapshotsError) {
      console.error('Error fetching snapshots:', snapshotsError);
      return NextResponse.json(
        {
          error: 'Failed to fetch KPI snapshots',
          details: snapshotsError.message,
        },
        { status: 500 }
      );
    }

    // Return empty data if no snapshots exist
    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json({
        data: {
          snapshots: [],
          trends: {
            arr_change_pct: 0,
            mrr_change_pct: 0,
            nrr_change_pct: 0,
          },
        },
        meta: {
          last_calculated_at: new Date().toISOString(),
          period_count: 0,
        },
      });
    }

    // Calculate trends (compare latest to oldest in period)
    const latest = snapshots[0];
    const oldest = snapshots[snapshots.length - 1];

    const arrChange =
      oldest.arr === 0
        ? 0
        : Math.round(((latest.arr - oldest.arr) / oldest.arr) * 100 * 100) / 100;

    const mrrChange =
      oldest.mrr === 0
        ? 0
        : Math.round(((latest.mrr - oldest.mrr) / oldest.mrr) * 100 * 100) / 100;

    const nrrChange =
      oldest.nrr === 0
        ? 0
        : Math.round(((latest.nrr - oldest.nrr) / oldest.nrr) * 100 * 100) / 100;

    // Get last calculated time from latest snapshot
    const lastCalculatedAt = latest.updated_at || latest.created_at;

    return NextResponse.json({
      data: {
        snapshots: snapshots as KPISnapshot[],
        trends: {
          arr_change_pct: arrChange,
          mrr_change_pct: mrrChange,
          nrr_change_pct: nrrChange,
        },
      },
      meta: {
        last_calculated_at: lastCalculatedAt,
        period_count: snapshots.length,
      },
    });
  } catch (error) {
    console.error('Summary error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
