'use client'

/**
 * Comment Thread Component
 * Full-featured commenting system with threading, mentions, and reactions
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import {
  MessageCircle,
  Send,
  Reply,
  ThumbsUp,
  Heart,
  CheckCircle,
  Smile
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface Comment {
  id: string
  user_id: string
  content: string
  mentions: string[]
  parent_id: string | null
  reactions: Record<string, string[]>
  is_resolved: boolean
  created_at: string
  updated_at: string
  // Joined data
  user_name?: string
  user_avatar?: string
}

interface CommentThreadProps {
  entityType: string
  entityId: string
  entityName: string
  className?: string
}

export function CommentThread({
  entityType,
  entityId,
  entityName,
  className = ''
}: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar?: string } | null>(null)
  const supabase = createClient()

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single<{ full_name: string | null; avatar_url: string | null }>()

      if (profile) {
        setCurrentUser({
          id: user.id,
          name: profile.full_name || user.email || 'Unknown User',
          avatar: profile.avatar_url || undefined
        })
      }
    }

    fetchUser()
  }, [supabase])

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      type CommentWithProfile = {
        id: string
        org_id: string | null
        user_id: string | null
        entity_type: string
        entity_id: string
        content: string
        mentions: string[] | null
        parent_id: string | null
        reactions: any
        is_resolved: boolean
        resolved_by: string | null
        resolved_at: string | null
        created_at: string
        updated_at: string
        profiles: {
          full_name: string | null
          avatar_url: string | null
        } | null
      }

      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles!user_id(full_name, avatar_url)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true })
        .returns<CommentWithProfile[]>()

      if (error) throw error

      const commentsWithUser = (data || []).map(comment => ({
        ...comment,
        user_name: comment.profiles?.full_name,
        user_avatar: comment.profiles?.avatar_url
      }))

      setComments(commentsWithUser as any)
      setLoading(false)
    } catch (error) {
      console.error('[CommentThread] Error fetching comments:', error)
      setLoading(false)
    }
  }, [entityType, entityId, supabase])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`comments:${entityType}:${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `entity_id=eq.${entityId}`
        },
        () => {
          fetchComments()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [entityType, entityId, supabase, fetchComments])

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to comment')
        return
      }

      // Get user's org_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single<{ org_id: string | null }>()

      if (!profile?.org_id) {
        toast.error('User not in an organization')
        return
      }

      // Extract mentions (@username)
      const mentionRegex = /@(\w+)/g
      const mentions: string[] = []
      let match
      while ((match = mentionRegex.exec(newComment)) !== null) {
        mentions.push(match[1])
      }

      // Insert comment
      const { error } = await supabase
        .from('comments')
        .insert({
          org_id: profile.org_id,
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          content: newComment,
          mentions,
          parent_id: replyTo
        } as any)

      if (error) throw error

      // Clear form
      setNewComment('')
      setReplyTo(null)

      // Refresh comments
      await fetchComments()

      toast.success('Comment added')
    } catch (error) {
      console.error('[CommentThread] Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }

  // Add reaction
  const handleAddReaction = async (commentId: string, emoji: string) => {
    if (!currentUser) return

    try {
      const comment = comments.find(c => c.id === commentId)
      if (!comment) return

      const reactions = { ...(comment.reactions || {}) }

      // Toggle reaction
      if (reactions[emoji]?.includes(currentUser.id)) {
        reactions[emoji] = reactions[emoji].filter(id => id !== currentUser.id)
        if (reactions[emoji].length === 0) {
          delete reactions[emoji]
        }
      } else {
        if (!reactions[emoji]) {
          reactions[emoji] = []
        }
        reactions[emoji].push(currentUser.id)
      }

      // Update in database
      const { error } = await supabase
        .from('comments')
        .update({ reactions })
        .eq('id', commentId)

      if (error) throw error

      // Optimistic update
      setComments(prev =>
        prev.map(c => c.id === commentId ? { ...c, reactions } : c)
      )
    } catch (error) {
      console.error('[CommentThread] Error adding reaction:', error)
      toast.error('Failed to add reaction')
    }
  }

  // Organize comments into threads
  const topLevelComments = comments.filter(c => !c.parent_id)
  const getReplies = (commentId: string) => comments.filter(c => c.parent_id === commentId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-lg">
            Comments ({comments.length})
          </h3>
        </div>
      </div>

      {/* Add Comment Form */}
      {currentUser && (
        <Card className="p-4">
          <div className="space-y-3">
            {replyTo && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Reply className="w-4 h-4" />
                <span>Replying to comment</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyTo(null)}
                >
                  Cancel
                </Button>
              </div>
            )}
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment... (Use @name to mention someone)"
              className="min-h-[80px] resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Tip: Use @username to mention teammates
              </span>
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                size="sm"
              >
                <Send className="w-4 h-4 mr-2" />
                Comment
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        <AnimatePresence>
          {topLevelComments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              currentUser={currentUser}
              onReply={setReplyTo}
              onReact={handleAddReaction}
            />
          ))}
        </AnimatePresence>

        {comments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No comments yet</p>
            <p className="text-sm mt-1">Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Individual Comment Item
function CommentItem({
  comment,
  replies,
  currentUser,
  onReply,
  onReact
}: {
  comment: Comment
  replies: Comment[]
  currentUser: { id: string; name: string; avatar?: string } | null
  onReply: (id: string) => void
  onReact: (commentId: string, emoji: string) => void
}) {
  const [showReactions, setShowReactions] = useState(false)

  const availableReactions = ['👍', '❤️', '🔥', '✅', '😊']

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      {/* Main Comment */}
      <Card className="p-4">
        <div className="flex gap-3">
          {/* Avatar */}
          <Avatar className="w-8 h-8 flex-shrink-0">
            {comment.user_avatar && (
              <AvatarImage src={comment.user_avatar} alt={comment.user_name || 'User'} />
            )}
            <AvatarFallback>
              {(comment.user_name || 'U').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{comment.user_name}</span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>

            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
              {comment.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(comment.id)}
                className="text-xs h-7"
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>

              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReactions(!showReactions)}
                  className="text-xs h-7"
                >
                  <Smile className="w-3 h-3 mr-1" />
                  React
                </Button>

                {showReactions && (
                  <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg border flex gap-1 z-10">
                    {availableReactions.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onReact(comment.id, emoji)
                          setShowReactions(false)
                        }}
                        className="text-xl hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reactions Display */}
            {comment.reactions && Object.keys(comment.reactions).length > 0 && (
              <div className="flex gap-2 mt-2">
                {Object.entries(comment.reactions).map(([emoji, userIds]) => (
                  <button
                    key={emoji}
                    onClick={() => onReact(comment.id, emoji)}
                    className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${
                      userIds.includes(currentUser?.id || '')
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{userIds.length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-8 space-y-3">
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              currentUser={currentUser}
              onReply={onReply}
              onReact={onReact}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
