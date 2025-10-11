import { NextRequest, NextResponse } from 'next/server'
import { resend, DEFAULT_FROM_EMAIL, REPLY_TO_EMAIL } from '@/lib/email/resend'
import { createClient } from '@/lib/supabase/server'
import WelcomeEmail from '@/emails/welcome'
import VerificationEmail from '@/emails/verification'
import PasswordResetEmail from '@/emails/password-reset'
import NotificationEmail from '@/emails/notification'
import type { Row } from '@/lib/supabase/helpers'

export async function POST(request: NextRequest) {
  try {
    const { type, to, data } = await request.json()

    if (!resend) {
      console.warn('Email service not configured - RESEND_API_KEY missing')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      )
    }

    if (!to || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: to, type' },
        { status: 400 }
      )
    }

    // Check if user is authenticated for certain email types
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Some emails require authentication
    const protectedTypes = ['notification', 'report', 'export']
    if (protectedTypes.includes(type) && !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    let emailContent
    let subject = ''

    switch (type) {
      case 'welcome':
        subject = 'Welcome to OppSpot! 🎉'
        emailContent = WelcomeEmail({
          firstName: data?.firstName,
          email: to,
          verificationUrl: data?.verificationUrl,
        })
        break

      case 'verification':
        subject = 'Verify your email address'
        emailContent = VerificationEmail({
          firstName: data?.firstName,
          email: to,
          verificationUrl: data?.verificationUrl,
        })
        break

      case 'password-reset':
        subject = 'Reset your password'
        emailContent = PasswordResetEmail({
          firstName: data?.firstName,
          email: to,
          resetUrl: data?.resetUrl,
        })
        break

      case 'notification':
        subject = data?.subject || 'New notification from OppSpot'
        emailContent = NotificationEmail({
          firstName: data?.firstName,
          email: to,
          subject,
          title: data?.title || 'Notification',
          message: data?.message || '',
          actionUrl: data?.actionUrl,
          actionText: data?.actionText,
          type: data?.notificationType || 'info',
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    // Send the email
    const result = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to,
      subject,
      reply_to: REPLY_TO_EMAIL,
      react: emailContent,
    })

    // Log email event if user is authenticated
    if (user) {
      // @ts-expect-error - Supabase type inference issue
      await supabase.from('events').insert({
        user_id: user.id,
        event_type: 'email_sent',
        event_data: {
          type,
          to,
          subject,
          sent_at: new Date().toISOString(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      messageId: result.data?.id,
    })

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}