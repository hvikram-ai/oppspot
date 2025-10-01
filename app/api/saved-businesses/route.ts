import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('saved_businesses')
      .select(`
        id,
        business_id,
        saved_at,
        notes,
        tags,
        businesses (
          id,
          name,
          description,
          categories,
          address,
          latitude,
          longitude,
          rating,
          phone_numbers,
          emails,
          website,
          verified
        )
      `)
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved businesses:', error)
      return NextResponse.json({ error: 'Failed to fetch saved businesses' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { business_id, notes, tags } = body

    if (!business_id) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_businesses')
      .select('id')
      .eq('user_id', user.id)
      .eq('business_id', business_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Business already saved' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('saved_businesses')
      .insert({
        user_id: user.id,
        business_id,
        notes: notes || null,
        tags: tags || [],
        saved_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving business:', error)
      return NextResponse.json({ error: 'Failed to save business' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const business_id = searchParams.get('business_id')

    if (!business_id) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('saved_businesses')
      .delete()
      .eq('user_id', user.id)
      .eq('business_id', business_id)

    if (error) {
      console.error('Error removing business:', error)
      return NextResponse.json({ error: 'Failed to remove business' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}