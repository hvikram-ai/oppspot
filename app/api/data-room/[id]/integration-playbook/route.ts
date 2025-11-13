/**
 * Integration Playbook API Routes
 * POST - Create new playbook for data room
 * GET - List all playbooks for data room
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlaybookRepository } from '@/lib/data-room/repository/playbook-repository';
import { PlaybookGenerator } from '@/lib/data-room/integration-playbook/playbook-generator';
import type { CreatePlaybookRequest, GeneratePlaybookRequest } from '@/lib/data-room/types';

/**
 * POST /api/data-room/[id]/integration-playbook
 * Create a new integration playbook
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const dataRoomId = params.id;

    // Validate data room access
    const { data: dataRoom, error: accessError } = await supabase
      .from('data_rooms')
      .select('id')
      .eq('id', dataRoomId)
      .single();

    if (accessError || !dataRoom) {
      return NextResponse.json(
        { error: 'Data room not found or access denied' },
        { status: 404 }
      );
    }

    // Build playbook creation request
    const playbookRequest: CreatePlaybookRequest = {
      data_room_id: dataRoomId,
      playbook_name: body.playbook_name,
      deal_type: body.deal_type,
      deal_rationale: body.deal_rationale,
      integration_objectives: body.integration_objectives,
      target_close_date: body.target_close_date,
    };

    // Build generation request
    const generateRequest: GeneratePlaybookRequest = {
      use_tech_stack_analysis: body.use_tech_stack_analysis ?? true,
      use_deal_hypotheses: body.use_deal_hypotheses ?? true,
      custom_objectives: body.custom_objectives,
      include_quick_wins: body.include_quick_wins ?? true,
    };

    // Generate playbook
    const generator = new PlaybookGenerator(supabase, user.id);
    const result = await generator.generatePlaybook(
      playbookRequest,
      generateRequest,
      user.id
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Integration playbook created successfully',
    });
  } catch (error) {
    console.error('Error creating playbook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create playbook' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/data-room/[id]/integration-playbook
 * List all playbooks for a data room
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dataRoomId = params.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const includeArchived = searchParams.get('include_archived') === 'true';

    // Get playbooks
    const repository = new PlaybookRepository(supabase);
    const playbooks = await repository.listPlaybooks(dataRoomId, {
      status: status as any,
      includeArchived,
    });

    return NextResponse.json({
      success: true,
      data: playbooks,
      count: playbooks.length,
    });
  } catch (error) {
    console.error('Error listing playbooks:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list playbooks' },
      { status: 500 }
    );
  }
}
