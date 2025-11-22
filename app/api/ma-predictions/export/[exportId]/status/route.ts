/**
 * GET /api/ma-predictions/export/{exportId}/status
 *
 * Check status of async export job
 *
 * Returns:
 * - 200: Export status
 * - 404: Export not found
 * - 401: Unauthorized
 * - 500: Internal error
 *
 * Part of T033 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// In-memory export status store (in production, use Redis or database)
const exportStatusStore = new Map<string, any>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exportId: string }> }
) {
  try {
    const { exportId } = await params;
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required', code: 401 },
        { status: 401 }
      );
    }

    // Fetch export status
    const status = exportStatusStore.get(exportId);

    if (!status) {
      return NextResponse.json(
        { error: 'export_not_found', message: 'Export job not found', code: 404 },
        { status: 404 }
      );
    }

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error('Error fetching export status:', error);

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Failed to retrieve export status',
        code: 500
      },
      { status: 500 }
    );
  }
}
