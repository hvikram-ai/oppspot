'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, ExternalLink, MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface CompetitorCardProps {
  competitorId: string;
  competitorName: string;
  competitorWebsite?: string;
  parityScore?: number;
  lastUpdated?: string;
  isOwner?: boolean;
  onRemove?: (competitorId: string) => void;
  onViewDetails?: (competitorId: string) => void;
  className?: string;
}

/**
 * Display single competitor summary card
 */
export function CompetitorCard({
  competitorId,
  competitorName,
  competitorWebsite,
  parityScore,
  lastUpdated,
  isOwner = false,
  onRemove,
  onViewDetails,
  className,
}: CompetitorCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine score color and label
  const getScoreBadge = (score: number) => {
    if (score >= 80) {
      return { variant: 'destructive' as const, label: 'High Parity', color: 'text-red-600' };
    } else if (score >= 60) {
      return { variant: 'secondary' as const, label: 'Medium Parity', color: 'text-yellow-600' };
    } else {
      return { variant: 'default' as const, label: 'Low Parity', color: 'text-green-600' };
    }
  };

  const scoreBadge = parityScore !== undefined ? getScoreBadge(parityScore) : null;

  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md cursor-pointer',
        isExpanded && 'ring-2 ring-primary',
        className
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{competitorName}</CardTitle>
          </div>
          {isOwner && onRemove && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {competitorWebsite && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(competitorWebsite, '_blank');
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Visit Website
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(competitorId);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Parity Score */}
          {scoreBadge && parityScore !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Feature Parity</span>
              <div className="flex items-center space-x-2">
                <span className={cn('text-2xl font-bold', scoreBadge.color)}>
                  {parityScore.toFixed(0)}%
                </span>
                <Badge variant={scoreBadge.variant}>{scoreBadge.label}</Badge>
              </div>
            </div>
          )}

          {/* Website */}
          {competitorWebsite && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Website</span>
              <a
                href={competitorWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                {new URL(competitorWebsite).hostname}
              </a>
            </div>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="text-sm">
                {new Date(lastUpdated).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* View Details Button */}
          {onViewDetails && isExpanded && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(competitorId);
              }}
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
