/**
 * GET /api/ma-predictions/export/watchlist
 *
 * Export M&A predictions for user's saved companies
 * Automatically filters for High/Very High likelihood targets
 *
 * Query parameters:
 * - format: 'pdf' | 'excel' | 'csv' (required)
 * - list_id: UUID (optional, specific business list)
 *
 * Returns:
 * - 200: Export file
 * - 404: No saved companies or no high-likelihood targets
 * - 400: Invalid format
 * - 401: Unauthorized
 * - 500: Internal error
 *
 * Part of T034 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPrediction } from '@/lib/ma-prediction/ma-prediction-service';

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const listId = searchParams.get('list_id');

    // Validate format
    if (!format || !['pdf', 'excel', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'invalid_format', message: 'Format must be one of: pdf, excel, csv', code: 400 },
        { status: 400 }
      );
    }

    // Fetch user's saved companies
    let savedQuery = supabase
      .from('saved_businesses')
      .select('business_id')
      .eq('user_id', user.id);

    if (listId) {
      savedQuery = savedQuery.eq('list_id', listId);
    }

    const { data: savedCompanies, error: savedError } = await savedQuery;

    if (savedError || !savedCompanies || savedCompanies.length === 0) {
      return NextResponse.json(
        { error: 'no_saved_companies', message: 'No saved companies found in watchlist', code: 404 },
        { status: 404 }
      );
    }

    const companyIds = savedCompanies.map(sc => sc.business_id);

    // Fetch predictions and filter for High/Very High
    const highLikelihoodCompanies = [];

    for (const companyId of companyIds) {
      try {
        const prediction = await getPrediction(companyId);

        // Filter for High/Very High likelihood
        if (prediction.likelihood_category === 'High' || prediction.likelihood_category === 'Very High') {
          highLikelihoodCompanies.push(prediction);
        }
      } catch (error) {
        // Skip companies without predictions
        console.error(`No prediction for ${companyId}:`, error);
      }
    }

    if (highLikelihoodCompanies.length === 0) {
      return NextResponse.json(
        {
          error: 'no_high_likelihood_targets',
          message: 'No high-likelihood M&A targets found in your watchlist',
          code: 404
        },
        { status: 404 }
      );
    }

    // Generate CSV export
    if (format === 'csv') {
      const csv = generateWatchlistCSV(highLikelihoodCompanies);

      const filename = `watchlist-ma-targets-${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // PDF/Excel not implemented yet
    return NextResponse.json(
      {
        error: 'not_implemented',
        message: 'PDF and Excel export are not yet implemented. Please use CSV format.',
        code: 501
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error exporting watchlist:', error);

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Failed to export watchlist',
        code: 500
      },
      { status: 500 }
    );
  }
}

/**
 * Generate CSV for watchlist export
 */
function generateWatchlistCSV(predictions: any[]): string {
  const headers = [
    'Company Name',
    'Company ID',
    'Prediction Score',
    'Likelihood',
    'Confidence',
    'Min Valuation (GBP)',
    'Max Valuation (GBP)',
    'Top Factor',
    'Analysis Date'
  ];

  const rows = predictions.map(pred => [
    pred.company?.name || 'Unknown',
    pred.company_id,
    pred.prediction_score,
    pred.likelihood_category,
    pred.confidence_level,
    pred.valuation?.min_valuation_gbp || '',
    pred.valuation?.max_valuation_gbp || '',
    pred.factors?.[0]?.factor_name || '',
    new Date(pred.created_at).toISOString().split('T')[0]
  ]);

  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ];

  return csvLines.join('\n');
}
