/**
 * GET /api/companies/[id]/financials/ar-ap-aging
 *
 * Retrieve accounts receivable and payable aging for a company
 *
 * Query parameters:
 * - period: Number of months to retrieve (1-24, default: 12)
 *
 * Returns:
 * - aging_history: Array of AR/AP aging metrics (buckets, DSO, DPO)
 * - latest: Most recent aging data
 * - anomalies: Array of AR aging spike anomalies (>50% increase in 90+ bucket)
 * - meta: Metadata (period count)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ARAPAging, Anomaly } from '@/lib/financials/types';

interface ARAPAgingResponse {
  data: {
    aging_history: ARAPAging[];
    latest: ARAPAging | null;
    anomalies: Anomaly[];
  };
  meta: {
    period_count: number;
  };
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ARAPAgingResponse | ErrorResponse>> {
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
    const periodParam = searchParams.get('period');
    const period = periodParam ? parseInt(periodParam, 10) : 12;

    // Validate period parameter
    if (period < 1 || period > 24) {
      return NextResponse.json(
        { error: 'period must be between 1 and 24' },
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

    // Fetch AR/AP aging history
    const { data: agingHistory, error: agingError } = await supabase
      .from('ar_ap_aging')
      .select('*')
      .eq('company_id', companyId)
      .order('period_date', { ascending: false })
      .limit(period);

    if (agingError) {
      console.error('Error fetching AR/AP aging:', agingError);
      return NextResponse.json(
        {
          error: 'Failed to fetch AR/AP aging',
          details: agingError.message,
        },
        { status: 500 }
      );
    }

    // Fetch AR aging spike anomalies (FR-021: >50% increase in 90+ bucket)
    const { data: anomalies, error: anomaliesError } = await supabase
      .from('anomalies')
      .select('*')
      .eq('company_id', companyId)
      .in('anomaly_type', ['ar_aging_spike', 'high_dso'])
      .order('period_date', { ascending: false })
      .limit(period);

    if (anomaliesError) {
      console.error('Error fetching anomalies:', anomaliesError);
      // Don't fail the request, just return empty anomalies
    }

    // Return empty data if no aging data exists
    if (!agingHistory || agingHistory.length === 0) {
      return NextResponse.json({
        data: {
          aging_history: [],
          latest: null,
          anomalies: [],
        },
        meta: {
          period_count: 0,
        },
      });
    }

    // Get latest aging data
    const latest = agingHistory[0];

    return NextResponse.json({
      data: {
        aging_history: agingHistory as ARAPAging[],
        latest: latest as ARAPAging,
        anomalies: (anomalies || []) as Anomaly[],
      },
      meta: {
        period_count: agingHistory.length,
      },
    });
  } catch (error) {
    console.error('AR/AP aging error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
