/**
 * Alert Evaluator Service
 *
 * Evaluates competitive intelligence changes against configured alert rules
 * Creates notifications when thresholds are met
 *
 * Part of T014 Phase 5 implementation
 */

import { createClient } from '@/lib/supabase/server';
import type { ChangeDetectionResult } from './change-detector';
import type { DashboardData } from './types';

type AlertRule = {
  id: string;
  rule_type: string;
  threshold_config: Record<string, unknown>;
  severity: string;
  is_enabled: boolean;
  notify_webhook: boolean;
  webhook_url?: string;
};

/**
 * Evaluate changes against alert rules and create notifications
 */
export async function evaluateAlertsAndNotify(params: {
  analysisId: string;
  userId: string;
  changes: ChangeDetectionResult;
  dashboardData: DashboardData;
}): Promise<void> {
  const { analysisId, userId, changes, dashboardData } = params;

  // Get active alert rules for this analysis
  const supabase = await createClient();
  const { data: rules, error: rulesError } = await supabase
    .from('competitive_intelligence_alert_rules')
    .select('*')
    .eq('analysis_id', analysisId)
    .eq('is_enabled', true);

  if (rulesError) {
    console.error('[Alert Evaluator] Error fetching rules:', rulesError);
    return;
  }

  if (!rules || rules.length === 0) {
    console.log('[Alert Evaluator] No active alert rules found');
    return;
  }

  console.log(`[Alert Evaluator] Evaluating ${rules.length} alert rules`);

  // Evaluate each rule
  for (const rule of rules as AlertRule[]) {
    try {
      const shouldTrigger = evaluateRule(rule, changes, dashboardData);

      if (shouldTrigger) {
        await createNotification({
          analysisId,
          userId,
          rule,
          changes,
          dashboardData,
        });
      }
    } catch (error) {
      console.error(`[Alert Evaluator] Error evaluating rule ${rule.id}:`, error);
    }
  }
}

/**
 * Evaluate a single alert rule
 */
function evaluateRule(
  rule: AlertRule,
  changes: ChangeDetectionResult,
  dashboardData: DashboardData
): boolean {
  const { rule_type, threshold_config } = rule;

  switch (rule_type) {
    case 'moat_threshold':
      return evaluateMoatThreshold(threshold_config, changes, dashboardData);

    case 'parity_threshold':
      return evaluateParityThreshold(threshold_config, changes, dashboardData);

    case 'pricing_change':
      return changes.pricing_changed;

    case 'competitor_added':
      return changes.competitors_changed && (changes.competitor_change_details?.added ?? 0) > 0;

    case 'platform_threat':
      return changes.platform_threat_changed;

    case 'velocity_drop':
      return evaluateVelocityDrop(threshold_config, dashboardData);

    default:
      console.warn(`[Alert Evaluator] Unknown rule type: ${rule_type}`);
      return false;
  }
}

/**
 * Evaluate moat threshold rule
 */
function evaluateMoatThreshold(
  config: Record<string, unknown>,
  changes: ChangeDetectionResult,
  dashboardData: DashboardData
): boolean {
  if (!changes.moat_changed || !dashboardData.moat_score) return false;

  const minScore = config.min_score as number;
  const comparison = config.comparison as string;
  const currentScore = dashboardData.moat_score.overall_moat_score;

  if (comparison === 'below') {
    return currentScore < minScore;
  }

  return false;
}

/**
 * Evaluate parity threshold rule
 */
function evaluateParityThreshold(
  config: Record<string, unknown>,
  changes: ChangeDetectionResult,
  dashboardData: DashboardData
): boolean {
  if (!changes.parity_changed) return false;

  const maxScore = config.max_score as number;
  const comparison = config.comparison as string;
  const avgParity = changes.parity_change_details?.new_avg ?? 0;

  if (comparison === 'above') {
    return avgParity > maxScore;
  }

  return false;
}

/**
 * Evaluate velocity drop rule
 */
function evaluateVelocityDrop(
  config: Record<string, unknown>,
  dashboardData: DashboardData
): boolean {
  // This would require historical feature counts
  // For now, return false (implement later with trends data)
  return false;
}

/**
 * Create notification for triggered alert
 */
async function createNotification(params: {
  analysisId: string;
  userId: string;
  rule: AlertRule;
  changes: ChangeDetectionResult;
  dashboardData: DashboardData;
}): Promise<void> {
  const { analysisId, userId, rule, changes, dashboardData } = params;

  const { title, message, alertData } = generateNotificationContent(
    rule,
    changes,
    dashboardData
  );

  const supabase = await createClient();

  // Create notification
  const { error } = await supabase
    .from('competitive_intelligence_alert_notifications')
    .insert({
      analysis_id: analysisId,
      alert_rule_id: rule.id,
      user_id: userId,
      alert_type: rule.rule_type,
      severity: rule.severity,
      title,
      message,
      alert_data: alertData,
      is_read: false,
      is_acknowledged: false,
    });

  if (error) {
    console.error('[Alert Evaluator] Error creating notification:', error);
    throw error;
  }

  console.log(`[Alert Evaluator] Created notification: ${title}`);

  // Trigger webhook if configured
  if (rule.notify_webhook && rule.webhook_url) {
    try {
      await triggerWebhook(rule.webhook_url, {
        title,
        message,
        severity: rule.severity,
        alert_data: alertData,
        analysis_id: analysisId,
      });
    } catch (webhookError) {
      console.error('[Alert Evaluator] Webhook failed:', webhookError);
      // Don't throw - notification was created successfully
    }
  }
}

/**
 * Generate notification content based on rule type
 */
function generateNotificationContent(
  rule: AlertRule,
  changes: ChangeDetectionResult,
  dashboardData: DashboardData
): { title: string; message: string; alertData: Record<string, unknown> } {
  switch (rule.rule_type) {
    case 'moat_threshold':
      return {
        title: 'Moat Strength Below Threshold',
        message: `ITONICS moat score dropped to ${dashboardData.moat_score?.overall_moat_score.toFixed(1)} (threshold: ${rule.threshold_config.min_score})`,
        alertData: {
          current_score: dashboardData.moat_score?.overall_moat_score,
          threshold: rule.threshold_config.min_score,
          change: changes.moat_change_details?.change,
        },
      };

    case 'parity_threshold':
      return {
        title: 'Feature Parity Exceeds Threshold',
        message: `Average feature parity reached ${changes.parity_change_details?.new_avg.toFixed(1)}% (threshold: ${rule.threshold_config.max_score}%)`,
        alertData: {
          current_parity: changes.parity_change_details?.new_avg,
          threshold: rule.threshold_config.max_score,
          change: changes.parity_change_details?.change,
        },
      };

    case 'pricing_change':
      return {
        title: 'Pricing Changes Detected',
        message: `Pricing updated for ${changes.pricing_change_details?.changes_count} competitor(s): ${changes.pricing_change_details?.competitors_affected.join(', ')}`,
        alertData: {
          changes_count: changes.pricing_change_details?.changes_count,
          competitors: changes.pricing_change_details?.competitors_affected,
        },
      };

    case 'competitor_added':
      return {
        title: 'New Competitor Added',
        message: `${changes.competitor_change_details?.added} new competitor(s) added: ${changes.competitor_change_details?.new_competitors.join(', ')}`,
        alertData: {
          added_count: changes.competitor_change_details?.added,
          new_competitors: changes.competitor_change_details?.new_competitors,
        },
      };

    case 'platform_threat':
      return {
        title: 'Platform Threat Level Changed',
        message: `Platform threat level changed from ${changes.platform_threat_details?.old_level.toUpperCase()} to ${changes.platform_threat_details?.new_level.toUpperCase()}`,
        alertData: {
          old_level: changes.platform_threat_details?.old_level,
          new_level: changes.platform_threat_details?.new_level,
        },
      };

    default:
      return {
        title: 'Competitive Intelligence Alert',
        message: 'Significant competitive changes detected',
        alertData: {},
      };
  }
}

/**
 * Trigger webhook notification
 */
async function triggerWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
      source: 'oppSpot Competitive Intelligence',
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}: ${await response.text()}`);
  }

  console.log(`[Alert Evaluator] Webhook triggered successfully: ${webhookUrl}`);
}
