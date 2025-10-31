import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/feedback/[id]/follow
 * Toggle following a feedback item
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: feedbackId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if feedback exists
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('id')
      .eq('id', feedbackId)
      .single();

    if (feedbackError || !feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('feedback_followers')
      .select('id')
      .eq('feedback_id', feedbackId)
      .eq('user_id', user.id)
      .single();

    let following = false;

    if (existingFollow) {
      // Unfollow
      const { error: deleteError } = await supabase
        .from('feedback_followers')
        .delete()
        .eq('feedback_id', feedbackId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('[Feedback] Error unfollowing:', deleteError);
        throw new Error('Failed to unfollow');
      }

      following = false;
    } else {
      // Follow
      const { error: insertError } = await supabase.from('feedback_followers').insert({
        feedback_id: feedbackId,
        user_id: user.id,
      });

      if (insertError) {
        console.error('[Feedback] Error following:', insertError);
        throw new Error('Failed to follow');
      }

      following = true;
    }

    // Log activity
    await supabase.from('feedback_activity').insert({
      feedback_id: feedbackId,
      user_id: user.id,
      action_type: following ? 'followed' : 'unfollowed',
    });

    return NextResponse.json({ following });
  } catch (error) {
    console.error('[Feedback] Follow toggle error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
