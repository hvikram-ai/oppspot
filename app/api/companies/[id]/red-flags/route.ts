/**
 * Red Flags List API
 *
 * GET /api/companies/[id]/red-flags
 *
 * Returns paginated list of red flags with filtering, sorting, and summary stats.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRedFlagService } from '@/lib/red-flags/red-flag-service';
import { FlagFilters } from '@/lib/red-flags/types';
import { userHasCompanyAccess } from '@/lib/companies/access';

/**
 * GET handler - List red flags for a company
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

    // Check if user has access to this company
    const hasAccess = await userHasCompanyAccess(supabase, user.id, companyId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - no access to this company' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = parseFilters(searchParams);

    // Get flags from service
    const redFlagService = getRedFlagService();
    const result = await redFlagService.getFlags(
      companyId,
      'company',
      filters
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[RedFlagsAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Parse query parameters into FlagFilters
 */
function parseFilters(searchParams: URLSearchParams): FlagFilters {
  const filters: FlagFilters = {};

  // Status filter (can be multiple)
  const status = searchParams.getAll('status');
  if (status.length > 0) {
    filters.status = status as Array<'open' | 'reviewing' | 'mitigating' | 'resolved' | 'false_positive'>;
  }

  // Category filter (can be multiple)
  const category = searchParams.getAll('category');
  if (category.length > 0) {
    filters.category = category as Array<'financial' | 'legal' | 'operational' | 'cyber' | 'esg'>;
  }

  // Severity filter (can be multiple)
  const severity = searchParams.getAll('severity');
  if (severity.length > 0) {
    filters.severity = severity as Array<'critical' | 'high' | 'medium' | 'low'>;
  }

  // Search query
  const search = searchParams.get('search');
  if (search) {
    filters.search = search;
  }

  // Sort order
  const sort = searchParams.get('sort');
  if (sort && ['severity', 'updated', 'detected'].includes(sort)) {
    filters.sort = sort as 'severity' | 'updated' | 'detected';
  }

  // Pagination
  const page = searchParams.get('page');
  if (page) {
    filters.page = parseInt(page, 10);
  }

  const limit = searchParams.get('limit');
  if (limit) {
    filters.limit = parseInt(limit, 10);
  }

  return filters;
}

/**
 * Check if user has access to the company
 */
async function checkCompanyAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  companyId: string
): Promise<boolean> {
  return userHasCompanyAccess(supabase, userId, companyId);
}
