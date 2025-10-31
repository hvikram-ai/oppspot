/**
 * GET /api/ma-predictions/batch/{batchId}/status
 *
 * Get status of a batch processing job
 *
 * Returns:
 * - 200: Batch status with progress
 * - 404: Batch not found
 * - 401: Unauthorized
 * - 500: Internal error
 *
 * Part of T029 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBatchStatus } from '@/lib/ma-prediction/batch/batch-processor';

export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
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

    const batchId = params.batchId;

    // Fetch batch status
    const status = await getBatchStatus(batchId);

    if (!status) {
      return NextResponse.json(
        { error: 'batch_not_found', message: 'Batch job not found', code: 404 },
        { status: 404 }
      );
    }

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error('Error fetching batch status:', error);

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Failed to retrieve batch status',
        code: 500
      },
      { status: 500 }
    );
  }
}
