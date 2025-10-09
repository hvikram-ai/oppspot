import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import type { Row } from '@/lib/supabase/helpers'

// Admin API endpoint to create premium accounts
// Protected by API key for security

export async function POST(request: Request) {
  try {
    // Check for admin API key
    const headersList = await headers()
    const apiKey = headersList.get('x-admin-api-key')
    
    // You should set this in your environment variables
    const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'your-secure-admin-api-key-here'
    
    if (!apiKey || apiKey !== ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email, password, fullName, companyName, role = 'admin', tier = 'premium' } = body

    // Validate required fields
    if (!email || !password || !fullName || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, fullName, companyName' },
        { status: 400 }
      )
    }

    // Create Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Create the user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        company_name: companyName,
        role,
      },
    })

    if (authError) {
      return NextResponse.json(
        { error: `Failed to create user: ${authError.message}` },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'No user data returned' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // Create organization
    const orgSlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 7)

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: companyName,
        slug: orgSlug,
        settings: {},
        subscription_tier: tier,
        onboarding_step: 999, // Mark as completed
      })
      .select()
      .single()

    if (orgError) {
      // Clean up user if org creation fails
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: `Failed to create organization: ${orgError.message}` },
        { status: 500 }
      )
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        org_id: orgData.id,
        full_name: fullName,
        role,
        preferences: {
          email_notifications: true,
          weekly_digest: true,
        },
        streak_count: 0,
        last_active: new Date().toISOString(),
        trial_ends_at: null, // No trial for premium users
        onboarding_completed: true, // Skip onboarding
        email_verified_at: new Date().toISOString(), // Pre-verified
      })

    if (profileError) {
      // Clean up
      await supabase.from('organizations').delete().eq('id', orgData.id)
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    // Return success with account details
    return NextResponse.json({
      success: true,
      message: 'Premium account created successfully',
      account: {
        userId,
        email,
        fullName,
        companyName,
        organizationId: orgData.id,
        organizationSlug: orgData.slug,
        subscriptionTier: tier,
      },
      credentials: {
        email,
        password,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
      },
    })

  } catch (error) {
    console.error('Error creating premium account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check if the API is working
export async function GET() {
  return NextResponse.json({
    message: 'Admin Create Account API',
    usage: 'POST request with admin API key and user details',
    requiredHeaders: {
      'x-admin-api-key': 'Your admin API key',
      'Content-Type': 'application/json',
    },
    requiredBody: {
      email: 'User email',
      password: 'User password',
      fullName: 'User full name',
      companyName: 'Company name',
      role: 'User role (optional, default: admin)',
      tier: 'Subscription tier (optional, default: premium)',
    },
  })
}