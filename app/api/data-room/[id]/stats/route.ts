/**
 * Data Room Stats API Route
 * GET - Get statistics for a data room
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  DocumentRepository,
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
 * GET /api/data-room/[id]/stats
 * Get comprehensive statistics for a data room
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

    // Get document counts by type
    const docRepo = new DocumentRepository(supabase);
    const documentCountsByType = await docRepo.getDocumentCountsByType(id);

    // Get activity counts by action
    const activityRepo = new ActivityRepository(supabase);
    const activityCountsByAction =
      await activityRepo.getActivityCountsByAction(id);

    // Get data room info
    const dataRoom = await dataRoomRepo.getDataRoom(id);

    return NextResponse.json({
      storage_used_bytes: dataRoom?.storage_used_bytes || 0,
      document_count: dataRoom?.document_count || 0,
      documents_by_type: documentCountsByType,
      activities_by_action: activityCountsByAction,
    });
  }
);
