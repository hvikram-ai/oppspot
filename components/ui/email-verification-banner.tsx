'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { X, Mail, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export function EmailVerificationBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const checkVerificationStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Check if email is confirmed in auth
      const emailConfirmed = user.email_confirmed_at !== null
      setIsVerified(emailConfirmed)
      setIsVisible(!emailConfirmed)
      
      // Also check profile for verification status
      const { data: profile } = await supabase
        .from('profiles')
        .select('email_verified_at')
        .eq('id', user.id)
        .single() as any
      
      if (profile?.email_verified_at) {
        setIsVerified(true)
        setIsVisible(false)
      }
    }
  }, [supabase])

  useEffect(() => {
    checkVerificationStatus()
  }, [checkVerificationStatus])

  const resendVerificationEmail = async () => {
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('No user email found')

      // Resend verification email via Supabase
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      })

      if (error) throw error

      toast.success('Verification email sent! Check your inbox.')
    } catch (error) {
      console.error('Error resending verification:', error)
      toast.error('Failed to send verification email')
    } finally {
      setLoading(false)
    }
  }

  const dismiss = () => {
    setIsVisible(false)
    // Store dismissal in localStorage to persist across sessions
    localStorage.setItem('email-banner-dismissed', 'true')
  }

  // Check if user previously dismissed the banner
  useEffect(() => {
    const dismissed = localStorage.getItem('email-banner-dismissed')
    if (dismissed === 'true' && !isVerified) {
      // Show again after 24 hours
      const dismissedTime = localStorage.getItem('email-banner-dismissed-time')
      if (dismissedTime) {
        const timeDiff = Date.now() - parseInt(dismissedTime)
        if (timeDiff < 24 * 60 * 60 * 1000) {
          setIsVisible(false)
        }
      }
    }
  }, [isVerified])

  if (!isVisible || isVerified) return null

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Mail className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Verify your email</strong> to unlock all features including data exports, team invites, and API access.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="default"
              onClick={resendVerificationEmail}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? 'Sending...' : 'Resend Email'}
            </Button>
            <button
              onClick={dismiss}
              className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Success notification component for when email is verified
export function EmailVerifiedNotification() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check URL params for verification success
    const params = new URLSearchParams(window.location.search)
    if (params.get('verified') === 'true') {
      setShow(true)
      // Remove param from URL
      window.history.replaceState({}, '', window.location.pathname)
      
      // Auto-hide after 10 seconds
      setTimeout(() => setShow(false), 10000)
    }
  }, [])

  if (!show) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-3 shadow-lg">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
        <div>
          <p className="font-medium text-green-800 dark:text-green-200">
            Email verified successfully!
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            All features are now unlocked.
          </p>
        </div>
        <button
          onClick={() => setShow(false)}
          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}