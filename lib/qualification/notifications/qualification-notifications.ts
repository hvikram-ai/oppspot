import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

interface NotificationTemplate {
  title: string
  message: string
  description?: string
  action?: {
    label: string
    url: string
  }
  priority?: string
  icon?: string
}

interface NotificationSettings {
  email_enabled: boolean
  email_types?: string[]
  push_enabled: boolean
  push_types?: string[]
}

export interface QualificationNotification {
  type: 'lead_qualified' | 'lead_assigned' | 'sla_warning' | 'alert_triggered' |
        'checklist_completed' | 'lead_recycled' | 'score_change' | 'action_required'
  recipient: string
  leadId: string
  data: Record<string, unknown>
}

export class QualificationNotificationService {
  private supabase: SupabaseClient

  constructor() {
    // Initialize in methods
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Send qualification notification
   */
  async sendNotification(notification: QualificationNotification): Promise<boolean> {
    try {
      const template = this.getTemplate(notification.type, notification.data)

      // Create in-app notification
      await this.createInAppNotification(notification.recipient, template)

      // Send email notification
      if (await this.shouldSendEmail(notification.recipient, notification.type)) {
        await this.sendEmailNotification(notification.recipient, template)
      }

      // Send push notification if enabled
      if (await this.shouldSendPush(notification.recipient, notification.type)) {
        await this.sendPushNotification(notification.recipient, template)
      }

      return true
    } catch (error) {
      console.error('Error sending notification:', error)
      return false
    }
  }

  /**
   * Get notification template based on type
   */
  private getTemplate(type: string, data: Record<string, unknown>): NotificationTemplate {
    const templates: Record<string, NotificationTemplate> = {
      lead_qualified: {
        title: '🎯 Lead Qualified!',
        message: `${data.companyName || 'Lead'} has been qualified with a score of ${data.score}%.`,
        description: `Framework: ${data.framework}, Status: ${data.status}`,
        action: {
          label: 'View Lead',
          url: `/leads/${data.leadId}`
        },
        priority: 'high',
        icon: '✅'
      },

      lead_assigned: {
        title: '👤 New Lead Assignment',
        message: `You've been assigned ${data.companyName || 'a new lead'}.`,
        description: `Priority: ${data.priority}, SLA: ${data.sla}`,
        action: {
          label: 'View Assignment',
          url: `/qualification?lead=${data.leadId}`
        },
        priority: 'high',
        icon: '📋'
      },

      sla_warning: {
        title: '⏰ SLA Warning',
        message: `SLA deadline approaching for ${data.companyName || 'lead'}.`,
        description: `Time remaining: ${data.timeRemaining}`,
        action: {
          label: 'Take Action',
          url: `/qualification?lead=${data.leadId}`
        },
        priority: 'urgent',
        icon: '⚠️'
      },

      alert_triggered: {
        title: '🚨 Qualification Alert',
        message: data.alertMessage || 'A qualification alert has been triggered.',
        description: `Type: ${data.alertType}, Lead: ${data.companyName}`,
        action: {
          label: 'View Alert',
          url: `/qualification?tab=alerts&alert=${data.alertId}`
        },
        priority: data.priority || 'medium',
        icon: '🔔'
      },

      checklist_completed: {
        title: '✅ Checklist Completed',
        message: `Qualification checklist completed for ${data.companyName || 'lead'}.`,
        description: `Completion: ${data.completionPercentage}%, Framework: ${data.framework}`,
        action: {
          label: 'View Results',
          url: `/qualification?tab=checklists&lead=${data.leadId}`
        },
        priority: 'low',
        icon: '📝'
      },

      lead_recycled: {
        title: '♻️ Lead Recycled',
        message: `${data.companyName || 'Lead'} has been recycled for re-engagement.`,
        description: `Reason: ${data.reason}, New Status: ${data.newStatus}`,
        action: {
          label: 'View Lead',
          url: `/leads/${data.leadId}`
        },
        priority: 'medium',
        icon: '🔄'
      },

      score_change: {
        title: '📊 Score Update',
        message: `Qualification score changed for ${data.companyName || 'lead'}.`,
        description: `${data.previousScore}% → ${data.newScore}% (${typeof data.change === 'number' && data.change > 0 ? '+' : ''}${data.change}%)`,
        action: {
          label: 'View Details',
          url: `/qualification?lead=${data.leadId}`
        },
        priority: 'low',
        icon: typeof data.change === 'number' && data.change > 0 ? '📈' : '📉'
      },

      action_required: {
        title: '⚡ Action Required',
        message: data.actionMessage || 'Action required for qualification.',
        description: `Lead: ${data.companyName}, Action: ${data.requiredAction}`,
        action: {
          label: 'Take Action',
          url: `/qualification?lead=${data.leadId}`
        },
        priority: 'high',
        icon: '🎯'
      }
    }

    return templates[type] || {
      title: 'Qualification Update',
      message: 'A qualification event has occurred.',
      description: '',
      action: {
        label: 'View',
        url: '/qualification'
      },
      priority: 'medium',
      icon: '📌'
    }
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(userId: string, template: NotificationTemplate): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      await supabase.from('notifications').insert({
        user_id: userId,
        title: template.title,
        message: template.message,
        type: 'qualification',
        priority: template.priority,
        metadata: {
          description: template.description,
          action: template.action,
          icon: template.icon
        },
        read: false,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error creating in-app notification:', error)
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(userId: string, template: NotificationTemplate): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      // Get user email from auth
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) return

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .icon { font-size: 48px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .message { font-size: 16px; color: #374151; margin-bottom: 20px; line-height: 1.5; }
            .description { font-size: 14px; color: #6b7280; margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 5px; }
            .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px; font-weight: 500; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">${template.icon}</div>
              <div class="title">${template.title.replace(template.icon, '').trim()}</div>
            </div>
            <div class="content">
              <p class="message">${template.message}</p>
              ${template.description ? `<div class="description">${template.description}</div>` : ''}
              ${template.action ? `
                <a href="${process.env.NEXT_PUBLIC_APP_URL}${template.action.url}" class="button">
                  ${template.action.label}
                </a>
              ` : ''}
              <div class="footer">
                <p>This is an automated notification from oppSpot. You can manage your notification preferences in your account settings.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `

      await resend.emails.send({
        from: 'oppSpot Notifications <notifications@oppspot.com>',
        to: user.email,
        subject: template.title.replace(/[^\w\s]/g, '').trim(),
        html: emailHtml
      })
    } catch (error) {
      console.error('Error sending email notification:', error)
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(userId: string, template: NotificationTemplate): Promise<void> {
    // TODO: Implement push notifications using service like OneSignal or Firebase
    console.log('Push notification would be sent:', { userId, template })
  }

  /**
   * Check if email should be sent for this notification type
   */
  private async shouldSendEmail(userId: string, notificationType: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()

      // Query notification_settings (table may not exist in types yet)
      const { data: settings, error } = await supabase
        .from('notification_settings' as 'notification_settings')
        .select('email_enabled, email_types')
        .eq('user_id', userId)
        .single()

      if (error || !settings) return true // Default to sending if no settings

      const typedSettings = settings as NotificationSettings
      return typedSettings.email_enabled &&
             (!typedSettings.email_types || typedSettings.email_types.includes(notificationType))
    } catch (error) {
      return true // Default to sending on error
    }
  }

  /**
   * Check if push should be sent for this notification type
   */
  private async shouldSendPush(userId: string, notificationType: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()

      // Query notification_settings (table may not exist in types yet)
      const { data: settings, error } = await supabase
        .from('notification_settings' as 'notification_settings')
        .select('push_enabled, push_types')
        .eq('user_id', userId)
        .single()

      if (error || !settings) return false // Default to not sending if no settings

      const typedSettings = settings as NotificationSettings
      return typedSettings.push_enabled &&
             (!typedSettings.push_types || typedSettings.push_types.includes(notificationType))
    } catch (error) {
      return false
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    notifications: QualificationNotification[]
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0

    for (const notification of notifications) {
      const success = await this.sendNotification(notification)
      if (success) {
        sent++
      } else {
        failed++
      }

      // Add small delay to avoid overwhelming services
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return { sent, failed }
  }

  /**
   * Send daily qualification digest
   */
  async sendDailyDigest(userId: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      // Get qualification stats for the day
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const [bantStats, meddicStats, assignments, alerts] = await Promise.all([
        supabase.from('bant_qualifications')
          .select('*')
          .gte('created_at', yesterday.toISOString())
          .order('overall_score', { ascending: false }),
        supabase.from('meddic_qualifications')
          .select('*')
          .gte('created_at', yesterday.toISOString())
          .order('overall_score', { ascending: false }),
        supabase.from('lead_assignments')
          .select('*')
          .eq('assigned_to', userId)
          .gte('created_at', yesterday.toISOString()),
        supabase.from('alert_history')
          .select('*')
          .gte('created_at', yesterday.toISOString())
      ])

      const digestData = {
        date: new Date().toLocaleDateString(),
        newQualifications: (bantStats.data?.length || 0) + (meddicStats.data?.length || 0),
        newAssignments: assignments.data?.length || 0,
        alerts: alerts.data?.length || 0,
        topLeads: [
          ...(bantStats.data || []).slice(0, 3),
          ...(meddicStats.data || []).slice(0, 3)
        ].slice(0, 5)
      }

      // Only send if there's activity
      if (digestData.newQualifications > 0 || digestData.newAssignments > 0) {
        await this.sendNotification({
          type: 'action_required',
          recipient: userId,
          leadId: '',
          data: {
            actionMessage: `Daily Digest: ${digestData.newQualifications} new qualifications, ${digestData.newAssignments} assignments`,
            requiredAction: 'Review daily activity',
            companyName: 'Daily Summary',
            ...digestData
          }
        })
      }
    } catch (error) {
      console.error('Error sending daily digest:', error)
    }
  }

  /**
   * Send SLA reminders
   */
  async sendSLAReminders(): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      // Get assignments with approaching SLA deadlines
      const now = new Date()
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

      interface LeadAssignment {
        lead_id: string;
        assigned_to: string;
        priority: string;
        sla_deadline: string;
        status: string;
      }

      // Query lead_assignments (table may not exist in types yet)
      const { data: assignments } = await supabase
        .from('lead_assignments' as 'lead_assignments')
        .select('*')
        .in('status', ['assigned', 'accepted'])
        .lte('sla_deadline', oneHourFromNow.toISOString())
        .gte('sla_deadline', now.toISOString())

      if (assignments && assignments.length > 0) {
        const typedAssignments = assignments as unknown as LeadAssignment[];
        for (const assignment of typedAssignments) {
          const timeRemaining = Math.floor(
            (new Date(assignment.sla_deadline).getTime() - now.getTime()) / (1000 * 60)
          )

          await this.sendNotification({
            type: 'sla_warning',
            recipient: assignment.assigned_to,
            leadId: assignment.lead_id,
            data: {
              companyName: `Lead ${assignment.lead_id.slice(0, 8)}`,
              timeRemaining: `${timeRemaining} minutes`,
              priority: assignment.priority,
              sla: assignment.sla_deadline
            }
          })
        }
      }
    } catch (error) {
      console.error('Error sending SLA reminders:', error)
    }
  }
}