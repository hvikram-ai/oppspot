// Runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { itpService } from '@/lib/itp';
import type { ListMatchesResponse } from '@/types/itp';

/**
 * GET /api/itp/[id]/matches
 * List matches for an ITP with pagination and filters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[ITP Matches API] GET - Fetching matches for ITP:', id);
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const itpId = id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const min_score = searchParams.get('min_score')
      ? parseInt(searchParams.get('min_score')!)
      : undefined;
    const max_score = searchParams.get('max_score')
      ? parseInt(searchParams.get('max_score')!)
      : undefined;
    const user_action = searchParams.get('user_action') as
      | 'accepted'
      | 'rejected'
      | 'pending'
      | null;
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = parseInt(searchParams.get('per_page') || '20');

    const limit = Math.min(per_page, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    console.log('[ITP Matches API] Query params:', {
      min_score,
      max_score,
      user_action,
      page,
      per_page: limit,
    });

    // Get matches
    const { matches, total } = await itpService.getMatches(user.id, itpId, {
      min_score,
      max_score,
      user_action: user_action || undefined,
      limit,
      offset,
    });

    // Get statistics
    const stats = await itpService.getMatchStats(user.id, itpId);

    const response: ListMatchesResponse = {
      matches,
      stats,
      pagination: {
        page,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };

    console.log('[ITP Matches API] Returning', matches.length, 'matches');

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[ITP Matches API] GET error:', error);

    if (error instanceof Error && error.message === 'ITP not found') {
      return NextResponse.json({ error: 'ITP not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch matches',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
