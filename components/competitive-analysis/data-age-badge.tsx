'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface DataAgeBadgeProps {
  lastRefreshedAt?: string | null;
  className?: string;
}

/**
 * Visual indicator of data freshness
 * Green: <7 days, Yellow: 7-30 days, Red: >30 days
 */
export function DataAgeBadge({ lastRefreshedAt, className }: DataAgeBadgeProps) {
  if (!lastRefreshedAt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={className}>
              <AlertTriangle className="mr-1 h-3 w-3" />
              Never refreshed
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This analysis has never been refreshed with competitor data</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const lastRefreshedDate = new Date(lastRefreshedAt);
  const daysSince = Math.floor((Date.now() - lastRefreshedDate.getTime()) / (1000 * 60 * 60 * 24));

  // Determine color and icon based on age
  let variant: 'default' | 'secondary' | 'destructive' = 'default';
  let Icon = CheckCircle;
  let colorClass = 'bg-green-100 text-green-800 border-green-300';

  if (daysSince >= 30) {
    variant = 'destructive';
    Icon = AlertTriangle;
    colorClass = 'bg-red-100 text-red-800 border-red-300';
  } else if (daysSince >= 7) {
    variant = 'secondary';
    Icon = Clock;
    colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-300';
  }

  const timeAgo = formatDistanceToNow(lastRefreshedDate, { addSuffix: true });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant={variant} className={`${colorClass} ${className}`}>
            <Icon className="mr-1 h-3 w-3" />
            Updated {timeAgo}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">Last refreshed</p>
          <p className="text-xs">{lastRefreshedDate.toLocaleString()}</p>
          <p className="text-xs mt-1">
            {daysSince === 0 && 'Data is fresh (today)'}
            {daysSince === 1 && 'Data is 1 day old'}
            {daysSince > 1 && daysSince < 7 && `Data is ${daysSince} days old`}
            {daysSince >= 7 && daysSince < 30 && 'Consider refreshing soon'}
            {daysSince >= 30 && 'Data is stale - refresh recommended'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
