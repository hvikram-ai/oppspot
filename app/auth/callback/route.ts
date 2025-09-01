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
      // Redirect based on the type
      if (type === 'email' || type === 'signup') {
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