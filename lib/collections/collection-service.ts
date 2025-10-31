/**
 * Collections™ Service Layer
 * Core business logic for stream operations
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import type {
  Collection,
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
} from '@/types/collections'

// Database type aliases
type DBCollection = Database['public']['Tables']['collections']['Row']
type DBStreamInsert = Database['public']['Tables']['collections']['Insert']
type DBStreamUpdate = Database['public']['Tables']['collections']['Update']
type DBStreamMember = Database['public']['Tables']['collection_members']['Row']
type DBStreamMemberInsert = Database['public']['Tables']['collection_members']['Insert']
type DBStreamMemberUpdate = Database['public']['Tables']['collection_members']['Update']
type DBStreamItem = Database['public']['Tables']['collection_items']['Row']
type DBStreamItemInsert = Database['public']['Tables']['collection_items']['Insert']
type DBStreamItemUpdate = Database['public']['Tables']['collection_items']['Update']
type DBStreamActivity = Database['public']['Tables']['collection_activities']['Row']
type DBStreamActivityInsert = Database['public']['Tables']['collection_activities']['Insert']
type DBStreamComment = Database['public']['Tables']['collection_comments']['Row']
type DBStreamCommentInsert = Database['public']['Tables']['collection_comments']['Insert']
type DBStreamNotificationInsert = Database['public']['Tables']['collection_notifications']['Insert']

export class StreamService {
  /**
   * Create a new stream
   */
  static async createCollection(
    userId: string,
    orgId: string,
    data: CreateStreamRequest
  ): Promise<Collection> {
    // Use admin client to bypass RLS for stream creation
    const adminClient = createAdminClient()

    console.log('[StreamService] Creating stream with:', { userId, orgId, streamName: data.name })

    const insertData: DBStreamInsert = {
      org_id: orgId,
      name: data.name,
      description: data.description || null,
      emoji: data.emoji || '📁',
      color: data.color || '#6366f1',
      collection_type: data.collection_type || 'project',
      stages: (data.stages || [
        { id: 'discover', name: 'Discover', color: '#3b82f6' },
        { id: 'research', name: 'Research', color: '#8b5cf6' },
        { id: 'outreach', name: 'Outreach', color: '#ec4899' },
        { id: 'qualified', name: 'Qualified', color: '#10b981' },
        { id: 'closed', name: 'Closed', color: '#64748b' }
      ]) as unknown as Database['public']['Tables']['collections']['Insert']['stages'],
      metadata: (data.metadata || {}) as unknown as Database['public']['Tables']['collections']['Insert']['metadata'],
      created_by: userId,
      status: 'active' as const
    }

    const { data: stream, error } = (await adminClient
      .from('collections')
      .insert(insertData)
      .select()
      .single()) as { data: DBCollection | null; error: any }

    if (error || !stream) {
      console.error('[StreamService] Error creating stream:', error)
      throw new Error(`Failed to create stream: ${error?.message || 'Unknown error'}`)
    }

    const streamData = stream
    console.log('[StreamService] Collection created:', streamData.id)

    // Add creator as owner member using same admin client to bypass RLS
    console.log('[StreamService] Adding owner member:', { streamId: streamData.id, userId })

    const memberInsert: DBStreamMemberInsert = {
      collection_id: streamData.id,
      user_id: userId,
      role: 'owner' as const,
      invitation_accepted_at: new Date().toISOString()
    }

    const { error: memberError } = (await adminClient
      .from('collection_members')
      .insert([memberInsert])) as { error: any }

    if (memberError) {
      console.error('[StreamService] Error adding stream member:', memberError)
      throw new Error(`Failed to add stream member: ${memberError.message} (Code: ${memberError.code})`)
    }

    console.log('[StreamService] Member added successfully')

    // Log activity
    await this.logActivity(streamData.id, userId, 'collection_created', {
      description: `Created stream: ${streamData.name}`,
      target_type: 'stream',
      target_id: streamData.id
    })

    return streamData as Collection
  }

  /**
   * Get collections for a user
   */
  static async getCollections(
    userId: string,
    filters?: StreamFilters,
    page = 1,
    limit = 20
  ): Promise<StreamListResponse> {
    const supabase = await createClient()

    // First get stream IDs for this user
    const { data: memberData } = (await supabase
      .from('collection_members')
      .select('collection_id')
      .eq('user_id', userId)) as { data: Pick<DBStreamMember, 'collection_id'>[] | null }

    const streamIds = memberData?.map((m) => m.collection_id) || []

    // If user has no collections, return empty
    if (streamIds.length === 0) {
      return {
        collections: [],
        total: 0,
        page,
        limit
      }
    }

    let query = supabase
      .from('collections')
      .select(`
        *,
        creator:profiles!collections_created_by_fkey(id, full_name, avatar_url),
        members:collection_members(count)
      `, { count: 'exact' })
      .in('id', streamIds)
      .order('updated_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Apply filters
    if (filters?.collection_type) {
      query = query.eq('collection_type', filters.collection_type)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      query = query.eq('status', 'active') // Default to active collections
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    if (filters?.created_by) {
      query = query.eq('created_by', filters.created_by)
    }

    const { data: collections, error, count } = await query

    if (error) throw error

    return {
      collections: collections || [],
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

    type StreamWithCreator = DBCollection & {
      creator: { id: string; full_name: string | null; avatar_url: string | null } | null
    }

    // Get stream
    const { data: stream, error: streamError } = await supabase
      .from('collections')
      .select(`
        *,
        creator:profiles!collections_created_by_fkey(id, full_name, avatar_url)
      `)
      .eq('id', streamId)
      .single() as { data: StreamWithCreator | null; error: unknown }

    if (streamError) throw streamError

    type StreamItemWithRelations = DBStreamItem & {
      business: { id: string; name: string; website: string | null } | null;
      assigned_user: { id: string; full_name: string | null; avatar_url: string | null } | null;
    }

    // Get items
    const { data: items, error: itemsError } = await supabase
      .from('collection_items')
      .select(`
        *,
        business:businesses(id, name, website),
        assigned_user:profiles!collection_items_assigned_to_fkey(id, full_name, avatar_url)
      `)
      .eq('collection_id', streamId)
      .order('position', { ascending: true }) as { data: StreamItemWithRelations[] | null; error: unknown }

    if (itemsError) throw itemsError

    type StreamMemberWithUser = DBStreamMember & {
      user: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
    }

    // Get members
    const { data: members, error: membersError } = await supabase
      .from('collection_members')
      .select(`
        *,
        user:profiles(id, full_name, email, avatar_url)
      `)
      .eq('collection_id', streamId)
      .order('joined_at', { ascending: true }) as { data: StreamMemberWithUser[] | null; error: unknown }

    if (membersError) throw membersError

    type StreamActivityWithUser = DBStreamActivity & {
      user: { id: string; full_name: string | null; avatar_url: string | null } | null;
    }

    // Get recent activity
    const { data: activity, error: activityError } = await supabase
      .from('collection_activities')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `)
      .eq('collection_id', streamId)
      .order('created_at', { ascending: false })
      .limit(20) as { data: StreamActivityWithUser[] | null; error: unknown }

    if (activityError) throw activityError

    // Update last accessed
    const memberUpdate: DBStreamMemberUpdate = {
      last_accessed_at: new Date().toISOString()
    }

    await (supabase
      .from('collection_members')
      .update(memberUpdate as any)
      .eq('collection_id', streamId)
      .eq('user_id', userId) as any)

    return {
      stream: stream as unknown as Collection,
      items: (items || []) as StreamItem[],
      members: (members || []) as unknown as StreamMember[],
      recent_activity: (activity || []) as StreamActivity[]
    }
  }

  /**
   * Update stream
   */
  static async updateCollection(
    streamId: string,
    userId: string,
    data: UpdateStreamRequest
  ): Promise<Collection> {
    const supabase = await createClient()

    // Verify user is owner or editor
    await this.verifyRole(streamId, userId, ['owner', 'editor'])

    const updateData: DBStreamUpdate = {
      ...data,
      updated_by: userId,
      stages: data.stages as unknown as Database['public']['Tables']['collections']['Update']['stages'],
      metadata: data.metadata as unknown as Database['public']['Tables']['collections']['Update']['metadata']
    }

    const { data: stream, error } = (await supabase
      .from('collections')
      .update(updateData as any)
      .eq('id', streamId)
      .select()
      .single()) as { data: DBCollection | null; error: any }

    if (error || !stream) throw error || new Error('Collection not found')

    const streamData = stream
    // Log activity
    await this.logActivity(streamId, userId, 'collection_updated', {
      description: `Updated stream: ${streamData.name ?? "Unknown"}`,
      target_type: 'stream',
      target_id: streamId
    })

    return streamData as Collection
  }

  /**
   * Archive stream
   */
  static async archiveCollection(streamId: string, userId: string): Promise<void> {
    const supabase = await createClient()

    // Verify user is owner
    await this.verifyRole(streamId, userId, ['owner'])

    const archiveUpdate: DBStreamUpdate = {
      status: 'archived' as const,
      archived_at: new Date().toISOString(),
      updated_by: userId
    }

    const { error } = (await supabase
      .from('collections')
      .update(archiveUpdate as any)
      .eq('id', streamId)) as { error: any }

    if (error) throw error

    await this.logActivity(streamId, userId, 'collection_archived', {
      description: 'Archived stream',
      target_type: 'stream',
      target_id: streamId
    })
  }

  /**
   * Delete stream (permanent)
   */
  static async deleteCollection(streamId: string, userId: string): Promise<void> {
    const supabase = await createClient()

    // Verify user is owner
    await this.verifyRole(streamId, userId, ['owner'])

    const { error } = await supabase
      .from('collections')
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

    const memberInsertData: DBStreamMemberInsert = {
      collection_id: streamId,
      user_id: data.user_id,
      role: data.role,
      notification_settings: (data.notification_settings || {
        new_items: true,
        status_changes: true,
        mentions: true,
        comments: true,
        daily_digest: false,
        instant_critical: true
      }) as unknown as Database['public']['Tables']['collection_members']['Insert']['notification_settings'],
      invited_by: requesterId,
      invitation_accepted_at: new Date().toISOString()
    }

    const { data: member, error } = (await supabase
      .from('collection_members')
      .insert(memberInsertData)
      .select()
      .single()) as { data: DBStreamMember | null; error: any }

    if (error || !member) throw error || new Error('Failed to add member')

    const memberData = member
    // Log activity
    await this.logActivity(streamId, requesterId, 'member_added', {
      description: `Added member to stream`,
      target_type: 'member',
      target_id: memberData.id ?? ""
    })

    // Create notification for new member
    await this.createNotification({
      collection_id: streamId,
      user_id: data.user_id,
      notification_type: 'member_added',
      title: 'Added to Collection',
      body: `You've been added to a stream`,
      priority: 'medium',
      actor_id: requesterId
    })

    return memberData as StreamMember
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
      .from('collection_members')
      .delete()
      .eq('id', memberId)
      .eq('collection_id', streamId)

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
    const { data: maxPosition } = (await supabase
      .from('collection_items')
      .select('position')
      .eq('collection_id', streamId)
      .order('position', { ascending: false })
      .limit(1)
      .single()) as { data: Pick<DBStreamItem, 'position'> | null; error: any }

    const nextPosition = (maxPosition?.position ?? 0) + 1

    const itemInsertData: DBStreamItemInsert = {
      collection_id: streamId,
      item_type: data.item_type,
      title: data.title,
      description: data.description || null,
      content: (data.content || {}) as unknown as Database['public']['Tables']['collection_items']['Insert']['content'],
      business_id: data.business_id || null,
      list_id: data.list_id || null,
      research_id: data.research_id || null,
      stage_id: data.stage_id || null,
      priority: data.priority || 'medium',
      tags: data.tags || [],
      assigned_to: data.assigned_to || null,
      due_date: data.due_date || null,
      position: nextPosition,
      metadata: (data.metadata || {}) as unknown as Database['public']['Tables']['collection_items']['Insert']['metadata'],
      added_by: userId,
      status: 'open'
    }

    const { data: item, error } = (await supabase
      .from('collection_items')
      .insert(itemInsertData)
      .select()
      .single()) as { data: DBStreamItem | null; error: any }

    if (error || !item) throw error || new Error('Failed to create item')

    const itemData = item
    // Notify assigned user
    if (data.assigned_to && data.assigned_to !== userId) {
      await this.createNotification({
        collection_id: streamId,
        user_id: data.assigned_to,
        notification_type: 'item_assigned',
        title: 'New Task Assigned',
        body: `You've been assigned: ${data.title}`,
        priority: data.priority || 'medium',
        item_id: itemData.id,
        actor_id: userId
      })
    }

    return itemData as StreamItem
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
    const { data: existingItem } = (await supabase
      .from('collection_items')
      .select('collection_id, assigned_to, stage_id, status')
      .eq('id', itemId)
      .single()) as { data: Pick<DBStreamItem, 'collection_id' | 'assigned_to' | 'stage_id' | 'status'> | null; error: any }

    if (!existingItem) throw new Error('Item not found')

    const existingItemData = existingItem
    // Verify user is owner or editor
    await this.verifyRole(existingItemData.collection_id, userId, ['owner', 'editor'])

    const itemUpdateData: DBStreamItemUpdate = {
      ...data,
      updated_by: userId,
      content: data.content as unknown as Database['public']['Tables']['collection_items']['Update']['content'],
      metadata: data.metadata as unknown as Database['public']['Tables']['collection_items']['Update']['metadata']
    }

    const { data: item, error } = (await supabase
      .from('collection_items')
      .update(itemUpdateData as any)
      .eq('id', itemId)
      .select()
      .single()) as { data: DBStreamItem | null; error: any }

    if (error) throw error

    const itemData = item
    // Notify if assignment changed
    if (data.assigned_to && data.assigned_to !== existingItemData.assigned_to && itemData) {
      await this.createNotification({
        collection_id: existingItemData.collection_id,
        user_id: data.assigned_to,
        notification_type: 'item_assigned',
        title: 'Task Reassigned',
        body: `You've been assigned: ${itemData.title || 'a task'}`,
        priority: itemData.priority || 'medium',
        item_id: itemId,
        actor_id: userId
      })
    }

    return itemData as StreamItem
  }

  /**
   * Delete stream item
   */
  static async deleteItem(itemId: string, userId: string): Promise<void> {
    const supabase = await createClient()

    // Get item to verify access
    const { data: item } = (await supabase
      .from('collection_items')
      .select('collection_id')
      .eq('id', itemId)
      .single()) as { data: Pick<DBStreamItem, 'collection_id'> | null; error: any }

    if (!item) throw new Error('Item not found')

    const itemData = item
    // Verify user is owner or editor
    await this.verifyRole(itemData.collection_id, userId, ['owner', 'editor'])

    const { error } = await supabase
      .from('collection_items')
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
      .from('collection_items')
      .select(`
        *,
        business:businesses(id, name, website),
        assigned_user:profiles!collection_items_assigned_to_fkey(id, full_name, avatar_url)
      `)
      .eq('collection_id', streamId)

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

    const commentInsertData: DBStreamCommentInsert = {
      collection_id: streamId,
      item_id: data.item_id || null,
      content: data.content,
      parent_comment_id: data.parent_comment_id || null,
      thread_id: data.parent_comment_id || null, // If reply, use parent as thread
      mentioned_users: data.mentioned_users || [],
      author_id: userId
    }

    const { data: comment, error } = (await supabase
      .from('collection_comments')
      .insert(commentInsertData)
      .select()
      .single()) as { data: DBStreamComment | null; error: any }

    if (error || !comment) throw error || new Error('Failed to create comment')

    const commentData = comment
    // Notify mentioned users
    if (data.mentioned_users && data.mentioned_users.length > 0) {
      for (const mentionedUserId of data.mentioned_users) {
        if (mentionedUserId !== userId) {
          await this.createNotification({
            collection_id: streamId,
            user_id: mentionedUserId,
            notification_type: 'mentioned',
            title: 'You were mentioned',
            body: `in a comment: ${data.content.substring(0, 100)}`,
            priority: 'medium',
            item_id: data.item_id || null,
            comment_id: commentData.id ?? "",
            actor_id: userId
          })
        }
      }
    }

    return commentData as StreamComment
  }

  /**
   * Helper: Verify user has access to stream
   */
  private static async verifyAccess(streamId: string, userId: string): Promise<void> {
    const supabase = await createClient()

    const { data, error } = (await supabase
      .from('collection_members')
      .select('id')
      .eq('collection_id', streamId)
      .eq('user_id', userId)
      .single()) as { data: Pick<DBStreamMember, 'id'> | null; error: any }

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

    const { data, error } = (await supabase
      .from('collection_members')
      .select('role')
      .eq('collection_id', streamId)
      .eq('user_id', userId)
      .single()) as { data: Pick<DBStreamMember, 'role'> | null; error: any }

    const memberData = data
    if (error || !memberData || !allowedRoles.includes(memberData.role)) {
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

    const activityInsert: DBStreamActivityInsert = {
      collection_id: streamId,
      user_id: userId,
      activity_type: activityType,
      description: options.description,
      target_type: options.target_type || null,
      target_id: options.target_id || null,
      importance: options.importance || 'normal',
      metadata: (options.metadata || {}) as unknown as Database['public']['Tables']['collection_activities']['Insert']['metadata'],
      is_system: false
    }

    await (supabase.from('collection_activities').insert(activityInsert) as any)
  }

  /**
   * Helper: Create notification
   */
  private static async createNotification(data: {
    collection_id: string
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

    const notificationInsert: DBStreamNotificationInsert = {
      collection_id: data.collection_id,
      user_id: data.user_id,
      notification_type: data.notification_type,
      title: data.title,
      body: data.body,
      priority: data.priority,
      item_id: data.item_id || null,
      comment_id: data.comment_id || null,
      actor_id: data.actor_id || null,
      action_url: `/collections/${data.collection_id}${data.item_id ? `/items/${data.item_id}` : ''}`
    }

    await (supabase.from('collection_notifications').insert(notificationInsert) as any)
  }
}
