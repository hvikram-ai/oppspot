'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo/demo-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import Link from 'next/link'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { enableDemoMode } = useDemoMode()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Sign in error details:', {
          message: error.message,
          status: error.status,
          code: error.code,
          name: error.name,
          fullError: error
        })
        
        // Provide more specific error messages
        if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
          // Log more details about the network error
          console.error('Network/fetch error detected. Possible causes:')
          console.error('1. CORS issues (check browser console Network tab)')
          console.error('2. Supabase service temporarily unavailable')
          console.error('3. Browser extensions blocking requests')
          
          toast.error('Network error: Unable to connect to authentication service. Please check your connection and try again.')
        } else if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please check your credentials and try again.')
        } else if (error.message.includes('infinite recursion')) {
          toast.error('Database configuration issue. Please contact support.')
          console.error('RLS policy error detected - infinite recursion in profiles table')
        } else {
          toast.error(error.message || 'An error occurred during sign in')
        }
      } else if (data?.user) {
        console.log('Login successful, user:', data.user.email)
        console.log('Session:', data.session ? 'Present' : 'Missing')
        
        toast.success('Welcome back!')
        
        // Ensure session is properly set before redirecting
        if (data.session) {
          // Give the session time to be stored in cookies
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Force a hard navigation to ensure cookies are sent
          window.location.href = '/dashboard'
        } else {
          console.error('No session returned despite successful login')
          toast.error('Session creation failed. Please try again.')
        }
      } else {
        toast.error('Sign in failed. Please try again.')
      }
    } catch (err) {
      console.error('Sign in error:', err)
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    // Redirect to dedicated signup page for better experience
    router.push('/signup')
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    // Always use the current window origin for OAuth callback
    // This works for any deployment URL automatically
    const redirectUrl = `${window.location.origin}/auth/callback`
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    })

    if (error) {
      console.error('Google OAuth error:', error)
      if (error.message.includes('OAuth')) {
        toast.error('Google sign-in is not configured. Please use email/password login or contact support.')
      } else {
        toast.error(error.message)
      }
    }
    setLoading(false)
  }

  const handleDemoLogin = async () => {
    setLoading(true)

    try {
      // Enable demo mode (this will show demo data and the demo banner)
      enableDemoMode()
      
      toast.success('Welcome to the oppSpot demo! 🚀', {
        description: 'You are now exploring the app with sample data. No registration required!',
        duration: 5000,
      })
      
      // Navigate to dashboard in demo mode
      router.push('/dashboard?demo=true')
    } catch (error) {
      toast.error('Failed to start demo mode')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome to oppSpot</CardTitle>
        <CardDescription>
          Sign in to discover UK & Ireland business opportunities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password">Password</Label>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <div className="w-full space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
          <Button
            variant="secondary"
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
            onClick={handleDemoLogin}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {loading ? 'Logging in...' : 'Try Demo (No Registration)'}
          </Button>
          <p className="text-xs text-center text-muted-foreground px-4">
            Demo mode lets you explore all features without creating an account
          </p>
        </div>
      </CardFooter>
    </Card>
  )
}