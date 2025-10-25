import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Missing verification token or email' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify the email using Supabase auth
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (verifyError) {
      console.error('Email verification error:', verifyError)
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Update user profile to mark email as verified
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ 
          email_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      // Log the verification event
      await supabase.from('events').insert({
        user_id: user.id,
        event_type: 'email_verified',
        event_data: {
          email,
          verified_at: new Date().toISOString(),
        },
      })
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/auth/verify-success', request.url)
    )

  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Resend verification email
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })

    if (error) {
      console.error('Error resending verification email:', error)
      return NextResponse.json(
        { error: 'Failed to resend verification email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
    })

  } catch (error) {
    console.error('Error in verification endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}