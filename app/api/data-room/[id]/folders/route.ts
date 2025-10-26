/**
 * Folders API Route
 * GET - Get folder structure for a data room
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  DocumentRepository,
  DataRoomRepository,
  withErrorHandler,
  unauthorizedError,
  forbiddenError,
} from '@/lib/data-room';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/data-room/[id]/folders
 * Get all unique folder paths in a data room
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

    // Get folders
    const docRepo = new DocumentRepository(supabase);
    const folders = await docRepo.getFolders(id);

    return NextResponse.json({ data: folders });
  }
);
