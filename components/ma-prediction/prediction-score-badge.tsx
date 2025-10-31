/**
 * Prediction Score Badge Component
 *
 * Displays M&A prediction score as circular badge with color coding
 *
 * Props:
 * - score: number (0-100)
 * - size: 'sm' | 'md' | 'lg' (optional, default 'md')
 *
 * Part of T039 implementation
 */

'use client';

import { cn } from '@/lib/utils';

interface PredictionScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PredictionScoreBadge({
  score,
  size = 'md',
  className
}: PredictionScoreBadgeProps) {
  // Determine likelihood category from score
  const getLikelihoodCategory = (score: number): string => {
    if (score >= 76) return 'Very High';
    if (score >= 51) return 'High';
    if (score >= 26) return 'Medium';
    return 'Low';
  };

  // Get color based on likelihood
  const getColorClasses = (score: number): string => {
    if (score >= 76) return 'bg-red-500 text-white border-red-600'; // Very High
    if (score >= 51) return 'bg-orange-500 text-white border-orange-600'; // High
    if (score >= 26) return 'bg-yellow-500 text-gray-900 border-yellow-600'; // Medium
    return 'bg-green-500 text-white border-green-600'; // Low
  };

  // Size classes
  const sizeClasses = {
    sm: 'w-12 h-12 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-20 h-20 text-base'
  };

  const category = getLikelihoodCategory(score);
  const colorClasses = getColorClasses(score);

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className={cn(
          'rounded-full border-2 flex items-center justify-center font-bold shadow-md',
          sizeClasses[size],
          colorClasses
        )}
        title={`M&A Target Likelihood: ${category}`}
      >
        {score}
      </div>
      <span className="text-xs text-muted-foreground">{category}</span>
    </div>
  );
}
