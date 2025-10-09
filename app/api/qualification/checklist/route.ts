import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checklistEngine } from '@/lib/qualification/checklists/checklist-engine';
import { CreateChecklistRequest } from '@/lib/qualification/types/qualification';
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

    const body: CreateChecklistRequest = await request.json();

    if (!body.lead_id || !body.company_id || !body.framework) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id, company_id, and framework' },
        { status: 400 }
      );
    }

    // Create checklist
    const checklist = await checklistEngine.createChecklist(body);

    if (!checklist) {
      return NextResponse.json(
        { error: 'Failed to create checklist' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: checklist
    });

  } catch (error) {
    console.error('Error in checklist API:', error);
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
    const checklistId = searchParams.get('checklist_id');
    const leadId = searchParams.get('lead_id');

    if (checklistId) {
      // Get specific checklist
      const checklist = await checklistEngine.getChecklist(checklistId);

      if (!checklist) {
        return NextResponse.json(
          { error: 'Checklist not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: checklist
      });
    } else if (leadId) {
      // Get checklists for a lead
      const { data: checklists, error } = await supabase
        .from('qualification_checklists')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch checklists' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: checklists
      });
    } else {
      return NextResponse.json(
        { error: 'Missing checklist_id or lead_id parameter' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in checklist GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update checklist item
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
    const { item_id, status, answer, evidence } = body;

    if (!item_id) {
      return NextResponse.json(
        { error: 'Missing item_id' },
        { status: 400 }
      );
    }

    // Update item
    const updated = await checklistEngine.updateChecklistItem(
      item_id,
      { status, answer, evidence }
    );

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update checklist item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated
    });

  } catch (error) {
    console.error('Error in checklist PATCH API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Complete checklist
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
    const { checklist_id } = body;

    if (!checklist_id) {
      return NextResponse.json(
        { error: 'Missing checklist_id' },
        { status: 400 }
      );
    }

    // Complete checklist
    const result = await checklistEngine.completeChecklist(checklist_id);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to complete checklist' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in checklist PUT API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}