import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, email, fullName, companyName, role } = body

    const supabase = await createClient()

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
        settings: {
          industry: null,
          company_size: null,
        },
        subscription_tier: 'trial',
      })
      .select()
      .single()

    if (orgError) {
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
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }

    // Log signup event
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
      })

    // Schedule welcome email (in production, use a queue service)
    // For now, we'll just log it
    console.log('Welcome email scheduled for:', email)
    
    // Schedule verification reminder for 5 minutes later
    setTimeout(() => {
      console.log('Verification reminder scheduled for:', email)
    }, 5 * 60 * 1000)

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