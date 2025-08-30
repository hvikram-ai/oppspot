import { emailTemplates } from './templates'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

class EmailService {
  private async sendEmail(options: EmailOptions) {
    // In production, integrate with services like:
    // - SendGrid
    // - Postmark
    // - Resend
    // - AWS SES
    
    // For now, we'll log the email for development
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email would be sent:', {
        to: options.to,
        subject: options.subject,
        preview: options.text?.substring(0, 100) + '...'
      })
      return { success: true, messageId: 'dev-' + Date.now() }
    }

    // Production email sending with Resend (example)
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'oppSpot <noreply@oppspot.com>',
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send email')
      }

      const data = await response.json()
      return { success: true, messageId: data.id }
    } catch (error) {
      console.error('Email sending failed:', error)
      return { success: false, error }
    }
  }

  async sendWelcomeEmail(email: string, name: string, companyName: string) {
    const template = emailTemplates.welcome(name, companyName)
    return this.sendEmail({
      to: email,
      ...template
    })
  }

  async sendVerificationReminder(email: string, name: string) {
    const template = emailTemplates.verificationReminder(name)
    return this.sendEmail({
      to: email,
      ...template
    })
  }

  async sendOnboardingTips(email: string, name: string, dayNumber: number) {
    const template = emailTemplates.onboardingTips(name, dayNumber)
    return this.sendEmail({
      to: email,
      ...template
    })
  }

  // Schedule emails with delays
  scheduleEmail(type: 'verification' | 'onboarding', email: string, name: string, delayMs: number) {
    setTimeout(async () => {
      if (type === 'verification') {
        await this.sendVerificationReminder(email, name)
      } else if (type === 'onboarding') {
        await this.sendOnboardingTips(email, name, 2)
      }
    }, delayMs)
  }
}

export const emailService = new EmailService()