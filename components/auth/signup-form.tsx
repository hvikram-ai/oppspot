'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Eye, EyeOff, Check, X, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface PasswordStrength {
  score: number
  message: string
  color: string
}

export function SignupForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
    role: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ 
    score: 0, 
    message: '', 
    color: '' 
  })
  
  const router = useRouter()
  const supabase = createClient()

  const checkPasswordStrength = (password: string): PasswordStrength => {
    let score = 0
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*]/.test(password),
    }

    Object.values(checks).forEach(passed => passed && score++)

    if (score <= 2) return { score, message: 'Weak', color: 'text-red-500' }
    if (score <= 3) return { score, message: 'Fair', color: 'text-orange-500' }
    if (score <= 4) return { score, message: 'Good', color: 'text-yellow-500' }
    return { score, message: 'Strong', color: 'text-green-500' }
  }

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password })
    setPasswordStrength(checkPasswordStrength(password))
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all required fields
    if (!formData.fullName.trim()) {
      toast.error('Please enter your full name')
      return
    }

    if (!formData.email.trim()) {
      toast.error('Please enter your email address')
      return
    }

    if (!validateEmail(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    if (!formData.password) {
      toast.error('Please enter a password')
      return
    }

    if (passwordStrength.score < 3) {
      toast.error('Please choose a stronger password')
      return
    }

    if (!formData.companyName.trim()) {
      toast.error('Please enter your company name')
      return
    }

    if (!formData.role) {
      toast.error('Please select your role')
      return
    }

    if (!agreedToTerms) {
      toast.error('Please agree to the terms and conditions')
      return
    }

    setLoading(true)

    // Validate Supabase public env at runtime (prevents "fetch Invalid value" from supabase-js)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined
    if (!supabaseUrl || !/^https?:\/\//.test(supabaseUrl) || !supabaseAnon) {
      console.error('Supabase env missing or invalid', { supabaseUrlPresent: !!supabaseUrl, supabaseAnonPresent: !!supabaseAnon })
      toast.error('Signup is temporarily unavailable: missing Supabase configuration. Please try again later.')
      setLoading(false)
      return
    }

    try {
      // Sign up with Supabase (auto-confirms if configured)
      console.log('Starting signup process...')
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName,
            role: formData.role,
          },
        },
      })

      if (error) {
        console.error('Supabase signup error:', error)
        throw error
      }

      if (data.user) {
        console.log('User created, calling API...')
        // Create organization and profile via API
        try {
          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              email: formData.email,
              fullName: formData.fullName,
              companyName: formData.companyName,
              role: formData.role,
            }),
          })

          if (!response.ok) {
            const errorData = await response.text()
            console.error('API response error:', errorData)
            throw new Error(`Failed to complete signup: ${response.status}`)
          }
          
          const result = await response.json()
          console.log('Signup API success:', result)
        } catch (fetchError) {
          console.error('Fetch error:', fetchError)
          // If the API call fails, we should still consider the user signed up
          // since the Supabase auth was successful
          toast.warning('Account created but profile setup incomplete. You can complete it later.')
        }

        // Success! User is automatically logged in
        toast.success('Welcome to oppSpot! Your account is ready.')
        
        // Redirect directly to dashboard
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Signup error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setLoading(true)
    // Use production URL for OAuth callback to avoid Vercel auth issues
    const redirectUrl = process.env.NODE_ENV === 'production' 
      ? 'https://oppspot.vercel.app/auth/callback'
      : `${window.location.origin}/auth/callback`
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    })

    if (error) {
      console.error('Google OAuth error:', error)
      if (error.message.includes('OAuth')) {
        toast.error('Google sign-in is not configured. Please use email/password registration or contact support.')
      } else {
        toast.error(error.message)
      }
    }
    setLoading(false)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start discovering business opportunities in seconds
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Work Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
              {formData.email && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {validateEmail(formData.email) ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {formData.password && (
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      passwordStrength.score === 1 ? 'w-1/5 bg-red-500' :
                      passwordStrength.score === 2 ? 'w-2/5 bg-orange-500' :
                      passwordStrength.score === 3 ? 'w-3/5 bg-yellow-500' :
                      passwordStrength.score === 4 ? 'w-4/5 bg-green-500' :
                      passwordStrength.score === 5 ? 'w-full bg-green-600' :
                      'w-0'
                    }`}
                  />
                </div>
                <span className={`text-xs ${passwordStrength.color}`}>
                  {passwordStrength.message}
                </span>
              </div>
            )}
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Acme Inc."
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Your Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
              disabled={loading}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="business-dev">Business Development</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="founder">Founder/CEO</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Terms */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              disabled={loading}
            />
            <label
              htmlFor="terms"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              I agree to the{' '}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !agreedToTerms}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
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
            onClick={handleGoogleSignUp}
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
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </CardFooter>
    </Card>
  )
}
