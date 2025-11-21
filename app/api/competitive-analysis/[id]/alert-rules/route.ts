/**
 * Alert Rules API
 *
 * GET /api/competitive-analysis/[id]/alert-rules - List all alert rules
 * POST /api/competitive-analysis/[id]/alert-rules - Create new alert rule
 *
 * Part of T014 Phase 5 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  handleError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from '@/lib/competitive-analysis/errors';
import { validateUUID } from '@/lib/competitive-analysis/validation';

export async function GET(
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

    // Fetch alert rules
    const { data: rules, error } = await supabase
      .from('competitive_intelligence_alert_rules')
      .select('*')
      .eq('analysis_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alert rules:', error);
      throw error;
    }

    return NextResponse.json({ rules: rules || [] }, { status: 200 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export async function POST(
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

    // Parse request body
    const body = await request.json();
    const {
      rule_name,
      rule_type,
      threshold_config,
      severity = 'medium',
      is_enabled = true,
      notify_email = true,
      notify_in_app = true,
      notify_webhook = false,
      webhook_url,
    } = body;

    // Validate required fields
    if (!rule_name) {
      throw new ValidationError('rule_name is required');
    }

    if (!rule_type) {
      throw new ValidationError('rule_type is required');
    }

    const validRuleTypes = [
      'moat_threshold',
      'parity_threshold',
      'pricing_change',
      'competitor_added',
      'platform_threat',
      'velocity_drop',
    ];

    if (!validRuleTypes.includes(rule_type)) {
      throw new ValidationError(`Invalid rule_type. Must be one of: ${validRuleTypes.join(', ')}`);
    }

    if (!threshold_config || typeof threshold_config !== 'object') {
      throw new ValidationError('threshold_config must be an object');
    }

    // Create alert rule
    const { data: rule, error } = await supabase
      .from('competitive_intelligence_alert_rules')
      .insert({
        analysis_id: id,
        created_by: user.id,
        rule_name,
        rule_type,
        threshold_config,
        severity,
        is_enabled,
        notify_email,
        notify_in_app,
        notify_webhook,
        webhook_url,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert rule:', error);
      throw error;
    }

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
