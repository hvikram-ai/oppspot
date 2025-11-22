// Runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { FeedbackDetailResponse } from '@/types/feedback';
import { requireAdminRole } from '@/lib/auth/role-check';

// Validation schema for updates
const updateSchema = z.object({
  status: z.enum(['pending', 'in_review', 'in_progress', 'resolved', 'declined', 'duplicate']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  admin_response: z.string().max(5000).optional(),
  is_public: z.boolean().optional(),
});

/**
 * GET /api/feedback/[id]
 * Get detailed feedback with comments and activity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[Feedback Detail API] Fetching feedback:', id);
    const supabase = await createClient();

    // Get authenticated user
    console.log('[Feedback Detail API] Getting authenticated user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const feedbackId = id;

    // Get feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('*')
      .eq('id', feedbackId)
      .single();

    if (feedbackError || !feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Check if user has access (public OR owner)
    if (!feedback.is_public && feedback.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if user has voted
    const { data: vote } = await supabase
      .from('feedback_votes')
      .select('id')
      .eq('feedback_id', feedbackId)
      .eq('user_id', user.id)
      .single();

    // Check if user is following
    const { data: follow } = await supabase
      .from('feedback_followers')
      .select('id')
      .eq('feedback_id', feedbackId)
      .eq('user_id', user.id)
      .single();

    // Get comments
    const { data: comments } = await supabase
      .from('feedback_comments')
      .select(`
        *,
        user:user_id (
          email
        )
      `)
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: true });

    // Get activity
    const { data: activity } = await supabase
      .from('feedback_activity')
      .select('*')
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Increment view count
    await supabase
      .from('feedback')
      .update({ view_count: feedback.view_count + 1 })
      .eq('id', feedbackId)
      .catch((err: unknown) => console.log('[Feedback Detail API] View count update failed:', err));

    // Format response
    const formattedComments = comments?.map((c) => ({
      ...c,
      user_email: c.user?.email || null,
    })) || [];

    const response: FeedbackDetailResponse = {
      feedback: {
        ...feedback,
        hasVoted: !!vote,
        hasFollowed: !!follow,
      },
      comments: formattedComments,
      activity: activity || [],
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Feedback Detail API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/feedback/[id]
 * Update feedback (admin or owner)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const feedbackId = id;

    // Parse and validate body
    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Get existing feedback
    const { data: existingFeedback, error: fetchError } = await supabase
      .from('feedback')
      .select('*')
      .eq('id', feedbackId)
      .single();

    if (fetchError || !existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Check permissions (owner can update their own, admin can update all)
    const isOwner = existingFeedback.user_id === user.id;
    const isAdmin = await requireAdminRole(supabase, user.id);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Prepare update object
    const updateData: {
      status?: string;
      resolved_at?: string;
      priority?: string;
      admin_response?: string;
      admin_response_by?: string;
      admin_response_at?: string;
      is_public?: boolean;
    } = {};

    if (updates.status !== undefined) {
      updateData.status = updates.status;
      if (updates.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
    }

    if (updates.priority !== undefined) {
      updateData.priority = updates.priority;
    }

    if (updates.admin_response !== undefined) {
      updateData.admin_response = updates.admin_response;
      updateData.admin_response_by = user.id;
      updateData.admin_response_at = new Date().toISOString();
    }

    if (updates.is_public !== undefined) {
      updateData.is_public = updates.is_public;
    }

    // Update feedback
    const { data: updatedFeedback, error: updateError } = await supabase
      .from('feedback')
      .update(updateData)
      .eq('id', feedbackId)
      .select()
      .single();

    if (updateError) {
      console.error('[Feedback Detail API] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update feedback' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase
      .from('feedback_activity')
      .insert({
        feedback_id: feedbackId,
        user_id: user.id,
        action: 'updated',
        old_value: {
          status: existingFeedback.status,
          priority: existingFeedback.priority,
          is_public: existingFeedback.is_public,
        },
        new_value: updateData,
      })
      .catch((err: unknown) => console.log('[Feedback Detail API] Activity log failed:', err));

    // TODO: Notify followers if status changed

    return NextResponse.json({ feedback: updatedFeedback }, { status: 200 });

  } catch (error) {
    console.error('[Feedback Detail API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/feedback/[id]
 * Delete feedback (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const feedbackId = id;

    // Get feedback to check ownership
    const { data: feedback, error: fetchError } = await supabase
      .from('feedback')
      .select('user_id')
      .eq('id', feedbackId)
      .single();

    if (fetchError || !feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (feedback.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete feedback (cascade will delete related records)
    const { error: deleteError } = await supabase
      .from('feedback')
      .delete()
      .eq('id', feedbackId);

    if (deleteError) {
      console.error('[Feedback Detail API] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Feedback deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('[Feedback Detail API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to delete feedback' },
      { status: 500 }
    );
  }
}
