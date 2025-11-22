/**
 * Collections API - Archive Management
 * GET /api/collections/archive - List user's archived collections
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get archived collections (owned only, not shared)
    const { data: archived, error } = await supabase
      .from('collections')
      .select('*, collection_items(count)')
      .eq('user_id', user.id)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })

    if (error) {
      console.error('Error fetching archived collections:', error)
      return NextResponse.json(
        { error: 'Failed to fetch archived collections' },
        { status: 500 }
      )
    }

    // Format with item counts
    interface ArchivedCollection {
      id: string;
      name: string;
      archived_at: string;
      collection_items?: Array<{ count: number }>;
      [key: string]: unknown;
    }

    const formatted = (archived || []).map((col: ArchivedCollection) => ({
      ...col,
      item_count: col.collection_items?.[0]?.count || 0
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Error in GET /api/collections/archive:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
