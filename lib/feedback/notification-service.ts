/**
 * Feedback Notification Service
 * Handles sending email notifications for feedback events
 */

import { Resend } from 'resend';
import { FeedbackEmailTemplates } from './email-templates';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export class FeedbackNotificationService {
  /**
   * Admin email address for receiving feedback notifications
   */
  private static ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@oppspot.com';

  /**
   * From email address for sending notifications
   */
  private static FROM_EMAIL = process.env.FROM_EMAIL || 'notifications@oppspot.com';

  /**
   * Base URL for the application
   */
  private static getBaseUrl(): string {
    return (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL ||
      'https://oppspot-one.vercel.app'
    );
  }

  /**
   * Send new feedback notification to admins
   */
  static async notifyAdminNewFeedback(data: {
    feedbackId: string;
    title: string;
    category: string;
    description: string;
    submitterEmail?: string;
    priority: string;
    affectedFeature?: string;
    isPublic: boolean;
  }): Promise<void> {
    try {
      const actionUrl = `${this.getBaseUrl()}/admin/feedback?highlight=${data.feedbackId}`;

      const html = FeedbackEmailTemplates.newFeedbackAdmin({
        title: data.title,
        category: data.category,
        description: data.description,
        submitterEmail: data.submitterEmail || 'Anonymous',
        priority: data.priority,
        affectedFeature: data.affectedFeature,
        isPublic: data.isPublic,
        actionUrl,
      });

      await resend.emails.send({
        from: this.FROM_EMAIL,
        to: this.ADMIN_EMAIL,
        subject: `[oppSpot Feedback] New ${data.category}: ${data.title}`,
        html,
      });

      console.log('[Feedback] Admin notification sent for:', data.feedbackId);
    } catch (error) {
      console.error('[Feedback] Failed to send admin notification:', error);
      // Don't throw - notification failure shouldn't break feedback submission
    }
  }

  /**
   * Send feedback confirmation to user
   */
  static async sendFeedbackConfirmation(data: {
    userEmail: string;
    userName: string;
    feedbackId: string;
    title: string;
    category: string;
    referenceId: string;
    isPublic: boolean;
  }): Promise<void> {
    try {
      const actionUrl = data.isPublic
        ? `${this.getBaseUrl()}/feedback/${data.feedbackId}`
        : `${this.getBaseUrl()}/feedback/submissions`;

      const html = FeedbackEmailTemplates.feedbackConfirmation({
        userName: data.userName,
        title: data.title,
        category: data.category,
        referenceId: data.referenceId,
        isPublic: data.isPublic,
        actionUrl,
      });

      await resend.emails.send({
        from: this.FROM_EMAIL,
        to: data.userEmail,
        subject: `Feedback Received: ${data.title}`,
        html,
      });

      console.log('[Feedback] Confirmation sent to:', data.userEmail);
    } catch (error) {
      console.error('[Feedback] Failed to send confirmation:', error);
      // Don't throw - notification failure shouldn't break feedback submission
    }
  }

  /**
   * Send status update notification to user
   */
  static async notifyStatusUpdate(data: {
    userEmail: string;
    userName: string;
    feedbackId: string;
    title: string;
    oldStatus: string;
    newStatus: string;
    adminResponse?: string;
  }): Promise<void> {
    try {
      const actionUrl = `${this.getBaseUrl()}/feedback/${data.feedbackId}`;

      const html = FeedbackEmailTemplates.statusUpdate({
        userName: data.userName,
        title: data.title,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        adminResponse: data.adminResponse,
        actionUrl,
      });

      await resend.emails.send({
        from: this.FROM_EMAIL,
        to: data.userEmail,
        subject: `Feedback Update: ${data.title}`,
        html,
      });

      console.log('[Feedback] Status update sent to:', data.userEmail);
    } catch (error) {
      console.error('[Feedback] Failed to send status update:', error);
    }
  }

  /**
   * Send new comment notification to followers
   */
  static async notifyNewComment(data: {
    followerEmails: string[];
    feedbackId: string;
    feedbackTitle: string;
    commenterName: string;
    commentText: string;
  }): Promise<void> {
    try {
      const actionUrl = `${this.getBaseUrl()}/feedback/${data.feedbackId}`;

      // Send to each follower
      const promises = data.followerEmails.map(async (email) => {
        const html = FeedbackEmailTemplates.newComment({
          userName: email.split('@')[0], // Extract name from email
          feedbackTitle: data.feedbackTitle,
          commenterName: data.commenterName,
          commentText: data.commentText,
          actionUrl,
        });

        return resend.emails.send({
          from: this.FROM_EMAIL,
          to: email,
          subject: `New comment on: ${data.feedbackTitle}`,
          html,
        });
      });

      await Promise.all(promises);
      console.log(`[Feedback] Comment notifications sent to ${data.followerEmails.length} followers`);
    } catch (error) {
      console.error('[Feedback] Failed to send comment notifications:', error);
    }
  }

  /**
   * Send vote milestone notification to user
   */
  static async notifyVoteMilestone(data: {
    userEmail: string;
    userName: string;
    feedbackId: string;
    feedbackTitle: string;
    voteCount: number;
  }): Promise<void> {
    try {
      const actionUrl = `${this.getBaseUrl()}/feedback/${data.feedbackId}`;

      const html = FeedbackEmailTemplates.voteMilestone({
        userName: data.userName,
        feedbackTitle: data.feedbackTitle,
        voteCount: data.voteCount,
        actionUrl,
      });

      await resend.emails.send({
        from: this.FROM_EMAIL,
        to: data.userEmail,
        subject: `🎉 Your feedback reached ${data.voteCount} votes!`,
        html,
      });

      console.log('[Feedback] Milestone notification sent to:', data.userEmail);
    } catch (error) {
      console.error('[Feedback] Failed to send milestone notification:', error);
    }
  }

  /**
   * Send weekly digest to admins
   */
  static async sendWeeklyAdminDigest(data: {
    startDate: string;
    endDate: string;
    newFeedbackCount: number;
    resolvedCount: number;
    pendingCount: number;
    topFeedback: Array<{ title: string; votes: number; url: string }>;
  }): Promise<void> {
    try {
      const actionUrl = `${this.getBaseUrl()}/admin/feedback`;

      const html = FeedbackEmailTemplates.weeklyAdminDigest({
        ...data,
        actionUrl,
      });

      await resend.emails.send({
        from: this.FROM_EMAIL,
        to: this.ADMIN_EMAIL,
        subject: `Weekly Feedback Digest - ${data.startDate} to ${data.endDate}`,
        html,
      });

      console.log('[Feedback] Weekly digest sent to admin');
    } catch (error) {
      console.error('[Feedback] Failed to send weekly digest:', error);
    }
  }

  /**
   * Check if vote count is a milestone (10, 25, 50, 100, 250, 500, 1000)
   */
  static isMilestone(voteCount: number): boolean {
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    return milestones.includes(voteCount);
  }
}
