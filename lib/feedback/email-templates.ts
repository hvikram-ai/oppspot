/**
 * Email Templates for Feedback Notifications
 * HTML templates for feedback system notification emails
 */

export interface EmailTemplateData {
  [key: string]: string | number | boolean | null | undefined;
}

export class FeedbackEmailTemplates {
  /**
   * Base email wrapper with oppSpot branding
   */
  private static wrapEmail(content: string, actionUrl?: string): string {
    const actionButton = actionUrl
      ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${actionUrl}"
           style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px;
                  text-decoration: none; display: inline-block; font-weight: 600;">
          View Details
        </a>
      </div>
    `
      : '';

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
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">oppSpot</h1>
              <p style="margin: 8px 0 0 0; color: #dbeafe; font-size: 14px;">Business Intelligence Platform</p>
            </div>

            <!-- Content -->
            <div style="padding: 32px 24px;">
              ${content}
              ${actionButton}
            </div>

            <!-- Footer -->
            <div style="background: #f3f4f6; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                © ${new Date().getFullYear()} oppSpot. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                This email was sent from the oppSpot feedback system.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * New Feedback Submission (Admin Alert)
   */
  static newFeedbackAdmin(data: {
    title: string;
    category: string;
    description: string;
    submitterEmail: string;
    priority: string;
    affectedFeature?: string;
    isPublic: boolean;
    actionUrl: string;
  }): string {
    const categoryIcons: Record<string, string> = {
      bug: '🐛',
      feature: '✨',
      improvement: '📈',
      data_quality: '📊',
      integration: '🔗',
      performance: '⚡',
      documentation: '📚',
      other: '💬',
    };

    const priorityColors: Record<string, string> = {
      critical: '#dc2626',
      high: '#f59e0b',
      medium: '#eab308',
      low: '#9ca3af',
    };

    const content = `
      <h2 style="color: #1f2937; margin-bottom: 16px;">
        ${categoryIcons[data.category] || '💬'} New Feedback Submitted
      </h2>
      <p style="color: #4b5563; margin-bottom: 16px;">
        A new feedback item has been submitted and requires your attention.
      </p>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${priorityColors[data.priority] || '#9ca3af'};">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px;">${data.title}</h3>

        <div style="margin-bottom: 8px;">
          <span style="display: inline-block; background: ${priorityColors[data.priority] || '#9ca3af'}20; color: ${priorityColors[data.priority] || '#9ca3af'};
                       padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-right: 8px;">
            ${data.priority.toUpperCase()} PRIORITY
          </span>
          <span style="display: inline-block; background: #e0e7ff; color: #3730a3;
                       padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-right: 8px;">
            ${data.category.toUpperCase()}
          </span>
          ${
            data.isPublic
              ? '<span style="display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">PUBLIC</span>'
              : '<span style="display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">PRIVATE</span>'
          }
        </div>

        <p style="margin: 12px 0 0 0; color: #6b7280; line-height: 1.6;">
          ${data.description.substring(0, 200)}${data.description.length > 200 ? '...' : ''}
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Submitted By:</td>
          <td style="padding: 8px 0; color: #1f2937;">${data.submitterEmail || 'Anonymous'}</td>
        </tr>
        ${
          data.affectedFeature
            ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Affected Feature:</td>
          <td style="padding: 8px 0; color: #1f2937;">${data.affectedFeature}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Visibility:</td>
          <td style="padding: 8px 0; color: #1f2937;">${data.isPublic ? 'Public (Community Board)' : 'Private (Admin Only)'}</td>
        </tr>
      </table>

      <p style="color: #4b5563; margin-top: 24px;">
        Please review this feedback and take appropriate action.
      </p>
    `;

    return this.wrapEmail(content, data.actionUrl);
  }

  /**
   * Feedback Confirmation (User Receipt)
   */
  static feedbackConfirmation(data: {
    userName: string;
    title: string;
    category: string;
    referenceId: string;
    isPublic: boolean;
    actionUrl: string;
  }): string {
    const content = `
      <h2 style="color: #10b981; margin-bottom: 16px;">✅ Feedback Received</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.userName || 'there'},</p>
      <p style="color: #4b5563; margin-bottom: 20px;">
        Thank you for taking the time to submit feedback! We've received your ${data.category} report and our team will review it shortly.
      </p>

      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
        <h3 style="margin: 0 0 12px 0; color: #065f46;">Your Feedback</h3>
        <p style="margin: 0 0 8px 0; color: #047857; font-size: 16px; font-weight: 600;">
          ${data.title}
        </p>
        <p style="margin: 0; color: #059669; font-size: 14px;">
          <strong>Reference ID:</strong> ${data.referenceId}
        </p>
      </div>

      ${
        data.isPublic
          ? `
      <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          <strong>📢 Public Feedback:</strong> Your feedback has been posted to the community board where other users can vote and comment on it.
        </p>
      </div>
      `
          : `
      <div style="background: #fef3c7; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>🔒 Private Feedback:</strong> Your feedback is only visible to the oppSpot team.
        </p>
      </div>
      `
      }

      <p style="color: #4b5563; margin-bottom: 8px;">
        <strong>What happens next?</strong>
      </p>
      <ul style="color: #6b7280; line-height: 1.8; padding-left: 20px;">
        <li>Our team will review your feedback within 1-2 business days</li>
        <li>We'll update the status as we investigate and work on a solution</li>
        <li>You'll receive email notifications when there are updates</li>
        ${data.isPublic ? '<li>Other users can upvote and comment on your feedback</li>' : ''}
      </ul>

      <p style="color: #4b5563; margin-top: 24px;">
        You can track the progress and view responses using the button below.
      </p>
    `;

    return this.wrapEmail(content, data.actionUrl);
  }

  /**
   * Status Update Notification
   */
  static statusUpdate(data: {
    userName: string;
    title: string;
    oldStatus: string;
    newStatus: string;
    adminResponse?: string;
    actionUrl: string;
  }): string {
    const statusConfig: Record<
      string,
      { color: string; bgColor: string; icon: string; text: string }
    > = {
      pending: { color: '#6b7280', bgColor: '#f3f4f6', icon: '⏳', text: 'Pending Review' },
      in_review: { color: '#f59e0b', bgColor: '#fffbeb', icon: '👀', text: 'Under Review' },
      in_progress: { color: '#3b82f6', bgColor: '#eff6ff', icon: '🚧', text: 'In Progress' },
      resolved: { color: '#10b981', bgColor: '#f0fdf4', icon: '✅', text: 'Resolved' },
      declined: { color: '#dc2626', bgColor: '#fef2f2', icon: '❌', text: 'Declined' },
      duplicate: { color: '#9ca3af', bgColor: '#f9fafb', icon: '🔄', text: 'Duplicate' },
    };

    const newStatusConfig =
      statusConfig[data.newStatus] || statusConfig.pending;

    const content = `
      <h2 style="color: #1f2937; margin-bottom: 16px;">📋 Feedback Status Update</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.userName || 'there'},</p>
      <p style="color: #4b5563; margin-bottom: 20px;">
        There's an update on your feedback submission:
      </p>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">${data.title}</h3>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="color: #9ca3af; font-size: 14px;">
            ${statusConfig[data.oldStatus]?.icon || '⏳'} ${data.oldStatus.replace('_', ' ').toUpperCase()}
          </span>
          <span style="color: #9ca3af;">→</span>
          <span style="background: ${newStatusConfig.bgColor}; color: ${newStatusConfig.color};
                       padding: 6px 16px; border-radius: 16px; font-size: 14px; font-weight: 600;">
            ${newStatusConfig.icon} ${newStatusConfig.text}
          </span>
        </div>
      </div>

      ${
        data.adminResponse
          ? `
      <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2563eb;">
        <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
          Response from oppSpot Team:
        </h4>
        <p style="margin: 0; color: #1e3a8a; line-height: 1.6;">
          ${data.adminResponse}
        </p>
      </div>
      `
          : ''
      }

      <p style="color: #4b5563; margin-top: 24px;">
        View the full details and any additional comments by clicking the button below.
      </p>
    `;

    return this.wrapEmail(content, data.actionUrl);
  }

  /**
   * New Comment Notification
   */
  static newComment(data: {
    userName: string;
    feedbackTitle: string;
    commenterName: string;
    commentText: string;
    actionUrl: string;
  }): string {
    const content = `
      <h2 style="color: #1f2937; margin-bottom: 16px;">💬 New Comment</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.userName || 'there'},</p>
      <p style="color: #4b5563; margin-bottom: 20px;">
        Someone commented on your feedback:
      </p>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 16px;">
          ${data.feedbackTitle}
        </p>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
            ${data.commenterName.charAt(0).toUpperCase()}
          </div>
          <span style="color: #374151; font-weight: 600;">${data.commenterName}</span>
        </div>
        <p style="margin: 0; color: #6b7280; line-height: 1.6;">
          "${data.commentText.substring(0, 200)}${data.commentText.length > 200 ? '...' : ''}"
        </p>
      </div>

      <p style="color: #4b5563; margin-top: 24px;">
        Click below to view the full conversation and reply.
      </p>
    `;

    return this.wrapEmail(content, data.actionUrl);
  }

  /**
   * Vote Milestone Notification (e.g., 10, 25, 50, 100 votes)
   */
  static voteMilestone(data: {
    userName: string;
    feedbackTitle: string;
    voteCount: number;
    actionUrl: string;
  }): string {
    const content = `
      <h2 style="color: #10b981; margin-bottom: 16px;">🎉 Milestone Reached!</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.userName || 'there'},</p>
      <p style="color: #4b5563; margin-bottom: 20px;">
        Great news! Your feedback has reached a voting milestone.
      </p>

      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                  padding: 32px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <div style="color: white; font-size: 48px; font-weight: 700; margin-bottom: 8px;">
          ${data.voteCount}
        </div>
        <div style="color: #d1fae5; font-size: 18px; font-weight: 600;">
          UPVOTES
        </div>
      </div>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; color: #1f2937; font-weight: 600;">
          ${data.feedbackTitle}
        </p>
      </div>

      <p style="color: #4b5563; margin-bottom: 8px;">
        This shows strong community interest in your feedback! Our team prioritizes highly-voted items.
      </p>

      <p style="color: #4b5563; margin-top: 24px;">
        Click below to see all the activity on your feedback.
      </p>
    `;

    return this.wrapEmail(content, data.actionUrl);
  }

  /**
   * Weekly Digest for Admins
   */
  static weeklyAdminDigest(data: {
    startDate: string;
    endDate: string;
    newFeedbackCount: number;
    resolvedCount: number;
    pendingCount: number;
    topFeedback: Array<{ title: string; votes: number; url: string }>;
    actionUrl: string;
  }): string {
    const content = `
      <h2 style="color: #1f2937; margin-bottom: 16px;">📊 Weekly Feedback Digest</h2>
      <p style="color: #4b5563; margin-bottom: 20px;">
        Here's your feedback summary for ${data.startDate} - ${data.endDate}
      </p>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
        <div style="background: #eff6ff; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="color: #2563eb; font-size: 32px; font-weight: 700;">${data.newFeedbackCount}</div>
          <div style="color: #1e40af; font-size: 14px;">New Items</div>
        </div>
        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="color: #10b981; font-size: 32px; font-weight: 700;">${data.resolvedCount}</div>
          <div style="color: #065f46; font-size: 14px;">Resolved</div>
        </div>
        <div style="background: #fffbeb; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="color: #f59e0b; font-size: 32px; font-weight: 700;">${data.pendingCount}</div>
          <div style="color: #92400e; font-size: 14px;">Pending</div>
        </div>
      </div>

      <h3 style="color: #1f2937; margin-bottom: 12px; font-size: 16px;">🔥 Top Voted Feedback</h3>
      <div style="background: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
        ${data.topFeedback
          .map(
            (item, index) => `
          <div style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; ${index === data.topFeedback.length - 1 ? 'border-bottom: none;' : ''}">
            <div style="display: flex; align-items: center; justify-content: between;">
              <span style="color: #6b7280; font-weight: 600; margin-right: 12px;">#${index + 1}</span>
              <span style="flex: 1; color: #1f2937;">${item.title}</span>
              <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px;
                           font-size: 12px; font-weight: 600;">▲ ${item.votes}</span>
            </div>
          </div>
        `
          )
          .join('')}
      </div>

      <p style="color: #4b5563; margin-top: 24px;">
        Review all feedback items and manage status updates in the admin portal.
      </p>
    `;

    return this.wrapEmail(content, data.actionUrl);
  }
}
