/**
 * GET /api/cron/ma-predictions
 *
 * Vercel Cron endpoint for nightly M&A prediction batch processing
 * Triggered automatically at 2 AM daily via vercel.json configuration
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * Returns:
 * - 200: Cron job executed successfully
 * - 401: Invalid or missing CRON_SECRET
 * - 500: Internal error
 *
 * Part of T030 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { processAllCompanies } from '@/lib/ma-prediction/batch/batch-processor';

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Missing authorization header', code: 401 },
        { status: 401 }
      );
    }

    // Extract Bearer token
    const token = authHeader.replace('Bearer ', '');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || token !== cronSecret) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Invalid CRON_SECRET', code: 401 },
        { status: 401 }
      );
    }

    // Execute batch processing
    const startTime = Date.now();
    const result = await processAllCompanies();
    const executionTime = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json(
      {
        success: true,
        batch_id: result.batch_id,
        processed_count: result.success_count,
        execution_time_seconds: executionTime
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cron job failed:', error);

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Cron job execution failed',
        code: 500
      },
      { status: 500 }
    );
  }
}
