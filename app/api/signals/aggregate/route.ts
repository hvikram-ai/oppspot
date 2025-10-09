import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import signalAggregator from '@/lib/signals/engines/signal-aggregation-engine';
import type { Row } from '@/lib/supabase/helpers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { company_id } = body;

    if (!company_id) {
      return NextResponse.json(
        { error: 'Missing required field: company_id' },
        { status: 400 }
      );
    }

    // Aggregate signals for the company
    const aggregation = await signalAggregator.aggregateSignals(company_id);

    if (!aggregation) {
      return NextResponse.json(
        { error: 'No signals found for aggregation' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: aggregation
    });

  } catch (error) {
    console.error('Error in signal aggregation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get existing aggregation or signals
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const signalType = searchParams.get('signal_type');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Missing company_id parameter' },
        { status: 400 }
      );
    }

    // Get aggregation
    const { data: aggregation } = await supabase
      .from('signal_aggregations')
      .select('*')
      .eq('company_id', companyId)
      .single() as { data: Row<'signal_aggregations'> | null; error: any };

    // Get signals
    let signalsQuery = supabase
      .from('buying_signals')
      .select(`
        *,
        funding_signals(*),
        executive_change_signals(*),
        job_posting_signals(*),
        technology_adoption_signals(*)
      `)
      .eq('company_id', companyId)
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (signalType) {
      signalsQuery = signalsQuery.eq('signal_type', signalType);
    }

    const { data: signals } = await signalsQuery;

    return NextResponse.json({
      success: true,
      data: {
        aggregation,
        signals
      }
    });

  } catch (error) {
    console.error('Error fetching signals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Recalculate aggregation
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { company_ids } = body;

    if (!company_ids || !Array.isArray(company_ids)) {
      return NextResponse.json(
        { error: 'Missing required field: company_ids array' },
        { status: 400 }
      );
    }

    const results = [];

    for (const companyId of company_ids) {
      const aggregation = await signalAggregator.aggregateSignals(companyId);
      if (aggregation) {
        results.push(aggregation);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: company_ids.length,
        aggregated: results.length,
        results
      }
    });

  } catch (error) {
    console.error('Error in batch aggregation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}