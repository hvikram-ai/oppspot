/**
 * POST /api/ma-predictions/export
 *
 * Export M&A predictions in PDF, Excel, or CSV format
 *
 * Request body:
 * - format: 'pdf' | 'excel' | 'csv' (required)
 * - company_ids: string[] (required, 1-1000 companies)
 * - filters: { likelihood_categories?, min_score?, max_score? } (optional)
 * - include_fields: { factors?, valuation?, acquirer_profiles?, historical_comparables? } (optional)
 *
 * Returns:
 * - 200: Export file (PDF/Excel/CSV)
 * - 202: Export queued for async processing (>100 companies)
 * - 400: Invalid request
 * - 401: Unauthorized
 * - 500: Internal error
 *
 * Part of T032 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPrediction } from '@/lib/ma-prediction/ma-prediction-service';
import { simpleJobQueue } from '@/lib/jobs/simple-job-queue';

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

    // Parse request body
    const body = await request.json();
    const { format, company_ids, filters, include_fields } = body;

    // Validate format
    if (!format || !['pdf', 'excel', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'invalid_format', message: 'Format must be one of: pdf, excel, csv', code: 400 },
        { status: 400 }
      );
    }

    // Validate company_ids
    if (!company_ids || !Array.isArray(company_ids) || company_ids.length === 0) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'company_ids array is required and cannot be empty', code: 400 },
        { status: 400 }
      );
    }

    if (company_ids.length > 1000) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Maximum 1000 companies per export request', code: 400 },
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

    // For CSV (simple format), generate synchronously
    if (format === 'csv') {
      const csv = await generateCSV(company_ids, include_fields);

      const filename = `ma-predictions-${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // For PDF/Excel with >100 companies, queue for async processing
    if (company_ids.length > 100) {
      const exportId = generateExportId();

      simpleJobQueue.enqueue(
        'ma-predictions-export',
        user.id,
        async () => ({
          status: 'pending_worker',
          companyCount: company_ids.length,
          format,
        }),
        exportId
      );

      return NextResponse.json(
        {
          export_id: exportId,
          status: 'queued',
          estimated_completion_seconds: Math.ceil(company_ids.length / 10),
          status_url: `/api/ma-predictions/export/${exportId}/status`
        },
        { status: 202 }
      );
    }

    // For small batches (<= 100), generate synchronously
    const predictionsData: Array<Record<string, unknown>> = [];

    for (const companyId of company_ids) {
      try {
        const prediction = await getPrediction(companyId);
        predictionsData.push(prediction);
      } catch (error) {
        console.error(`Failed to fetch prediction for ${companyId}:`, error);
        // Skip companies without predictions
      }
    }

    // Generate export based on format
    if (format === 'pdf') {
      const { generateMAPredictionsPDF } = await import('@/lib/ma-prediction/exporters/pdf-exporter');

      const pdfBuffer = await generateMAPredictionsPDF({
        predictions: predictionsData,
        includeFields: include_fields,
      });

      const filename = `ma-predictions-${new Date().toISOString().split('T')[0]}.pdf`;

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        }
      });
    } else {
      // Excel format
      const { generateMAPredictionsExcel } = await import('@/lib/ma-prediction/exporters/excel-exporter');

      const excelBuffer = await generateMAPredictionsExcel({
        predictions: predictionsData,
        includeFields: include_fields,
      });

      const filename = `ma-predictions-${new Date().toISOString().split('T')[0]}.xlsx`;

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': excelBuffer.length.toString(),
        }
      });
    }
  } catch (error) {
    console.error('Error exporting predictions:', error);

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Failed to export predictions',
        code: 500
      },
      { status: 500 }
    );
  }
}

/**
 * Generate CSV export
 */
async function generateCSV(
  companyIds: string[],
  includeFields?: Record<string, boolean>
): Promise<string> {
  const predictions = [];

  // Fetch predictions for all companies
  for (const companyId of companyIds) {
    try {
      const prediction = await getPrediction(companyId);
      predictions.push(prediction);
    } catch (error) {
      console.error(`Failed to fetch prediction for ${companyId}:`, error);
      // Skip companies without predictions
    }
  }

  // Build CSV header
  const headers = [
    'Company ID',
    'Company Name',
    'Prediction Score',
    'Likelihood Category',
    'Confidence Level',
    'Analysis Date'
  ];

  if (includeFields?.valuation !== false) {
    headers.push('Min Valuation (GBP)', 'Max Valuation (GBP)');
  }

  if (includeFields?.factors !== false) {
    headers.push('Top Factor', 'Factor Description');
  }

  // Build CSV rows
  const rows = predictions.map(pred => {
    const row = [
      pred.company_id,
      pred.company?.name || 'Unknown',
      pred.prediction_score,
      pred.likelihood_category,
      pred.confidence_level,
      new Date(pred.created_at).toISOString().split('T')[0]
    ];

    if (includeFields?.valuation !== false) {
      row.push(
        pred.valuation?.min_valuation_gbp?.toString() || '',
        pred.valuation?.max_valuation_gbp?.toString() || ''
      );
    }

    if (includeFields?.factors !== false) {
      const topFactor = pred.factors?.[0];
      row.push(
        topFactor?.factor_name || '',
        topFactor?.factor_description || ''
      );
    }

    return row;
  });

  // Generate CSV content
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ];

  return csvLines.join('\n');
}

/**
 * Generate unique export ID
 */
function generateExportId(): string {
  return `export_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
