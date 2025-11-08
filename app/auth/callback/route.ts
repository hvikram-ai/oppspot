import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  const origin = requestUrl.origin

  if (code) {
    // OAuth callback
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successful authentication - redirect to intended destination
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    // Error handling
    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error.message)}`)
  }

  if (token_hash && type) {
    // Email verification or password reset callback
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    })

    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser()

      // Check if this is a new user (no profile yet)
      if (user && (type === 'magiclink' || type === 'email')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        // New user - create profile from user metadata
        if (!profile) {
          console.log('[Auth Callback] New user detected, creating profile:', user.email)

          // Get metadata from user (set during magic link signup)
          const { full_name, company_name } = user.user_metadata || {}

          // If we have company info, create full account setup
          if (company_name) {
            try {
              // Call signup API to create organization + profile
              await fetch(`${origin}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.id,
                  email: user.email,
                  fullName: full_name || user.email?.split('@')[0] || 'User',
                  companyName: company_name,
                  role: 'admin',
                }),
              })
              console.log('[Auth Callback] Profile created successfully')
            } catch (err) {
              console.error('[Auth Callback] Failed to create profile:', err)
            }
          } else {
            // Simple profile creation for magic link login (no signup data)
            try {
              await supabase.from('profiles').insert({
                id: user.id,
                full_name: user.email?.split('@')[0] || 'User',
                email: user.email,
                role: 'member',
                preferences: {
                  email_notifications: true,
                  weekly_digest: true,
                },
                onboarding_completed: false,
                trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              })
              console.log('[Auth Callback] Simple profile created')
            } catch (err) {
              console.error('[Auth Callback] Failed to create simple profile:', err)
            }
          }
        }
      }

      // Redirect based on the type
      if (type === 'magiclink') {
        // Magic link login - show success page then redirect to dashboard
        return NextResponse.redirect(`${origin}/auth/magic-success`)
      } else if (type === 'email' || type === 'signup') {
        // Email verification successful
        return NextResponse.redirect(`${origin}/auth/verify-success`)
      } else if (type === 'recovery') {
        // Password reset - redirect to reset password form
        return NextResponse.redirect(`${origin}/reset-password`)
      } else if (type === 'invite') {
        // User invitation
        return NextResponse.redirect(`${origin}/onboarding`)
      } else {
        // Default redirect
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    // Error handling
    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error.message)}`)
  }

  // No code or token_hash provided - might be a direct visit
  return NextResponse.redirect(`${origin}/login`)
}