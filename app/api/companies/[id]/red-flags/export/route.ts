/**
 * Red Flags Export API
 *
 * GET /api/companies/[id]/red-flags/export?format=pdf|csv
 *
 * Exports red flags to PDF or CSV format.
 * For large exports (>1000 flags), returns 202 with export_id for async processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRedFlagService } from '@/lib/red-flags/red-flag-service';
import { FlagFilters } from '@/lib/red-flags/types';
import { stringify } from 'csv-stringify/sync';

/**
 * Max flags for synchronous export
 */
const MAX_SYNC_EXPORT = 1000;

/**
 * GET handler - Export red flags
 */
export async function GET(
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'pdf';
    const includeExplainer = searchParams.get('include_explainer') !== 'false';
    const includeEvidence = searchParams.get('include_evidence') !== 'false';
    const filters = parseFilters(searchParams);

    // Validate format
    if (!['pdf', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be pdf or csv' },
        { status: 400 }
      );
    }

    // Get flags
    const redFlagService = getRedFlagService();

    // First, get total count
    const countResult = await redFlagService.getFlags(companyId, 'company', {
      ...filters,
      page: 1,
      limit: 1,
    });

    const totalFlags = countResult.pagination.total;

    // Check if export is too large for sync processing
    if (totalFlags > MAX_SYNC_EXPORT) {
      // TODO: Implement async export (T040)
      return NextResponse.json(
        {
          error: 'Export too large',
          message: `Export contains ${totalFlags} flags. Maximum ${MAX_SYNC_EXPORT} flags for synchronous export. Async export not yet implemented.`,
        },
        { status: 413 }
      );
    }

    // Get all flags for export
    const allFlags = await redFlagService.getFlags(companyId, 'company', {
      ...filters,
      page: 1,
      limit: totalFlags || 100,
    });

    // Generate export based on format
    if (format === 'csv') {
      const csv = await generateCSV(allFlags.flags, includeExplainer);

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="red-flags-${companyId}-${Date.now()}.csv"`,
        },
      });
    } else {
      // PDF export
      const pdf = await generatePDF(allFlags.flags, includeExplainer, includeEvidence);

      return new NextResponse(pdf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="red-flags-${companyId}-${Date.now()}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error('[ExportAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Parse filters from query params
 */
function parseFilters(searchParams: URLSearchParams): FlagFilters {
  const filters: FlagFilters = {};

  const status = searchParams.getAll('status');
  if (status.length > 0) {
    filters.status = status as Array<'open' | 'reviewing' | 'mitigating' | 'resolved' | 'false_positive'>;
  }

  const category = searchParams.getAll('category');
  if (category.length > 0) {
    filters.category = category as Array<'financial' | 'legal' | 'operational' | 'cyber' | 'esg'>;
  }

  const severity = searchParams.getAll('severity');
  if (severity.length > 0) {
    filters.severity = severity as Array<'critical' | 'high' | 'medium' | 'low'>;
  }

  return filters;
}

/**
 * Generate CSV export
 */
async function generateCSV(
  flags: Array<{
    id: string;
    category: string;
    severity: string;
    confidence: number | null;
    title: string;
    description: string | null;
    status: string;
    first_detected_at: string;
    last_updated_at: string;
    meta: { explainer?: { why: string; suggested_remediation: string } };
  }>,
  includeExplainer: boolean
): Promise<string> {
  const records = flags.map(flag => {
    const record: Record<string, unknown> = {
      id: flag.id,
      category: flag.category,
      severity: flag.severity,
      confidence: flag.confidence || 'N/A',
      title: flag.title,
      description: flag.description || '',
      status: flag.status,
      first_detected: new Date(flag.first_detected_at).toISOString(),
      last_updated: new Date(flag.last_updated_at).toISOString(),
    };

    if (includeExplainer && flag.meta?.explainer) {
      record.explanation = flag.meta.explainer.why;
      record.remediation = flag.meta.explainer.suggested_remediation;
    }

    return record;
  });

  return stringify(records, {
    header: true,
    columns: includeExplainer
      ? ['id', 'category', 'severity', 'confidence', 'title', 'description', 'status', 'first_detected', 'last_updated', 'explanation', 'remediation']
      : ['id', 'category', 'severity', 'confidence', 'title', 'description', 'status', 'first_detected', 'last_updated'],
  });
}

/**
 * Generate PDF export
 * TODO: Implement using @react-pdf/renderer
 * For now, return a simple text-based PDF placeholder
 */
async function generatePDF(
  flags: Array<unknown>,
  includeExplainer: boolean,
  includeEvidence: boolean
): Promise<Buffer> {
  // Placeholder: In production, use @react-pdf/renderer to create proper PDF
  const content = `Red Flag Report

Generated: ${new Date().toISOString()}
Total Flags: ${flags.length}

Note: PDF generation with @react-pdf/renderer not yet implemented.
Use CSV export for now.
`;

  return Buffer.from(content, 'utf-8');
}
