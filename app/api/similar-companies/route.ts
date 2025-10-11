/**
 * Similar Companies API Routes
 * RESTful endpoints for the Similar Company MnA analysis feature
 * Built for enterprise-grade MnA decision making
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SimilarCompanyUseCase } from '@/lib/opp-scan/services/similar-company-use-case'
import { SimilarityConfiguration } from '@/lib/opp-scan/core/similarity-interfaces'
import { getErrorMessage } from '@/lib/utils/error-handler'
import type { Row } from '@/lib/supabase/helpers'

// Initialize services
let similarCompanyUseCase: SimilarCompanyUseCase

function getSimilarCompanyUseCase(): SimilarCompanyUseCase {
  if (!similarCompanyUseCase) {
    similarCompanyUseCase = new SimilarCompanyUseCase()
  }
  return similarCompanyUseCase
}

// POST: Start new similarity analysis
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication (optional - allow demo mode)
    const { data: { user } } = await supabase.auth.getUser()
    const isAuthenticated = !!user
    
    let userId = user?.id
    let orgId = null
    
    if (isAuthenticated) {
      // Get user's organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('org_id, role')
        .eq('id', user.id)
        .single()
      
      orgId = profile?.org_id
    } else {
      // Demo mode - generate temporary ID
      userId = `demo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      console.log('Similar Companies API: Running in demo mode with temporary ID:', userId)
    }

    // Parse request body
    const body = await request.json()
    const {
      targetCompanyName,
      analysisDepth = 'detailed',
      parameterWeights,
      filterCriteria = {},
      maxResults = 20,
      includeExplanations = true,
      webSearchEnabled = true,
      financialDataRequired = true,
      competitorAnalysis = true
    } = body

    // Validate required fields
    if (!targetCompanyName || typeof targetCompanyName !== 'string') {
      return NextResponse.json(
        { error: 'Target company name is required and must be a string' },
        { status: 400 }
      )
    }

    if (targetCompanyName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Company name must be at least 2 characters long' },
        { status: 400 }
      )
    }

    // Validate analysis depth
    const validDepths = ['quick', 'detailed', 'comprehensive']
    if (!validDepths.includes(analysisDepth)) {
      return NextResponse.json(
        { error: `Analysis depth must be one of: ${validDepths.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate max results
    if (maxResults < 1 || maxResults > 100) {
      return NextResponse.json(
        { error: 'Max results must be between 1 and 100' },
        { status: 400 }
      )
    }

    // Create analysis configuration
    const configuration: SimilarityConfiguration = {
      analysisDepth,
      parameterWeights: parameterWeights || {
        financial: 0.30,
        strategic: 0.25,
        operational: 0.20,
        market: 0.15,
        risk: 0.10
      },
      filterCriteria,
      maxResults,
      includeExplanations,
      webSearchEnabled,
      financialDataRequired,
      competitorAnalysis
    }

    // Check for cached results first (only for authenticated users)
    const useCase = getSimilarCompanyUseCase()
    if (isAuthenticated) {
      const cachedAnalysis = await useCase.getCachedAnalysis(
        targetCompanyName.trim(),
        userId,
        configuration
      )

      if (cachedAnalysis) {
        return NextResponse.json({
          analysis: cachedAnalysis,
          cached: true,
          message: 'Retrieved from cache'
        })
      }
    }

    // Start new analysis
    const analysisRequest = {
      targetCompanyName: targetCompanyName.trim(),
      userId: userId,
      orgId: orgId,
      configuration
    }

    // Generate analysis ID that will be used consistently
    const analysisId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // For long-running analysis, we'll start it and return immediately
    // The client can poll for progress using the analysis ID
    const analysisPromise = useCase.executeSimilarityAnalysis({
      ...analysisRequest,
      analysisId // Pass the ID to ensure consistency
    })
    
    // Start the analysis in the background
    analysisPromise.catch(error => {
      console.error('Background analysis failed:', error)
    })
    
    return NextResponse.json({
      analysisId,
      status: 'started',
      message: 'Similarity analysis started. Use the analysis ID to track progress.',
      estimatedCompletionTime: '2-5 minutes',
      targetCompany: targetCompanyName.trim(),
      configuration: {
        analysisDepth,
        maxResults,
        includeExplanations
      }
    }, { status: 202 })

  } catch (error) {
    console.error('Similarity analysis error:', error)
    return NextResponse.json(
      {
        error: 'Failed to start similarity analysis',
        details: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
      },
      { status: 500 }
    )
  }
}

// GET: Retrieve analysis results or list user's analyses
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const analysisId = searchParams.get('id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Check authentication (optional - allow demo mode)
    const { data: { user } } = await supabase.auth.getUser()
    const isAuthenticated = !!user
    
    // For demo mode, allow retrieving analyses by ID if it starts with 'demo-'
    const isDemoAnalysis = analysisId && analysisId.startsWith('demo-')
    
    if (!isAuthenticated && !isDemoAnalysis) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const useCase = getSimilarCompanyUseCase()
    const effectiveUserId = user?.id || (isDemoAnalysis ? 'demo-user' : null)

    if (analysisId) {
      // Get specific analysis status or results
      const rawAnalysisStatus = await useCase.getAnalysisStatus(analysisId, effectiveUserId)

      if (!rawAnalysisStatus) {
        return NextResponse.json(
          { error: 'Analysis not found or access denied' },
          { status: 404 }
        )
      }

      const analysisStatus = rawAnalysisStatus as typeof rawAnalysisStatus & {
        status?: string
        progress_percentage?: number
        current_step?: string
        error_message?: string
      }

      // If analysis is completed, return full results
      if (analysisStatus.status === 'completed') {
        // Get full analysis data from database
        const { data: fullAnalysis, error } = await supabase
          .from('similarity_analyses')
          .select(`
            *,
            similar_company_matches!inner(
              *,
              similarity_explanations(*)
            )
          `)
          .eq('id', analysisId)
          .eq('user_id', effectiveUserId!)
          .single()

        if (error || !fullAnalysis) {
          return NextResponse.json(
            { error: 'Failed to retrieve analysis results' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          analysis: fullAnalysis,
          status: 'completed',
          matches: fullAnalysis.similar_company_matches || []
        })
      }

      // Return current status for in-progress analyses
      return NextResponse.json({
        analysisId,
        status: analysisStatus.status,
        progress: analysisStatus.progress_percentage,
        currentStep: analysisStatus.current_step,
        error: analysisStatus.error_message,
        message: getStatusMessage(analysisStatus.status, analysisStatus.current_step)
      })

    } else {
      // List user's analyses
      const analyses = await useCase.getUserAnalyses(user.id, limit)
      
      // Apply status filter if provided
      const filteredAnalyses = status ? 
        analyses.filter(analysis => analysis.status === status) : 
        analyses

      // Apply pagination
      const paginatedAnalyses = filteredAnalyses.slice(offset, offset + limit)

      return NextResponse.json({
        analyses: paginatedAnalyses,
        pagination: {
          total: filteredAnalyses.length,
          limit,
          offset,
          hasMore: offset + limit < filteredAnalyses.length
        }
      })
    }

  } catch (error) {
    console.error('Error retrieving similarity analyses:', error)
    return NextResponse.json(
      {
        error: 'Failed to retrieve analyses',
        details: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE: Cancel ongoing analysis
export async function DELETE(request: NextRequest) {
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

    const useCase = getSimilarCompanyUseCase()
    const cancelled = await useCase.cancelAnalysis(analysisId, user.id)

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Failed to cancel analysis or analysis not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Analysis cancelled successfully',
      analysisId
    })

  } catch (error) {
    console.error('Error cancelling analysis:', error)
    return NextResponse.json(
      {
        error: 'Failed to cancel analysis',
        details: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
      },
      { status: 500 }
    )
  }
}

// Helper function to get status messages
function getStatusMessage(status: string, currentStep?: string): string {
  switch (status) {
    case 'pending':
      return 'Analysis queued for processing'
    case 'searching':
      return 'Searching for similar companies across multiple data sources'
    case 'analyzing':
      return currentStep ? `Analyzing companies: ${currentStep}` : 'Analyzing similarity metrics'
    case 'completed':
      return 'Analysis completed successfully'
    case 'failed':
      return 'Analysis encountered an error'
    case 'cancelled':
      return 'Analysis was cancelled'
    default:
      return 'Processing analysis'
  }
}