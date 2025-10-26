/**
 * Access Grant Detail API Routes
 * PATCH - Revoke access
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  AccessRepository,
  ActivityRepository,
  withErrorHandler,
  unauthorizedError,
} from '@/lib/data-room';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/data-room/access/[id]
 * Revoke access grant
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

    // Get access grant to find data room ID for logging
    const { data: access } = await supabase
      .from('data_room_access')
      .select('data_room_id, invite_email')
      .eq('id', id)
      .single();

    // Revoke access
    const accessRepo = new AccessRepository(supabase);
    await accessRepo.revokeAccess(id);

    // Log activity
    if (access) {
      const activityRepo = new ActivityRepository(supabase);
      await activityRepo.logActivity({
        data_room_id: access.data_room_id,
        action: 'revoke',
        details: {
          revoked_email: access.invite_email,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Access revoked',
    });
  }
);
