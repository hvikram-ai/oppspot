import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DemandForecaster } from '@/lib/analytics/demand-forecaster'

// GET: Fetch demand forecasts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const locationId = searchParams.get('locationId')
    const horizonDays = searchParams.get('horizonDays')
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }
    
    // Build query
    let query = supabase
      .from('demand_forecasts')
      .select('*')
      .eq('category', category)
    
    if (locationId) {
      query = query.eq('location_id', locationId)
    }
    
    if (horizonDays) {
      query = query.eq('forecast_horizon_days', parseInt(horizonDays))
    }
    
    const { data: forecasts, error } = await query
      .order('forecast_date', { ascending: false })
      .limit(10)
    
    if (error) throw error
    
    return NextResponse.json({
      forecasts: forecasts || []
    })
    
  } catch (error) {
    console.error('Error fetching forecasts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch forecasts' },
      { status: 500 }
    )
  }
}

// POST: Generate new demand forecast
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { category, locationId, horizonDays = 30, multiHorizon = false } = body
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }
    
    const forecaster = new DemandForecaster()
    
    if (multiHorizon) {
      // Generate forecasts for multiple time horizons
      const forecasts = await forecaster.multiHorizonForecast(category, locationId)
      
      return NextResponse.json({
        message: 'Multi-horizon forecasts generated successfully',
        forecasts
      })
    } else {
      // Generate single forecast
      const forecast = await forecaster.forecastDemand(category, locationId, horizonDays)
      
      return NextResponse.json({
        message: 'Forecast generated successfully',
        forecast
      })
    }
    
  } catch (error) {
    console.error('Error generating forecast:', error)
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    )
  }
}