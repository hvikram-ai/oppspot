/**
 * GET /api/ma-predictions/queue/status
 *
 * Get real-time recalculation queue status
 *
 * Returns:
 * - 200: Queue statistics
 * - 401: Unauthorized
 * - 500: Internal error
 *
 * Part of T031 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getQueueStatus } from '@/lib/ma-prediction/repository/prediction-repository';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required', code: 401 },
        { status: 401 }
      );
    }

    // Fetch queue status
    const status = await getQueueStatus();

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error('Error fetching queue status:', error);

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Failed to retrieve queue status',
        code: 500
      },
      { status: 500 }
    );
  }
}
