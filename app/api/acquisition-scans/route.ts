import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    // Get acquisition scans for the user and their organization
    let query = supabase
      .from('acquisition_scans')
      .select('*')
      .eq('user_id', user.id)

    // If user has an organization, include org scans
    if (profile?.org_id) {
      query = supabase
        .from('acquisition_scans')
        .select('*')
        .or(`user_id.eq.${user.id},org_id.eq.${profile.org_id}`)
    }

    const { data: scans, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching acquisition scans:', error)
      return NextResponse.json(
        { error: 'Failed to fetch acquisition scans' },
        { status: 500 }
      )
    }

    return NextResponse.json({ scans })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    const body = await request.json()
    const {
      name,
      description,
      selectedIndustries,
      marketMaturity,
      selectedRegions,
      regulatoryRequirements,
      crossBorderConsiderations,
      requiredCapabilities,
      strategicObjectives,
      synergyRequirements,
      dataSources,
      scanDepth,
      ...config
    } = body

    // Validate required fields
    if (!name || !selectedIndustries || selectedIndustries.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name and selectedIndustries' },
        { status: 400 }
      )
    }

    if (!selectedRegions || selectedRegions.length === 0) {
      return NextResponse.json(
        { error: 'At least one region must be selected' },
        { status: 400 }
      )
    }

    if (!dataSources || dataSources.length === 0) {
      return NextResponse.json(
        { error: 'At least one data source must be selected' },
        { status: 400 }
      )
    }

    // Create the acquisition scan
    const { data: scan, error } = await supabase
      .from('acquisition_scans')
      .insert({
        user_id: user.id,
        org_id: profile?.org_id,
        name,
        description,
        status: 'configuring',
        selected_industries: selectedIndustries,
        market_maturity: marketMaturity || [],
        selected_regions: selectedRegions,
        regulatory_requirements: regulatoryRequirements || {},
        cross_border_considerations: crossBorderConsiderations || {},
        required_capabilities: requiredCapabilities || [],
        strategic_objectives: strategicObjectives || {},
        synergy_requirements: synergyRequirements || {},
        data_sources: dataSources,
        scan_depth: scanDepth || 'comprehensive',
        current_step: 'industry_selection',
        config: {
          ...config,
          selectedIndustries,
          marketMaturity,
          selectedRegions,
          regulatoryRequirements,
          crossBorderConsiderations,
          requiredCapabilities,
          strategicObjectives,
          synergyRequirements,
          dataSources,
          scanDepth
        },
        progress_percentage: 0,
        targets_identified: 0,
        targets_analyzed: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating acquisition scan:', error)
      return NextResponse.json(
        { error: 'Failed to create acquisition scan' },
        { status: 500 }
      )
    }

    // Create audit log entry
    await supabase
      .from('scan_audit_log')
      .insert({
        scan_id: scan.id,
        user_id: user.id,
        action_type: 'scan_created',
        action_description: `Created acquisition scan: ${name}`,
        after_state: scan,
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        legal_basis: 'legitimate_interest',
        retention_period: 365
      })

    return NextResponse.json({ scan }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}