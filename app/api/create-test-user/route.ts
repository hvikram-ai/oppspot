import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'

type DbClient = SupabaseClient<Database>

// This is a development-only endpoint for creating test users
export async function POST(request: NextRequest) {
  try {
    // Only allow in development or with specific API key
    const apiKey = request.headers.get('x-api-key')
    const isDevelopment = process.env.NODE_ENV === 'development'
    const validApiKey = process.env.TEST_USER_API_KEY || 'test-key-12345'

    if (!isDevelopment && apiKey !== validApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized - This endpoint is only available in development' },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    
    // Create test user credentials
    const testEmail = 'test@oppspot.com'
    const testPassword = 'TestUser123!'
    const testData = {
      full_name: 'Test User',
      company_name: 'Test Company Ltd',
      role: 'founder'
    }

    console.log('Creating test user with Supabase...')

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: testData
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: `Failed to create user: ${authError.message}` },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user - no user data returned' },
        { status: 500 }
      )
    }

    console.log('User created, setting up profile...')

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: testData.company_name,
        slug: 'test-company-ltd',
        subscription_tier: 'premium', // Give premium access
        settings: {
          features: {
            opp_scan: true,
            advanced_search: true,
            premium_data: true
          }
        },
        status: 'active'
      })
      .select()
      .single()

    if (orgError) {
      console.error('Org error:', orgError)
      // Continue even if org creation fails
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        org_id: org?.id,
        full_name: testData.full_name,
        role: testData.role,
        onboarding_completed: true, // Skip onboarding
        settings: {
          notifications: {
            email: true,
            push: false
          },
          preferences: {
            theme: 'light',
            dashboard_layout: 'standard'
          }
        }
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    // Create some sample data
    await createSampleData(supabase, authData.user.id, org?.id)

    return NextResponse.json({
      success: true,
      message: 'Test user created successfully',
      credentials: {
        email: testEmail,
        password: testPassword
      },
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: testData.full_name,
        company: testData.company_name,
        role: testData.role,
        organization_id: org?.id,
        subscription_tier: 'premium'
      },
      instructions: [
        '1. Go to /login',
        `2. Use email: ${testEmail}`,
        `3. Use password: ${testPassword}`,
        '4. You will be logged in with premium access'
      ]
    })

  } catch (error) {
    console.error('Unexpected error creating test user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create some sample data for the test user
async function createSampleData(supabase: DbClient, userId: string, orgId?: string) {
  try {
    // Create a sample search
    await supabase
      .from('searches')
      .insert({
        user_id: userId,
        query: 'technology companies London',
        filters: {
          location: 'London',
          industry: 'Technology',
          size: 'small'
        },
        results_count: 25
      })

    // Create a sample business list
    await supabase
      .from('lists')
      .insert({
        org_id: orgId,
        created_by: userId,
        name: 'London Tech Prospects',
        description: 'Potential technology companies for outreach',
        business_count: 12,
        settings: {
          visibility: 'private',
          auto_update: false
        }
      })

    console.log('Sample data created successfully')
  } catch (error) {
    console.error('Error creating sample data:', error)
    // Don't fail the entire process if sample data creation fails
  }
}