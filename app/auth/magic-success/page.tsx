'use client'

/**
 * Magic Link Success Page
 * Shows after successful email verification via magic link
 * Auto-redirects to dashboard after 3 seconds
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicLayout } from '@/components/layout/public-layout'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function MagicSuccessPage() {
  const [countdown, setCountdown] = useState(3)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const router = useRouter()

  // Verify session is established before allowing redirect
  useEffect(() => {
    const verifySession = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        console.log('[Magic Success] Session check:', {
          hasUser: !!user,
          userId: user?.id,
          error: error?.message
        })

        if (error || !user) {
          setSessionError('Session not established. Please try logging in again.')
          console.error('[Magic Success] Session verification failed:', error)
          return
        }

        setSessionChecked(true)
      } catch (err) {
        console.error('[Magic Success] Session check error:', err)
        setSessionError('Failed to verify session. Please try logging in again.')
      }
    }

    verifySession()
  }, [])

  useEffect(() => {
    // Only start countdown if session is verified
    if (!sessionChecked || sessionError) {
      return
    }

    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // Redirect to dashboard
      router.push('/dashboard')
    }
  }, [countdown, router, sessionChecked, sessionError])

  // Show error state if session verification failed
  if (sessionError) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20">
          <div className="flex justify-center">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                    <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-red-900 dark:text-red-100">
                    Session Error
                  </h1>
                  <p className="text-muted-foreground">
                    {sessionError}
                  </p>
                </div>

                <Button
                  onClick={() => router.push('/login')}
                  className="w-full"
                  size="lg"
                >
                  Back to Login
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicLayout>
    )
  }

  // Show loading state while verifying session
  if (!sessionChecked) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20">
          <div className="flex justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
                <p className="text-muted-foreground">
                  Verifying your session...
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicLayout>
    )
  }

  // Show success state and countdown
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-20">
        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">
                  Welcome back!
                </h1>
                <p className="text-muted-foreground">
                  You've been successfully authenticated
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-blue-900 dark:text-blue-100">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm">
                    Redirecting to dashboard in <span className="font-bold">{countdown}</span> seconds...
                  </p>
                </div>
              </div>

              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
                size="lg"
              >
                Go to Dashboard Now
              </Button>

              <p className="text-xs text-muted-foreground">
                If you're not redirected automatically, click the button above
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  )
}
