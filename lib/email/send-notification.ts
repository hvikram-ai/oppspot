import { resend, DEFAULT_FROM_EMAIL, REPLY_TO_EMAIL } from './resend'
import WelcomeEmail from '@/emails/welcome'
import VerificationEmail from '@/emails/verification'
import PasswordResetEmail from '@/emails/password-reset'
import NotificationEmail from '@/emails/notification'

export type EmailType = 'welcome' | 'verification' | 'password-reset' | 'notification'

interface BaseEmailData {
  to: string
  firstName?: string
}

interface WelcomeEmailData extends BaseEmailData {
  type: 'welcome'
  verificationUrl?: string
}

interface VerificationEmailData extends BaseEmailData {
  type: 'verification'
  verificationUrl: string
}

interface PasswordResetEmailData extends BaseEmailData {
  type: 'password-reset'
  resetUrl: string
}

interface NotificationEmailData extends BaseEmailData {
  type: 'notification'
  subject: string
  title: string
  message: string
  actionUrl?: string
  actionText?: string
  notificationType?: 'info' | 'success' | 'warning' | 'alert'
}

export type EmailData = 
  | WelcomeEmailData
  | VerificationEmailData
  | PasswordResetEmailData
  | NotificationEmailData

export async function sendEmail(data: EmailData) {
  if (!resend) {
    console.warn('Email service not configured - skipping email send')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    let emailContent
    let subject = ''

    switch (data.type) {
      case 'welcome':
        subject = 'Welcome to OppSpot! 🎉'
        emailContent = WelcomeEmail({
          firstName: data.firstName,
          email: data.to,
          verificationUrl: data.verificationUrl,
        })
        break

      case 'verification':
        subject = 'Verify your email address'
        emailContent = VerificationEmail({
          firstName: data.firstName,
          email: data.to,
          verificationUrl: data.verificationUrl,
        })
        break

      case 'password-reset':
        subject = 'Reset your password'
        emailContent = PasswordResetEmail({
          firstName: data.firstName,
          email: data.to,
          resetUrl: data.resetUrl,
        })
        break

      case 'notification':
        subject = data.subject
        emailContent = NotificationEmail({
          firstName: data.firstName,
          email: data.to,
          subject: data.subject,
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
          actionText: data.actionText,
          type: data.notificationType,
        })
        break

      default:
        throw new Error('Invalid email type')
    }

    const result = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: data.to,
      subject,
      reply_to: REPLY_TO_EMAIL,
      react: emailContent,
    })

    return { 
      success: true, 
      messageId: result.data?.id 
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    }
  }
}

// Utility function to send bulk emails (with rate limiting)
export async function sendBulkEmails(
  emails: EmailData[],
  options: {
    batchSize?: number
    delayMs?: number
  } = {}
) {
  const { batchSize = 10, delayMs = 1000 } = options
  const results = []

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    
    const batchResults = await Promise.all(
      batch.map(email => sendEmail(email))
    )
    
    results.push(...batchResults)

    // Add delay between batches to avoid rate limiting
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return results
}