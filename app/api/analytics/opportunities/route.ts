import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OpportunityIdentifier } from '@/lib/analytics/opportunity-identifier'

// GET: Fetch opportunities
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const locationId = searchParams.get('locationId')
    const status = searchParams.get('status') || 'active'
    const minScore = parseFloat(searchParams.get('minScore') || '0')
    
    // Build query
    let query = supabase
      .from('opportunities')
      .select('*')
      .eq('status', status)
      .gte('opportunity_score', minScore)
    
    if (category) {
      query = query.eq('category', category)
    }
    
    if (locationId) {
      query = query.eq('location_id', locationId)
    }
    
    const { data: opportunities, error } = await query
      .order('opportunity_score', { ascending: false })
      .limit(20)
    
    if (error) throw error
    
    return NextResponse.json({
      opportunities: opportunities || []
    })
    
  } catch (error) {
    console.error('Error fetching opportunities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    )
  }
}

// POST: Identify new opportunities
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { category, locationId } = body
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }
    
    const identifier = new OpportunityIdentifier()
    const opportunities = await identifier.identifyOpportunities(category, locationId)
    
    return NextResponse.json({
      message: 'Opportunities identified successfully',
      opportunities,
      count: opportunities.length
    })
    
  } catch (error) {
    console.error('Error identifying opportunities:', error)
    return NextResponse.json(
      { error: 'Failed to identify opportunities' },
      { status: 500 }
    )
  }
}

// PATCH: Update opportunity status
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { opportunityId, action } = body
    
    if (!opportunityId || !action) {
      return NextResponse.json(
        { error: 'Opportunity ID and action are required' },
        { status: 400 }
      )
    }
    
    interface UpdateData {
      status: string
      captured_by?: string
      captured_at?: string
    }

    let updateData: UpdateData = { status: '' }
    
    switch (action) {
      case 'capture':
        updateData = {
          status: 'captured',
          captured_by: user.id,
          captured_at: new Date().toISOString()
        }
        break
      case 'dismiss':
        updateData = {
          status: 'dismissed'
        }
        break
      case 'expire':
        updateData = {
          status: 'expired'
        }
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    
    const { error } = await supabase
      .from('opportunities')
      .update(updateData)
      .eq('id', opportunityId)
    
    if (error) throw error
    
    // If capturing opportunity, create a notification
    if (action === 'capture') {
      const { data: opportunity, error: opportunityError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single() as { data: { type: string; category: string; potential_value: number } & Record<string, unknown> | null; error: unknown }

      if (opportunity) {
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'opportunity_captured',
            title: 'Opportunity Captured',
            body: `You have captured the ${opportunity.type} opportunity in ${opportunity.category}`,
            data: {
              opportunity_id: opportunityId,
              category: opportunity.category,
              potential_value: opportunity.potential_value
            },
            priority: 'medium'
          })
      }
    }
    
    return NextResponse.json({
      message: `Opportunity ${action}d successfully`
    })
    
  } catch (error) {
    console.error('Error updating opportunity:', error)
    return NextResponse.json(
      { error: 'Failed to update opportunity' },
      { status: 500 }
    )
  }
}

// DELETE: Delete expired opportunities
export async function DELETE() {
  try {
    const supabase = await createClient()
    
    // Check authentication and admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile, error: _profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null; error: unknown }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    // Update expired opportunities
    const { error } = await supabase
      .from('opportunities')
      .update({ status: 'expired' } as never)
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())
    
    if (error) throw error
    
    return NextResponse.json({
      message: 'Expired opportunities updated successfully'
    })
    
  } catch (error) {
    console.error('Error updating expired opportunities:', error)
    return NextResponse.json(
      { error: 'Failed to update expired opportunities' },
      { status: 500 }
    )
  }
}