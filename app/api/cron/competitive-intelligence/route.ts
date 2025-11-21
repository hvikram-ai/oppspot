/**
 * GET /api/cron/competitive-intelligence
 *
 * Vercel Cron endpoint for weekly ITONICS competitive intelligence refresh
 * Triggered automatically every Monday at 2 AM via vercel.json configuration
 *
 * Features:
 * - Finds ITONICS analysis
 * - Creates snapshot before refresh
 * - Triggers competitive data refresh
 * - Detects significant changes
 * - Sends email notifications for critical changes
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * Returns:
 * - 200: Cron job executed successfully
 * - 401: Invalid or missing CRON_SECRET
 * - 404: ITONICS analysis not found
 * - 500: Internal error
 *
 * Part of T014 Phase 3 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { competitiveAnalysisRepository } from '@/lib/competitive-analysis/repository';
import { detectSignificantChanges } from '@/lib/competitive-analysis/change-detector';
import { sendCompetitiveIntelligenceAlert } from '@/lib/competitive-analysis/notifications';
import { evaluateAlertsAndNotify } from '@/lib/competitive-analysis/alert-evaluator';

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Missing authorization header', code: 401 },
        { status: 401 }
      );
    }

    // Extract Bearer token
    const token = authHeader.replace('Bearer ', '');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || token !== cronSecret) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Invalid CRON_SECRET', code: 401 },
        { status: 401 }
      );
    }

    const startTime = Date.now();

    console.log('[Cron] Starting competitive intelligence refresh');

    // Find ITONICS analysis
    const supabase = await createClient();
    const { data: analyses, error: findError } = await supabase
      .from('competitive_analyses')
      .select('id, title, target_company_name, created_by')
      .or('target_company_name.eq.ITONICS,title.ilike.%ITONICS%')
      .limit(1)
      .single();

    if (findError || !analyses) {
      console.error('[Cron] ITONICS analysis not found:', findError);
      return NextResponse.json(
        { error: 'not_found', message: 'ITONICS analysis not found', code: 404 },
        { status: 404 }
      );
    }

    const analysisId = analyses.id;
    const createdBy = analyses.created_by;

    console.log('[Cron] Found ITONICS analysis:', analysisId);

    // Get current dashboard data (before refresh)
    const dataBefore = await competitiveAnalysisRepository.getDashboardData(analysisId);

    console.log('[Cron] Captured snapshot before refresh');

    // Create snapshot
    try {
      await competitiveAnalysisRepository.createSnapshot({
        analysis_id: analysisId,
        snapshot_data: dataBefore,
        snapshot_notes: 'Auto-snapshot before weekly cron refresh',
      });
    } catch (snapshotError) {
      console.error('[Cron] Failed to create snapshot:', snapshotError);
      // Continue even if snapshot fails
    }

    // Trigger refresh by calling the refresh endpoint internally
    const refreshUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://oppspot-one.vercel.app'}/api/competitive-analysis/${analysisId}/refresh`;

    console.log('[Cron] Triggering refresh at:', refreshUrl);

    // Note: Since refresh is async and returns 202, we need to wait for completion
    // For now, we'll trigger it and check status after a delay
    const refreshResponse = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward any auth headers if needed
      },
    });

    if (!refreshResponse.ok) {
      console.error('[Cron] Refresh failed:', await refreshResponse.text());
      throw new Error('Refresh request failed');
    }

    const refreshData = await refreshResponse.json();
    const estimatedSeconds = refreshData.estimated_completion_seconds || 120;

    console.log('[Cron] Refresh started, estimated completion:', estimatedSeconds, 'seconds');

    // Wait for refresh to complete (add buffer time)
    const waitTime = Math.min(estimatedSeconds * 1000 + 30000, 240000); // Max 4 minutes
    await new Promise(resolve => setTimeout(resolve, waitTime));

    console.log('[Cron] Waited for refresh completion');

    // Get updated dashboard data (after refresh)
    const dataAfter = await competitiveAnalysisRepository.getDashboardData(analysisId);

    console.log('[Cron] Captured data after refresh');

    // Detect significant changes
    const changes = detectSignificantChanges(dataBefore, dataAfter);

    console.log('[Cron] Detected changes:', {
      moat_changed: changes.moat_changed,
      pricing_changed: changes.pricing_changed,
      competitors_changed: changes.competitors_changed,
      has_significant_changes: changes.has_significant_changes
    });

    // Send notifications if there are significant changes
    if (changes.has_significant_changes) {
      try {
        await sendCompetitiveIntelligenceAlert({
          analysisId,
          userId: createdBy,
          changes,
          dashboardData: dataAfter,
        });

        console.log('[Cron] Notification sent successfully');
      } catch (notificationError) {
        console.error('[Cron] Failed to send notification:', notificationError);
        // Continue even if notification fails
      }

      // Evaluate alert rules and create in-app notifications
      try {
        await evaluateAlertsAndNotify({
          analysisId,
          userId: createdBy,
          changes,
          dashboardData: dataAfter,
        });

        console.log('[Cron] Alert evaluation completed');
      } catch (alertError) {
        console.error('[Cron] Failed to evaluate alerts:', alertError);
        // Continue even if alert evaluation fails
      }
    } else {
      console.log('[Cron] No significant changes detected, skipping notifications');
    }

    const executionTime = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json(
      {
        success: true,
        analysis_id: analysisId,
        changes_detected: changes.has_significant_changes,
        change_summary: changes.summary,
        notification_sent: changes.has_significant_changes,
        execution_time_seconds: executionTime,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Cron] Job failed:', error);

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Cron job execution failed',
        code: 500,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
