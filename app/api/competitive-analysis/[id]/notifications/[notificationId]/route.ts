/**
 * Individual Notification API
 *
 * PATCH /api/competitive-analysis/[id]/notifications/[notificationId] - Acknowledge notification
 *
 * Part of T014 Phase 5 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  handleError,
  UnauthorizedError,
  NotFoundError,
} from '@/lib/competitive-analysis/errors';
import { validateUUID } from '@/lib/competitive-analysis/validation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; notificationId: string }> }
) {
  try {
    const { id: analysisId, notificationId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const id = validateUUID(analysisId, 'Analysis ID');
    const notifId = validateUUID(notificationId, 'Notification ID');

    const body = await request.json();
    const { is_acknowledged, is_read } = body;

    const updates: Record<string, unknown> = {};

    if (is_acknowledged !== undefined) {
      updates.is_acknowledged = is_acknowledged;
      if (is_acknowledged) {
        updates.acknowledged_at = new Date().toISOString();
        updates.acknowledged_by = user.id;
      }
    }

    if (is_read !== undefined) {
      updates.is_read = is_read;
      if (is_read) {
        updates.read_at = new Date().toISOString();
      }
    }

    const { data: notification, error } = await supabase
      .from('competitive_intelligence_alert_notifications')
      .update(updates)
      .eq('id', notifId)
      .eq('analysis_id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !notification) {
      throw new NotFoundError('Notification', notifId);
    }

    return NextResponse.json({ notification }, { status: 200 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
