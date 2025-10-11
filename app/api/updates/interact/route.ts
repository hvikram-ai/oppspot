import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

// POST: Handle update interactions (like, view, share)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { updateId, action } = body
    
    if (!updateId || !action) {
      return NextResponse.json(
        { error: 'Update ID and action are required' },
        { status: 400 }
      )
    }
    
    switch (action) {
      case 'like':
        // Toggle like
        const { data: likeResult, error: likeError } = await supabase
          .rpc('toggle_update_like', {
            update_id: updateId,
            user_id: user.id
          })
        
        if (likeError) throw likeError
        
        return NextResponse.json({
          liked: likeResult,
          message: likeResult ? 'Update liked' : 'Update unliked'
        })
        
      case 'view':
        // Record view
        const { error: viewError } = await supabase
          .rpc('increment_update_view', {
            update_id: updateId,
            viewer_id: user.id
          })
        
        if (viewError) throw viewError
        
        return NextResponse.json({
          message: 'View recorded'
        })
        
      case 'share':
        // Record share interaction
        const { error: shareError } = await supabase
          .from('update_interactions')
          .insert({
            update_id: updateId,
            user_id: user.id,
            interaction_type: 'share'
          })
        
        if (!shareError) {
          // Increment share count
          await supabase
            .from('business_updates')
            .update({ 
              shares_count: supabase.raw('shares_count + 1')
            })
            .eq('id', updateId)
        }
        
        return NextResponse.json({
          message: 'Share recorded'
        })
        
      case 'save':
        // Toggle save
        const { data: existingSave, error: existError } = await supabase
          .from('update_interactions')
          .select('id')
          .eq('update_id', updateId)
          .eq('user_id', user.id)
          .eq('interaction_type', 'save')
          .single()

        // Ignore error if not saved yet (expected case)

        if (existingSave) {
          // Unsave
          await supabase
            .from('update_interactions')
            .delete()
            .eq('id', existingSave.id)
          
          return NextResponse.json({
            saved: false,
            message: 'Update unsaved'
          })
        } else {
          // Save
          await supabase
            .from('update_interactions')
            .insert({
              update_id: updateId,
              user_id: user.id,
              interaction_type: 'save'
            })
          
          return NextResponse.json({
            saved: true,
            message: 'Update saved'
          })
        }
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('Interaction error:', error)
    return NextResponse.json(
      { error: 'Failed to process interaction' },
      { status: 500 }
    )
  }
}

// GET: Get user's interactions with updates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const updateId = searchParams.get('updateId')
    const type = searchParams.get('type') // liked, saved, viewed
    
    let query = supabase
      .from('update_interactions')
      .select(`
        *,
        update:business_updates!update_id (
          id,
          title,
          business_id,
          published_at
        )
      `)
      .eq('user_id', user.id)
    
    if (updateId) {
      query = query.eq('update_id', updateId)
    }
    
    if (type) {
      query = query.eq('interaction_type', type)
    }
    
    const { data: interactions, error } = await query
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json({
      interactions: interactions || []
    })
    
  } catch (error) {
    console.error('Error fetching interactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch interactions' },
      { status: 500 }
    )
  }
}