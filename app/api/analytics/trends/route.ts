import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TrendAnalyzer } from '@/lib/analytics/trend-analyzer'
import type { Row } from '@/lib/supabase/helpers'

// GET: Fetch trend analysis
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get('entityType') as 'market' | 'category' | 'location' | 'business'
    const entityId = searchParams.get('entityId')
    const periodDays = parseInt(searchParams.get('periodDays') || '30')
    
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Entity type and ID are required' },
        { status: 400 }
      )
    }
    
    // Get existing analysis from database
    const { data: existingAnalysis, error: existingAnalysisError } = await supabase
      .from('trend_analysis')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('period_days', periodDays)
      .order('analysis_date', { ascending: false })
      .limit(1)
    
    // Check if we have recent analysis (within last 24 hours)
    const recentAnalysis = existingAnalysis?.[0]
    const isRecent = recentAnalysis && 
      (new Date().getTime() - new Date(recentAnalysis.created_at).getTime()) < 24 * 60 * 60 * 1000
    
    if (isRecent) {
      return NextResponse.json({
        analysis: recentAnalysis,
        cached: true
      })
    }
    
    // Generate new analysis
    const analyzer = new TrendAnalyzer()
    const analysis = await analyzer.analyzeTrends(entityType, entityId, periodDays)
    
    return NextResponse.json({
      analysis,
      cached: false
    })
    
  } catch (error) {
    console.error('Error fetching trend analysis:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trend analysis' },
      { status: 500 }
    )
  }
}

// POST: Generate new trend analysis
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { entityType, entityId, periodDays = 30, force = false } = body
    
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Entity type and ID are required' },
        { status: 400 }
      )
    }
    
    // Check for existing recent analysis unless forced
    if (!force) {
      const { data: existingAnalysis, error: existingAnalysisError } = await supabase
        .from('trend_analysis')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('period_days', periodDays)
        .order('analysis_date', { ascending: false })
        .limit(1)
      
      const recentAnalysis = existingAnalysis?.[0]
      const isRecent = recentAnalysis && 
        (new Date().getTime() - new Date(recentAnalysis.created_at).getTime()) < 24 * 60 * 60 * 1000
      
      if (isRecent) {
        return NextResponse.json({
          message: 'Recent analysis already exists',
          analysis: recentAnalysis
        })
      }
    }
    
    // Generate new analysis
    const analyzer = new TrendAnalyzer()
    const analysis = await analyzer.analyzeTrends(entityType, entityId, periodDays)
    
    return NextResponse.json({
      message: 'Trend analysis generated successfully',
      analysis
    })
    
  } catch (error) {
    console.error('Error generating trend analysis:', error)
    return NextResponse.json(
      { error: 'Failed to generate trend analysis' },
      { status: 500 }
    )
  }
}

// DELETE: Clear old trend analyses
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication and admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const daysOld = parseInt(searchParams.get('daysOld') || '30')
    
    // Delete analyses older than specified days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    
    const { error } = await supabase
      .from('trend_analysis')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
    
    if (error) throw error
    
    return NextResponse.json({
      message: `Deleted trend analyses older than ${daysOld} days`
    })
    
  } catch (error) {
    console.error('Error deleting trend analyses:', error)
    return NextResponse.json(
      { error: 'Failed to delete trend analyses' },
      { status: 500 }
    )
  }
}