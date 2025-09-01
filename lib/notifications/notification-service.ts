import { createClient } from '@/lib/supabase/client'
import { Resend } from 'resend'

interface NotificationData {
  userId: string
  type: string
  title: string
  body: string
  data?: Record<string, any>
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  actionUrl?: string
  imageUrl?: string
}

interface NotificationPreferences {
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  in_app_enabled: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  timezone?: string
  type_preferences?: Record<string, any>
}

export class NotificationService {
  private supabase = createClient()
  private resend: Resend | null = null

  constructor() {
    // Initialize Resend if API key is available
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY)
    }
  }

  // Send a notification to a user
  async sendNotification(data: NotificationData): Promise<string | null> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(data.userId)
      
      // Check if user is in quiet hours
      if (this.isInQuietHours(preferences)) {
        // Queue for later delivery
        return await this.queueNotification(data, this.getQuietHoursEnd(preferences))
      }

      // Create in-app notification
      let notificationId: string | null = null
      if (preferences.in_app_enabled) {
        notificationId = await this.createInAppNotification(data)
      }

      // Send email if enabled
      if (preferences.email_enabled && this.shouldSendEmail(data.type, preferences)) {
        await this.sendEmailNotification(data)
      }

      // Send push notification if enabled
      if (preferences.push_enabled && this.shouldSendPush(data.type, preferences)) {
        await this.sendPushNotification(data)
      }

      // Send SMS if enabled (would need Twilio integration)
      if (preferences.sms_enabled && this.shouldSendSMS(data.type, preferences)) {
        await this.sendSMSNotification(data)
      }

      return notificationId
    } catch (error) {
      console.error('Error sending notification:', error)
      throw error
    }
  }

  // Create in-app notification
  private async createInAppNotification(data: NotificationData): Promise<string> {
    const { data: notification, error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data || {},
        priority: data.priority || 'medium',
        action_url: data.actionUrl,
        image_url: data.imageUrl,
        delivered_channels: ['in_app']
      })
      .select()
      .single()

    if (error) throw error
    
    // Trigger real-time update
    await this.triggerRealtimeUpdate(data.userId, notification)
    
    return notification.id
  }

  // Send email notification
  private async sendEmailNotification(data: NotificationData): Promise<void> {
    if (!this.resend) {
      console.warn('Email service not configured')
      return
    }

    // Get user email
    const { data: user } = await this.supabase
      .from('profiles')
      .select('email')
      .eq('id', data.userId)
      .single()

    if (!user?.email) return

    // Get email template
    const template = await this.getEmailTemplate(data.type)
    
    // Replace variables in template
    const emailContent = this.processTemplate(template.email_template || template.body_template, {
      ...data.data,
      title: data.title,
      body: data.body
    })

    try {
      await this.resend.emails.send({
        from: 'OppSpot <notifications@oppspot.com>',
        to: user.email,
        subject: template.email_subject || data.title,
        html: this.wrapEmailTemplate(emailContent, data),
        text: data.body
      })

      // Update notification status
      if (data.data?.notification_id) {
        await this.supabase
          .from('notifications')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
            delivered_channels: this.supabase.sql`array_append(delivered_channels, 'email')`
          })
          .eq('id', data.data.notification_id)
      }
    } catch (error) {
      console.error('Email send error:', error)
    }
  }

  // Send push notification
  private async sendPushNotification(data: NotificationData): Promise<void> {
    // Get user's push tokens
    const { data: tokens } = await this.supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', data.userId)
      .eq('is_active', true)

    if (!tokens || tokens.length === 0) return

    for (const token of tokens) {
      try {
        if (token.platform === 'web') {
          await this.sendWebPush(token.token, data)
        } else if (token.platform === 'ios' || token.platform === 'android') {
          await this.sendMobilePush(token.token, token.platform, data)
        }
      } catch (error) {
        console.error(`Push notification failed for token ${token.token}:`, error)
        // Mark token as inactive if it fails
        await this.supabase
          .from('push_tokens')
          .update({ is_active: false })
          .eq('token', token.token)
      }
    }
  }

  // Send web push notification
  private async sendWebPush(token: string, data: NotificationData): Promise<void> {
    // This would use the Web Push API
    // Implementation depends on service worker setup
    console.log('Sending web push to:', token)
  }

  // Send mobile push notification
  private async sendMobilePush(token: string, platform: string, data: NotificationData): Promise<void> {
    // This would use Firebase Cloud Messaging or similar
    console.log(`Sending ${platform} push to:`, token)
  }

  // Send SMS notification
  private async sendSMSNotification(data: NotificationData): Promise<void> {
    // This would use Twilio or similar service
    console.log('SMS notification would be sent here')
  }

  // Get user preferences
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const { data } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Return defaults if no preferences exist
    return data || {
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true,
      in_app_enabled: true,
      quiet_hours_enabled: false
    }
  }

  // Check if user is in quiet hours
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quiet_hours_enabled) return false
    if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) return false

    const now = new Date()
    const timezone = preferences.timezone || 'UTC'
    
    // Convert to user's timezone
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const currentHour = userTime.getHours()
    const currentMinute = userTime.getMinutes()
    const currentTime = currentHour * 60 + currentMinute

    const [startHour, startMinute] = preferences.quiet_hours_start.split(':').map(Number)
    const [endHour, endMinute] = preferences.quiet_hours_end.split(':').map(Number)
    
    const startTime = startHour * 60 + startMinute
    const endTime = endHour * 60 + endMinute

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime < endTime
    }
  }

  // Get quiet hours end time
  private getQuietHoursEnd(preferences: NotificationPreferences): Date {
    const now = new Date()
    const timezone = preferences.timezone || 'UTC'
    
    if (!preferences.quiet_hours_end) return now

    const [endHour, endMinute] = preferences.quiet_hours_end.split(':').map(Number)
    
    // Create date at quiet hours end
    const endTime = new Date(now)
    endTime.setHours(endHour, endMinute, 0, 0)
    
    // If end time is before now, it's tomorrow
    if (endTime <= now) {
      endTime.setDate(endTime.getDate() + 1)
    }
    
    return endTime
  }

  // Queue notification for later delivery
  private async queueNotification(data: NotificationData, scheduledFor: Date): Promise<string> {
    const { data: queued, error } = await this.supabase
      .from('notification_queue')
      .insert({
        user_id: data.userId,
        notification_type: data.type,
        notification_data: data,
        scheduled_for: scheduledFor.toISOString(),
        channels: ['in_app', 'email', 'push'].filter(channel => 
          this.shouldSendChannel(channel, data.type, await this.getUserPreferences(data.userId))
        )
      })
      .select()
      .single()

    if (error) throw error
    return queued.id
  }

  // Check if should send via specific channel
  private shouldSendChannel(channel: string, type: string, preferences: NotificationPreferences): boolean {
    const typePrefs = preferences.type_preferences?.[type]
    if (typePrefs && typeof typePrefs[channel] === 'boolean') {
      return typePrefs[channel]
    }
    
    switch (channel) {
      case 'email': return preferences.email_enabled
      case 'push': return preferences.push_enabled
      case 'sms': return preferences.sms_enabled
      case 'in_app': return preferences.in_app_enabled
      default: return false
    }
  }

  private shouldSendEmail(type: string, preferences: NotificationPreferences): boolean {
    return this.shouldSendChannel('email', type, preferences)
  }

  private shouldSendPush(type: string, preferences: NotificationPreferences): boolean {
    return this.shouldSendChannel('push', type, preferences)
  }

  private shouldSendSMS(type: string, preferences: NotificationPreferences): boolean {
    return this.shouldSendChannel('sms', type, preferences)
  }

  // Get email template
  private async getEmailTemplate(type: string): Promise<any> {
    const { data } = await this.supabase
      .from('notification_templates')
      .select('*')
      .eq('type', type)
      .single()

    return data || {
      title: 'Notification',
      body_template: '{{body}}',
      email_subject: 'OppSpot Notification'
    }
  }

  // Process template with variables
  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      processed = processed.replace(regex, value?.toString() || '')
    }
    
    return processed
  }

  // Wrap email content in HTML template
  private wrapEmailTemplate(content: string, data: NotificationData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">${data.title}</h1>
    </div>
    <div class="content">
      ${content}
      ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">View Details</a>` : ''}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} OppSpot. All rights reserved.</p>
      <p><a href="https://oppspot.com/settings/notifications" style="color: #667eea;">Manage notification preferences</a></p>
    </div>
  </div>
</body>
</html>`
  }

  // Trigger real-time update via WebSocket
  private async triggerRealtimeUpdate(userId: string, notification: any): Promise<void> {
    // Supabase real-time will handle this automatically
    // when a new row is inserted in the notifications table
    console.log('Real-time update triggered for user:', userId)
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId)
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    await this.supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false)
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    const { count } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .eq('is_archived', false)

    return count || 0
  }

  // Subscribe to notifications
  async subscribeToEntity(
    userId: string,
    entityType: 'business' | 'competitor_set' | 'market' | 'category',
    entityId: string,
    conditions: Record<string, any> = {}
  ): Promise<void> {
    await this.supabase
      .from('notification_subscriptions')
      .upsert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        alert_conditions: conditions,
        is_active: true
      })
  }

  // Unsubscribe from notifications
  async unsubscribeFromEntity(
    userId: string,
    entityType: string,
    entityId: string
  ): Promise<void> {
    await this.supabase
      .from('notification_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
  }
}