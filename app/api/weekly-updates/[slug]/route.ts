import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateDetailResponse } from '@/types/updates'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const { slug } = await params

    // Get the update
    const { data: update, error: updateError } = await supabase
      .from('weekly_updates')
      .select('*')
      .eq('slug', slug)
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .single()

    if (updateError || !update) {
      return NextResponse.json(
        { error: 'Update not found' },
        { status: 404 }
      )
    }

    // Get update items
    const { data: items, error: itemsError } = await supabase
      .from('update_items')
      .select('*')
      .eq('update_id', update.id)
      .order('sort_order', { ascending: true })

    if (itemsError) {
      console.error('Error fetching update items:', itemsError)
    }

    // Get metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('update_metrics')
      .select('*')
      .eq('update_id', update.id)

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError)
    }

    // Get spotlight
    const { data: spotlight, error: spotlightError } = await supabase
      .from('update_spotlights')
      .select('*')
      .eq('update_id', update.id)
      .single()

    if (spotlightError && spotlightError.code !== 'PGRST116') {
      console.error('Error fetching spotlight:', spotlightError)
    }

    // Increment view count
    await supabase.rpc('increment_update_views', { p_update_id: update.id })

    const response: UpdateDetailResponse = {
      update,
      items: items || [],
      metrics: metrics || [],
      spotlight: spotlight || undefined
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in update detail API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
