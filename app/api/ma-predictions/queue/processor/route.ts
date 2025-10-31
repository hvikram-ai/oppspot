/**
 * Queue Processor Control API
 *
 * Allows starting/stopping the queue processor
 * Used for development and manual control
 *
 * In production, the queue processor should run as:
 * - A separate Node.js process, OR
 * - A Vercel serverless cron job, OR
 * - Automatically on server startup
 *
 * Part of T037 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { startQueueProcessor, stopQueueProcessor, getProcessorStatus } from '@/lib/ma-prediction/batch/queue-processor';
import { createClient } from '@/lib/supabase/server';

// GET: Get processor status
export async function GET(request: NextRequest) {
  try {
    const status = getProcessorStatus();

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error('Error getting processor status:', error);

    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to get processor status', code: 500 },
      { status: 500 }
    );
  }
}

// POST: Start or stop processor
export async function POST(request: NextRequest) {
  try {
    // Authenticate (admin only)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required', code: 401 },
        { status: 401 }
      );
    }

    // Parse body
    const body = await request.json();
    const { action } = body; // 'start' or 'stop'

    if (action === 'start') {
      startQueueProcessor();
      return NextResponse.json({ message: 'Queue processor started', status: getProcessorStatus() }, { status: 200 });
    } else if (action === 'stop') {
      stopQueueProcessor();
      return NextResponse.json({ message: 'Queue processor stopped', status: getProcessorStatus() }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: 'invalid_action', message: 'Action must be "start" or "stop"', code: 400 },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error controlling processor:', error);

    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to control processor', code: 500 },
      { status: 500 }
    );
  }
}
