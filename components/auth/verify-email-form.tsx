'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Mail, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function VerifyEmailForm() {
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email')
  
  const [email, setEmail] = useState(emailParam || '')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && !user.email_confirmed_at) {
      setEmail(user.email || '')
    }
  }, [supabase])

  useEffect(() => {
    // Check if user is already logged in
    checkUser()
  }, [checkUser])

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)

    try {
      // First, check if user exists and needs verification
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send verification email')
        toast.error(data.error || 'Failed to send verification email')
      } else {
        setSent(true)
        toast.success('Verification email sent!')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a verification link to {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Click the link in the email to verify your account. The link will expire in 24 hours.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium">Didn&apos;t receive the email?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your spam or junk folder</li>
              <li>Make sure {email} is correct</li>
              <li>Wait a few minutes and try again</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSent(false)
              setEmail('')
            }}
          >
            Try another email
          </Button>
          <Link href="/dashboard" className="w-full">
            <Button variant="ghost" className="w-full">
              Go to dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          We&apos;ll send you a link to verify your email address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendVerification} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending verification...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send verification email
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <div className="w-full text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Already verified?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Having trouble?{' '}
            <Link href="/support" className="text-primary hover:underline">
              Contact support
            </Link>
          </p>
        </div>
      </CardFooter>
    </Card>
  )
}