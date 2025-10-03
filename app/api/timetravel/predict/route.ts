import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface PredictionFeatures {
  signals_30d: number
  signals_60d: number
  signals_90d: number
  signal_velocity: number
  funding_signals: number
  hiring_signals: number
  technology_signals: number
  expansion_signals: number
  executive_signals: number
  financial_signals: number
  has_funding_hiring_combo: boolean
  has_expansion_tech_combo: boolean
  signal_momentum: string
}

interface PredictionResult {
  buying_probability: number
  predicted_timeline_days: number
  confidence_level: 'high' | 'medium' | 'low'
  signal_count_30d: number
  signal_count_60d: number
  signal_count_90d: number
  signal_velocity: number
  strongest_signals: string[]
  composite_signals: string[]
  recommended_actions: string[]
  priority_score: number
}

// Rule-based prediction engine
function calculatePrediction(features: PredictionFeatures): PredictionResult {
  let buying_probability = 0
  let confidence_level: 'high' | 'medium' | 'low' = 'low'
  let predicted_timeline_days = 90
  const strongest_signals: string[] = []
  const composite_signals: string[] = []
  const recommended_actions: string[] = []

  // Calculate base probability from signal count
  if (features.signals_30d >= 5) {
    buying_probability += 40
    strongest_signals.push('high_recent_activity')
  } else if (features.signals_30d >= 3) {
    buying_probability += 25
  } else if (features.signals_30d >= 1) {
    buying_probability += 10
  }

  // Velocity bonus
  if (features.signal_velocity > 1.5) {
    buying_probability += 20
    strongest_signals.push('accelerating_momentum')
    predicted_timeline_days = 30
  } else if (features.signal_velocity > 1.0) {
    buying_probability += 10
    predicted_timeline_days = 60
  }

  // Signal type bonuses
  if (features.funding_signals > 0) {
    buying_probability += 15
    strongest_signals.push('funding_event')
    recommended_actions.push('Reference recent funding in outreach')
  }

  if (features.hiring_signals >= 3) {
    buying_probability += 10
    strongest_signals.push('aggressive_hiring')
    recommended_actions.push('Highlight team scaling solutions')
  }

  if (features.executive_signals > 0) {
    buying_probability += 12
    strongest_signals.push('leadership_change')
    recommended_actions.push('Reach out to new executive directly')
  }

  if (features.technology_signals > 0) {
    buying_probability += 8
    strongest_signals.push('tech_adoption')
  }

  if (features.expansion_signals > 0) {
    buying_probability += 10
    strongest_signals.push('expansion_activity')
    recommended_actions.push('Position for scaling infrastructure')
  }

  // Composite patterns (powerful signals)
  if (features.has_funding_hiring_combo) {
    buying_probability += 15
    composite_signals.push('funding_hiring_combo')
    confidence_level = 'high'
    recommended_actions.push('High-intent prospect - prioritize immediate outreach')
  }

  if (features.has_expansion_tech_combo) {
    buying_probability += 12
    composite_signals.push('expansion_tech_combo')
  }

  // Momentum adjustment
  if (features.signal_momentum === 'accelerating') {
    buying_probability += 10
    strongest_signals.push('momentum_accelerating')
  } else if (features.signal_momentum === 'decelerating') {
    buying_probability -= 5
  }

  // Cap at 100
  buying_probability = Math.min(100, Math.max(0, buying_probability))

  // Determine confidence
  if (buying_probability >= 70 && features.signals_30d >= 4) {
    confidence_level = 'high'
  } else if (buying_probability >= 50 || features.signals_30d >= 2) {
    confidence_level = 'medium'
  } else {
    confidence_level = 'low'
  }

  // Calculate priority score (0-100)
  const priority_score = Math.round(
    buying_probability * 0.6 +
    Math.min(features.signals_30d * 5, 20) +
    (confidence_level === 'high' ? 20 : confidence_level === 'medium' ? 10 : 0)
  )

  // Default recommendations
  if (recommended_actions.length === 0) {
    recommended_actions.push('Monitor for additional signals')
    recommended_actions.push('Research company growth indicators')
  }

  return {
    buying_probability: Math.round(buying_probability * 100) / 100,
    predicted_timeline_days,
    confidence_level,
    signal_count_30d: features.signals_30d,
    signal_count_60d: features.signals_60d,
    signal_count_90d: features.signals_90d,
    signal_velocity: features.signal_velocity,
    strongest_signals,
    composite_signals,
    recommended_actions,
    priority_score: Math.min(100, priority_score)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const body = await request.json()
    const { company_id } = body

    if (!company_id) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400 })
    }

    // Get or refresh signal aggregates
    const { data: aggregate, error: aggError } = await supabase
      .from('signal_aggregates')
      .select('*')
      .eq('company_id', company_id)
      .single()

    if (aggError && aggError.code !== 'PGRST116') {
      throw aggError
    }

    // If no aggregate exists, refresh it
    if (!aggregate) {
      await supabase.rpc('refresh_signal_aggregates', { p_company_id: company_id })

      // Fetch again
      const { data: newAggregate } = await supabase
        .from('signal_aggregates')
        .select('*')
        .eq('company_id', company_id)
        .single()

      if (!newAggregate) {
        return NextResponse.json({
          error: 'No signals found for this company',
          prediction: null
        }, { status: 200 })
      }
    }

    const signalData = aggregate || {}

    // Calculate prediction
    const prediction = calculatePrediction({
      signals_30d: signalData.signals_30d || 0,
      signals_60d: signalData.signals_60d || 0,
      signals_90d: signalData.signals_90d || 0,
      signal_velocity: signalData.signal_velocity_30d || 0,
      funding_signals: signalData.funding_signals || 0,
      hiring_signals: signalData.hiring_signals || 0,
      technology_signals: signalData.technology_signals || 0,
      expansion_signals: signalData.expansion_signals || 0,
      executive_signals: signalData.executive_signals || 0,
      financial_signals: signalData.financial_signals || 0,
      has_funding_hiring_combo: signalData.has_funding_hiring_combo || false,
      has_expansion_tech_combo: signalData.has_expansion_tech_combo || false,
      signal_momentum: signalData.signal_momentum || 'stable'
    })

    // Save prediction to database
    const { data: savedPrediction, error: saveError } = await supabase
      .from('predictive_scores')
      .upsert({
        company_id,
        org_id: profile.org_id,
        buying_probability: prediction.buying_probability,
        predicted_timeline_days: prediction.predicted_timeline_days,
        confidence_level: prediction.confidence_level,
        signal_count_30d: prediction.signal_count_30d,
        signal_count_60d: prediction.signal_count_60d,
        signal_count_90d: prediction.signal_count_90d,
        signal_velocity: prediction.signal_velocity,
        strongest_signals: prediction.strongest_signals,
        composite_signals: prediction.composite_signals,
        recommended_actions: prediction.recommended_actions,
        priority_score: prediction.priority_score,
        model_version: '1.0.0',
        model_type: 'rule_based',
        model_confidence: prediction.buying_probability,
        features_used: signalData,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id,org_id'
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving prediction:', saveError)
    }

    // Check if alert should be created
    if (prediction.buying_probability >= 75 && prediction.confidence_level === 'high') {
      await supabase
        .from('prediction_alerts')
        .insert({
          prediction_id: savedPrediction?.id,
          company_id,
          org_id: profile.org_id,
          alert_type: 'high_probability',
          alert_priority: 'critical',
          alert_message: `${prediction.buying_probability}% buying probability detected with ${prediction.signal_count_30d} signals in the last 30 days`
        })
    }

    return NextResponse.json({
      success: true,
      prediction: savedPrediction || prediction
    })

  } catch (error: any) {
    console.error('Prediction error:', error)
    return NextResponse.json({
      error: error.message || 'Prediction failed'
    }, { status: 500 })
  }
}

// GET: Retrieve predictions for org
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')
    const min_probability = searchParams.get('min_probability') || '0'
    const limit = searchParams.get('limit') || '100'

    let query = supabase
      .from('predictive_scores')
      .select(`
        *,
        businesses:company_id (
          id,
          name,
          website,
          location,
          industry,
          employee_count
        )
      `)
      .gte('buying_probability', parseFloat(min_probability))
      .order('priority_score', { ascending: false })
      .limit(parseInt(limit))

    if (company_id) {
      query = query.eq('company_id', company_id)
    }

    const { data: predictions, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      predictions
    })

  } catch (error: any) {
    console.error('Fetch predictions error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to fetch predictions'
    }, { status: 500 })
  }
}
