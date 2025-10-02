/**
 * Streams™ Service Layer
 * Core business logic for stream operations
 */

import { createClient } from '@/lib/supabase/server'
import type {
  Stream,
  StreamMember,
  StreamItem,
  StreamActivity,
  StreamComment,
  CreateStreamRequest,
  UpdateStreamRequest,
  AddStreamMemberRequest,
  CreateStreamItemRequest,
  UpdateStreamItemRequest,
  CreateStreamCommentRequest,
  StreamFilters,
  StreamItemFilters,
  StreamListResponse,
  StreamDetailResponse,
  WorkflowStage
} from '@/types/streams'

export class StreamService {
  /**
   * Create a new stream
   */
  static async createStream(
    userId: string,
    orgId: string,
    data: CreateStreamRequest
  ): Promise<Stream> {
    const supabase = await createClient()

    const { data: stream, error } = await supabase
      .from('streams')
      .insert({
        org_id: orgId,
        name: data.name,
        description: data.description || null,
        emoji: data.emoji || '📁',
        color: data.color || '#6366f1',
        stream_type: data.stream_type || 'project',
        stages: data.stages || [
          { id: 'discover', name: 'Discover', color: '#3b82f6' },
          { id: 'research', name: 'Research', color: '#8b5cf6' },
          { id: 'outreach', name: 'Outreach', color: '#ec4899' },
          { id: 'qualified', name: 'Qualified', color: '#10b981' },
          { id: 'closed', name: 'Closed', color: '#64748b' }
        ],
        metadata: data.metadata || {},
        created_by: userId,
        status: 'active'
      })
      .select()
      .single()

    if (error) throw error

    // Add creator as owner member
    const { error: memberError } = await supabase
      .from('stream_members')
      .insert({
        stream_id: stream.id,
        user_id: userId,
        role: 'owner',
        invitation_accepted_at: new Date().toISOString()
      })

    if (memberError) throw memberError

    // Log activity
    await this.logActivity(stream.id, userId, 'stream_created', {
      description: `Created stream: ${stream.name}`,
      target_type: 'stream',
      target_id: stream.id
    })

    return stream
  }

  /**
   * Get streams for a user
   */
  static async getStreams(
    userId: string,
    filters?: StreamFilters,
    page = 1,
    limit = 20
  ): Promise<StreamListResponse> {
    const supabase = await createClient()

    // First get stream IDs for this user
    const { data: memberData } = await supabase
      .from('stream_members')
      .select('stream_id')
      .eq('user_id', userId)

    const streamIds = memberData?.map(m => m.stream_id) || []

    // If user has no streams, return empty
    if (streamIds.length === 0) {
      return {
        streams: [],
        total: 0,
        page,
        limit
      }
    }

    let query = supabase
      .from('streams')
      .select(`
        *,
        creator:profiles!streams_created_by_fkey(id, full_name, avatar_url),
        members:stream_members(count)
      `, { count: 'exact' })
      .in('id', streamIds)
      .order('updated_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Apply filters
    if (filters?.stream_type) {
      query = query.eq('stream_type', filters.stream_type)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      query = query.eq('status', 'active') // Default to active streams
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    if (filters?.created_by) {
      query = query.eq('created_by', filters.created_by)
    }

    const { data: streams, error, count } = await query

    if (error) throw error

    return {
      streams: streams || [],
      total: count || 0,
      page,
      limit
    }
  }

  /**
   * Get stream details with items and members
   */
  static async getStreamDetail(
    streamId: string,
    userId: string
  ): Promise<StreamDetailResponse> {
    const supabase = await createClient()

    // Verify user has access
    await this.verifyAccess(streamId, userId)

    // Get stream
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select(`
        *,
        creator:profiles!streams_created_by_fkey(id, full_name, avatar_url)
      `)
      .eq('id', streamId)
      .single()

    if (streamError) throw streamError

    // Get items
    const { data: items, error: itemsError } = await supabase
      .from('stream_items')
      .select(`
        *,
        business:businesses(id, name, website),
        assigned_user:profiles!stream_items_assigned_to_fkey(id, full_name, avatar_url)
      `)
      .eq('stream_id', streamId)
      .order('position', { ascending: true })

    if (itemsError) throw itemsError

    // Get members
    const { data: members, error: membersError } = await supabase
      .from('stream_members')
      .select(`
        *,
        user:profiles(id, full_name, email, avatar_url)
      `)
      .eq('stream_id', streamId)
      .order('joined_at', { ascending: true })

    if (membersError) throw membersError

    // Get recent activity
    const { data: activity, error: activityError } = await supabase
      .from('stream_activities')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `)
      .eq('stream_id', streamId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (activityError) throw activityError

    // Update last accessed
    await supabase
      .from('stream_members')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('stream_id', streamId)
      .eq('user_id', userId)

    return {
      stream,
      items: items || [],
      members: members || [],
      recent_activity: activity || []
    }
  }

  /**
   * Update stream
   */
  static async updateStream(
    streamId: string,
    userId: string,
    data: UpdateStreamRequest
  ): Promise<Stream> {
    const supabase = await createClient()

    // Verify user is owner or editor
    await this.verifyRole(streamId, userId, ['owner', 'editor'])

    const { data: stream, error } = await supabase
      .from('streams')
      .update({
        ...data,
        updated_by: userId
      })
      .eq('id', streamId)
      .select()
      .single()

    if (error) throw error

    // Log activity
    await this.logActivity(streamId, userId, 'stream_updated', {
      description: `Updated stream: ${stream.name}`,
      target_type: 'stream',
      target_id: streamId
    })

    return stream
  }

  /**
   * Archive stream
   */
  static async archiveStream(streamId: string, userId: string): Promise<void> {
    const supabase = await createClient()

    // Verify user is owner
    await this.verifyRole(streamId, userId, ['owner'])

    const { error } = await supabase
      .from('streams')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('id', streamId)

    if (error) throw error

    await this.logActivity(streamId, userId, 'stream_archived', {
      description: 'Archived stream',
      target_type: 'stream',
      target_id: streamId
    })
  }

  /**
   * Delete stream (permanent)
   */
  static async deleteStream(streamId: string, userId: string): Promise<void> {
    const supabase = await createClient()

    // Verify user is owner
    await this.verifyRole(streamId, userId, ['owner'])

    const { error } = await supabase
      .from('streams')
      .delete()
      .eq('id', streamId)

    if (error) throw error
  }

  /**
   * Add member to stream
   */
  static async addMember(
    streamId: string,
    requesterId: string,
    data: AddStreamMemberRequest
  ): Promise<StreamMember> {
    const supabase = await createClient()

    // Verify requester is owner or editor
    await this.verifyRole(streamId, requesterId, ['owner', 'editor'])

    const { data: member, error } = await supabase
      .from('stream_members')
      .insert({
        stream_id: streamId,
        user_id: data.user_id,
        role: data.role,
        notification_settings: data.notification_settings || {
          new_items: true,
          status_changes: true,
          mentions: true,
          comments: true,
          daily_digest: false,
          instant_critical: true
        },
        invited_by: requesterId,
        invitation_accepted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await this.logActivity(streamId, requesterId, 'member_added', {
      description: `Added member to stream`,
      target_type: 'member',
      target_id: member.id
    })

    // Create notification for new member
    await this.createNotification({
      stream_id: streamId,
      user_id: data.user_id,
      notification_type: 'member_added',
      title: 'Added to Stream',
      body: `You've been added to a stream`,
      priority: 'medium',
      actor_id: requesterId
    })

    return member
  }

  /**
   * Remove member from stream
   */
  static async removeMember(
    streamId: string,
    requesterId: string,
    memberId: string
  ): Promise<void> {
    const supabase = await createClient()

    // Verify requester is owner or editor
    await this.verifyRole(streamId, requesterId, ['owner', 'editor'])

    const { error } = await supabase
      .from('stream_members')
      .delete()
      .eq('id', memberId)
      .eq('stream_id', streamId)

    if (error) throw error

    await this.logActivity(streamId, requesterId, 'member_removed', {
      description: 'Removed member from stream',
      target_type: 'member',
      target_id: memberId
    })
  }

  /**
   * Create stream item
   */
  static async createItem(
    streamId: string,
    userId: string,
    data: CreateStreamItemRequest
  ): Promise<StreamItem> {
    const supabase = await createClient()

    // Verify user is owner or editor
    await this.verifyRole(streamId, userId, ['owner', 'editor'])

    // Get next position
    const { data: maxPosition } = await supabase
      .from('stream_items')
      .select('position')
      .eq('stream_id', streamId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (maxPosition?.position || 0) + 1

    const { data: item, error } = await supabase
      .from('stream_items')
      .insert({
        stream_id: streamId,
        item_type: data.item_type,
        title: data.title,
        description: data.description || null,
        content: data.content || {},
        business_id: data.business_id || null,
        list_id: data.list_id || null,
        research_id: data.research_id || null,
        stage_id: data.stage_id || null,
        priority: data.priority || 'medium',
        tags: data.tags || [],
        assigned_to: data.assigned_to || null,
        due_date: data.due_date || null,
        position: nextPosition,
        metadata: data.metadata || {},
        added_by: userId,
        status: 'open'
      })
      .select()
      .single()

    if (error) throw error

    // Notify assigned user
    if (data.assigned_to && data.assigned_to !== userId) {
      await this.createNotification({
        stream_id: streamId,
        user_id: data.assigned_to,
        notification_type: 'item_assigned',
        title: 'New Task Assigned',
        body: `You've been assigned: ${data.title}`,
        priority: data.priority || 'medium',
        item_id: item.id,
        actor_id: userId
      })
    }

    return item
  }

  /**
   * Update stream item
   */
  static async updateItem(
    itemId: string,
    userId: string,
    data: UpdateStreamItemRequest
  ): Promise<StreamItem> {
    const supabase = await createClient()

    // Get item to verify access
    const { data: existingItem } = await supabase
      .from('stream_items')
      .select('stream_id, assigned_to, stage_id, status')
      .eq('id', itemId)
      .single()

    if (!existingItem) throw new Error('Item not found')

    // Verify user is owner or editor
    await this.verifyRole(existingItem.stream_id, userId, ['owner', 'editor'])

    const { data: item, error } = await supabase
      .from('stream_items')
      .update({
        ...data,
        updated_by: userId
      })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error

    // Notify if assignment changed
    if (data.assigned_to && data.assigned_to !== existingItem.assigned_to) {
      await this.createNotification({
        stream_id: existingItem.stream_id,
        user_id: data.assigned_to,
        notification_type: 'item_assigned',
        title: 'Task Reassigned',
        body: `You've been assigned: ${item.title}`,
        priority: item.priority,
        item_id: itemId,
        actor_id: userId
      })
    }

    return item
  }

  /**
   * Delete stream item
   */
  static async deleteItem(itemId: string, userId: string): Promise<void> {
    const supabase = await createClient()

    // Get item to verify access
    const { data: item } = await supabase
      .from('stream_items')
      .select('stream_id')
      .eq('id', itemId)
      .single()

    if (!item) throw new Error('Item not found')

    // Verify user is owner or editor
    await this.verifyRole(item.stream_id, userId, ['owner', 'editor'])

    const { error } = await supabase
      .from('stream_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error
  }

  /**
   * Get stream items with filters
   */
  static async getItems(
    streamId: string,
    userId: string,
    filters?: StreamItemFilters
  ): Promise<StreamItem[]> {
    const supabase = await createClient()

    // Verify access
    await this.verifyAccess(streamId, userId)

    let query = supabase
      .from('stream_items')
      .select(`
        *,
        business:businesses(id, name, website),
        assigned_user:profiles!stream_items_assigned_to_fkey(id, full_name, avatar_url)
      `)
      .eq('stream_id', streamId)

    // Apply filters
    if (filters?.item_type) {
      query = query.eq('item_type', filters.item_type)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.stage_id) {
      query = query.eq('stage_id', filters.stage_id)
    }

    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    query = query.order('position', { ascending: true })

    const { data, error } = await query

    if (error) throw error

    return data || []
  }

  /**
   * Add comment to stream or item
   */
  static async addComment(
    streamId: string,
    userId: string,
    data: CreateStreamCommentRequest
  ): Promise<StreamComment> {
    const supabase = await createClient()

    // Verify access
    await this.verifyAccess(streamId, userId)

    const { data: comment, error } = await supabase
      .from('stream_comments')
      .insert({
        stream_id: streamId,
        item_id: data.item_id || null,
        content: data.content,
        parent_comment_id: data.parent_comment_id || null,
        thread_id: data.parent_comment_id || null, // If reply, use parent as thread
        mentioned_users: data.mentioned_users || [],
        author_id: userId
      })
      .select()
      .single()

    if (error) throw error

    // Notify mentioned users
    if (data.mentioned_users && data.mentioned_users.length > 0) {
      for (const mentionedUserId of data.mentioned_users) {
        if (mentionedUserId !== userId) {
          await this.createNotification({
            stream_id: streamId,
            user_id: mentionedUserId,
            notification_type: 'mentioned',
            title: 'You were mentioned',
            body: `in a comment: ${data.content.substring(0, 100)}`,
            priority: 'medium',
            item_id: data.item_id || null,
            comment_id: comment.id,
            actor_id: userId
          })
        }
      }
    }

    return comment
  }

  /**
   * Helper: Verify user has access to stream
   */
  private static async verifyAccess(streamId: string, userId: string): Promise<void> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('stream_members')
      .select('id')
      .eq('stream_id', streamId)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      throw new Error('Access denied')
    }
  }

  /**
   * Helper: Verify user has specific role
   */
  private static async verifyRole(
    streamId: string,
    userId: string,
    allowedRoles: string[]
  ): Promise<void> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', userId)
      .single()

    if (error || !data || !allowedRoles.includes(data.role)) {
      throw new Error('Insufficient permissions')
    }
  }

  /**
   * Helper: Log activity
   */
  private static async logActivity(
    streamId: string,
    userId: string,
    activityType: string,
    options: {
      description: string
      target_type?: string
      target_id?: string
      importance?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<void> {
    const supabase = await createClient()

    await supabase.from('stream_activities').insert({
      stream_id: streamId,
      user_id: userId,
      activity_type: activityType,
      description: options.description,
      target_type: options.target_type || null,
      target_id: options.target_id || null,
      importance: options.importance || 'normal',
      metadata: options.metadata || {},
      is_system: false
    })
  }

  /**
   * Helper: Create notification
   */
  private static async createNotification(data: {
    stream_id: string
    user_id: string
    notification_type: string
    title: string
    body: string
    priority: string
    item_id?: string | null
    comment_id?: string | null
    actor_id?: string | null
  }): Promise<void> {
    const supabase = await createClient()

    await supabase.from('stream_notifications').insert({
      stream_id: data.stream_id,
      user_id: data.user_id,
      notification_type: data.notification_type,
      title: data.title,
      body: data.body,
      priority: data.priority,
      item_id: data.item_id || null,
      comment_id: data.comment_id || null,
      actor_id: data.actor_id || null,
      action_url: `/streams/${data.stream_id}${data.item_id ? `/items/${data.item_id}` : ''}`
    })
  }
}
