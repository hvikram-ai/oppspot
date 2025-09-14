import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, email, fullName, companyName, role } = body

    // Use service-role admin client to bypass RLS for initial account provisioning
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars for admin client')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }
    const supabase = createSupabaseAdminClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Create organization
    const orgSlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 7)

    // Prefer secure RPC function if present, else direct insert
    let org: any = null
    let orgError: any = null
    try {
      const { data: rpcId, error: rpcError } = await supabase
        .rpc('create_organization_for_user', {
          user_id: userId,
          company_name: companyName,
          company_industry: null,
          company_size: null,
        })
      if (rpcError) throw rpcError
      if (rpcId) {
        const { data: orgRow, error: orgFetchErr } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', rpcId)
          .single()
        if (orgFetchErr) throw orgFetchErr
        org = orgRow
      }
    } catch (rpcFail) {
      // Fallback to direct insert (still safe via service role)
      const { data: orgRow, error: insertErr } = await supabase
        .from('organizations')
        .insert({
          name: companyName,
          slug: orgSlug,
          settings: {},
          subscription_tier: 'trial',
          onboarding_step: 0,
          industry: null,
          company_size: null,
        } as any)
        .select()
        .single()
      org = orgRow
      orgError = insertErr
    }

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
        email: email,
        role: role,
        preferences: {
          email_notifications: true,
          weekly_digest: true,
        },
        streak_count: 0,
        last_active: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days trial
        onboarding_completed: false,
      } as any)

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
          org_id: org.id,
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
      // Use production URL in production, localhost in development
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
        (process.env.NODE_ENV === 'production' ? 'https://oppspot.vercel.app' : 'http://localhost:3000')
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
