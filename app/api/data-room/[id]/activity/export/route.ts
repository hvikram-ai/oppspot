/**
 * Activity Logs Export API Route
 * GET - Export activity logs as CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ActivityRepository,
  DataRoomRepository,
  withErrorHandler,
  unauthorizedError,
  forbiddenError,
} from '@/lib/data-room';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/data-room/[id]/activity/export
 * Export activity logs as CSV
 */
export const GET = withErrorHandler(
  async (req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw unauthorizedError();
    }

    // Check if user is owner (only owners can export)
    const { data: dataRoom } = await supabase
      .from('data_rooms')
      .select('user_id, name')
      .eq('id', id)
      .single();

    if (!dataRoom || dataRoom.user_id !== user.id) {
      throw forbiddenError('Only data room owners can export activity logs');
    }

    // Export logs as CSV
    const activityRepo = new ActivityRepository(supabase);
    const csv = await activityRepo.exportActivityLog(id);

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="activity-log-${dataRoom.name}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }
);
