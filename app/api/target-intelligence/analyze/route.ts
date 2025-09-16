import { NextRequest, NextResponse } from 'next/server'
import { TargetIntelligenceService, type TargetCompanyInput } from '@/lib/target-intelligence/target-intelligence-service'
import { CompanyEnrichmentService, type CompanyEnrichmentRequest } from '@/lib/target-intelligence/company-enrichment-service'
import { createClient } from '@/lib/supabase/server'

interface AnalyzeRequest {
  company_name: string
  website?: string
  industry?: string
  country?: string
  existing_data?: Record<string, unknown>
  options?: {
    include_competitive_analysis?: boolean
    include_financial_deep_dive?: boolean
    include_esg_assessment?: boolean
    use_real_time_data?: boolean
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json()
    
    if (!body.company_name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    // Get user from session - allow demo mode
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const isDemoMode = request.headers.get('x-demo-mode') === 'true'
    
    if (!isDemoMode && (authError || !user)) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log(`[TargetIntelligence API] Starting analysis for: ${body.company_name}`)

    // Create progress tracking
    const progressStages: string[] = []
    const progressCallback = (progress: { stage: string; message: string; progress?: number }) => {
      progressStages.push(`${progress.stage}: ${progress.message}`)
      console.log(`[TargetIntelligence] ${progress.stage}: ${progress.progress}% - ${progress.message}`)
    }

    // Initialize services
    const targetIntelligenceService = new TargetIntelligenceService(progressCallback)
    const enrichmentService = new CompanyEnrichmentService()

    // Phase 1: Basic Company Enrichment
    console.log('[TargetIntelligence API] Phase 1: Company enrichment')
    const enrichmentRequest: CompanyEnrichmentRequest = {
      company_name: body.company_name,
      website: body.website,
      industry: body.industry,
      country: body.country,
      known_info: body.existing_data
    }

    const enrichmentResult = await enrichmentService.enrichCompanyData(enrichmentRequest)

    // Phase 2: Advanced Target Intelligence
    console.log('[TargetIntelligence API] Phase 2: Advanced intelligence generation')
    const targetInput: TargetCompanyInput = {
      company_name: body.company_name,
      website: body.website || enrichmentResult.enriched_data.contact_info?.website,
      industry: body.industry || enrichmentResult.enriched_data.industry_classification?.primary_industry,
      country: body.country || enrichmentResult.enriched_data.headquarters?.country,
      description: enrichmentResult.enriched_data.business_description?.short_description
    }

    const enhancedProfile = await targetIntelligenceService.generateEnhancedProfile(
      targetInput,
      body.options || {
        include_competitive_analysis: true,
        include_financial_deep_dive: true,
        include_esg_assessment: true,
        use_real_time_data: true
      }
    )

    // Phase 3: Data Integration and Enhancement
    console.log('[TargetIntelligence API] Phase 3: Data integration')
    
    // Merge enrichment data with intelligence profile
    const integratedProfile = {
      ...enhancedProfile,
      // Enhanced company details from enrichment
      legal_name: enrichmentResult.enriched_data.legal_name || enhancedProfile.company_name,
      headquarters: {
        ...enhancedProfile.headquarters,
        ...enrichmentResult.enriched_data.headquarters,
        address: enrichmentResult.enriched_data.headquarters?.address || enhancedProfile.headquarters?.address
      },
      // Enhanced business profile
      business_model: enrichmentResult.enriched_data.business_description?.short_description || enhancedProfile.business_model,
      sub_industries: enrichmentResult.enriched_data.industry_classification?.secondary_industries || enhancedProfile.sub_industries,
      // Enhanced employee and revenue data
      employee_count: enrichmentResult.enriched_data.company_size?.employee_count || enhancedProfile.employee_count,
      // Enhanced financial profile
      financial_profile: {
        ...enhancedProfile.financial_profile,
        revenue_estimate: enrichmentResult.enriched_data.company_size?.annual_revenue || enhancedProfile.financial_profile?.revenue_estimate,
        funding_history: enrichmentResult.enriched_data.financial_indicators?.key_investors?.map(investor => ({
          round_type: 'unknown',
          date: 'unknown',
          investors: [investor.name],
          amount: undefined
        })) || enhancedProfile.financial_profile?.funding_history || []
      },
      // Enhanced leadership data
      leadership_team: enrichmentResult.enriched_data.leadership?.key_executives || enhancedProfile.leadership_team,
      // Enhanced technology profile
      technology_profile: {
        ...enhancedProfile.technology_profile,
        tech_stack: enrichmentResult.enriched_data.technology_stack?.core_technologies || enhancedProfile.technology_profile?.tech_stack || [],
        website_analysis: {
          ...enhancedProfile.technology_profile?.website_analysis,
          domain_authority: enrichmentResult.enriched_data.digital_presence?.website_analysis?.domain_authority,
          monthly_visitors: enrichmentResult.enriched_data.digital_presence?.website_analysis?.monthly_visitors
        },
        social_media_presence: {
          platforms: enrichmentResult.enriched_data.digital_presence?.social_media?.platforms || {},
          social_activity_score: enhancedProfile.technology_profile?.social_media_presence?.social_activity_score || 50
        }
      },
      // Enhanced analysis metadata
      analysis_metadata: {
        ...enhancedProfile.analysis_metadata,
        data_sources: [
          ...enhancedProfile.analysis_metadata?.data_sources || [],
          ...enrichmentResult.enrichment_metadata.sources_used.map(s => s.source)
        ],
        confidence_score: Math.round(
          (enhancedProfile.analysis_metadata?.confidence_score || 50) * 0.7 + 
          enrichmentResult.enrichment_metadata.confidence_score * 0.3
        )
      }
    }

    // Phase 4: Store Results (Optional)
    if (body.options?.use_real_time_data) {
      try {
        const { error: storageError } = await supabase
          .from('target_intelligence_profiles')
          .upsert({
            user_id: user.id,
            company_name: body.company_name,
            profile_data: integratedProfile,
            enrichment_data: enrichmentResult,
            analysis_options: body.options,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,company_name'
          })

        if (storageError) {
          console.warn('[TargetIntelligence API] Failed to store profile:', storageError)
        } else {
          console.log('[TargetIntelligence API] Profile stored successfully')
        }
      } catch (storageError) {
        console.warn('[TargetIntelligence API] Storage failed:', storageError)
      }
    }

    console.log(`[TargetIntelligence API] Analysis completed for: ${body.company_name}`)
    console.log(`[TargetIntelligence API] Processing stages: ${progressStages.length}`)
    
    return NextResponse.json({
      ...integratedProfile,
      processing_summary: {
        stages_completed: progressStages.length,
        enrichment_sources: enrichmentResult.enrichment_metadata.sources_used.length,
        total_processing_time_ms: integratedProfile.analysis_metadata.processing_time_ms,
        confidence_score: integratedProfile.analysis_metadata.confidence_score
      }
    })

  } catch (error) {
    console.error('[TargetIntelligence API] Analysis failed:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const statusCode = errorMessage.includes('not enabled') ? 503 : 500
    
    return NextResponse.json(
      { 
        error: 'Target intelligence analysis failed',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyName = searchParams.get('company_name')
    
    if (!companyName) {
      return NextResponse.json(
        { error: 'Company name parameter is required' },
        { status: 400 }
      )
    }

    // Get user from session - allow demo mode
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const isDemoMode = request.headers.get('x-demo-mode') === 'true'
    
    if (!isDemoMode && (authError || !user)) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Retrieve stored profile
    const { data: profile, error } = await supabase
      .from('target_intelligence_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('company_name', companyName)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json(profile)

  } catch (error) {
    console.error('[TargetIntelligence API] Retrieval failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}