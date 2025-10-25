import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detractorManager } from '@/lib/stakeholder-tracking/detractors/detractor-manager';
import type { IdentifyDetractorsRequest } from '@/lib/stakeholder-tracking/types/stakeholder';

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

    const body: IdentifyDetractorsRequest = await request.json();

    // Get user's organization
    const { data: profile, error: _profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single() as { data: { org_id: string | null } | null; error: unknown };

    // Add org_id to request if not provided
    if (!body.org_id && profile?.org_id) {
      body.org_id = profile.org_id;
    }

    console.log('[API] Identifying detractors:', body);

    // Identify detractors
    const result = await detractorManager.identifyDetractors(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to identify detractors' },
        { status: 500 }
      );
    }

    // Log API usage
    await supabase
      .from('api_audit_log')
      .insert({
        api_name: 'stakeholder_tracking',
        endpoint: '/api/stakeholders/detractors',
        method: 'POST',
        request_params: body,
        response_status: 200,
        response_data: {
          detractors_found: result.total_count
        },
        user_id: user.id
      });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[API] Detractor identification error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve detractor management data
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
    const mitigation_status = searchParams.get('mitigation_status');
    const business_impact = searchParams.get('business_impact');

    // Get user's organization
    const { data: profile, error: _profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single() as { data: { org_id: string | null } | null; error: unknown };

    // Build query
    let query = supabase
      .from('detractor_management')
      .select(`
        *,
        stakeholder:stakeholders!inner(
          id,
          name,
          title,
          email,
          company_id,
          role_type,
          influence_level
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

    if (mitigation_status) {
      query = query.eq('mitigation_status', mitigation_status);
    }

    if (business_impact) {
      query = query.eq('business_impact', business_impact);
    }

    // Order by risk score
    query = query.order('deal_risk_score', { ascending: false });

    const { data: detractors, error } = await query;

    if (error) {
      console.error('[API] Error fetching detractor management:', error);
      return NextResponse.json(
        { error: 'Failed to fetch detractor management data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      detractors: detractors || [],
      total_count: detractors?.length || 0
    });

  } catch (error) {
    console.error('[API] Detractor management fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update mitigation status
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
    const { management_id, new_status, notes } = body;

    if (!management_id || !new_status) {
      return NextResponse.json(
        { error: 'management_id and new_status required' },
        { status: 400 }
      );
    }

    // Update mitigation status
    const success = await detractorManager.updateMitigationStatus(
      management_id,
      new_status,
      notes
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update mitigation status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mitigation status updated successfully'
    });

  } catch (error) {
    console.error('[API] Mitigation status update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}