/**
 * Data Room API Routes
 * POST - Create data room
 * GET - List data rooms
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  DataRoomRepository,
  ActivityRepository,
  withErrorHandler,
  unauthorizedError,
  CreateDataRoomSchema,
  DataRoomFilterSchema,
} from '@/lib/data-room';

/**
 * POST /api/data-room
 * Create a new data room
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
  const validated = CreateDataRoomSchema.parse(body);

  // Create data room
  const repo = new DataRoomRepository(supabase);
  const dataRoom = await repo.createDataRoom(validated);

  // Log activity
  const activityRepo = new ActivityRepository(supabase);
  await activityRepo.logActivity({
    data_room_id: dataRoom.id,
    action: 'create_room',
    details: {
      name: dataRoom.name,
      deal_type: dataRoom.deal_type,
    },
  });

  return NextResponse.json(dataRoom, { status: 201 });
});

/**
 * GET /api/data-room
 * List data rooms with filters
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
  const filters = {
    status: searchParams.get('status') || undefined,
    deal_type: searchParams.get('deal_type') || undefined,
    search: searchParams.get('search') || undefined,
    sort_by: searchParams.get('sort_by') || 'updated_at',
    sort_order: searchParams.get('sort_order') || 'desc',
    limit: searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50,
    offset: searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0,
  };

  // Validate filters
  const validated = DataRoomFilterSchema.parse(filters);

  // Get data rooms
  const repo = new DataRoomRepository(supabase);
  const dataRooms = await repo.getDataRooms(validated);

  return NextResponse.json({
    data: dataRooms,
    pagination: {
      limit: validated.limit,
      offset: validated.offset,
      total: dataRooms.length,
    },
  });
});
