/**
 * Diagnostics API - Check system health and API availability
 * Helps identify why similar companies search might not be working
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

interface APIStatus {
  name: string
  configured: boolean
  keyPresent: boolean
  keyLength?: number
  status: 'configured' | 'missing' | 'invalid'
}

interface SystemDiagnostics {
  timestamp: string
  environment: string
  apis: {
    external: APIStatus[]
    database: {
      connected: boolean
      businessCount?: number
      error?: string
    }
    supabase: {
      configured: boolean
      urlPresent: boolean
      anonKeyPresent: boolean
    }
  }
  searchCapabilities: {
    externalSearchAvailable: boolean
    databaseFallbackAvailable: boolean
    aiEnhancementAvailable: boolean
  }
  recommendations: string[]
}

export async function GET() {
  try {
    const diagnostics: SystemDiagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      apis: {
        external: [],
        database: {
          connected: false
        },
        supabase: {
          configured: false,
          urlPresent: false,
          anonKeyPresent: false
        }
      },
      searchCapabilities: {
        externalSearchAvailable: false,
        databaseFallbackAvailable: false,
        aiEnhancementAvailable: false
      },
      recommendations: []
    }

    // Check external API configurations
    const apiChecks = [
      { name: 'SearchAPI', key: 'SEARCHAPI_KEY' },
      { name: 'Google Search', key: 'GOOGLE_SEARCH_API_KEY' },
      { name: 'Bing Search', key: 'BING_SEARCH_API_KEY' },
      { name: 'Companies House', key: 'COMPANIES_HOUSE_API_KEY' },
      { name: 'Clearbit', key: 'CLEARBIT_API_KEY' },
      { name: 'Crunchbase', key: 'CRUNCHBASE_API_KEY' },
      { name: 'OpenRouter AI', key: 'OPENROUTER_API_KEY' }
    ]

    for (const api of apiChecks) {
      const apiKey = process.env[api.key]
      const status: APIStatus = {
        name: api.name,
        configured: !!apiKey,
        keyPresent: !!apiKey,
        keyLength: apiKey?.length,
        status: !apiKey ? 'missing' : apiKey.length < 10 ? 'invalid' : 'configured'
      }
      diagnostics.apis.external.push(status)
    }

    // Check Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    diagnostics.apis.supabase = {
      configured: !!(supabaseUrl && supabaseAnon),
      urlPresent: !!supabaseUrl,
      anonKeyPresent: !!supabaseAnon
    }

    // Check database connection and business count
    if (supabaseUrl && supabaseAnon) {
      try {
        const supabase = await createClient()
        const { count, error } = await supabase
          .from('businesses')
          .select('*', { count: 'exact', head: true })
        
        diagnostics.apis.database = {
          connected: !error,
          businessCount: count || 0,
          error: error?.message
        }

        diagnostics.searchCapabilities.databaseFallbackAvailable = !error && (count || 0) > 0
      } catch (dbError) {
        diagnostics.apis.database = {
          connected: false,
          error: dbError instanceof Error ? dbError.message : 'Unknown error'
        }
      }
    }

    // Determine search capabilities
    const hasAnyExternalAPI = diagnostics.apis.external.some(api => 
      api.status === 'configured' && !api.name.includes('OpenRouter')
    )
    diagnostics.searchCapabilities.externalSearchAvailable = hasAnyExternalAPI

    const hasOpenRouter = diagnostics.apis.external.find(api => 
      api.name === 'OpenRouter AI'
    )?.status === 'configured'
    diagnostics.searchCapabilities.aiEnhancementAvailable = hasOpenRouter

    // Generate recommendations
    if (!hasAnyExternalAPI) {
      diagnostics.recommendations.push(
        'No external search APIs configured. The system will use database fallback only.',
        'For better results, configure at least one search API (Google, Bing, or Companies House).'
      )
    }

    if (!diagnostics.searchCapabilities.databaseFallbackAvailable) {
      if (!diagnostics.apis.database.connected) {
        diagnostics.recommendations.push(
          'Database connection failed. Check Supabase configuration.'
        )
      } else if (diagnostics.apis.database.businessCount === 0) {
        diagnostics.recommendations.push(
          'No businesses in database. Import or add business data for fallback search to work.'
        )
      }
    }

    if (!hasOpenRouter) {
      diagnostics.recommendations.push(
        'OpenRouter AI not configured. Semantic similarity matching will be limited.',
        'Configure OPENROUTER_API_KEY for improved search relevance.'
      )
    }

    // Add summary recommendation
    if (diagnostics.recommendations.length === 0) {
      diagnostics.recommendations.push('All systems operational. Search capabilities fully available.')
    } else {
      diagnostics.recommendations.unshift(
        `WARNING: Similar companies search is operating with limitations.`
      )
    }

    // Security: Only return detailed info in development
    if (process.env.NODE_ENV === 'production') {
      // Sanitize sensitive data in production
      diagnostics.apis.external = diagnostics.apis.external.map(api => ({
        ...api,
        keyLength: undefined
      }))
    }

    return NextResponse.json({
      status: 'ok',
      diagnostics,
      searchStatus: {
        operational: diagnostics.searchCapabilities.externalSearchAvailable || 
                    diagnostics.searchCapabilities.databaseFallbackAvailable,
        mode: !hasAnyExternalAPI ? 'database-only' : 
              diagnostics.searchCapabilities.databaseFallbackAvailable ? 'hybrid' : 'external-only',
        limitations: diagnostics.recommendations.filter(r => r.includes('WARNING') || r.includes('not'))
      }
    })

  } catch (error) {
    console.error('Diagnostics error:', error)
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to run diagnostics',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    )
  }
}