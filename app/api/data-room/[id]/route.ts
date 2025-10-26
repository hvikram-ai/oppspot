/**
 * Data Room Detail API Routes
 * GET - Get single data room
 * PATCH - Update data room
 * DELETE - Delete data room (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  DataRoomRepository,
  ActivityRepository,
  withErrorHandler,
  unauthorizedError,
  notFoundError,
  UpdateDataRoomSchema,
} from '@/lib/data-room';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/data-room/[id]
 * Get a single data room with stats
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

    // Get data room with stats
    const repo = new DataRoomRepository(supabase);
    const dataRoom = await repo.getDataRoomWithStats(id);

    if (!dataRoom) {
      throw notFoundError('Data room', id);
    }

    // Log view activity
    const activityRepo = new ActivityRepository(supabase);
    await activityRepo.logActivity({
      data_room_id: id,
      action: 'view',
      details: {},
    });

    return NextResponse.json(dataRoom);
  }
);

/**
 * PATCH /api/data-room/[id]
 * Update a data room
 */
export const PATCH = withErrorHandler(
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

    // Parse and validate request body
    const body = await req.json();
    const validated = UpdateDataRoomSchema.parse(body);

    // Update data room
    const repo = new DataRoomRepository(supabase);
    const dataRoom = await repo.updateDataRoom(id, validated);

    // Log activity
    const activityRepo = new ActivityRepository(supabase);
    await activityRepo.logActivity({
      data_room_id: id,
      action: 'edit',
      details: {
        updated_fields: Object.keys(validated),
      },
    });

    return NextResponse.json(dataRoom);
  }
);

/**
 * DELETE /api/data-room/[id]
 * Soft delete a data room
 */
export const DELETE = withErrorHandler(
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

    // Delete data room (soft delete)
    const repo = new DataRoomRepository(supabase);
    await repo.deleteDataRoom(id);

    // Log activity
    const activityRepo = new ActivityRepository(supabase);
    await activityRepo.logActivity({
      data_room_id: id,
      action: 'delete_room',
      details: {},
    });

    return NextResponse.json({ success: true, message: 'Data room deleted' });
  }
);
