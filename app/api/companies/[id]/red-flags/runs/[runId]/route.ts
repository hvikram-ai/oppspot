/**
 * Red Flag Run Status API
 *
 * GET /api/companies/[id]/red-flags/runs/[runId]
 *
 * Returns status of a detection run for polling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET handler - Get run status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id: companyId, runId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get run from database
    const { data: run, error } = await supabase
      .from('red_flag_runs')
      .select('*')
      .eq('id', runId)
      .eq('entity_id', companyId)
      .eq('entity_type', 'company')
      .single();

    if (error || !run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    // Calculate estimated completion time
    let estimated_completion_seconds = 0;
    if (run.status === 'running') {
      const elapsedMs = Date.now() - new Date(run.started_at).getTime();
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      // Estimate 10 seconds total for detection
      estimated_completion_seconds = Math.max(0, 10 - elapsedSeconds);
    }

    return NextResponse.json({
      run_id: run.id,
      status: run.status,
      started_at: run.started_at,
      finished_at: run.finished_at,
      stats: run.stats,
      estimated_completion_seconds,
    }, { status: 200 });
  } catch (error) {
    console.error('[RunStatusAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
