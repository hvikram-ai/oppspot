/**
 * ICP Match Score API
 * POST /api/icp/match - Calculate ICP match score for a company
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { icpLearningEngine } from '@/lib/ai/icp/learning-engine'

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
    const { company_id, icp_id } = body

    if (!company_id) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400 })
    }

    // Get active ICP if not specified
    let icpIdToUse = icp_id
    if (!icpIdToUse) {
      const activeICP = await icpLearningEngine.getActiveICP(profile.org_id)
      if (!activeICP) {
        return NextResponse.json(
          { error: 'No active ICP found. Train an ICP first.' },
          { status: 404 }
        )
      }
      icpIdToUse = activeICP.id
    }

    // Calculate match score
    const score = await icpLearningEngine.calculateMatchScore(company_id, icpIdToUse)

    return NextResponse.json({
      success: true,
      company_id,
      icp_id: icpIdToUse,
      match_score: score,
      match_level: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'
    })
  } catch (error: unknown) {
    console.error('[ICP Match API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate match score', message: error.message },
      { status: 500 }
    )
  }
}
