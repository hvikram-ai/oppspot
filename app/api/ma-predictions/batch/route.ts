/**
 * POST /api/ma-predictions/batch
 *
 * Trigger batch M&A prediction generation
 *
 * Request body (optional):
 * - company_ids: string[] (specific companies, or omit for all)
 * - force_recalculate: boolean (default false)
 * - batch_size: number (default 100, min 10, max 500)
 *
 * Returns:
 * - 202: Batch processing initiated
 * - 401: Unauthorized
 * - 403: Forbidden (requires admin)
 * - 500: Internal error
 *
 * Part of T028 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processBatch, processAllCompanies } from '@/lib/ma-prediction/batch/batch-processor';
import { requireAdminRole } from '@/lib/auth/role-check';

export async function POST(request: NextRequest) {
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

    const isAdmin = await requireAdminRole(supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Batch processing requires admin role', code: 403 },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { company_ids, force_recalculate, batch_size } = body;

    // Validate batch_size if provided
    let effectiveBatchSize = batch_size || 100;
    if (batch_size !== undefined) {
      if (typeof batch_size !== 'number' || batch_size < 10) {
        return NextResponse.json(
          { error: 'invalid_batch_size', message: 'Batch size must be at least 10', code: 400 },
          { status: 400 }
        );
      }

      if (batch_size > 500) {
        return NextResponse.json(
          { error: 'invalid_batch_size', message: 'Batch size cannot exceed 500', code: 400 },
          { status: 400 }
        );
      }

      effectiveBatchSize = batch_size;
    }

    // Validate company_ids if provided
    if (company_ids !== undefined) {
      if (!Array.isArray(company_ids)) {
        return NextResponse.json(
          { error: 'invalid_company_ids', message: 'company_ids must be an array', code: 400 },
          { status: 400 }
        );
      }

      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      for (const id of company_ids) {
        if (!uuidRegex.test(id)) {
          return NextResponse.json(
            { error: 'invalid_company_id', message: `Invalid UUID format: ${id}`, code: 400 },
            { status: 400 }
          );
        }
      }
    }

    // Start batch processing
    let result;
    if (company_ids && company_ids.length > 0) {
      // Process specific companies
      result = await processBatch(company_ids, effectiveBatchSize);
    } else {
      // Process all companies
      result = await processAllCompanies();
    }

    // Estimate completion time (assuming ~4 seconds per company on average)
    const estimatedSeconds = Math.ceil(result.total_companies * 4 / effectiveBatchSize);
    const estimatedCompletion = new Date();
    estimatedCompletion.setSeconds(estimatedCompletion.getSeconds() + estimatedSeconds);

    return NextResponse.json(
      {
        batch_id: result.batch_id,
        total_companies: result.total_companies,
        estimated_completion_time: estimatedCompletion.toISOString(),
        status_url: `/api/ma-predictions/batch/${result.batch_id}/status`
      },
      { status: 202 } // 202 Accepted
    );
  } catch (error) {
    console.error('Error triggering batch processing:', error);

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Failed to initiate batch processing',
        code: 500
      },
      { status: 500 }
    );
  }
}
