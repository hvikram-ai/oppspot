'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Home, ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('message') || 'An authentication error occurred'
  const errorCode = searchParams.get('code')

  // Provide user-friendly error messages
  const getErrorMessage = (error: string) => {
    if (error.includes('Email not confirmed')) {
      return {
        title: 'Email Not Verified',
        message: 'Please verify your email address before signing in.',
        action: 'resend'
      }
    }
    if (error.includes('Invalid login')) {
      return {
        title: 'Invalid Credentials',
        message: 'The email or password you entered is incorrect.',
        action: 'retry'
      }
    }
    if (error.includes('expired')) {
      return {
        title: 'Link Expired',
        message: 'This link has expired. Please request a new one.',
        action: 'resend'
      }
    }
    if (error.includes('User already registered')) {
      return {
        title: 'Account Already Exists',
        message: 'An account with this email already exists.',
        action: 'login'
      }
    }
    return {
      title: 'Authentication Error',
      message: error,
      action: 'retry'
    }
  }

  const errorInfo = getErrorMessage(error)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Simple Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center space-x-2 w-fit">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl">oppSpot</span>
          </Link>
        </div>
      </div>

      {/* Error Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle>{errorInfo.title}</CardTitle>
              <CardDescription>{errorInfo.message}</CardDescription>
            </CardHeader>
            <CardContent>
              {errorCode && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Error code: {errorCode}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">What you can do:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {errorInfo.action === 'resend' && (
                    <>
                      <li>" Check your email for a verification link</li>
                      <li>" Request a new verification email</li>
                      <li>" Check your spam folder</li>
                    </>
                  )}
                  {errorInfo.action === 'retry' && (
                    <>
                      <li>" Double-check your email and password</li>
                      <li>" Reset your password if you've forgotten it</li>
                      <li>" Contact support if the problem persists</li>
                    </>
                  )}
                  {errorInfo.action === 'login' && (
                    <>
                      <li>" Try signing in with your existing account</li>
                      <li>" Reset your password if needed</li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              {errorInfo.action === 'resend' && (
                <Link href="/auth/verify" className="w-full">
                  <Button className="w-full">
                    Resend Verification Email
                  </Button>
                </Link>
              )}
              {errorInfo.action === 'retry' && (
                <Link href="/login" className="w-full">
                  <Button className="w-full">
                    Try Again
                  </Button>
                </Link>
              )}
              {errorInfo.action === 'login' && (
                <Link href="/login" className="w-full">
                  <Button className="w-full">
                    Sign In
                  </Button>
                </Link>
              )}
              
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
              
              <Link href="/support" className="w-full">
                <Button variant="ghost" className="w-full text-sm">
                  Need help? Contact support
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}