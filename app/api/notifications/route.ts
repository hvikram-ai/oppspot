import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NotificationService } from '@/lib/notifications/notification-service'
import type { Row } from '@/lib/supabase/helpers'

// GET: Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unread') === 'true'
    const type = searchParams.get('type')
    
    const offset = (page - 1) * limit
    
    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_archived', false)
    
    if (unreadOnly) {
      query = query.eq('is_read', false)
    }
    
    if (type) {
      query = query.eq('type', type)
    }
    
    const { data: notifications, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    
    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .eq('is_archived', false)
    
    return NextResponse.json({
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      },
      unreadCount: unreadCount || 0
    })
    
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST: Create a notification
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { 
      targetUserId,
      type,
      title,
      body: notificationBody,
      data = {},
      priority = 'medium',
      actionUrl
    } = body
    
    // Check if user has permission to send notifications
    // (In production, you might want to restrict this to admins or specific use cases)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[API] Failed to fetch profile:', profileError)
    }
    
    const canSendNotifications = profile?.role === 'admin' || 
                                 profile?.role === 'owner' || 
                                 targetUserId === user.id
    
    if (!canSendNotifications) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }
    
    // Send notification using the service
    const notificationService = new NotificationService()
    const notificationId = await notificationService.sendNotification({
      userId: targetUserId || user.id,
      type,
      title,
      body: notificationBody,
      data,
      priority,
      actionUrl
    })
    
    return NextResponse.json({
      message: 'Notification sent successfully',
      notificationId
    })
    
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

// PATCH: Update notification (mark as read, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { notificationId, action, notifications } = body
    
    if (action === 'mark_read') {
      if (notificationId) {
        // Mark single notification as read
        const { error } = await supabase
          .from('notifications')
          // @ts-expect-error - Type inference issue
          .update({ 
            is_read: true,
            read_at: new Date().toISOString()
          })
          .eq('id', notificationId)
          .eq('user_id', user.id)
        
        if (error) throw error
        
        return NextResponse.json({ message: 'Notification marked as read' })
      } else if (notifications && Array.isArray(notifications)) {
        // Mark multiple notifications as read
        const { error } = await supabase
          .from('notifications')
          .update({ 
            is_read: true,
            read_at: new Date().toISOString()
          })
          .in('id', notifications)
          .eq('user_id', user.id)
        
        if (error) throw error
        
        return NextResponse.json({ message: 'Notifications marked as read' })
      }
    } else if (action === 'mark_all_read') {
      // Mark all notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false)
      
      if (error) throw error
      
      return NextResponse.json({ message: 'All notifications marked as read' })
    } else if (action === 'archive') {
      // Archive notification
      const { error } = await supabase
        .from('notifications')
        .update({ is_archived: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      return NextResponse.json({ message: 'Notification archived' })
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

// DELETE: Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const notificationId = searchParams.get('id')
    
    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID required' },
        { status: 400 }
      )
    }
    
    // Archive instead of hard delete
    const { error } = await supabase
      .from('notifications')
      .update({ is_archived: true })
      .eq('id', notificationId)
      .eq('user_id', user.id)
    
    if (error) throw error
    
    return NextResponse.json({ message: 'Notification deleted' })
    
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}