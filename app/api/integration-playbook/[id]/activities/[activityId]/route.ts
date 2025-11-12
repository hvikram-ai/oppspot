/**
 * Single Activity API Routes
 * PATCH - Update single activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ActivityStatus, ActivityCategory, ActivityPriority } from '@/lib/data-room/types';

/**
 * PATCH /api/integration-playbook/[id]/activities/[activityId]
 * Update a single activity
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; activityId: string } }
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

    const activityId = params.activityId;
    const body = await request.json();

    // Build update object
    const updates: {
      status?: ActivityStatus;
      priority?: ActivityPriority;
      category?: ActivityCategory;
      completion_percentage?: number;
      start_date?: string;
      target_completion_date?: string;
      actual_completion_date?: string;
      assigned_to?: string;
      notes?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (body.status) updates.status = body.status;
    if (body.priority) updates.priority = body.priority;
    if (body.category) updates.category = body.category;
    if (body.completion_percentage !== undefined) updates.completion_percentage = body.completion_percentage;
    if (body.start_date) updates.start_date = body.start_date;
    if (body.target_completion_date) updates.target_completion_date = body.target_completion_date;
    if (body.actual_completion_date) updates.actual_completion_date = body.actual_completion_date;
    if (body.assigned_to) updates.assigned_to = body.assigned_to;
    if (body.notes) updates.notes = body.notes;

    // Auto-set actual_completion_date when marking as completed
    if (body.status === 'completed' && !updates.actual_completion_date) {
      updates.actual_completion_date = new Date().toISOString();
      updates.completion_percentage = 100;
    }

    // Update activity
    const { data, error } = await supabase
      .from('integration_activities')
      .update(updates)
      .eq('id', activityId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update activity: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Activity updated successfully',
    });
  } catch (error) {
    console.error('Error updating activity:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update activity' },
      { status: 500 }
    );
  }
}
