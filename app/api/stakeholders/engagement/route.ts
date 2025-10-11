import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { engagementTracker } from '@/lib/stakeholder-tracking/engagement/engagement-tracker';
import type { TrackEngagementRequest } from '@/lib/stakeholder-tracking/types/stakeholder';
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

    const body: TrackEngagementRequest = await request.json();

    // Validate request
    if (!body.engagement || !body.engagement.stakeholder_id || !body.engagement.engagement_date) {
      return NextResponse.json(
        { error: 'Invalid request - stakeholder_id and engagement_date required' },
        { status: 400 }
      );
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    // Add metadata
    body.engagement.org_id = profile?.org_id;
    body.engagement.created_by = user.id;
    body.engagement.initiated_by = user.id;

    console.log('[API] Tracking engagement for stakeholder:', body.engagement.stakeholder_id);

    // Track engagement
    const result = await engagementTracker.trackEngagement(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to track engagement' },
        { status: 500 }
      );
    }

    // Log API usage
    await supabase
      .from('api_audit_log')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        api_name: 'stakeholder_tracking',
        endpoint: '/api/stakeholders/engagement',
        method: 'POST',
        request_params: {
          stakeholder_id: body.engagement.stakeholder_id,
          engagement_type: body.engagement.engagement_type
        },
        response_status: 201,
        response_data: {
          engagement_id: result.engagement.id,
          sentiment_trend: result.sentiment_trend
        },
        user_id: user.id
      });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('[API] Engagement tracking error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve engagement history
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
    const engagement_type = searchParams.get('engagement_type');
    const outcome = searchParams.get('outcome');
    const days = searchParams.get('days');

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    // Build query
    let query = supabase
      .from('stakeholder_engagement')
      .select(`
        *,
        stakeholder:stakeholders!inner(
          id,
          name,
          title,
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

    if (engagement_type) {
      query = query.eq('engagement_type', engagement_type);
    }

    if (outcome) {
      query = query.eq('outcome', outcome);
    }

    if (days) {
      const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('engagement_date', startDate);
    }

    // Order by date
    query = query.order('engagement_date', { ascending: false });

    const { data: engagements, error } = await query;

    if (error) {
      console.error('[API] Error fetching engagements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch engagements' },
        { status: 500 }
      );
    }

    // If requesting summary for a specific stakeholder
    if (stakeholder_id && !engagement_type && !outcome) {
      const summary = await engagementTracker.getEngagementSummary(
        stakeholder_id,
        days ? parseInt(days) : 90
      );

      return NextResponse.json({
        success: true,
        engagements: engagements || [],
        summary
      });
    }

    return NextResponse.json({
      success: true,
      engagements: engagements || [],
      total_count: engagements?.length || 0
    });

  } catch (error) {
    console.error('[API] Engagement fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}