/**
 * Access Management API Routes
 * POST - Grant access to user
 * GET - List access grants
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  AccessRepository,
  ActivityRepository,
  DataRoomRepository,
  withErrorHandler,
  unauthorizedError,
  forbiddenError,
  validationError,
  CreateAccessSchema,
} from '@/lib/data-room';

/**
 * POST /api/data-room/access
 * Grant access to a user (invite)
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

  // Parse and validate request body
  const body = await req.json();
  const validated = CreateAccessSchema.parse(body);

  // Check if current user is owner
  const dataRoomRepo = new DataRoomRepository(supabase);
  const dataRoom = await dataRoomRepo.getDataRoom(validated.data_room_id);

  if (!dataRoom) {
    throw validationError('Data room not found');
  }

  if (dataRoom.user_id !== user.id) {
    throw forbiddenError('Only data room owners can grant access');
  }

  // Grant access
  const accessRepo = new AccessRepository(supabase);
  const accessGrant = await accessRepo.grantAccess(validated);

  // Log activity
  const activityRepo = new ActivityRepository(supabase);
  await activityRepo.logActivity({
    data_room_id: validated.data_room_id,
    action: 'share',
    details: {
      invite_email: validated.invite_email,
      permission_level: validated.permission_level,
      expires_in_days: validated.expires_in_days,
    },
  });

  return NextResponse.json(accessGrant, { status: 201 });
});

/**
 * GET /api/data-room/access
 * List all access grants for a data room
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  // Get authenticated user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw unauthorizedError();
  }

  // Parse query parameters
  const { searchParams } = new URL(req.url);
  const dataRoomId = searchParams.get('data_room_id');

  if (!dataRoomId) {
    throw validationError('data_room_id query parameter is required');
  }

  // Check if user is owner
  const dataRoomRepo = new DataRoomRepository(supabase);
  const dataRoom = await dataRoomRepo.getDataRoom(dataRoomId);

  if (!dataRoom) {
    throw validationError('Data room not found');
  }

  if (dataRoom.user_id !== user.id) {
    throw forbiddenError('Only data room owners can view access grants');
  }

  // Get access grants
  const accessRepo = new AccessRepository(supabase);
  const grants = await accessRepo.getAccessGrants(dataRoomId);

  return NextResponse.json({ data: grants });
});
