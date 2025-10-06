/**
 * Business Tags API
 * GET /api/tags - Get all unique tags used by current user
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all saved businesses with tags for the user
    const { data: savedBusinesses, error } = await supabase
      .from('saved_businesses')
      .select('tags')
      .eq('user_id', user.id)
      .not('tags', 'is', null)

    if (error) {
      console.error('Error fetching tags:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      )
    }

    // Extract unique tags and count usage
    const tagMap = new Map<string, number>()

    savedBusinesses?.forEach(sb => {
      if (sb.tags && Array.isArray(sb.tags)) {
        sb.tags.forEach(tag => {
          const normalizedTag = tag.trim().toLowerCase()
          if (normalizedTag) {
            tagMap.set(normalizedTag, (tagMap.get(normalizedTag) || 0) + 1)
          }
        })
      }
    })

    // Convert to array and sort by usage
    const tags = Array.from(tagMap.entries())
      .map(([name, count]) => ({
        id: name,
        name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
        count,
      }))
      .sort((a, b) => b.count - a.count) // Sort by most used

    return NextResponse.json({
      success: true,
      tags,
      total: tags.length,
    })
  } catch (error) {
    console.error('Tags API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
