// Runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { itpService } from '@/lib/itp';
import type { UpdateMatchActionRequest } from '@/types/itp';

// Validation schema for updating match action
const updateMatchActionSchema = z.object({
  user_action: z.enum(['accepted', 'rejected', 'pending']),
  user_notes: z.string().max(1000).optional(),
});

/**
 * PATCH /api/itp/matches/[matchId]
 * Update user action on a match (accept/reject)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    console.log('[ITP Match Action API] PATCH - Updating match:', params.matchId);
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

    const matchId = params.matchId;

    // Parse and validate body
    const body = await request.json();
    const validation = updateMatchActionSchema.safeParse(body);

    if (!validation.success) {
      console.error(
        '[ITP Match Action API] Validation failed:',
        validation.error.issues
      );
      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { user_action, user_notes } = validation.data;

    // Update match action
    const match = await itpService.updateMatchAction(
      user.id,
      matchId,
      user_action,
      user_notes
    );

    console.log(
      `[ITP Match Action API] Updated match ${matchId} action to ${user_action}`
    );

    return NextResponse.json({ match }, { status: 200 });
  } catch (error) {
    console.error('[ITP Match Action API] PATCH error:', error);

    if (error instanceof Error && error.message === 'Match not found') {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: 'Failed to update match',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
