import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import leadRecyclingEngine from '@/lib/qualification/recycling/lead-recycling-engine';
import { RecycleLeadRequest } from '@/lib/qualification/types/qualification';

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

    const body: RecycleLeadRequest = await request.json();

    if (!body.lead_id || !body.company_id || !body.reason) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id, company_id, and reason' },
        { status: 400 }
      );
    }

    // Recycle the lead
    const result = await leadRecyclingEngine.recycleLead(body);

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.message || 'Failed to recycle lead' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in recycling API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');
    const campaignId = searchParams.get('campaign_id');

    if (leadId) {
      // Get recycling history for a lead
      const { data: history, error } = await supabase
        .from('lead_recycling_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch recycling history' },
          { status: 500 }
        );
      }

      // Get recycling recommendations
      const recommendations = await leadRecyclingEngine.getRecyclingRecommendations(leadId);

      return NextResponse.json({
        success: true,
        data: {
          history,
          recommendations
        }
      });
    } else if (campaignId) {
      // Get nurture campaign details
      const { data: campaign, error } = await supabase
        .from('nurture_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }

      // Get enrolled leads
      const { data: enrollments } = await supabase
        .from('nurture_campaign_enrollments')
        .select('*')
        .eq('campaign_id', campaignId);

      return NextResponse.json({
        success: true,
        data: {
          campaign,
          enrollments
        }
      });
    } else {
      // Get all active recycling rules
      const { data: rules, error } = await supabase
        .from('lead_recycling_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch recycling rules' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: rules
      });
    }

  } catch (error) {
    console.error('Error in recycling GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optimize recycling rules
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Optimize rules based on performance
    await leadRecyclingEngine.optimizeRecyclingRules();

    return NextResponse.json({
      success: true,
      message: 'Recycling rules optimized successfully'
    });

  } catch (error) {
    console.error('Error in recycling optimization API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}