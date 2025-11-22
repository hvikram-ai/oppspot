/**
 * Red Flag Detail API
 *
 * GET /api/companies/[id]/red-flags/[flagId]
 *
 * Returns detailed flag information including evidence, actions, and explainer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRedFlagService } from '@/lib/red-flags/red-flag-service';
import { userHasCompanyAccess } from '@/lib/companies/access';

/**
 * GET handler - Get red flag detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; flagId: string }> }
) {
  try {
    const { id: companyId, flagId } = await params;
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

    // Get flag detail from service
    const redFlagService = getRedFlagService();
    const flagDetail = await redFlagService.getFlagDetail(flagId);

    // Verify flag belongs to this company
    if (flagDetail.entity_id !== companyId || flagDetail.entity_type !== 'company') {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(flagDetail, { status: 200 });
  } catch (error) {
    console.error('[RedFlagDetailAPI] Error:', error);

    // Check if it's a "not found" error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Flag not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Access handled via userHasCompanyAccess
