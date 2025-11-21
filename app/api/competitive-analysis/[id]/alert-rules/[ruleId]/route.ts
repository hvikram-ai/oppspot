/**
 * Individual Alert Rule API
 *
 * GET /api/competitive-analysis/[id]/alert-rules/[ruleId] - Get single rule
 * PATCH /api/competitive-analysis/[id]/alert-rules/[ruleId] - Update rule
 * DELETE /api/competitive-analysis/[id]/alert-rules/[ruleId] - Delete rule
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const { id: analysisId, ruleId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const id = validateUUID(analysisId, 'Analysis ID');
    const rId = validateUUID(ruleId, 'Rule ID');

    const { data: rule, error } = await supabase
      .from('competitive_intelligence_alert_rules')
      .select('*')
      .eq('id', rId)
      .eq('analysis_id', id)
      .single();

    if (error || !rule) {
      throw new NotFoundError('Alert rule', rId);
    }

    return NextResponse.json({ rule }, { status: 200 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const { id: analysisId, ruleId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const id = validateUUID(analysisId, 'Analysis ID');
    const rId = validateUUID(ruleId, 'Rule ID');

    const body = await request.json();

    // Update alert rule
    const { data: rule, error } = await supabase
      .from('competitive_intelligence_alert_rules')
      .update(body)
      .eq('id', rId)
      .eq('analysis_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating alert rule:', error);
      throw error;
    }

    return NextResponse.json({ rule }, { status: 200 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const { id: analysisId, ruleId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const id = validateUUID(analysisId, 'Analysis ID');
    const rId = validateUUID(ruleId, 'Rule ID');

    const { error } = await supabase
      .from('competitive_intelligence_alert_rules')
      .delete()
      .eq('id', rId)
      .eq('analysis_id', id);

    if (error) {
      console.error('Error deleting alert rule:', error);
      throw error;
    }

    return NextResponse.json({ message: 'Alert rule deleted successfully' }, { status: 200 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
