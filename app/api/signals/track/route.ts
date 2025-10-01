import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const {
      session_id,
      company_id,
      visitor_id,
      page_url,
      page_title,
      page_type,
      time_on_page,
      scroll_depth,
      clicks,
      form_interactions,
      event_type,
      metadata
    } = body

    // Validate required fields
    if (!session_id || !visitor_id || !page_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Determine page type if not provided
    const actualPageType = page_type || determinePageType(page_url)

    // Check if this is a high-intent activity
    const isHighIntent = ['pricing', 'demo', 'contact', 'trial'].includes(actualPageType)

    // For high-intent pages or significant engagement, create a buying signal
    if (isHighIntent || (time_on_page && time_on_page > 60)) {
      // Calculate signal strength based on activity
      let signalStrength = 5.0 // Base score

      if (actualPageType === 'demo') signalStrength = 9.0
      else if (actualPageType === 'pricing') signalStrength = 7.5
      else if (actualPageType === 'contact') signalStrength = 8.0

      // Adjust for engagement
      if (time_on_page) {
        if (time_on_page > 120) signalStrength += 1.0
        else if (time_on_page > 60) signalStrength += 0.5
      }

      if (scroll_depth && scroll_depth > 75) signalStrength += 0.5
      if (form_interactions) signalStrength += 1.5

      signalStrength = Math.min(signalStrength, 10)

      // Create buying signal
      const { data: signal, error: signalError } = await supabase
        .from('buying_signals')
        .insert({
          company_id,
          signal_type: 'web_activity',
          signal_category: 'intent',
          signal_strength: signalStrength,
          confidence_score: 0.8,
          source: 'website',
          source_url: page_url,
          title: `${actualPageType.charAt(0).toUpperCase() + actualPageType.slice(1)} Page Visit`,
          description: `Visited ${actualPageType} page${time_on_page ? ` for ${Math.round(time_on_page / 60)} minutes` : ''}`,
          raw_data: body,
          metadata: {
            page_type: actualPageType,
            session_id,
            visitor_id,
            time_on_page,
            scroll_depth,
            clicks,
            form_interactions,
            ...metadata
          }
        })
        .select()
        .single()

      if (!signalError && signal) {
        // Record web activity
        await supabase.from('web_activity_signals').insert({
          signal_id: signal.id,
          company_id,
          session_id,
          visitor_id,
          page_url,
          page_title,
          page_type: actualPageType,
          time_on_page,
          scroll_depth,
          clicks,
          form_interactions
        })

        // Update company signal summary
        if (company_id) {
          await updateCompanySignalSummary(supabase, company_id)
        }
      }
    }

    // Always record basic web activity for analytics
    await supabase.from('events').insert({
      event_type: event_type || 'web_activity',
      event_data: {
        session_id,
        company_id,
        visitor_id,
        page_url,
        page_title,
        page_type: actualPageType,
        time_on_page,
        scroll_depth,
        clicks,
        form_interactions,
        metadata
      }
    })

    return NextResponse.json({
      success: true,
      tracked: true
    })

  } catch (error) {
    console.error('[API] Tracking error:', error)
    // Don't return error to avoid breaking client-side tracking
    return NextResponse.json({
      success: false,
      tracked: false
    })
  }
}

function determinePageType(url: string): string {
  const path = new URL(url).pathname.toLowerCase()

  if (path.includes('pricing') || path.includes('plans')) return 'pricing'
  if (path.includes('demo') || path.includes('trial')) return 'demo'
  if (path.includes('contact') || path.includes('sales')) return 'contact'
  if (path.includes('features') || path.includes('product')) return 'features'
  if (path.includes('blog') || path.includes('resources')) return 'content'
  if (path.includes('about')) return 'about'
  if (path === '/' || path === '') return 'homepage'

  return 'other'
}

async function updateCompanySignalSummary(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string) {
  try {
    // Get recent signals
    const { data: signals } = await supabase
      .from('buying_signals')
      .select('*')
      .eq('company_id', companyId)
      .gte('detected_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
      .order('signal_strength', { ascending: false })

    if (!signals || signals.length === 0) return

    // Calculate intent score
    let weightedSum = 0
    let totalWeight = 0

    for (const signal of signals) {
      const age = (Date.now() - new Date(signal.detected_at).getTime()) / (1000 * 60 * 60 * 24)
      const recency = age < 7 ? 1.0 : age < 30 ? 0.7 : age < 90 ? 0.4 : 0.2
      weightedSum += signal.signal_strength * recency
      totalWeight += recency
    }

    const intentScore = totalWeight > 0 ? (weightedSum / totalWeight) * 10 : 0

    // Determine intent level
    const intentLevel =
      intentScore >= 80 ? 'hot' :
      intentScore >= 60 ? 'warm' :
      intentScore >= 40 ? 'lukewarm' :
      intentScore >= 20 ? 'cold' :
      'no_intent'

    // Update summary
    await supabase.from('company_signal_summary').upsert({
      company_id: companyId,
      total_signals: signals.length,
      intent_score: Math.round(intentScore),
      intent_level: intentLevel,
      top_signals: signals.slice(0, 5),
      last_signal_date: signals[0].detected_at,
      updated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('[API] Error updating signal summary:', error)
  }
}