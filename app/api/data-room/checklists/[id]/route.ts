/**
 * Checklist Detail API Routes
 * GET - Get checklist with items
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/data-room/checklists/[id]
 * Get checklist with all items, grouped by category
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get checklist
    const { data: checklist, error: checklistError } = await supabase
      .from('review_checklists')
      .select('*')
      .eq('id', id)
      .single()

    if (checklistError || !checklist) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 })
    }

    // Verify access
    const { data: access } = await supabase
      .from('data_room_access')
      .select('role')
      .eq('data_room_id', checklist.data_room_id)
      .eq('user_id', user.id)
      .single()

    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get checklist items
    const { data: items, error: itemsError } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('checklist_id', id)
      .order('category')
      .order('created_at')

    if (itemsError) throw itemsError

    // Group items by category
    const categories = items?.reduce((acc: Record<string, unknown>[], item: { category: string }) => {
      const existing = acc.find((c: { name: string }) => c.name === item.category)
      if (existing) {
        (existing.items as unknown[]).push(item)
        existing.total = (existing.total as number) + 1
        if (item.status === 'completed') {
          existing.completed = (existing.completed as number) + 1
        }
      } else {
        acc.push({
          name: item.category,
          items: [item],
          total: 1,
          completed: item.status === 'completed' ? 1 : 0
        })
      }
      return acc
    }, []) || []

    return NextResponse.json({
      success: true,
      data: {
        ...checklist,
        categories
      }
    })
  } catch (error) {
    console.error('Get checklist error:', error)
    return NextResponse.json({ error: 'Failed to get checklist' }, { status: 500 })
  }
}
