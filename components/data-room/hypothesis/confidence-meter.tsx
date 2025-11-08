'use client';

/**
 * Confidence Meter Component
 * Visual gauge showing hypothesis confidence score (0-100)
 */

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfidenceMeterProps {
  score: number | null; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showBreakdown?: boolean;
  breakdown?: {
    supporting_evidence: number;
    contradicting_evidence: number;
    avg_relevance: number;
    metrics_met: number;
  };
  className?: string;
}

export function ConfidenceMeter({
  score,
  size = 'md',
  showLabel = true,
  showBreakdown = false,
  breakdown,
  className,
}: ConfidenceMeterProps) {
  // Default to 0 if no score
  const displayScore = score ?? 0;

  // Determine color based on score
  const getColor = (score: number): string => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (score: number): string => {
    if (score >= 70) return 'bg-green-600';
    if (score >= 40) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getLabel = (score: number): string => {
    if (score >= 70) return 'High Confidence';
    if (score >= 40) return 'Medium Confidence';
    return 'Low Confidence';
  };

  // Size variants
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        {showLabel && (
          <span className={cn('font-medium', getColor(displayScore), textSizeClasses[size])}>
            {getLabel(displayScore)}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className={cn('font-bold', getColor(displayScore), textSizeClasses[size])}>
            {displayScore}%
          </span>
          {showBreakdown && breakdown && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold">Confidence Breakdown:</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Evidence Ratio:</span>
                        <span className="font-medium">
                          {breakdown.supporting_evidence}/
                          {breakdown.supporting_evidence + breakdown.contradicting_evidence}
                          {' supporting'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Relevance:</span>
                        <span className="font-medium">{breakdown.avg_relevance.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Metrics Met:</span>
                        <span className="font-medium">{breakdown.metrics_met} achieved</span>
                      </div>
                    </div>
                    <p className="text-muted-foreground pt-1 border-t">
                      Formula: 50% evidence + 30% relevance + 20% metrics
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <Progress
        value={displayScore}
        className={cn(sizeClasses[size], 'bg-secondary')}
        indicatorClassName={getProgressColor(displayScore)}
      />

      {score === null && (
        <p className="text-xs text-muted-foreground">
          No confidence score yet. Add evidence or metrics to calculate.
        </p>
      )}
    </div>
  );
}

// Compact version for cards
export function ConfidenceBadge({ score }: { score: number | null }) {
  const displayScore = score ?? 0;

  const getColor = (score: number): string => {
    if (score >= 70) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    if (score >= 40)
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
  };

  return (
    <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', getColor(displayScore))}>
      {displayScore}% Confident
    </span>
  );
}
