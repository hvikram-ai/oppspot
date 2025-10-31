'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  ChevronUp,
  MessageCircle,
  Clock,
  User,
  Tag,
  MapPin,
  Bell,
  BellOff,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { FeedbackDetailResponse, FeedbackComment } from '@/types/feedback';

const categoryColors: Record<string, string> = {
  bug: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  feature: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  improvement: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  data_quality: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  integration: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  performance: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  documentation: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
};

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  in_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  duplicate: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
};

const categoryLabels: Record<string, string> = {
  bug: 'Bug',
  feature: 'Feature',
  improvement: 'Improvement',
  data_quality: 'Data Quality',
  integration: 'Integration',
  performance: 'Performance',
  documentation: 'Documentation',
  other: 'Other',
};

export default function FeedbackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const feedbackId = params?.id as string;

  const [data, setData] = useState<FeedbackDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  // Fetch feedback details
  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/feedback/${feedbackId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Feedback not found');
        }
        throw new Error('Failed to load feedback');
      }

      const result: FeedbackDetailResponse = await response.json();
      setData(result);
      setIsFollowing(result.is_following);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [feedbackId]);

  useEffect(() => {
    if (feedbackId) {
      fetchFeedback();
    }
  }, [feedbackId, fetchFeedback]);

  // Handle vote
  const handleVote = async () => {
    if (!data) return;

    try {
      setIsVoting(true);
      const response = await fetch(`/api/feedback/${feedbackId}/vote`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Please sign in to vote on feedback.');
          return;
        }
        throw new Error('Failed to vote');
      }

      const result = await response.json();
      setData((prev) =>
        prev
          ? {
              ...prev,
              feedback: {
                ...prev.feedback,
                hasVoted: result.voted,
                votes_count: result.votes_count,
              },
            }
          : null
      );
    } catch (err) {
      console.error('Error voting:', err);
      alert('Failed to process vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  // Handle follow/unfollow
  const handleToggleFollow = async () => {
    try {
      setIsTogglingFollow(true);
      const response = await fetch(`/api/feedback/${feedbackId}/follow`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Please sign in to follow feedback.');
          return;
        }
        throw new Error('Failed to toggle follow');
      }

      const result = await response.json();
      setIsFollowing(result.following);
    } catch (err) {
      console.error('Error toggling follow:', err);
      alert('Failed to update follow status. Please try again.');
    } finally {
      setIsTogglingFollow(false);
    }
  };

  // Handle submit comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setIsSubmittingComment(true);

      const response = await fetch(`/api/feedback/${feedbackId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          comment: commentText,
          parent_id: replyToId,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Please sign in to comment.');
          return;
        }
        throw new Error('Failed to post comment');
      }

      // Refresh feedback to get new comments
      await fetchFeedback();

      // Reset form
      setCommentText('');
      setReplyToId(null);
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle delete feedback
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete feedback');
      }

      alert('Feedback deleted successfully');
      router.push('/feedback/board');
    } catch (err) {
      console.error('Error deleting feedback:', err);
      alert('Failed to delete feedback. Please try again.');
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Organize comments into threads
  const organizeComments = (comments: FeedbackComment[]) => {
    const topLevel = comments.filter((c) => !c.parent_id);
    const replies = comments.filter((c) => c.parent_id);

    const threaded: Array<FeedbackComment & { replies: FeedbackComment[] }> = topLevel.map(
      (comment) => ({
        ...comment,
        replies: replies.filter((r) => r.parent_id === comment.id),
      })
    );

    return threaded;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-2">{error || 'Feedback not found'}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push('/feedback/board')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Board
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { feedback, comments, activity } = data;
  const threadedComments = organizeComments(comments);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => router.push('/feedback/board')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Board
          </Button>

          {/* Main Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-4">
                {/* Vote Section */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'flex flex-col items-center p-2 h-auto min-w-[60px]',
                      feedback.hasVoted && 'text-primary bg-primary/10'
                    )}
                    onClick={handleVote}
                    disabled={isVoting}
                  >
                    <ChevronUp className={cn('h-6 w-6', feedback.hasVoted && 'fill-current')} />
                    <span className="text-lg font-semibold mt-1">{feedback.votes_count}</span>
                  </Button>
                </div>

                {/* Title and Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex-1">
                      {feedback.title}
                    </h1>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={statusColors[feedback.status] || statusColors.pending}>
                        {formatStatus(feedback.status)}
                      </Badge>
                      {feedback.is_pinned && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          Pinned
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500 flex-wrap mb-4">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{feedback.user_email || 'Anonymous'}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn('text-xs', categoryColors[feedback.category])}
                    >
                      {categoryLabels[feedback.category] || feedback.category}
                    </Badge>

                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {feedback.priority.toUpperCase()}
                    </span>

                    {feedback.affected_feature && (
                      <div className="flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3" />
                        <span>{feedback.affected_feature}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleFollow}
                      disabled={isTogglingFollow}
                    >
                      {isFollowing ? (
                        <>
                          <BellOff className="h-4 w-4 mr-2" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>

                    {/* Owner actions - TODO: Check if current user is owner */}
                    {feedback.user_id && (
                      <>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDelete}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Description
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {feedback.description}
              </p>

              {/* Screenshot */}
              {feedback.screenshot_url && (
                <div className="mt-4">
                  <img
                    src={feedback.screenshot_url}
                    alt="Screenshot"
                    className="max-w-full h-auto rounded-md border border-gray-200"
                  />
                </div>
              )}

              {/* Tags */}
              {feedback.tags && feedback.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-4">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <div className="flex gap-2 flex-wrap">
                    {feedback.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="text-sm px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Response */}
            {feedback.admin_response && (
              <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Official Response
                </h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {feedback.admin_response}
                </p>
              </div>
            )}

            {/* Comments Section */}
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                <MessageCircle className="h-5 w-5 inline mr-2" />
                Comments ({comments.length})
              </h2>

              {/* Comment Form */}
              <form onSubmit={handleSubmitComment} className="mb-6">
                {replyToId && (
                  <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                    Replying to comment...{' '}
                    <button
                      type="button"
                      onClick={() => setReplyToId(null)}
                      className="text-blue-600 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="mb-2"
                />
                <Button type="submit" disabled={!commentText.trim() || isSubmittingComment}>
                  {isSubmittingComment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Post Comment
                    </>
                  )}
                </Button>
              </form>

              {/* Comment List */}
              <div className="space-y-4">
                {threadedComments.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  threadedComments.map((comment) => (
                    <div key={comment.id} className="space-y-3">
                      {/* Parent Comment */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {comment.user_email || 'Anonymous'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(comment.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                          {comment.comment}
                        </p>
                        <button
                          onClick={() => setReplyToId(comment.id)}
                          className="text-xs text-blue-600 hover:underline mt-2"
                        >
                          Reply
                        </button>
                      </div>

                      {/* Replies */}
                      {comment.replies.length > 0 && (
                        <div className="ml-8 space-y-2">
                          {comment.replies.map((reply) => (
                            <div
                              key={reply.id}
                              className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                    {reply.user_email || 'Anonymous'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDistanceToNow(new Date(reply.created_at), {
                                      addSuffix: true,
                                    })}
                                  </span>
                                </div>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                                {reply.comment}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Activity Timeline */}
            {activity.length > 0 && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Activity Timeline
                </h2>
                <div className="space-y-3">
                  {activity.map((item) => (
                    <div key={item.id} className="flex gap-3 text-sm">
                      <div className="flex-shrink-0 w-2 h-2 mt-1.5 bg-blue-500 rounded-full" />
                      <div className="flex-1">
                        <p className="text-gray-700 dark:text-gray-300">
                          <span className="font-medium">{item.user_email || 'System'}</span>{' '}
                          {item.action_type.replace('_', ' ')}
                          {item.metadata && <span> - {JSON.stringify(item.metadata)}</span>}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
