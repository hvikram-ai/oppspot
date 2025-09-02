/**
 * Similar Companies Detail API Routes
 * Detailed analysis results and operations for specific similarity analyses
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SimilarCompanyUseCase } from '@/lib/opp-scan/services/similar-company-use-case'

// GET: Get detailed analysis results
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const analysisId = params.id
    const searchParams = request.nextUrl.searchParams
    const includeMatches = searchParams.get('includeMatches') !== 'false'
    const includeExplanations = searchParams.get('includeExplanations') !== 'false'
    const matchLimit = parseInt(searchParams.get('matchLimit') || '50')

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query based on requested includes
    let selectQuery = `
      *,
      similar_company_matches!inner(
        id,
        company_name,
        company_data,
        overall_score,
        confidence,
        rank,
        financial_score,
        strategic_score,
        operational_score,
        market_score,
        risk_score,
        financial_confidence,
        strategic_confidence,
        operational_confidence,
        market_confidence,
        risk_confidence,
        financial_factors,
        strategic_factors,
        operational_factors,
        market_factors,
        risk_factors,
        market_position,
        risk_factors_identified,
        opportunity_areas,
        data_points_used,
        created_at
    `

    if (includeExplanations) {
      selectQuery += `,
        similarity_explanations(
          summary,
          key_reasons,
          financial_rationale,
          strategic_rationale,
          risk_considerations,
          confidence_level,
          data_quality_note
        )
      `
    }

    selectQuery += ')' // Close the similar_company_matches selection

    // Get analysis with matches
    const { data: analysis, error } = await supabase
      .from('similarity_analyses')
      .select(selectQuery)
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Analysis not found or access denied' },
          { status: 404 }
        )
      }
      throw error
    }

    // Limit matches if requested
    if (analysis.similar_company_matches && matchLimit < analysis.similar_company_matches.length) {
      analysis.similar_company_matches = analysis.similar_company_matches
        .sort((a: any, b: any) => b.overall_score - a.overall_score)
        .slice(0, matchLimit)
    }

    // Calculate summary statistics
    const matches = analysis.similar_company_matches || []
    const summary = {
      totalMatches: matches.length,
      averageScore: matches.length > 0 ? 
        matches.reduce((sum: number, match: any) => sum + match.overall_score, 0) / matches.length : 0,
      topScore: matches.length > 0 ? 
        Math.max(...matches.map((match: any) => match.overall_score)) : 0,
      scoreDistribution: {
        excellent: matches.filter((m: any) => m.overall_score >= 85).length,
        good: matches.filter((m: any) => m.overall_score >= 70 && m.overall_score < 85).length,
        fair: matches.filter((m: any) => m.overall_score >= 55 && m.overall_score < 70).length,
        poor: matches.filter((m: any) => m.overall_score < 55).length
      },
      confidenceDistribution: {
        high: matches.filter((m: any) => m.confidence >= 0.8).length,
        medium: matches.filter((m: any) => m.confidence >= 0.6 && m.confidence < 0.8).length,
        low: matches.filter((m: any) => m.confidence < 0.6).length
      }
    }

    return NextResponse.json({
      analysis: {
        ...analysis,
        summary
      },
      metadata: {
        retrievedAt: new Date().toISOString(),
        includeMatches,
        includeExplanations,
        matchLimit: matches.length
      }
    })

  } catch (error) {
    console.error('Error retrieving detailed analysis:', error)
    return NextResponse.json(
      { 
        error: 'Failed to retrieve detailed analysis',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// PUT: Update analysis configuration or metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const analysisId = params.id

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notes, tags, isPublic = false, sharedWith = [] } = body

    // Validate analysis ownership
    const { data: existing, error: checkError } = await supabase
      .from('similarity_analyses')
      .select('id, user_id, status')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Analysis not found or access denied' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (notes !== undefined) updateData.notes = notes
    if (tags !== undefined) updateData.tags = tags
    if (isPublic !== undefined) updateData.is_public = isPublic
    if (sharedWith !== undefined) updateData.shared_with = sharedWith

    // Update analysis
    const { data: updated, error: updateError } = await supabase
      .from('similarity_analyses')
      .update(updateData)
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      message: 'Analysis updated successfully',
      analysis: updated
    })

  } catch (error) {
    console.error('Error updating analysis:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update analysis',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE: Delete analysis and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const analysisId = params.id

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate analysis ownership
    const { data: existing, error: checkError } = await supabase
      .from('similarity_analyses')
      .select('id, user_id, target_company_name')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Analysis not found or access denied' },
        { status: 404 }
      )
    }

    // Delete analysis (cascading deletes will handle related records)
    const { error: deleteError } = await supabase
      .from('similarity_analyses')
      .delete()
      .eq('id', analysisId)
      .eq('user_id', user.id)

    if (deleteError) {
      throw deleteError
    }

    // Record deletion in feature usage
    await supabase
      .from('similarity_feature_usage')
      .insert({
        user_id: user.id,
        event_type: 'analysis_deleted',
        similarity_analysis_id: analysisId,
        target_company_name: existing.target_company_name,
        feature_version: 'v1.0'
      })

    return NextResponse.json({
      message: 'Analysis deleted successfully',
      analysisId
    })

  } catch (error) {
    console.error('Error deleting analysis:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete analysis',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}