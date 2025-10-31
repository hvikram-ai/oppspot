/**
 * Red Flag Actions API
 *
 * POST /api/companies/[id]/red-flags/[flagId]/actions
 *
 * Records actions on red flags (assign, note, status_change, snooze, remediation, override).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRedFlagService } from '@/lib/red-flags/red-flag-service';
import { ActionPayload } from '@/lib/red-flags/types';

/**
 * Valid status transitions
 */
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['reviewing', 'mitigating', 'false_positive'],
  reviewing: ['open', 'mitigating', 'false_positive'],
  mitigating: ['reviewing', 'resolved', 'false_positive'],
  resolved: ['open'], // Can reopen
  false_positive: ['open'], // Can reopen if incorrectly marked
};

/**
 * POST handler - Record action on flag
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; flagId: string }> }
) {
  try {
    const { id: companyId, flagId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const actionPayload = body as ActionPayload;

    // Validate action type
    if (!actionPayload.type) {
      return NextResponse.json(
        { error: 'Missing action type' },
        { status: 400 }
      );
    }

    // Get current flag to validate
    const { data: flag, error: flagError } = await supabase
      .from('red_flags')
      .select('*')
      .eq('id', flagId)
      .single();

    if (flagError || !flag) {
      return NextResponse.json(
        { error: 'Flag not found' },
        { status: 404 }
      );
    }

    // Verify flag belongs to this company
    if (flag.entity_id !== companyId) {
      return NextResponse.json(
        { error: 'Flag does not belong to this company' },
        { status: 404 }
      );
    }

    // Validate action based on type
    const validationError = validateAction(actionPayload, flag);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Record action
    const redFlagService = getRedFlagService();
    await redFlagService.recordAction(flagId, actionPayload, user.id);

    // Get updated flag detail
    const updatedFlag = await redFlagService.getFlagDetail(flagId);

    return NextResponse.json(updatedFlag, { status: 201 });
  } catch (error) {
    console.error('[ActionsAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate action payload based on type
 */
function validateAction(action: ActionPayload, currentFlag: { status: string }): string | null {
  switch (action.type) {
    case 'assign':
      if (!action.assignee_id) {
        return 'Missing assignee_id for assign action';
      }
      break;

    case 'note':
      if (!action.text || action.text.trim().length === 0) {
        return 'Missing or empty text for note action';
      }
      if (action.text.length > 2000) {
        return 'Note text exceeds maximum length of 2000 characters';
      }
      break;

    case 'status_change':
      if (!action.from || !action.to) {
        return 'Missing from or to status for status_change action';
      }
      // Validate transition
      const validTransitions = VALID_STATUS_TRANSITIONS[action.from];
      if (!validTransitions || !validTransitions.includes(action.to)) {
        return `Invalid status transition from ${action.from} to ${action.to}`;
      }
      // Validate current status matches
      if (currentFlag.status !== action.from) {
        return `Current status (${currentFlag.status}) does not match from status (${action.from})`;
      }
      // Require reason for false_positive
      if (action.to === 'false_positive' && !action.reason) {
        return 'Reason is required when marking flag as false positive';
      }
      break;

    case 'snooze':
      if (!action.duration_days || action.duration_days <= 0) {
        return 'Invalid duration_days for snooze action';
      }
      if (!action.until) {
        return 'Missing until timestamp for snooze action';
      }
      if (!action.reason) {
        return 'Reason is required for snooze action';
      }
      break;

    case 'remediation':
      if (!action.plan || action.plan.trim().length === 0) {
        return 'Missing or empty plan for remediation action';
      }
      if (!action.eta) {
        return 'Missing eta for remediation action';
      }
      if (!action.stakeholders || action.stakeholders.length === 0) {
        return 'Missing stakeholders for remediation action';
      }
      break;

    case 'override':
      if (!action.field || !['severity', 'confidence'].includes(action.field)) {
        return 'Invalid field for override action (must be severity or confidence)';
      }
      if (action.from === undefined || action.to === undefined) {
        return 'Missing from or to value for override action';
      }
      if (!action.reason) {
        return 'Reason is required for override action';
      }
      break;

    default:
      return `Unknown action type: ${(action as { type: string }).type}`;
  }

  return null;
}
