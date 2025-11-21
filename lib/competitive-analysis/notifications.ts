/**
 * Competitive Intelligence Notifications
 *
 * Sends email alerts for significant competitive analysis changes
 * Uses Resend for email delivery
 *
 * Part of T014 Phase 3 implementation
 */

import { resend, DEFAULT_FROM_EMAIL } from '@/lib/email/resend';
import { createClient } from '@/lib/supabase/server';
import type { DashboardData } from './types';
import type { ChangeDetectionResult } from './change-detector';

/**
 * Send competitive intelligence alert email
 */
export async function sendCompetitiveIntelligenceAlert(params: {
  analysisId: string;
  userId: string;
  changes: ChangeDetectionResult;
  dashboardData: DashboardData;
}): Promise<void> {
  const { analysisId, userId, changes, dashboardData } = params;

  // Get user email
  const supabase = await createClient();
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (userError || !user?.email) {
    console.error('[Notifications] Failed to get user email:', userError);
    throw new Error('User email not found');
  }

  // Check if Resend is configured
  if (!resend) {
    console.warn('[Notifications] Resend not configured, skipping email');
    return;
  }

  // Generate email content
  const emailHtml = generateAlertEmail({
    userName: user.full_name || 'there',
    changes,
    dashboardData,
    analysisId,
  });

  const emailSubject = generateSubject(changes);

  // Send email
  try {
    await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: user.email,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log('[Notifications] Alert email sent to:', user.email);
  } catch (error) {
    console.error('[Notifications] Failed to send email:', error);
    throw error;
  }
}

/**
 * Generate email subject based on changes
 */
function generateSubject(changes: ChangeDetectionResult): string {
  if (changes.platform_threat_changed && changes.platform_threat_details?.new_level === 'high') {
    return '🚨 Critical: ITONICS Platform Threat Alert';
  }

  if (changes.moat_changed && changes.moat_change_details) {
    const direction = changes.moat_change_details.direction === 'decreased' ? '⚠️' : '📈';
    return `${direction} ITONICS Competitive Position Update`;
  }

  return '📊 ITONICS Weekly Competitive Intelligence Update';
}

/**
 * Generate HTML email content
 */
function generateAlertEmail(params: {
  userName: string;
  changes: ChangeDetectionResult;
  dashboardData: DashboardData;
  analysisId: string;
}): string {
  const { userName, changes, dashboardData, analysisId } = params;

  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://oppspot-one.vercel.app'}/competitive-intelligence/itonics`;

  const changesHtml = changes.summary
    .map(
      change => `
        <li style="margin: 8px 0; padding: 12px; background: #f9fafb; border-left: 3px solid #2563eb; border-radius: 4px;">
          ${change}
        </li>
      `
    )
    .join('');

  // Threat level badge
  const threatLevel = changes.platform_threat_details?.new_level || calculateThreatLevel(dashboardData);
  const threatBadge = getThreatBadgeHtml(threatLevel);

  // Key metrics
  const moatScore = dashboardData.moat_score?.overall_moat_score.toFixed(1) || 'N/A';
  const avgParity = calculateAvgParity(dashboardData).toFixed(1);
  const competitorCount = dashboardData.competitors?.length || 0;

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
    <div style="max-width: 600px; margin: 0 auto; background: white;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 24px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">🛡️ ITONICS Intelligence</h1>
        <p style="margin: 8px 0 0 0; color: #dbeafe; font-size: 14px;">Competitive Analysis Update</p>
      </div>

      <!-- Content -->
      <div style="padding: 32px 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #111827;">
          Hi ${userName},
        </h2>

        <p style="margin: 0 0 24px 0; color: #4b5563; line-height: 1.6;">
          We've detected significant changes in ITONICS's competitive landscape during the weekly refresh:
        </p>

        <!-- Changes List -->
        <div style="margin: 24px 0;">
          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827;">
            📋 What Changed
          </h3>
          <ul style="margin: 0; padding: 0; list-style: none;">
            ${changesHtml}
          </ul>
        </div>

        <!-- Key Metrics -->
        <div style="margin: 32px 0; padding: 20px; background: #f3f4f6; border-radius: 8px;">
          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827;">
            📊 Current Metrics
          </h3>
          <div style="display: flex; flex-wrap: wrap; gap: 16px;">
            <div style="flex: 1; min-width: 140px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                Moat Strength
              </p>
              <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 700; color: #111827;">
                ${moatScore}/100
              </p>
            </div>
            <div style="flex: 1; min-width: 140px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                Avg Feature Parity
              </p>
              <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 700; color: #111827;">
                ${avgParity}%
              </p>
            </div>
            <div style="flex: 1; min-width: 140px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                Platform Threat
              </p>
              <div style="margin: 8px 0 0 0;">
                ${threatBadge}
              </div>
            </div>
            <div style="flex: 1; min-width: 140px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                Competitors
              </p>
              <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 700; color: #111827;">
                ${competitorCount}
              </p>
            </div>
          </div>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${dashboardUrl}"
             style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px;
                    text-decoration: none; display: inline-block; font-weight: 600;">
            View Full Dashboard →
          </a>
        </div>

        <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
          This automated alert is sent weekly when significant competitive changes are detected.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f3f4f6; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
          © ${new Date().getFullYear()} oppSpot. All rights reserved.
        </p>
        <p style="margin: 0; color: #9ca3af; font-size: 11px;">
          Competitive Intelligence Dashboard | Powered by oppSpot
        </p>
      </div>
    </div>
  </body>
</html>
  `;
}

/**
 * Get threat level badge HTML
 */
function getThreatBadgeHtml(level: 'high' | 'medium' | 'low'): string {
  const colors = {
    high: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
    medium: { bg: '#fefce8', text: '#854d0e', border: '#fde047' },
    low: { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
  };

  const color = colors[level];

  return `
    <span style="display: inline-block; padding: 4px 12px; background: ${color.bg};
                 color: ${color.text}; border: 1px solid ${color.border}; border-radius: 4px;
                 font-size: 12px; font-weight: 600; text-transform: uppercase;">
      ${level}
    </span>
  `;
}

/**
 * Calculate average parity from dashboard data
 */
function calculateAvgParity(data: DashboardData): number {
  if (!data.competitors || data.competitors.length === 0) return 0;

  const parityScores = data.competitors
    .map(c => c.parity_score?.parity_score)
    .filter((s): s is number => s !== undefined && s !== null);

  if (parityScores.length === 0) return 0;

  return parityScores.reduce((sum, s) => sum + s, 0) / parityScores.length;
}

/**
 * Calculate current threat level
 */
function calculateThreatLevel(data: DashboardData): 'high' | 'medium' | 'low' {
  if (!data.moat_score) return 'medium';

  const PLATFORM_COMPETITORS = ['Miro', 'Microsoft Whiteboard', 'FigJam'];

  const moatScore = data.moat_score.overall_moat_score;
  const hasPlatformCompetitor = data.competitors?.some(c =>
    PLATFORM_COMPETITORS.includes(c.competitor_name)
  );

  if (moatScore < 50 && hasPlatformCompetitor) return 'high';
  if (moatScore < 70 && hasPlatformCompetitor) return 'medium';
  return 'low';
}
