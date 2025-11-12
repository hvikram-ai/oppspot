/**
 * Integration Activities API Routes
 * GET - List activities with filters
 * PATCH - Bulk update activities
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlaybookRepository } from '@/lib/data-room/repository/playbook-repository';
import type { ActivityStatus, ActivityCategory, ActivityPriority } from '@/lib/data-room/types';

/**
 * GET /api/integration-playbook/[id]/activities
 * List activities with optional filters
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
    const { searchParams } = new URL(request.url);

    // Parse filters
    const filters: {
      phase_id?: string;
      workstream_id?: string;
      status?: ActivityStatus;
      priority?: ActivityPriority;
      category?: ActivityCategory;
    } = {};

    const phaseId = searchParams.get('phase_id');
    const workstreamId = searchParams.get('workstream_id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');

    if (phaseId) filters.phase_id = phaseId;
    if (workstreamId) filters.workstream_id = workstreamId;
    if (status) filters.status = status as ActivityStatus;
    if (priority) filters.priority = priority as ActivityPriority;
    if (category) filters.category = category as ActivityCategory;

    // Get activities
    const repository = new PlaybookRepository(supabase);
    const activities = await repository.getActivities(playbookId, filters);

    // Get summary statistics
    const summary = {
      total: activities.length,
      not_started: activities.filter((a) => a.status === 'not_started').length,
      in_progress: activities.filter((a) => a.status === 'in_progress').length,
      completed: activities.filter((a) => a.status === 'completed').length,
      blocked: activities.filter((a) => a.status === 'blocked').length,
      at_risk: activities.filter((a) => a.status === 'at_risk').length,
    };

    return NextResponse.json({
      success: true,
      data: activities,
      summary,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/integration-playbook/[id]/activities
 * Bulk update multiple activities
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

    const body = await request.json();
    const { activity_ids, updates } = body;

    if (!activity_ids || !Array.isArray(activity_ids) || activity_ids.length === 0) {
      return NextResponse.json(
        { error: 'activity_ids array is required' },
        { status: 400 }
      );
    }

    // Update activities
    const { data, error } = await supabase
      .from('integration_activities')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .in('id', activity_ids)
      .select();

    if (error) {
      throw new Error(`Failed to update activities: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data,
      message: `${data.length} activities updated successfully`,
    });
  } catch (error) {
    console.error('Error updating activities:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update activities' },
      { status: 500 }
    );
  }
}
