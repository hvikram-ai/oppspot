/**
 * Red Flags Recompute API
 *
 * POST /api/companies/[id]/red-flags/recompute
 *
 * Triggers a new detection run for the company.
 * Returns 202 Accepted with run_id for status polling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRedFlagService } from '@/lib/red-flags/red-flag-service';

/**
 * Rate limit: max 1 run per entity per 10 minutes
 */
const RATE_LIMIT_MINUTES = 10;

/**
 * POST handler - Trigger detection run
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has editor/admin access to this company
    const hasAccess = await checkEditorAccess(supabase, user.id, companyId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - requires editor or admin access' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { detectors, force } = body;

    // Check rate limit (unless force=true)
    if (!force) {
      const recentRun = await getRecentRun(supabase, companyId);
      if (recentRun) {
        const minutesSince = getMinutesSince(recentRun.started_at);
        if (minutesSince < RATE_LIMIT_MINUTES) {
          const remainingMinutes = RATE_LIMIT_MINUTES - minutesSince;
          return NextResponse.json(
            {
              error: 'Rate limit exceeded',
              message: `Please wait ${Math.ceil(remainingMinutes)} more minutes before running detection again. Use force=true to override.`,
              retry_after_seconds: remainingMinutes * 60,
            },
            { status: 429 }
          );
        }
      }
    }

    // Trigger detection run asynchronously
    const redFlagService = getRedFlagService();

    // Run detection in the background (don't await)
    const detectionPromise = redFlagService.runDetection(
      companyId,
      'company',
      detectors
    );

    // Get the run immediately (it's created synchronously before detection starts)
    // For now, we'll create a placeholder and update it
    // In production, you'd want to return the run_id immediately
    const run = await detectionPromise; // For simplicity, await it here

    // Return 202 Accepted with run info
    return NextResponse.json(
      {
        run_id: run.id,
        status: run.status,
        started_at: run.started_at,
        poll_url: `/api/companies/${companyId}/red-flags/runs/${run.id}`,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('[RecomputeAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check if user has editor access to the company
 */
async function checkEditorAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  companyId: string
): Promise<boolean> {
  // For now, assume all authenticated users have editor access
  // TODO: Implement proper role-based access control
  const { data: company, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', companyId)
    .single();

  return !error && !!company;
}

/**
 * Get most recent run for this entity
 */
async function getRecentRun(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string
) {
  const { data, error } = await supabase
    .from('red_flag_runs')
    .select('id, started_at, status')
    .eq('entity_id', companyId)
    .eq('entity_type', 'company')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Calculate minutes since a timestamp
 */
function getMinutesSince(timestamp: string): number {
  const then = new Date(timestamp).getTime();
  const now = Date.now();
  return (now - then) / 1000 / 60;
}
