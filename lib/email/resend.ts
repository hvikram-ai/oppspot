import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('Warning: RESEND_API_KEY is not set. Email functionality will be disabled.')
}

export const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || 'OppSpot <noreply@oppspot.com>'
export const REPLY_TO_EMAIL = process.env.EMAIL_REPLY_TO || 'support@oppspot.com'