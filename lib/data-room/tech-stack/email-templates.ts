/**
 * Email Templates for Tech Stack Analysis Notifications
 * HTML templates for tech stack analysis notification emails
 */

export class TechStackEmailTemplates {
  /**
   * Analysis Complete Email Template
   */
  static analysisCompleted(data: {
    userName: string;
    analysisTitle: string;
    dataRoomName: string;
    technologiesFound: number;
    riskLevel: string | null;
    modernizationScore: number | null;
    aiAuthenticityScore: number | null;
    criticalFindings: number;
    actionUrl: string;
  }): { subject: string; html: string } {
    const riskLevelColor = {
      low: '#22c55e',
      medium: '#f59e0b',
      high: '#f97316',
      critical: '#ef4444',
    }[data.riskLevel || 'medium'] || '#6b7280';

    const riskLevelText = data.riskLevel ? data.riskLevel.toUpperCase() : 'PENDING';

    return {
      subject: `Tech Stack Analysis Complete: ${data.analysisTitle}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tech Stack Analysis Complete</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">✅ Analysis Complete</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #4b5563; margin: 0 0 16px 0; font-size: 16px;">Hi ${data.userName},</p>

              <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px;">
                Your tech stack analysis has been completed successfully!
              </p>

              <!-- Analysis Info Card -->
              <div style="background: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 4px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px; font-weight: 600;">${data.analysisTitle}</h2>
                <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Data Room:</strong> ${data.dataRoomName}</p>
              </div>

              <!-- Key Metrics -->
              <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Key Results</h3>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="50%" style="padding: 16px; background: #f9fafb; border-radius: 8px;">
                    <div style="text-align: center;">
                      <div style="font-size: 32px; font-weight: bold; color: #3b82f6; margin-bottom: 4px;">${data.technologiesFound}</div>
                      <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Technologies</div>
                    </div>
                  </td>
                  <td width="10"></td>
                  <td width="50%" style="padding: 16px; background: #f9fafb; border-radius: 8px;">
                    <div style="text-align: center;">
                      <div style="font-size: 20px; font-weight: bold; color: ${riskLevelColor}; margin-bottom: 4px;">${riskLevelText}</div>
                      <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Risk Level</div>
                    </div>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="32%" style="padding: 16px; background: #f9fafb; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #3b82f6; margin-bottom: 4px;">${data.modernizationScore ?? 'N/A'}</div>
                    <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Modernization</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="padding: 16px; background: #f9fafb; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #3b82f6; margin-bottom: 4px;">${data.aiAuthenticityScore ?? 'N/A'}</div>
                    <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">AI Authenticity</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="padding: 16px; background: #f9fafb; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: ${data.criticalFindings > 0 ? '#ef4444' : '#22c55e'}; margin-bottom: 4px;">${data.criticalFindings}</div>
                    <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Critical Issues</div>
                  </td>
                </tr>
              </table>

              ${data.criticalFindings > 0 ? `
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">
                  ⚠️ ${data.criticalFindings} critical finding${data.criticalFindings !== 1 ? 's' : ''} require${data.criticalFindings === 1 ? 's' : ''} immediate attention
                </p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      View Full Analysis →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0; text-align: center;">
                Analysis includes detailed technology breakdown, findings, and actionable recommendations.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                Tech Stack Due Diligence by <strong>oppSpot</strong>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                This is an automated notification. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    };
  }

  /**
   * Analysis Failed Email Template
   */
  static analysisFailed(data: {
    userName: string;
    analysisTitle: string;
    dataRoomName: string;
    errorMessage?: string;
    actionUrl: string;
  }): { subject: string; html: string } {
    return {
      subject: `Tech Stack Analysis Failed: ${data.analysisTitle}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tech Stack Analysis Failed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">❌ Analysis Failed</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #4b5563; margin: 0 0 16px 0; font-size: 16px;">Hi ${data.userName},</p>

              <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px;">
                Unfortunately, your tech stack analysis encountered an error and could not be completed.
              </p>

              <!-- Analysis Info Card -->
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 4px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 8px 0; color: #991b1b; font-size: 18px; font-weight: 600;">${data.analysisTitle}</h2>
                <p style="margin: 0; color: #7f1d1d; font-size: 14px;"><strong>Data Room:</strong> ${data.dataRoomName}</p>
              </div>

              ${data.errorMessage ? `
              <div style="background: #f9fafb; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Error Details</p>
                <p style="margin: 0; color: #374151; font-size: 14px; font-family: 'Courier New', monospace;">${data.errorMessage}</p>
              </div>
              ` : ''}

              <p style="color: #4b5563; font-size: 14px; margin-bottom: 24px;">
                <strong>What you can do:</strong>
              </p>
              <ul style="color: #4b5563; font-size: 14px; margin: 0 0 24px 0; padding-left: 20px;">
                <li>Check that your data room has documents uploaded</li>
                <li>Ensure documents are properly processed</li>
                <li>Try running the analysis again</li>
                <li>Contact support if the issue persists</li>
              </ul>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Retry Analysis →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                Tech Stack Due Diligence by <strong>oppSpot</strong>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                This is an automated notification. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    };
  }
}
