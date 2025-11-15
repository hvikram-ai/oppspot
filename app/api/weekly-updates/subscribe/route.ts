import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SubscribeRequest, SubscribeResponse } from '@/types/updates'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body: SubscribeRequest = await request.json()

    const { email, user_id } = body

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('update_subscriptions')
      .select('id, unsubscribed_at')
      .eq('email', email)
      .single()

    if (existing) {
      if (existing.unsubscribed_at) {
        // Re-subscribe
        const { error: updateError } = await supabase
          .from('update_subscriptions')
          .update({ unsubscribed_at: null })
          .eq('email', email)

        if (updateError) {
          console.error('Error re-subscribing:', updateError)
          return NextResponse.json(
            { success: false, message: 'Failed to subscribe' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Successfully re-subscribed to weekly updates',
          subscription_id: existing.id
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Already subscribed to weekly updates',
        subscription_id: existing.id
      })
    }

    // Create new subscription
    const { data: subscription, error: insertError } = await supabase
      .from('update_subscriptions')
      .insert({
        email,
        user_id: user_id || null
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error creating subscription:', insertError)
      return NextResponse.json(
        { success: false, message: 'Failed to subscribe' },
        { status: 500 }
      )
    }

    const response: SubscribeResponse = {
      success: true,
      message: 'Successfully subscribed to weekly updates!',
      subscription_id: subscription.id
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in subscribe API:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      )
    }

    // Soft delete (mark as unsubscribed)
    const { error: updateError } = await supabase
      .from('update_subscriptions')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('email', email)

    if (updateError) {
      console.error('Error unsubscribing:', updateError)
      return NextResponse.json(
        { success: false, message: 'Failed to unsubscribe' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from weekly updates'
    })
  } catch (error) {
    console.error('Unexpected error in unsubscribe API:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
