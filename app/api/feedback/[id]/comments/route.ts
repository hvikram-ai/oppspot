// Runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema
const commentSchema = z.object({
  comment: z.string().min(1).max(2000),
  parent_comment_id: z.string().uuid().nullable().optional(),
});

/**
 * GET /api/feedback/[id]/comments
 * Get comments for a feedback item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const feedbackId = params.id;

    // Get comments with user info
    const { data: comments, error } = await supabase
      .from('feedback_comments')
      .select(`
        *,
        user:user_id (
          email
        )
      `)
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Feedback Comments API] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    // Format response
    const formattedComments = comments?.map((c) => ({
      ...c,
      user_email: c.user?.email || null,
    }));

    return NextResponse.json({ comments: formattedComments || [] }, { status: 200 });

  } catch (error) {
    console.error('[Feedback Comments API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedback/[id]/comments
 * Add a comment to feedback
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const feedbackId = params.id;

    // Parse and validate body
    const body = await request.json();
    const validation = commentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { comment, parent_comment_id } = validation.data;

    // Check if feedback exists
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('id')
      .eq('id', feedbackId)
      .single();

    if (feedbackError || !feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Insert comment
    const { data: newComment, error: insertError } = await supabase
      .from('feedback_comments')
      .insert({
        feedback_id: feedbackId,
        user_id: user.id,
        comment,
        parent_comment_id: parent_comment_id || null,
        is_admin: false, // TODO: Check if user is admin
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Feedback Comments API] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to add comment' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase
      .from('feedback_activity')
      .insert({
        feedback_id: feedbackId,
        user_id: user.id,
        action: 'commented',
        new_value: {
          comment_id: newComment.id,
          parent_comment_id: parent_comment_id || null,
        },
      })
      .catch((err) => console.log('[Feedback Comments API] Activity log failed:', err));

    // TODO: Notify followers

    return NextResponse.json({ comment: newComment }, { status: 201 });

  } catch (error) {
    console.error('[Feedback Comments API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
