/**
 * Knowledge Graph™ API - Entity Details
 * Get entity with relationships and facts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User org not found' },
        { status: 404 }
      )
    }

    // Get entity
    const { data: entity, error: entityError } = await supabase
      .from('knowledge_entities')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single()

    if (entityError || !entity) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      )
    }

    // Get relationships
    const { data: relationships } = await supabase.rpc('find_related_entities', {
      p_entity_id: id,
      p_relationship_type: null,
      p_limit: 100
    })

    // Get facts
    const { data: facts } = await supabase.rpc('get_entity_facts', {
      p_entity_id: id,
      p_include_historical: false
    })

    return NextResponse.json({
      success: true,
      entity,
      relationships: relationships || [],
      facts: facts || [],
      relationship_count: (relationships || []).length,
      fact_count: (facts || []).length
    })
  } catch (error) {
    console.error('[API] Entity fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fetch failed' },
      { status: 500 }
    )
  }
}
