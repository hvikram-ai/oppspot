/**
 * Alert Notifications API
 *
 * GET /api/competitive-analysis/[id]/notifications - List notifications
 * PATCH /api/competitive-analysis/[id]/notifications - Bulk mark as read
 *
 * Part of T014 Phase 5 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  handleError,
  UnauthorizedError,
} from '@/lib/competitive-analysis/errors';
import { validateUUID } from '@/lib/competitive-analysis/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params;
    const { searchParams } = new URL(request.url);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const id = validateUUID(analysisId, 'Analysis ID');

    // Query parameters
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unread') === 'true';

    let query = supabase
      .from('competitive_intelligence_alert_notifications')
      .select('*')
      .eq('analysis_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('competitive_intelligence_alert_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_id', id)
      .eq('user_id', user.id)
      .eq('is_read', false);

    return NextResponse.json(
      {
        notifications: notifications || [],
        unread_count: unreadCount || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const id = validateUUID(analysisId, 'Analysis ID');

    const body = await request.json();
    const { notification_ids, mark_as_read } = body;

    // Bulk update
    const updates: Record<string, unknown> = {
      is_read: mark_as_read !== undefined ? mark_as_read : true,
    };

    if (mark_as_read) {
      updates.read_at = new Date().toISOString();
    }

    let query = supabase
      .from('competitive_intelligence_alert_notifications')
      .update(updates)
      .eq('analysis_id', id)
      .eq('user_id', user.id);

    if (notification_ids && Array.isArray(notification_ids)) {
      query = query.in('id', notification_ids);
    }

    const { error } = await query;

    if (error) {
      console.error('Error updating notifications:', error);
      throw error;
    }

    return NextResponse.json(
      { message: 'Notifications updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
