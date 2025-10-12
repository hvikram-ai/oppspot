import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { peerIdentifier } from '@/lib/benchmarking/peers/peer-identifier'
import type { IdentifyPeersRequest } from '@/lib/benchmarking/types/benchmarking'
import type { Row } from '@/lib/supabase/helpers'

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

    const body: IdentifyPeersRequest = await request.json()

    // Validate request
    if (!body.company_id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    console.log('[API] Identifying peers for:', body.company_id)

    // Identify peers
    const result = await peerIdentifier.identifyPeers(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to identify peers' },
        { status: 500 }
      )
    }

    // Log API usage
    await supabase
      .from('api_audit_log')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        api_name: 'benchmarking',
        endpoint: '/api/benchmarking/peers',
        request_params: {
          company_id: body.company_id,
          max_peers: body.max_peers,
          include_competitors: body.include_competitors,
          include_aspirational: body.include_aspirational
        },
        response_status: 200,
        response_data: {
          peers_found: result.peers.length,
          total_candidates: result.total_candidates
        },
        user_id: user.id
      })

    return NextResponse.json(result)

  } catch (error) {
    console.error('[API] Peer identification error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const peerGroupId = searchParams.get('peer_group_id')

    if (peerGroupId) {
      // Get specific peer group
      const peerGroup = await peerIdentifier.getPeerGroup(peerGroupId)
      const members = await peerIdentifier.getPeerGroupMembers(peerGroupId)

      return NextResponse.json({
        success: true,
        peer_group: peerGroup,
        members
      })
    }

    // Get all peer groups for the user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single() as { data: { org_id: string } | null; error: unknown }

    let query = supabase.from('peer_groups').select('*')

    if (profile?.org_id) {
      query = query.eq('org_id', profile.org_id)
    } else {
      query = query.eq('created_by', user.id)
    }

    const { data: peerGroups, error: peerGroupsError } = await query.order('created_at', { ascending: false })

    return NextResponse.json({
      success: true,
      peer_groups: peerGroups || []
    })

  } catch (error) {
    console.error('[API] Get peer groups error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}