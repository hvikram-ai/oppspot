'use client'

/**
 * Magic Link Login Form Component
 * Passwordless authentication - user enters email, receives login link
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Mail, CheckCircle2, Sparkles } from 'lucide-react'

interface MagicLinkFormProps {
  onSwitchToPassword?: () => void
}

export function MagicLinkForm({ onSwitchToPassword }: MagicLinkFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429) {
          toast.error('Too many requests', {
            description: data.message || `Please try again in ${data.retryAfter || 60} seconds`,
          })
        } else if (response.status === 400) {
          toast.error('Invalid email', {
            description: data.error || 'Please enter a valid email address',
          })
        } else {
          toast.error('Failed to send magic link', {
            description: data.message || 'Please try again',
          })
        }
        return
      }

      // Success
      setEmailSent(true)
      setResendCountdown(30) // 30 second cooldown before resend

      toast.success('Magic link sent!', {
        description: `Check your email at ${email}`,
        duration: 6000,
        icon: <Mail className="h-4 w-4" />,
      })

      console.log('[Magic Link] Successfully sent to:', email)
      console.log('[Magic Link] Remaining attempts:', data.remaining)

    } catch (error) {
      console.error('[Magic Link] Error:', error)
      toast.error('Network error', {
        description: 'Please check your connection and try again',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCountdown > 0) return
    await handleSendMagicLink(new Event('submit') as any)
  }

  if (emailSent) {
    return (
      <div className="space-y-6 text-center">
        {/* Success State */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Check your email!</h3>
          <p className="text-sm text-muted-foreground">
            We sent a magic link to
          </p>
          <p className="text-sm font-medium">{email}</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium text-blue-900 dark:text-blue-100">
            {`What's next?`}
          </p>
          <ol className="text-left text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
            <li>Open your email inbox</li>
            <li>{`Click the "Login to oppSpot" button`}</li>
            <li>{`You'll be signed in automatically!`}</li>
          </ol>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Link expires in 5 minutes for security
          </p>

          {/* Resend Button */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {`Didn't receive the email?`}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={resendCountdown > 0}
            >
              {resendCountdown > 0 ? (
                `Resend in ${resendCountdown}s`
              ) : (
                'Resend Magic Link'
              )}
            </Button>
          </div>

          {/* Back to Form */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEmailSent(false)}
            className="text-xs"
          >
            Use a different email
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSendMagicLink} className="space-y-4">
      {/* Info Banner */}
      <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-3 flex items-start gap-2">
        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-purple-900 dark:text-purple-100">
          <p className="font-medium">No password needed!</p>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
            {`We'll email you a secure link to log in instantly.`}
          </p>
        </div>
      </div>

      {/* Email Input */}
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email address</Label>
        <Input
          id="magic-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          autoComplete="email"
        />
      </div>

      {/* Send Button */}
      <Button type="submit" className="w-full" disabled={loading || !email}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send Magic Link
          </>
        )}
      </Button>

      {/* Switch to Password Login */}
      {onSwitchToPassword && (
        <div className="text-center pt-2">
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={onSwitchToPassword}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Use password instead
          </Button>
        </div>
      )}
    </form>
  )
}
