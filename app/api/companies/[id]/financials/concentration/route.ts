/**
 * GET /api/companies/[id]/financials/concentration
 *
 * Retrieve revenue concentration analysis for a company
 *
 * Query parameters:
 * - period: Number of months to retrieve (1-24, default: 12)
 *
 * Returns:
 * - concentration_history: Array of concentration metrics (HHI, top-N percentages)
 * - latest: Most recent concentration data
 * - anomalies: Array of concentration risk anomalies (>25% from single customer)
 * - meta: Metadata (period count)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { RevenueConcentration, Anomaly } from '@/lib/financials/types';

interface ConcentrationResponse {
  data: {
    concentration_history: RevenueConcentration[];
    latest: RevenueConcentration | null;
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
): Promise<NextResponse<ConcentrationResponse | ErrorResponse>> {
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

    // Fetch revenue concentration history
    const { data: concentrationHistory, error: concentrationError } = await supabase
      .from('revenue_concentration')
      .select('*')
      .eq('company_id', companyId)
      .order('period_date', { ascending: false })
      .limit(period);

    if (concentrationError) {
      console.error('Error fetching concentration:', concentrationError);
      return NextResponse.json(
        {
          error: 'Failed to fetch revenue concentration',
          details: concentrationError.message,
        },
        { status: 500 }
      );
    }

    // Fetch concentration anomalies (FR-016: >25% single customer)
    const { data: anomalies, error: anomaliesError } = await supabase
      .from('anomalies')
      .select('*')
      .eq('company_id', companyId)
      .eq('anomaly_type', 'concentration_risk')
      .order('period_date', { ascending: false })
      .limit(period);

    if (anomaliesError) {
      console.error('Error fetching anomalies:', anomaliesError);
      // Don't fail the request, just return empty anomalies
    }

    // Return empty data if no concentration data exists
    if (!concentrationHistory || concentrationHistory.length === 0) {
      return NextResponse.json({
        data: {
          concentration_history: [],
          latest: null,
          anomalies: [],
        },
        meta: {
          period_count: 0,
        },
      });
    }

    // Get latest concentration data
    const latest = concentrationHistory[0];

    return NextResponse.json({
      data: {
        concentration_history: concentrationHistory as RevenueConcentration[],
        latest: latest as RevenueConcentration,
        anomalies: (anomalies || []) as Anomaly[],
      },
      meta: {
        period_count: concentrationHistory.length,
      },
    });
  } catch (error) {
    console.error('Concentration error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
