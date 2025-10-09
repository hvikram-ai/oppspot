import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { leadRoutingEngine } from '@/lib/qualification/routing/lead-routing-engine';
import { RouteLeadRequest } from '@/lib/qualification/types/qualification';
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

    const body: RouteLeadRequest = await request.json();

    if (!body.lead_id || !body.company_id) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id and company_id' },
        { status: 400 }
      );
    }

    // Route the lead
    const routingDecision = await leadRoutingEngine.routeLead(body);

    if (!routingDecision) {
      return NextResponse.json(
        { error: 'No routing rules apply to this lead' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: routingDecision
    });

  } catch (error) {
    console.error('Error in routing API:', error);
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

    if (!leadId) {
      // Get all routing rules
      const { data: rules, error: rulesError } = await supabase
        .from('lead_routing_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (rulesError) {
        return NextResponse.json(
          { error: 'Failed to fetch routing rules' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: rules
      });
    }

    // Get assignment history for specific lead
    const { data: assignments, error } = await supabase
      .from('lead_assignments')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch lead assignments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: assignments
    });

  } catch (error) {
    console.error('Error in routing GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update assignment status
export async function PATCH(request: NextRequest) {
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
    const { assignment_id, status, notes } = body;

    if (!assignment_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: assignment_id and status' },
        { status: 400 }
      );
    }

    // Update assignment
    const updateData: {
      status: string;
      updated_at: string;
      accepted_at?: string;
      completed_at?: string;
      reassigned_at?: string;
    } = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'accepted') {
      updateData.accepted_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'reassigned') {
      updateData.reassigned_at = new Date().toISOString();
    }

    if (notes) {
      updateData.notes = notes;
    }

    const { data, error } = await supabase
      .from('lead_assignments')
      // @ts-ignore - Type inference issue
      .update(updateData)
      .eq('id', assignment_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error in routing PATCH API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}