/**
 * Similar Companies Validation API
 * Validate company names and check service availability before analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WebSearchService } from '@/lib/opp-scan/services/web-search-service'
import { SimilarCompanyUseCase } from '@/lib/opp-scan/services/similar-company-use-case'
import { getErrorMessage } from '@/lib/utils/error-handler'
import type { Row } from '@/lib/supabase/helpers'

// Simple in-memory rate limiting for demo mode
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_MAX = 10 // Max requests per window
const RATE_LIMIT_WINDOW = 60000 // 1 minute window

// POST: Validate company name and get suggestions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication (optional - allow demo mode)
    const { data: { user } } = await supabase.auth.getUser()
    const isAuthenticated = !!user
    
    // Basic rate limiting for unauthenticated requests
    if (!isAuthenticated) {
      // Get client IP for rate limiting
      const forwarded = request.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
      
      // Check rate limit
      const now = Date.now()
      const rateLimit = rateLimitMap.get(ip)
      
      if (rateLimit) {
        if (now < rateLimit.resetTime) {
          if (rateLimit.count >= RATE_LIMIT_MAX) {
            return NextResponse.json(
              { error: 'Rate limit exceeded. Please try again later.' },
              { status: 429 }
            )
          }
          rateLimit.count++
        } else {
          // Reset the window
          rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
        }
      } else {
        // First request from this IP
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
      }
      
      console.log('Similar Companies Validation: Running in demo/unauthenticated mode')
    }

    const body = await request.json()
    const { companyName, includeSuggestions = true, includeCompetitors = false } = body

    // Validate input
    if (!companyName || typeof companyName !== 'string') {
      return NextResponse.json(
        { error: 'Company name is required and must be a string' },
        { status: 400 }
      )
    }

    const cleanedName = companyName.trim()
    if (cleanedName.length < 2) {
      return NextResponse.json(
        { error: 'Company name must be at least 2 characters long' },
        { status: 400 }
      )
    }

    if (cleanedName.length > 200) {
      return NextResponse.json(
        { error: 'Company name must be less than 200 characters' },
        { status: 400 }
      )
    }

    // Initialize search service
    const webSearchService = new WebSearchService()

    try {
      // Validate company existence
      const validation = await webSearchService.validateCompanyExists(cleanedName)
      
      let suggestions = []
      let competitors = []

      // Get suggestions if requested and company exists or partially matches
      if (includeSuggestions && (validation.exists || validation.suggestedMatches)) {
        if (validation.suggestedMatches && validation.suggestedMatches.length > 0) {
          suggestions = validation.suggestedMatches.slice(0, 5).map(company => ({
            name: company.name,
            country: company.country,
            industry: company.industryCodes[0] || 'Unknown',
            description: company.description,
            confidence: company.confidenceScore,
            website: company.website
          }))
        }
      }

      // Get competitors if requested and company exists
      if (includeCompetitors && validation.exists) {
        try {
          const competitorsList = await webSearchService.getCompetitors(cleanedName)
          competitors = competitorsList.slice(0, 3).map(competitor => ({
            name: competitor.name,
            country: competitor.country,
            industry: competitor.industryCodes[0] || 'Unknown',
            description: competitor.description
          }))
        } catch (competitorError) {
          console.warn('Error fetching competitors:', competitorError)
          // Don't fail validation if competitors can't be fetched
        }
      }

      return NextResponse.json({
        valid: validation.exists,
        confidence: validation.confidence,
        companyName: cleanedName,
        validationSource: validation.validationSource,
        suggestions: suggestions,
        competitors: competitors,
        message: validation.exists 
          ? 'Company validated successfully'
          : suggestions.length > 0 
            ? 'Company not found exactly, but similar companies were found'
            : 'Company could not be validated',
        estimatedAnalysisTime: validation.exists ? '2-5 minutes' : 'N/A'
      })

    } catch (searchError) {
      console.error('Search service error during validation:', searchError)
      
      // Return a degraded response when search services are unavailable
      return NextResponse.json({
        valid: false,
        confidence: 0,
        companyName: cleanedName,
        validationSource: 'service_unavailable',
        suggestions: [],
        competitors: [],
        message: 'Unable to validate company at this time. Analysis may still proceed with limited data.',
        warning: 'Search services are temporarily unavailable',
        estimatedAnalysisTime: '3-7 minutes (with limited data)'
      })
    }

  } catch (error) {
    console.error('Company validation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to validate company',
        details: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
      },
      { status: 500 }
    )
  }
}

// GET: Get validation service health and capabilities
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check authentication (optional - allow demo mode)
    const { data: { user } } = await supabase.auth.getUser()
    const isAuthenticated = !!user
    
    if (!isAuthenticated) {
      console.log('Similar Companies Health Check: Running in demo/unauthenticated mode')
    }

    // Check service health
    const useCase = new SimilarCompanyUseCase()
    const serviceHealth = await useCase.getServiceHealth()

    // Get web search service capabilities
    const webSearchService = new WebSearchService()
    const providerStats = webSearchService.getProviderStats()

    // Check database connectivity
    let databaseHealth = false
    try {
      const { error } = await supabase
        .from('similarity_analyses')
        .select('count')
        .limit(1)
      
      databaseHealth = !error
    } catch (dbError) {
      console.error('Database health check failed:', dbError)
    }

    // Calculate overall service status
    const criticalServices = [serviceHealth.database, serviceHealth.llmService]
    const optionalServices = [serviceHealth.webSearch]
    
    let overallStatus = 'healthy'
    if (criticalServices.some(service => !service)) {
      overallStatus = 'degraded'
    } else if (optionalServices.some(service => !service)) {
      overallStatus = 'partial'
    }

    return NextResponse.json({
      status: overallStatus,
      services: {
        database: {
          status: databaseHealth ? 'healthy' : 'unhealthy',
          message: databaseHealth ? 'Database connection successful' : 'Database connection failed'
        },
        webSearch: {
          status: serviceHealth.webSearch ? 'healthy' : 'degraded',
          message: serviceHealth.webSearch 
            ? 'Web search services available' 
            : 'Some search providers may be unavailable',
          providers: providerStats
        },
        aiService: {
          status: serviceHealth.llmService ? 'healthy' : 'unhealthy',
          message: serviceHealth.llmService 
            ? 'AI explanation services available' 
            : 'AI services unavailable - explanations will be limited'
        }
      },
      capabilities: {
        companyValidation: serviceHealth.webSearch,
        competitorDiscovery: serviceHealth.webSearch,
        aiExplanations: serviceHealth.llmService,
        dataStorage: databaseHealth,
        exportGeneration: databaseHealth
      },
      limits: {
        maxCompanyNameLength: 200,
        maxResultsPerAnalysis: 100,
        maxConcurrentAnalyses: 3,
        analysisRetentionDays: 30
      },
      pricing: {
        costPerAnalysis: 'Variable (based on data sources used)',
        estimatedRange: '$0.10 - $2.00 per analysis',
        currency: 'USD'
      },
      checkedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Service health check error:', error)
    return NextResponse.json(
      {
        error: 'Failed to check service health',
        details: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
      },
      { status: 500 }
    )
  }
}