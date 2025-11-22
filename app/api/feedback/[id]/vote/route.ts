// Runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { FeedbackVoteResponse } from '@/types/feedback';

/**
 * POST /api/feedback/[id]/vote
 * Toggle vote on feedback (add or remove)
 */
export async function POST(
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

    // Check if feedback exists
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('id, votes_count')
      .eq('id', feedbackId)
      .single();

    if (feedbackError || !feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Check if user has already voted
    const { data: existingVote } = await supabase
      .from('feedback_votes')
      .select('id')
      .eq('feedback_id', feedbackId)
      .eq('user_id', user.id)
      .single();

    let voted = false;
    let votesCount = feedback.votes_count;

    if (existingVote) {
      // Remove vote
      const { error: deleteError } = await supabase
        .from('feedback_votes')
        .delete()
        .eq('id', existingVote.id);

      if (deleteError) {
        console.error('[Feedback Vote API] Delete error:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove vote' },
          { status: 500 }
        );
      }

      voted = false;
      votesCount = Math.max(0, votesCount - 1);

      // Log activity
      await supabase
        .from('feedback_activity')
        .insert({
          feedback_id: feedbackId,
          user_id: user.id,
          action: 'voted',
          old_value: { voted: true },
          new_value: { voted: false },
        })
        .catch((err: unknown) => console.log('[Feedback Vote API] Activity log failed:', err));

    } else {
      // Add vote
      const { error: insertError } = await supabase
        .from('feedback_votes')
        .insert({
          feedback_id: feedbackId,
          user_id: user.id,
        });

      if (insertError) {
        console.error('[Feedback Vote API] Insert error:', insertError);
        return NextResponse.json(
          { error: 'Failed to add vote' },
          { status: 500 }
        );
      }

      voted = true;
      votesCount = votesCount + 1;

      // Log activity
      await supabase
        .from('feedback_activity')
        .insert({
          feedback_id: feedbackId,
          user_id: user.id,
          action: 'voted',
          old_value: { voted: false },
          new_value: { voted: true },
        })
        .catch((err: unknown) => console.log('[Feedback Vote API] Activity log failed:', err));
    }

    // Get updated votes count
    const { data: updatedFeedback } = await supabase
      .from('feedback')
      .select('votes_count')
      .eq('id', feedbackId)
      .single();

    const response: FeedbackVoteResponse = {
      voted,
      votes_count: updatedFeedback?.votes_count || votesCount,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Feedback Vote API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to process vote' },
      { status: 500 }
    );
  }
}
