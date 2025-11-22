/**
 * Single Day 1 Checklist Item API Routes
 * PATCH - Update checklist item
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ChecklistStatus } from '@/lib/data-room/types';

/**
 * PATCH /api/integration-playbook/[id]/day1-checklist/[itemId]
 * Update a Day 1 checklist item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId: item } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const itemId = item;
    const body = await request.json();

    // Build update object
    const updates: {
      status?: ChecklistStatus;
      completed_at?: string | null;
      completed_by?: string | null;
      notes?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (body.status) {
      updates.status = body.status;

      // Auto-set completed_at and completed_by when marking as completed
      if (body.status === 'completed') {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = user.id;
      } else {
        updates.completed_at = null;
        updates.completed_by = null;
      }
    }

    if (body.notes !== undefined) updates.notes = body.notes;

    // Update item
    const { data, error } = await supabase
      .from('integration_day1_checklist')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update checklist item: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Checklist item updated successfully',
    });
  } catch (error) {
    console.error('Error updating checklist item:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Checklist item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update checklist item' },
      { status: 500 }
    );
  }
}
