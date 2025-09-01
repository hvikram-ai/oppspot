import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, email, fullName, companyName, role } = body

    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Component context
            }
          },
        },
      }
    )

    // Create organization
    const orgSlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 7)

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: companyName,
        slug: orgSlug,
        settings: {},
        subscription_tier: 'trial',
        onboarding_step: 0,
        industry: null,
        company_size: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .single() as any

    if (orgError || !org) {
      console.error('Error creating organization:', orgError)
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    // Update user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        org_id: org.id,
        full_name: fullName,
        role: role,
        preferences: {
          email_notifications: true,
          weekly_digest: true,
        },
        streak_count: 0,
        last_active: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
        onboarding_completed: false,
        email_verified_at: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any) as any

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }

    // Log signup event (optional - only if events table exists)
    try {
      await supabase
        .from('events')
        .insert({
          user_id: userId,
          event_type: 'signup_completed',
          metadata: {
            email,
            company_name: companyName,
            role,
            signup_source: 'web',
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
    } catch (eventError) {
      // Events table might not exist yet, that's okay
      console.log('Event logging skipped:', eventError)
    }

    // Send welcome email
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const verificationUrl = `${appUrl}/auth/verify?email=${encodeURIComponent(email)}`
      
      await fetch(`${appUrl}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'welcome',
          to: email,
          data: {
            firstName: fullName.split(' ')[0],
            verificationUrl,
          },
        }),
      })
      console.log('Welcome email sent to:', email)
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail the signup if email fails
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      message: 'Account created successfully',
    })
  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}