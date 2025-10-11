import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { influenceScorer } from '@/lib/stakeholder-tracking/influence/influence-scorer';
import type { CalculateInfluenceRequest } from '@/lib/stakeholder-tracking/types/stakeholder';
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

    const body: CalculateInfluenceRequest = await request.json();

    // Validate request
    if (!body.stakeholder_id) {
      return NextResponse.json(
        { error: 'stakeholder_id required' },
        { status: 400 }
      );
    }

    console.log('[API] Calculating influence for stakeholder:', body.stakeholder_id);

    // Calculate influence
    const result = await influenceScorer.calculateInfluence(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to calculate influence' },
        { status: 500 }
      );
    }

    // Log API usage
    await supabase
      .from('api_audit_log')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        api_name: 'stakeholder_tracking',
        endpoint: '/api/stakeholders/influence',
        method: 'POST',
        request_params: body,
        response_status: 200,
        response_data: {
          overall_influence: result.influence_scores.overall_influence
        },
        user_id: user.id
      });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[API] Influence calculation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve influence scores
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

    const searchParams = request.nextUrl.searchParams;
    const stakeholder_id = searchParams.get('stakeholder_id');
    const min_influence = searchParams.get('min_influence');

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    // Build query
    let query = supabase
      .from('influence_scores')
      .select(`
        *,
        stakeholder:stakeholders!inner(
          id,
          name,
          title,
          department,
          company_id
        )
      `);

    // Filter by organization
    if (profile?.org_id) {
      query = query.eq('org_id', profile.org_id);
    }

    // Apply filters
    if (stakeholder_id) {
      query = query.eq('stakeholder_id', stakeholder_id);
    }

    if (min_influence) {
      query = query.gte('overall_influence', parseInt(min_influence));
    }

    // Order by overall influence
    query = query.order('overall_influence', { ascending: false });

    const { data: scores, error } = await query;

    if (error) {
      console.error('[API] Error fetching influence scores:', error);
      return NextResponse.json(
        { error: 'Failed to fetch influence scores' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      influence_scores: scores || [],
      total_count: scores?.length || 0
    });

  } catch (error) {
    console.error('[API] Influence scores fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}