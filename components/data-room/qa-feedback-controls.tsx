'use client'

/**
 * Q&A Feedback Controls Component
 * Feature: 008-oppspot-docs-dataroom
 * Task: T030
 *
 * Thumbs up/down buttons for rating query answers as helpful/not_helpful
 * with optional comment textarea
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ThumbsUp, ThumbsDown, Loader2, CheckCircle2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { FeedbackRequest } from '@/types/data-room-qa'

interface FeedbackControlsProps {
  queryId: string
  dataRoomId: string
  initialRating?: 'helpful' | 'not_helpful' | null
  initialComment?: string
  onFeedbackSubmitted?: (rating: 'helpful' | 'not_helpful', comment?: string) => void
  variant?: 'inline' | 'expanded'
  showComment?: boolean
  className?: string
}

export function FeedbackControls({
  queryId,
  dataRoomId,
  initialRating = null,
  initialComment = '',
  onFeedbackSubmitted,
  variant = 'inline',
  showComment = false,
  className
}: FeedbackControlsProps) {
  const [rating, setRating] = useState<'helpful' | 'not_helpful' | null>(initialRating)
  const [comment, setComment] = useState(initialComment)
  const [showCommentBox, setShowCommentBox] = useState(showComment || !!initialComment)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!initialRating)

  const MAX_COMMENT_LENGTH = 2000

  const handleRatingClick = async (newRating: 'helpful' | 'not_helpful') => {
    // If clicking the same rating, toggle it off
    const finalRating = rating === newRating ? null : newRating

    setRating(finalRating)

    // If rating is cleared, hide comment box
    if (finalRating === null) {
      setShowCommentBox(false)
      setComment('')
    } else {
      // Auto-submit rating without comment if variant is inline
      if (variant === 'inline' && !showCommentBox) {
        await submitFeedback(finalRating, undefined)
      }
    }
  }

  const submitFeedback = async (
    feedbackRating: 'helpful' | 'not_helpful',
    feedbackComment?: string
  ) => {
    setSubmitting(true)

    try {
      const body: FeedbackRequest = {
        query_id: queryId,
        rating: feedbackRating,
        ...(feedbackComment && { comment: feedbackComment })
      }

      const response = await fetch(`/api/data-room/${dataRoomId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit feedback')
      }

      setSubmitted(true)
      toast.success('Feedback submitted successfully')

      onFeedbackSubmitted?.(feedbackRating, feedbackComment)

      // Hide comment box after successful submission in inline mode
      if (variant === 'inline' && !feedbackComment) {
        setShowCommentBox(false)
      }
    } catch (err) {
      console.error('Feedback submission error:', err)
      toast.error('Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitWithComment = async () => {
    if (!rating) return

    await submitFeedback(rating, comment.trim() || undefined)
  }

  const toggleCommentBox = () => {
    setShowCommentBox(prev => !prev)
  }

  // Inline variant - compact buttons only
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={rating === 'helpful' ? 'default' : 'outline'}
            onClick={() => handleRatingClick('helpful')}
            disabled={submitting}
            className={cn(
              'h-8 gap-1.5',
              rating === 'helpful' && 'bg-green-600 hover:bg-green-700'
            )}
          >
            <ThumbsUp className={cn('h-3.5 w-3.5', rating === 'helpful' && 'fill-current')} />
            <span className="text-xs">Helpful</span>
          </Button>

          <Button
            size="sm"
            variant={rating === 'not_helpful' ? 'default' : 'outline'}
            onClick={() => handleRatingClick('not_helpful')}
            disabled={submitting}
            className={cn(
              'h-8 gap-1.5',
              rating === 'not_helpful' && 'bg-red-600 hover:bg-red-700'
            )}
          >
            <ThumbsDown className={cn('h-3.5 w-3.5', rating === 'not_helpful' && 'fill-current')} />
            <span className="text-xs">Not Helpful</span>
          </Button>

          {rating && (
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleCommentBox}
              className="h-8 gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-xs">
                {showCommentBox ? 'Hide' : 'Add'} comment
              </span>
            </Button>
          )}
        </div>

        {submitted && !showCommentBox && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Thanks for your feedback!</span>
          </div>
        )}

        {submitting && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {/* Inline comment box (appears when toggled) */}
        {showCommentBox && rating && (
          <div className="absolute z-10 mt-2 p-3 bg-background border rounded-lg shadow-lg w-full max-w-md">
            <Label htmlFor="feedback-comment" className="text-xs font-medium mb-2 block">
              Add a comment (optional)
            </Label>
            <Textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us more about your experience..."
              className="min-h-[80px] text-sm mb-2"
              maxLength={MAX_COMMENT_LENGTH}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {comment.length}/{MAX_COMMENT_LENGTH}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCommentBox(false)
                    setComment('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitWithComment}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Submit'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Expanded variant - full form layout
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4 space-y-4">
        {/* Rating Buttons */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Was this answer helpful?</Label>
          <div className="flex gap-2">
            <Button
              variant={rating === 'helpful' ? 'default' : 'outline'}
              onClick={() => handleRatingClick('helpful')}
              disabled={submitting}
              className={cn(
                'flex-1 gap-2',
                rating === 'helpful' && 'bg-green-600 hover:bg-green-700'
              )}
            >
              <ThumbsUp className={cn('h-4 w-4', rating === 'helpful' && 'fill-current')} />
              Helpful
            </Button>

            <Button
              variant={rating === 'not_helpful' ? 'default' : 'outline'}
              onClick={() => handleRatingClick('not_helpful')}
              disabled={submitting}
              className={cn(
                'flex-1 gap-2',
                rating === 'not_helpful' && 'bg-red-600 hover:bg-red-700'
              )}
            >
              <ThumbsDown className={cn('h-4 w-4', rating === 'not_helpful' && 'fill-current')} />
              Not Helpful
            </Button>
          </div>
        </div>

        {/* Comment Box (always visible in expanded mode when rating is selected) */}
        {rating && (
          <div className="space-y-2">
            <Label htmlFor="feedback-comment-expanded" className="text-sm font-medium">
              Additional comments (optional)
            </Label>
            <Textarea
              id="feedback-comment-expanded"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us more about your experience..."
              className="min-h-[100px] resize-y"
              maxLength={MAX_COMMENT_LENGTH}
              disabled={submitting}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {comment.length}/{MAX_COMMENT_LENGTH} characters
              </span>
            </div>
          </div>
        )}

        {/* Submit Button (expanded mode) */}
        {rating && (
          <div className="flex items-center justify-between pt-2">
            {submitted ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Thanks for your feedback!</span>
              </div>
            ) : (
              <div className="flex-1" />
            )}

            <Button
              onClick={handleSubmitWithComment}
              disabled={submitting || submitted}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : submitted ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Submitted
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </div>
        )}

        {/* No Rating Selected Message */}
        {!rating && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Please select whether this answer was helpful
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Compact feedback display (read-only)
 * Shows existing feedback without edit capability
 */
interface FeedbackDisplayProps {
  rating: 'helpful' | 'not_helpful'
  comment?: string
  timestamp?: string
  className?: string
}

export function FeedbackDisplay({
  rating,
  comment,
  timestamp,
  className
}: FeedbackDisplayProps) {
  const formatTimestamp = (ts: string): string => {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className={cn('flex items-start gap-3 p-3 bg-muted/50 rounded-lg', className)}>
      <div className="flex-shrink-0 mt-0.5">
        {rating === 'helpful' ? (
          <ThumbsUp className="h-4 w-4 text-green-600 fill-green-600" />
        ) : (
          <ThumbsDown className="h-4 w-4 text-red-600 fill-red-600" />
        )}
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {rating === 'helpful' ? 'Marked as helpful' : 'Marked as not helpful'}
          </span>
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(timestamp)}
            </span>
          )}
        </div>

        {comment && (
          <p className="text-sm text-muted-foreground">{comment}</p>
        )}
      </div>
    </div>
  )
}
