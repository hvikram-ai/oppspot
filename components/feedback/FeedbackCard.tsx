'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronUp, MessageCircle, Clock, Tag, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Feedback } from '@/types/feedback';

interface FeedbackCardProps {
  feedback: Feedback & { hasVoted?: boolean };
  onVote: (feedbackId: string) => void;
  onClick?: () => void;
}

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

const priorityColors: Record<string, string> = {
  critical: 'text-red-600 dark:text-red-400',
  high: 'text-orange-600 dark:text-orange-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  low: 'text-gray-600 dark:text-gray-400',
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

export default function FeedbackCard({ feedback, onVote, onClick }: FeedbackCardProps) {
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVoting(true);
    await onVote(feedback.id);
    setIsVoting(false);
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',
        'hover:shadow-md transition-shadow duration-200',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="p-4 flex gap-4">
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
            <ChevronUp
              className={cn('h-5 w-5', feedback.hasVoted && 'fill-current')}
            />
            <span className="text-sm font-semibold mt-1">{feedback.votes_count}</span>
          </Button>
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
              {feedback.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                className={statusColors[feedback.status] || statusColors.pending}
              >
                {formatStatus(feedback.status)}
              </Badge>
              {feedback.is_pinned && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Pinned
                </Badge>
              )}
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
            {feedback.description}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500 flex-wrap">
            {/* Timestamp */}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(feedback.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>

            {/* Comments */}
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>{feedback.comments_count} comments</span>
            </div>

            {/* Category */}
            <Badge
              variant="outline"
              className={cn('text-xs', categoryColors[feedback.category])}
            >
              {categoryLabels[feedback.category] || feedback.category}
            </Badge>

            {/* Priority */}
            <span
              className={cn('text-xs font-medium', priorityColors[feedback.priority])}
            >
              {feedback.priority.toUpperCase()}
            </span>

            {/* Affected Feature */}
            {feedback.affected_feature && (
              <div className="flex items-center gap-1 text-xs">
                <MapPin className="h-3 w-3" />
                <span>{feedback.affected_feature}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {feedback.tags && feedback.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Tag className="h-3 w-3 text-gray-400" />
              <div className="flex gap-1 flex-wrap">
                {feedback.tags.slice(0, 5).map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  >
                    #{tag}
                  </span>
                ))}
                {feedback.tags.length > 5 && (
                  <span className="text-xs text-gray-400">
                    +{feedback.tags.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
