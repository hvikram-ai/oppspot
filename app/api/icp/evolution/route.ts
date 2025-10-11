/**
 * ICP Evolution History API
 * GET /api/icp/evolution - Get ICP evolution log
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getErrorMessage } from '@/lib/utils/error-handler'
import type { Row } from '@/lib/supabase/helpers'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const icpId = searchParams.get('icp_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('icp_evolution_log')
      .select(`
        *,
        icp_profile:icp_profiles!icp_evolution_log_icp_profile_id_fkey(
          id,
          version,
          name
        )
      `)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (icpId) {
      query = query.eq('icp_profile_id', icpId)
    }

    const { data: evolution, error } = await query

    if (error) {
      throw new Error(`Failed to fetch evolution log: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      evolution: evolution || [],
      count: evolution?.length || 0
    })
  } catch (error: unknown) {
    console.error('[ICP Evolution API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch evolution log', message: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
