import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DataCollector } from '@/lib/analytics/data-collector'

// POST: Collect market metrics
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication and admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'admin' && profile?.role !== 'analyst') {
      return NextResponse.json({ error: 'Admin or analyst access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { category, locationId, collectSignals = false } = body
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }
    
    const collector = new DataCollector()
    
    // Collect market metrics
    const metrics = await collector.collectMarketMetrics(category, locationId)
    
    // Optionally collect market signals
    let signals = []
    if (collectSignals) {
      signals = await collector.collectMarketSignals(category, locationId)
    }
    
    return NextResponse.json({
      message: 'Data collected successfully',
      metrics: metrics.length,
      signals: signals.length
    })
    
  } catch (error) {
    console.error('Error collecting data:', error)
    return NextResponse.json(
      { error: 'Failed to collect data' },
      { status: 500 }
    )
  }
}

// GET: Get preprocessed data for analysis
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
    const days = parseInt(searchParams.get('days') || '90')
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }
    
    const collector = new DataCollector()
    const preprocessedData = await collector.preprocessDataForAnalysis(
      category,
      locationId || undefined,
      days
    )
    
    return NextResponse.json({
      data: preprocessedData
    })
    
  } catch (error) {
    console.error('Error preprocessing data:', error)
    return NextResponse.json(
      { error: 'Failed to preprocess data' },
      { status: 500 }
    )
  }
}