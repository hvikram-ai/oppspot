/**
 * ICP Profiles API
 * GET  /api/icp - Get ICP profiles
 * POST /api/icp - Create/train new ICP
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { icpLearningEngine } from '@/lib/ai/icp/learning-engine'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const activeOnly = searchParams.get('active') === 'true'

    // Build query
    let query = supabase
      .from('icp_profiles')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('version', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: profiles, error } = await query

    if (error) {
      throw new Error(`Failed to fetch ICP profiles: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      profiles: profiles || [],
      count: profiles?.length || 0
    })
  } catch (error: any) {
    console.error('[ICP API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ICP profiles', message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'train') {
      // Train new ICP from deals
      console.log(`[ICP API] Training new ICP for org ${profile.org_id}`)

      const newICP = await icpLearningEngine.trainFromDeals(profile.org_id)

      return NextResponse.json({
        success: true,
        icp: newICP,
        message: `Successfully trained ICP v${newICP.version} from ${newICP.training_data_count} deals`
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use action: "train"' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[ICP API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process ICP request', message: error.message },
      { status: 500 }
    )
  }
}
