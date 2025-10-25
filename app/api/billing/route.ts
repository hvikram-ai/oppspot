/**
 * Billing API - Get User's Organization Billing Info
 * GET /api/billing - Get current user's organization subscription and billing info
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's profile to find org_id
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as Row<'profiles'> | null

    if (profileError) {
      console.error('Error fetching profile for billing:', profileError)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // If no organization, return free tier info
    if (!profile?.org_id) {
      return NextResponse.json({
        subscription_tier: 'free',
        trial_ends_at: null,
        is_trial: false,
        seats_used: 1,
        seats_limit: 1,
        monthly_spend: 0,
        billing_cycle_start: null,
        billing_cycle_end: null
      }, { status: 200 })
    }

    // Fetch organization billing details
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('subscription_tier, trial_ends_at, stripe_customer_id, stripe_subscription_id')
      .eq('id', profile.org_id)
      .single()

    const org = orgData as any

    if (orgError) {
      console.error('Error fetching organization billing:', orgError)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to fetch billing info' },
        { status: 500 }
      )
    }

    // Check if in trial period
    const isTrial = org?.trial_ends_at ? new Date(org.trial_ends_at as string | number | Date) > new Date() : false

    // Count organization members
    const { count: seatsUsed } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', profile.org_id)

    // Determine seat limits based on subscription tier
    const tierLimits: Record<string, number> = {
      free: 1,
      starter: 5,
      professional: 20,
      premium: 50,
      enterprise: 999
    }

    const seatsLimit = tierLimits[org?.subscription_tier || 'free'] || 1

    // Build billing response
    const billingInfo = {
      subscription_tier: org?.subscription_tier || 'free',
      trial_ends_at: org?.trial_ends_at,
      is_trial: isTrial,
      seats_used: seatsUsed || 1,
      seats_limit: seatsLimit,
      has_payment_method: !!org?.stripe_customer_id,
      is_subscribed: !!org?.stripe_subscription_id,
      // Additional fields can be added as needed
      monthly_spend: 0, // TODO: Calculate from usage metrics
      billing_cycle_start: null, // TODO: Get from Stripe
      billing_cycle_end: null // TODO: Get from Stripe
    }

    return NextResponse.json(billingInfo, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in GET /api/billing:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
