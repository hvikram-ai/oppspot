import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PredictiveLeadScorer } from '@/lib/ai/scoring/predictive-lead-scorer';
import type { Row } from '@/lib/supabase/helpers';

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

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    const body = await request.json();
    const { company_id, include_recommendations = true, use_ai = true } = body;

    if (!company_id) {
      return NextResponse.json(
        { error: 'Company ID required' },
        { status: 400 }
      );
    }

    // Initialize the scorer
    const scorer = new PredictiveLeadScorer();

    // Calculate predictive score
    const score = await scorer.calculatePredictiveScore(company_id, {
      includeRecommendations: include_recommendations,
      useAI: use_ai,
      orgId: profile?.org_id
    });

    // Log API usage
    await supabase
      .from('api_audit_log')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        api_name: 'ai_predictive_scoring',
        endpoint: '/api/ai-scoring/predictive',
        method: 'POST',
        request_params: { company_id },
        response_status: 200,
        response_data: {
          overall_score: score.overall_score,
          deal_probability: score.deal_probability
        },
        user_id: user.id
      });

    return NextResponse.json({
      success: true,
      score
    });

  } catch (error) {
    console.error('[API] Predictive scoring error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate predictive score' },
      { status: 500 }
    );
  }
}

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

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    const searchParams = request.nextUrl.searchParams;
    const company_id = searchParams.get('company_id');
    const min_score = searchParams.get('min_score');
    const timing = searchParams.get('timing');

    // Build query
    let query = supabase
      .from('ai_lead_scores')
      .select(`
        *,
        businesses!inner(
          name,
          website,
          city,
          country,
          employee_count_min,
          employee_count_max
        )
      `);

    // Apply filters
    if (profile?.org_id) {
      query = query.eq('org_id', profile.org_id);
    }

    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    if (min_score) {
      query = query.gte('overall_score', parseInt(min_score));
    }

    if (timing) {
      query = query.eq('optimal_engagement_timing', timing);
    }

    // Order by score and probability
    query = query.order('deal_probability', { ascending: false });

    const { data: scores, error } = await query;

    if (error) {
      console.error('[API] Error fetching scores:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scores' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      scores: scores || [],
      total: scores?.length || 0
    });

  } catch (error) {
    console.error('[API] Scores fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}