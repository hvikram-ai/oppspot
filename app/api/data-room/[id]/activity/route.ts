/**
 * Activity Logs API Route
 * GET - Get activity logs for a data room
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ActivityRepository,
  DataRoomRepository,
  withErrorHandler,
  unauthorizedError,
  forbiddenError,
  ActivityLogFilterSchema,
} from '@/lib/data-room';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/data-room/[id]/activity
 * Get activity logs for a data room
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

    // Check access to data room
    const dataRoomRepo = new DataRoomRepository(supabase);
    const hasAccess = await dataRoomRepo.hasAccess(id, user.id);

    if (!hasAccess) {
      throw forbiddenError('You do not have access to this data room');
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const filters = {
      data_room_id: id,
      document_id: searchParams.get('document_id') || undefined,
      actor_id: searchParams.get('actor_id') || undefined,
      action: searchParams.get('action') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 100,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0,
    };

    // Validate filters
    const validated = ActivityLogFilterSchema.parse(filters);

    // Get activity logs
    const activityRepo = new ActivityRepository(supabase);
    const logs = await activityRepo.getActivityLogs(validated);

    return NextResponse.json({
      data: logs,
      pagination: {
        limit: validated.limit,
        offset: validated.offset,
        total: logs.length,
      },
    });
  }
);
