/**
 * Intelligent Similarity Analysis API
 * AI-powered M&A intelligence using local LLM and real-time data
 * Replaces static pattern matching with intelligent business model analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { IntelligentSimilarityService } from '@/lib/intelligent-analysis/intelligent-similarity-service'
import { IntelligentSimilarityRequest } from '@/lib/intelligent-analysis/intelligent-similarity-service'

// Initialize the intelligent similarity service
let intelligentSimilarityService: IntelligentSimilarityService

function getIntelligentSimilarityService(): IntelligentSimilarityService {
  if (!intelligentSimilarityService) {
    intelligentSimilarityService = new IntelligentSimilarityService()
  }
  return intelligentSimilarityService
}

// POST: Start intelligent similarity analysis
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication - allow demo mode
    const { data: { user } } = await supabase.auth.getUser()
    const isDemoMode = request.headers.get('x-demo-mode') === 'true'
    
    if (!user && !isDemoMode) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to access Intelligent Similarity Analysis' }, 
        { status: 401 }
      )
    }

    // Get user's organization (skip in demo mode)
    let profile: { org_id: string; role: string } | null = null
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('org_id, role')
        .eq('id', user.id)
        .single() as { data: { org_id: string; role: string } | null; error: unknown }
      profile = data
    }

    // Parse request body
    const body = await request.json()
    const {
      target_company_name,
      target_domain,
      industry_hint,
      analysis_depth = 'comprehensive',
      max_competitors = 12,
      include_strategic_insights = true,
      include_market_intelligence = true,
      scoring_preferences = {
        strategic_fit: 0.35,
        market_positioning: 0.25,
        financial_health: 0.20,
        technology_overlap: 0.15,
        risk_factors: 0.05
      }
    } = body

    // Validate required fields
    if (!target_company_name || typeof target_company_name !== 'string') {
      return NextResponse.json(
        { error: 'Target company name is required and must be a string' },
        { status: 400 }
      )
    }

    if (target_company_name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Company name must be at least 2 characters long' },
        { status: 400 }
      )
    }

    // Validate analysis depth
    const validDepths = ['quick', 'standard', 'comprehensive']
    if (!validDepths.includes(analysis_depth)) {
      return NextResponse.json(
        { error: `Analysis depth must be one of: ${validDepths.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate max competitors
    if (max_competitors < 3 || max_competitors > 25) {
      return NextResponse.json(
        { error: 'Max competitors must be between 3 and 25' },
        { status: 400 }
      )
    }

    // Create intelligent analysis request
    const intelligentRequest: IntelligentSimilarityRequest = {
      target_company_name: target_company_name.trim(),
      target_domain: target_domain?.trim(),
      industry_hint: industry_hint?.trim(),
      max_competitors,
      include_strategic_insights,
      include_market_intelligence,
      scoring_preferences,
      user_id: user?.id,
      org_id: profile?.org_id
    } as any

    console.log(`[IntelligentAPI] Starting AI-powered analysis for: ${target_company_name}`)
    console.log(`[IntelligentAPI] Analysis depth: ${analysis_depth}, Max competitors: ${max_competitors}`)

    // Generate analysis ID for tracking
    const analysisId = `ai_sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Get the service instance
    const service = getIntelligentSimilarityService()
    
    // For comprehensive analysis, start in background and return tracking ID
    if (analysis_depth === 'comprehensive') {
      // Start analysis in background
      const analysisPromise = service.generateIntelligentAnalysis(intelligentRequest)
        .then(result => {
          console.log(`[IntelligentAPI] Background analysis completed for: ${target_company_name}`)
          return result
        })
        .catch(error => {
          console.error(`[IntelligentAPI] Background analysis failed for: ${target_company_name}`, error)
          throw error
        })

      // Don't await - let it run in background
      analysisPromise.catch(error => {
        console.error('Background intelligent analysis failed:', error)
      })

      return NextResponse.json({
        analysisId,
        status: 'processing',
        message: 'AI-powered similarity analysis started. This may take 3-7 minutes for comprehensive results.',
        target_company: target_company_name.trim(),
        analysis_type: 'intelligent',
        estimatedCompletionTime: '3-7 minutes',
        features: [
          'AI-powered business model classification',
          'Intelligent competitor discovery',
          'Market intelligence analysis',
          'Strategic M&A insights',
          'Real-time data enrichment'
        ]
      }, { status: 202 })
    }

    // For quick/standard analysis, process synchronously
    console.log(`[IntelligentAPI] Processing ${analysis_depth} analysis synchronously`)
    
    const analysisResult = await service.generateIntelligentAnalysis(intelligentRequest)
    
    console.log(`[IntelligentAPI] Analysis completed for: ${target_company_name}`)
    console.log(`[IntelligentAPI] Found ${analysisResult.similar_company_matches.length} competitors`)

    const targetAnalysis = analysisResult.target_company_analysis as unknown as Record<string, unknown> & {
      confidence_score?: number
      analysis_metadata?: {
        processing_time_ms?: number
        data_sources?: string[]
        llm_model?: string
      }
    }
    console.log(`[IntelligentAPI] Confidence score: ${targetAnalysis.confidence_score}%`)

    return NextResponse.json({
      analysis: analysisResult,
      analysisId,
      status: 'completed',
      message: 'AI-powered similarity analysis completed successfully',
      processing_time_ms: targetAnalysis.analysis_metadata?.processing_time_ms,
      data_sources: targetAnalysis.analysis_metadata?.data_sources,
      llm_model: targetAnalysis.analysis_metadata?.llm_model
    })

  } catch (error) {
    console.error('[IntelligentAPI] Analysis failed:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to start intelligent similarity analysis'
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes('Ollama')) {
        errorMessage = 'AI analysis service unavailable. Please ensure local LLM is running.'
        statusCode = 503
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Analysis rate limit exceeded. Please try again in a few minutes.'
        statusCode = 429
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        error_type: 'intelligent_analysis_error',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        suggestions: [
          'Ensure Ollama is running locally',
          'Check your internet connection for web scraping',
          'Try a simpler company name if analysis fails'
        ]
      },
      { status: statusCode }
    )
  }
}

// GET: Retrieve intelligent analysis status or results
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const analysisId = searchParams.get('id')

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      )
    }

    // For now, return a simple status response
    // In a production system, you'd store analysis status in database
    console.log(`[IntelligentAPI] Status check for analysis: ${analysisId}`)

    return NextResponse.json({
      analysisId,
      status: 'completed',
      message: 'Analysis completed - please start a new analysis',
      note: 'Status tracking will be enhanced in future versions'
    })

  } catch (error) {
    console.error('[IntelligentAPI] Status check failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to retrieve analysis status',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}