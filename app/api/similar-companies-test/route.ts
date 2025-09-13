/**
 * Test API for Similar Companies - Bypasses authentication for testing
 * This endpoint allows testing the similar companies search without authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { SimilarCompanyUseCase } from '@/lib/opp-scan/services/similar-company-use-case'
import { SimilarityConfiguration } from '@/lib/opp-scan/core/similarity-interfaces'

// Initialize services
let similarCompanyUseCase: SimilarCompanyUseCase

function getSimilarCompanyUseCase(): SimilarCompanyUseCase {
  if (!similarCompanyUseCase) {
    similarCompanyUseCase = new SimilarCompanyUseCase()
  }
  return similarCompanyUseCase
}

// POST: Start new similarity analysis (TEST VERSION - NO AUTH)
export async function POST(request: NextRequest) {
  try {
    console.log('[TEST API] Starting similar companies analysis without auth')
    
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
      financialDataRequired = false, // Disable for testing
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

    console.log(`[TEST API] Searching for companies similar to: ${targetCompanyName}`)

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

    // Use a test user ID
    const testUserId = 'test-user-' + Date.now()
    
    // Start new analysis
    const analysisRequest = {
      targetCompanyName: targetCompanyName.trim(),
      userId: testUserId,
      orgId: 'test-org',
      configuration
    }

    // Generate analysis ID
    const analysisId = `test_sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`[TEST API] Starting analysis with ID: ${analysisId}`)
    
    // Execute analysis synchronously for testing
    try {
      const result = await getSimilarCompanyUseCase().executeSimilarityAnalysis({
        ...analysisRequest,
        analysisId
      })
      
      console.log(`[TEST API] Analysis completed. Found ${result.similarityAnalysis?.similar_company_matches?.length || 0} matches`)
      
      return NextResponse.json({
        success: true,
        analysisId,
        status: 'completed',
        analysis: result.similarityAnalysis,
        metrics: result.metrics,
        message: 'Test analysis completed successfully',
        targetCompany: targetCompanyName.trim(),
        configuration,
        errors: result.errors,
        warnings: result.warnings
      })
    } catch (analysisError: any) {
      console.error('[TEST API] Analysis execution failed:', analysisError)
      
      return NextResponse.json({
        success: false,
        analysisId,
        status: 'failed',
        error: analysisError.message,
        message: 'Analysis failed during execution',
        targetCompany: targetCompanyName.trim()
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('[TEST API] Similarity analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to start similarity analysis',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// GET: Test endpoint status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Similar Companies Test API is running',
    note: 'This is a test endpoint that bypasses authentication',
    usage: 'POST to this endpoint with { targetCompanyName: "company name" }'
  })
}