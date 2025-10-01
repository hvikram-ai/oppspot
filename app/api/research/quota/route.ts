/**
 * Research Quota API
 *
 * GET /api/research/quota - Get user's research quota status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResearchGPTService } from '@/lib/research-gpt/research-gpt-service';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get quota
    const service = getResearchGPTService();
    const quota = await service.getQuota(user.id);

    const researches_remaining = quota.researches_limit - quota.researches_used;
    const percentage_used = Math.round((quota.researches_used / quota.researches_limit) * 100);

    // Determine warning status
    const warning = percentage_used >= 90;
    let warning_message: string | undefined;

    if (percentage_used >= 100) {
      warning_message = 'You have reached your monthly research limit. Upgrade to continue.';
    } else if (percentage_used >= 90) {
      warning_message = `You have used ${percentage_used}% of your monthly research quota. ${researches_remaining} researches remaining.`;
    }

    return NextResponse.json({
      user_id: quota.user_id,
      period_start: quota.period_start,
      period_end: quota.period_end,
      researches_used: quota.researches_used,
      researches_limit: quota.researches_limit,
      researches_remaining,
      percentage_used,
      tier: quota.tier,
      warning,
      warning_message,
    });
  } catch (error) {
    console.error('Quota check error:', error);

    return NextResponse.json(
      { error: 'Failed to check quota' },
      { status: 500 }
    );
  }
}
