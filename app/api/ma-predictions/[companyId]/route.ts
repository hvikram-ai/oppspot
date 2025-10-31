/**
 * GET /api/ma-predictions/{companyId}
 *
 * Retrieve M&A target prediction for a specific company
 *
 * Query parameters:
 * - include: factors|valuation|acquirers|all (optional)
 *
 * Returns:
 * - 200: Prediction with optional related data
 * - 404: No prediction found or insufficient data
 * - 401: Unauthorized
 * - 500: Internal error
 *
 * Part of T024 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPrediction } from '@/lib/ma-prediction/ma-prediction-service';
import { logAuditTrail } from '@/lib/ma-prediction/repository/prediction-repository';

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
    const include = searchParams.get('include'); // factors|valuation|acquirers|all

    // Fetch prediction
    let prediction;
    try {
      prediction = await getPrediction(companyId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if it's insufficient data error
      if (errorMessage.includes('Insufficient data') || errorMessage.includes('not found')) {
        return NextResponse.json(
          {
            error: 'prediction_not_found',
            message: errorMessage.includes('Insufficient data')
              ? `No M&A prediction available for this company. ${errorMessage}`
              : 'No M&A prediction available for this company.',
            code: 404
          },
          { status: 404 }
        );
      }

      throw error; // Re-throw other errors
    }

    // Log access to audit trail
    await logAuditTrail(prediction.id, 'prediction_accessed', {
      user_id: user.id,
      company_id: companyId,
      include_param: include
    });

    // Build response based on include parameter
    const response: any = {
      prediction: {
        id: prediction.id,
        company_id: prediction.company_id,
        prediction_score: prediction.prediction_score,
        likelihood_category: prediction.likelihood_category,
        confidence_level: prediction.confidence_level,
        analysis_version: prediction.analysis_version,
        algorithm_type: prediction.algorithm_type,
        created_at: prediction.created_at,
        updated_at: prediction.updated_at,
        data_last_refreshed: prediction.data_last_refreshed,
        calculation_time_ms: prediction.calculation_time_ms
      }
    };

    // Include factors if requested
    if (include === 'factors' || include === 'all') {
      response.factors = prediction.factors || [];
    }

    // Include valuation if requested
    if (include === 'valuation' || include === 'all') {
      response.valuation = prediction.valuation || null;
    }

    // Include acquirer profiles if requested
    if (include === 'acquirers' || include === 'all') {
      response.acquirer_profiles = prediction.acquirer_profiles || [];
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching M&A prediction:', error);

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Failed to retrieve M&A prediction',
        code: 500
      },
      { status: 500 }
    );
  }
}
