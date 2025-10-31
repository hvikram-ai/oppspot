/**
 * GET /api/ma-predictions/{companyId}/history
 *
 * Retrieve historical M&A predictions for a company
 *
 * Query parameters:
 * - limit: Number of predictions to return (default 10, max 100)
 *
 * Returns:
 * - 200: Array of historical predictions
 * - 401: Unauthorized
 * - 500: Internal error
 *
 * Part of T025 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHistoricalPredictions } from '@/lib/ma-prediction/repository/prediction-repository';

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
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

    const companyId = params.companyId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(companyId)) {
      return NextResponse.json(
        { error: 'invalid_company_id', message: 'Invalid company ID format', code: 400 },
        { status: 400 }
      );
    }

    // Get query parameter
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    let limit = 10; // Default

    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);

      // Validate limit range (1-100)
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return NextResponse.json(
          { error: 'invalid_limit', message: 'Limit must be at least 1', code: 400 },
          { status: 400 }
        );
      }

      if (parsedLimit > 100) {
        return NextResponse.json(
          { error: 'invalid_limit', message: 'Limit cannot exceed 100', code: 400 },
          { status: 400 }
        );
      }

      limit = parsedLimit;
    }

    // Fetch historical predictions
    const predictions = await getHistoricalPredictions(companyId, limit);

    return NextResponse.json(
      {
        predictions,
        total_count: predictions.length
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching historical predictions:', error);

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Failed to retrieve historical predictions',
        code: 500
      },
      { status: 500 }
    );
  }
}
