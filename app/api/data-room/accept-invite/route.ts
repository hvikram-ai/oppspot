/**
 * Accept Invite API Route
 * POST - Accept invitation via token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  AccessRepository,
  ActivityRepository,
  withErrorHandler,
  unauthorizedError,
  validationError,
} from '@/lib/data-room';

/**
 * POST /api/data-room/accept-invite
 * Accept an invitation to a data room
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  // Get authenticated user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw unauthorizedError();
  }

  // Parse request body
  const body = await req.json();
  const { token } = body;

  if (!token) {
    throw validationError('Invite token is required');
  }

  // Accept invite
  const accessRepo = new AccessRepository(supabase);
  const access = await accessRepo.acceptInvite(token);

  // Log activity
  const activityRepo = new ActivityRepository(supabase);
  await activityRepo.logActivity({
    data_room_id: access.data_room_id,
    action: 'share',
    details: {
      accepted_by: user.email,
      permission_level: access.permission_level,
    },
  });

  return NextResponse.json({
    success: true,
    data_room_id: access.data_room_id,
    permission_level: access.permission_level,
    message: 'Invitation accepted successfully',
  });
});
