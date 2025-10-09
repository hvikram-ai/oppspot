import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { championIdentifier } from '@/lib/stakeholder-tracking/champions/champion-identifier';
import type { IdentifyChampionsRequest } from '@/lib/stakeholder-tracking/types/stakeholder';
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

    const body: IdentifyChampionsRequest = await request.json();

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single() as { data: Pick<Row<'profiles'>, 'org_id'> | null; error: any };

    // Add org_id to request if not provided
    if (!body.org_id && profile?.org_id) {
      body.org_id = profile.org_id;
    }

    console.log('[API] Identifying champions:', body);

    // Identify champions
    const result = await championIdentifier.identifyChampions(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to identify champions' },
        { status: 500 }
      );
    }

    // Log API usage
    await supabase
      .from('api_audit_log')
      // @ts-ignore - Supabase type inference issue
      .insert({
        api_name: 'stakeholder_tracking',
        endpoint: '/api/stakeholders/champions',
        method: 'POST',
        request_params: body,
        response_status: 200,
        response_data: {
          champions_found: result.total_count
        },
        user_id: user.id
      });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[API] Champion identification error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve champion tracking data
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
    const development_stage = searchParams.get('development_stage');
    const risk_level = searchParams.get('risk_level');

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single() as { data: Pick<Row<'profiles'>, 'org_id'> | null; error: any };

    // Build query
    let query = supabase
      .from('champion_tracking')
      .select(`
        *,
        stakeholder:stakeholders!inner(
          id,
          name,
          title,
          email,
          company_id,
          champion_status,
          champion_score
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

    if (development_stage) {
      query = query.eq('development_stage', development_stage);
    }

    if (risk_level) {
      query = query.eq('risk_level', risk_level);
    }

    // Order by risk level and advocacy level
    query = query.order('risk_level', { ascending: false })
      .order('advocacy_level', { ascending: false });

    const { data: champions, error } = await query;

    if (error) {
      console.error('[API] Error fetching champion tracking:', error);
      return NextResponse.json(
        { error: 'Failed to fetch champion tracking data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      champions: champions || [],
      total_count: champions?.length || 0
    });

  } catch (error) {
    console.error('[API] Champion tracking fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update champion development stage
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
    const { tracking_id, new_stage, notes } = body;

    if (!tracking_id || !new_stage) {
      return NextResponse.json(
        { error: 'tracking_id and new_stage required' },
        { status: 400 }
      );
    }

    // Update development stage
    const success = await championIdentifier.updateDevelopmentStage(
      tracking_id,
      new_stage,
      notes
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update development stage' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Development stage updated successfully'
    });

  } catch (error) {
    console.error('[API] Champion stage update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}