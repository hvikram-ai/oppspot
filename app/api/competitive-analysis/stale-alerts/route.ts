import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { competitiveAnalysisRepository } from '@/lib/competitive-analysis/repository';
import {
  handleError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/competitive-analysis/errors';

/**
 * GET /api/competitive-analysis/stale-alerts
 * Check for analyses with data older than threshold (default: 30 days)
 * Used to display alerts on login
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const thresholdDays = parseInt(searchParams.get('threshold_days') || '30');

    // Validate threshold range
    if (isNaN(thresholdDays) || thresholdDays < 1 || thresholdDays > 365) {
      throw new ValidationError('Threshold must be between 1 and 365 days', {
        threshold_days: thresholdDays,
      });
    }

    // Get stale analyses
    const staleAnalyses = await competitiveAnalysisRepository.getStaleAnalyses(user.id, thresholdDays);

    return NextResponse.json(
      {
        stale_analyses: staleAnalyses,
        threshold_days: thresholdDays,
        count: staleAnalyses.length,
      },
      { status: 200 }
    );
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
