import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OllamaScoringService } from '@/lib/ai/scoring/ollama-scoring-service'
import { isOllamaEnabled, getOllamaClient } from '@/lib/ai/ollama'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      company_id,
      company_number,
      company_name,
      analysis_depth = 'detailed',
      include_recommendations = true
    } = body

    // Validate input
    if (!company_id && !company_number && !company_name) {
      return NextResponse.json(
        { error: 'Company identifier required (company_id, company_number, or company_name)' },
        { status: 400 }
      )
    }

    // Check if Ollama is enabled
    if (!isOllamaEnabled()) {
      return NextResponse.json(
        { error: 'AI scoring is not enabled. Set ENABLE_OLLAMA=true in environment.' },
        { status: 503 }
      )
    }

    // Check if Ollama is accessible
    const ollama = getOllamaClient()
    const isAvailable = await ollama.validateAccess()
    if (!isAvailable) {
      return NextResponse.json(
        { error: 'AI service is not available. Please ensure Ollama is running.' },
        { status: 503 }
      )
    }

    console.log('[API] AI analysis request:', { company_id, company_number, company_name, analysis_depth })

    // Resolve company
    let company
    if (company_id) {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', company_id)
        .single() as { data: { id: string } & Record<string, unknown> | null; error: unknown }
      company = data
    } else if (company_number) {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('company_number', company_number.toUpperCase())
        .single() as { data: { id: string } & Record<string, unknown> | null; error: unknown }
      company = data
    } else {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .ilike('name', `%${company_name}%`)
        .limit(1)
        .single() as { data: { id: string } & Record<string, unknown> | null; error: unknown }
      company = data
    }

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Initialize AI scoring service
    const aiScoring = new OllamaScoringService()

    // Perform AI analysis
    const analysis = await aiScoring.analyzeCompany(company, {
      depth: analysis_depth as 'quick' | 'detailed',
      useCache: true,
      includeRecommendations: include_recommendations
    })

    // Log API usage
    await supabase
      .from('api_audit_log')
      .insert({
        api_name: 'ai_scoring',
        endpoint: '/api/scoring/ai-analyze',
        request_params: {
          company_id: company.id,
          analysis_depth,
          model_used: analysis.ai_metadata.model_used
        },
        response_status: 200,
        response_data: {
          overall_score: analysis.overall.score,
          confidence: analysis.overall.confidence,
          analysis_time_ms: analysis.ai_metadata.analysis_time_ms
        },
        user_id: user.id
      })

    return NextResponse.json({
      success: true,
      analysis,
      message: 'AI analysis completed successfully'
    })

  } catch (error) {
    console.error('[API] AI analysis error:', error)
    return NextResponse.json(
      {
        error: 'AI analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check Ollama status
    const enabled = isOllamaEnabled()
    let available = false
    let models: string[] = []
    let status = 'disabled'

    if (enabled) {
      const ollama = getOllamaClient()
      available = await ollama.validateAccess()

      if (available) {
        const modelList = await ollama.listModels()
        models = modelList.map(m => m.name)
        status = 'ready'
      } else {
        status = 'unavailable'
      }
    }

    return NextResponse.json({
      success: true,
      ai_scoring: {
        enabled,
        available,
        status,
        models,
        recommended_models: ['mistral:7b', 'tinyllama:1.1b'],
        features: {
          financial_analysis: true,
          technology_assessment: true,
          industry_alignment: true,
          growth_detection: true,
          engagement_prediction: true,
          natural_language_insights: true,
          recommendations: true
        }
      }
    })

  } catch (error) {
    console.error('[API] AI status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check AI status' },
      { status: 500 }
    )
  }
}