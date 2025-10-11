import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateStakeholderRequest, UpdateStakeholderRequest } from '@/lib/stakeholder-tracking/types/stakeholder';
import type { Row } from '@/lib/supabase/helpers'

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
    const company_id = searchParams.get('company_id');
    const role_type = searchParams.get('role_type');
    const champion_status = searchParams.get('champion_status');

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[API] Error fetching profile:', profileError);
    }

    // Build query
    let query = supabase
      .from('stakeholders')
      .select(`
        *,
        champion_tracking!left(*),
        detractor_management!left(*),
        influence_scores!left(*)
      `);

    // Filter by organization
    if (profile?.org_id) {
      query = query.eq('org_id', profile.org_id);
    }

    // Apply filters
    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    if (role_type) {
      query = query.eq('role_type', role_type);
    }

    if (champion_status) {
      query = query.eq('champion_status', champion_status);
    }

    // Order by influence level
    query = query.order('influence_level', { ascending: false });

    const { data: stakeholders, error } = await query;

    if (error) {
      console.error('[API] Error fetching stakeholders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch stakeholders' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stakeholders: stakeholders || [],
      total_count: stakeholders?.length || 0
    });

  } catch (error) {
    console.error('[API] Stakeholders fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const body: CreateStakeholderRequest = await request.json();

    // Validate request
    if (!body.stakeholder || !body.stakeholder.name || !body.stakeholder.company_id) {
      return NextResponse.json(
        { error: 'Invalid request - name and company_id required' },
        { status: 400 }
      );
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[API] Error fetching profile:', profileError);
    }

    // Add metadata
    const stakeholderData = {
      ...body.stakeholder,
      org_id: profile?.org_id,
      created_by: user.id,
      created_at: new Date().toISOString()
    };

    // Create stakeholder
    const { data: stakeholder, error } = await supabase
      .from('stakeholders')
      .insert(stakeholderData)
      .select()
      .single();

    if (error) {
      console.error('[API] Error creating stakeholder:', error);

      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Stakeholder with this email already exists for the company' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create stakeholder' },
        { status: 500 }
      );
    }

    // Log API usage
    await supabase
      .from('api_audit_log')
      .insert({
        api_name: 'stakeholder_tracking',
        endpoint: '/api/stakeholders',
        method: 'POST',
        request_params: {
          company_id: body.stakeholder.company_id,
          role_type: body.stakeholder.role_type
        },
        response_status: 201,
        response_data: { stakeholder_id: stakeholder.id },
        user_id: user.id
      });

    return NextResponse.json({
      success: true,
      stakeholder
    }, { status: 201 });

  } catch (error) {
    console.error('[API] Stakeholder creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const body: UpdateStakeholderRequest = await request.json();

    // Validate request
    if (!body.stakeholder_id || !body.updates) {
      return NextResponse.json(
        { error: 'Invalid request - stakeholder_id and updates required' },
        { status: 400 }
      );
    }

    // Check if user has access to this stakeholder
    const { data: existing, error: existingError } = await supabase
      .from('stakeholders')
      .select('org_id')
      .eq('id', body.stakeholder_id)
      .single();

    if (existingError) {
      console.error('[API] Error fetching stakeholder:', existingError);
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[API] Error fetching profile:', profileError);
    }

    if (existing.org_id && profile?.org_id !== existing.org_id) {
      return NextResponse.json(
        { error: 'Unauthorized - different organization' },
        { status: 403 }
      );
    }

    // Update stakeholder
    const { data: stakeholder, error } = await supabase
      .from('stakeholders')
      .update({
        ...body.updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.stakeholder_id)
      .select()
      .single();

    if (error) {
      console.error('[API] Error updating stakeholder:', error);
      return NextResponse.json(
        { error: 'Failed to update stakeholder' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stakeholder
    });

  } catch (error) {
    console.error('[API] Stakeholder update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const stakeholder_id = searchParams.get('id');

    if (!stakeholder_id) {
      return NextResponse.json(
        { error: 'Stakeholder ID required' },
        { status: 400 }
      );
    }

    // Check if user has access to this stakeholder
    const { data: existing, error: existingError } = await supabase
      .from('stakeholders')
      .select('org_id')
      .eq('id', stakeholder_id)
      .single();

    if (existingError) {
      console.error('[API] Error fetching stakeholder:', existingError);
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[API] Error fetching profile:', profileError);
    }

    if (existing.org_id && profile?.org_id !== existing.org_id) {
      return NextResponse.json(
        { error: 'Unauthorized - different organization' },
        { status: 403 }
      );
    }

    // Delete stakeholder (cascade will handle related records)
    const { error } = await supabase
      .from('stakeholders')
      .delete()
      .eq('id', stakeholder_id);

    if (error) {
      console.error('[API] Error deleting stakeholder:', error);
      return NextResponse.json(
        { error: 'Failed to delete stakeholder' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Stakeholder deleted successfully'
    });

  } catch (error) {
    console.error('[API] Stakeholder deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}