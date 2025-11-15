// Runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { itpService } from '@/lib/itp';
import type { RunMatchingRequest, RunMatchingResponse } from '@/types/itp';

// Validation schema for run matching request
const runMatchingSchema = z.object({
  business_ids: z.array(z.string().uuid()).optional(),
  force_rematch: z.boolean().optional(),
  limit: z.number().min(1).max(1000).optional(),
});

/**
 * POST /api/itp/[id]/match
 * Run ITP matching against businesses
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[ITP Match API] POST - Running matching for ITP:', params.id);
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

    const itpId = params.id;

    // Parse and validate body
    const body = await request.json().catch(() => ({}));
    const validation = runMatchingSchema.safeParse(body);

    if (!validation.success) {
      console.error('[ITP Match API] Validation failed:', validation.error.issues);
      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const options = validation.data;

    console.log('[ITP Match API] Running matching with options:', {
      business_ids_count: options.business_ids?.length,
      force_rematch: options.force_rematch,
      limit: options.limit,
    });

    // Run matching
    const result: RunMatchingResponse = await itpService.runMatching(
      user.id,
      itpId,
      options
    );

    console.log('[ITP Match API] Matching complete:', {
      new_matches: result.new_matches,
      total_matches: result.total_matches,
      execution_time_ms: result.execution_time_ms,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[ITP Match API] POST error:', error);

    if (error instanceof Error) {
      if (error.message === 'ITP not found') {
        return NextResponse.json({ error: 'ITP not found' }, { status: 404 });
      }

      if (error.message === 'ITP is not active') {
        return NextResponse.json(
          { error: 'ITP is not active. Please activate it before running matching.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to run matching',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
