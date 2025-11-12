/**
 * Single Integration Playbook API Routes
 * GET - Retrieve single playbook with details
 * PATCH - Update playbook
 * DELETE - Soft delete playbook
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlaybookRepository } from '@/lib/data-room/repository/playbook-repository';
import type { UpdatePlaybookRequest } from '@/lib/data-room/types';

/**
 * GET /api/integration-playbook/[id]
 * Get single playbook with all details
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

    const playbookId = params.id;
    const repository = new PlaybookRepository(supabase);

    // Get playbook with all details
    const playbook = await repository.getPlaybookWithDetails(playbookId);

    return NextResponse.json({
      success: true,
      data: playbook,
    });
  } catch (error) {
    console.error('Error fetching playbook:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Playbook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch playbook' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/integration-playbook/[id]
 * Update playbook
 */
export async function PATCH(
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

    const playbookId = params.id;
    const body = await request.json();

    // Build update request
    const updateRequest: UpdatePlaybookRequest = {
      playbook_name: body.playbook_name,
      status: body.status,
      deal_rationale: body.deal_rationale,
      integration_objectives: body.integration_objectives,
      target_close_date: body.target_close_date,
      actual_close_date: body.actual_close_date,
    };

    // Update playbook
    const repository = new PlaybookRepository(supabase);
    const updatedPlaybook = await repository.updatePlaybook(playbookId, updateRequest);

    return NextResponse.json({
      success: true,
      data: updatedPlaybook,
      message: 'Playbook updated successfully',
    });
  } catch (error) {
    console.error('Error updating playbook:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Playbook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update playbook' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integration-playbook/[id]
 * Soft delete playbook
 */
export async function DELETE(
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

    const playbookId = params.id;
    const repository = new PlaybookRepository(supabase);

    // Soft delete playbook
    await repository.deletePlaybook(playbookId);

    return NextResponse.json({
      success: true,
      message: 'Playbook deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting playbook:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Playbook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete playbook' },
      { status: 500 }
    );
  }
}
