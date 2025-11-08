'use client';

/**
 * Hypothesis Card Component
 * Displays hypothesis summary in card format
 */

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfidenceBadge } from './confidence-meter';
import { HypothesisListItem, HypothesisType, HypothesisStatus } from '@/lib/data-room/types';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
  Users,
  Trophy,
  Zap,
  UserPlus,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface HypothesisCardProps {
  hypothesis: HypothesisListItem;
  dataRoomId: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAnalyze?: (id: string) => void;
  className?: string;
}

const HYPOTHESIS_TYPE_CONFIG: Record<
  HypothesisType,
  { icon: React.ElementType; label: string; color: string }
> = {
  revenue_growth: { icon: TrendingUp, label: 'Revenue Growth', color: 'text-green-600' },
  cost_synergy: { icon: TrendingDown, label: 'Cost Synergy', color: 'text-blue-600' },
  market_expansion: { icon: Target, label: 'Market Expansion', color: 'text-purple-600' },
  tech_advantage: { icon: Lightbulb, label: 'Tech Advantage', color: 'text-yellow-600' },
  team_quality: { icon: Users, label: 'Team Quality', color: 'text-pink-600' },
  competitive_position: { icon: Trophy, label: 'Competitive Position', color: 'text-orange-600' },
  operational_efficiency: { icon: Zap, label: 'Operational Efficiency', color: 'text-indigo-600' },
  customer_acquisition: { icon: UserPlus, label: 'Customer Acquisition', color: 'text-cyan-600' },
  custom: { icon: Lightbulb, label: 'Custom', color: 'text-gray-600' },
};

const STATUS_CONFIG: Record<
  HypothesisStatus,
  { icon: React.ElementType; label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { icon: Edit, label: 'Draft', variant: 'secondary' },
  active: { icon: Play, label: 'Active', variant: 'default' },
  validated: { icon: CheckCircle2, label: 'Validated', variant: 'default' },
  invalidated: { icon: XCircle, label: 'Invalidated', variant: 'destructive' },
  needs_revision: { icon: AlertCircle, label: 'Needs Revision', variant: 'outline' },
};

export function HypothesisCard({
  hypothesis,
  dataRoomId,
  onEdit,
  onDelete,
  onAnalyze,
  className,
}: HypothesisCardProps) {
  const typeConfig = HYPOTHESIS_TYPE_CONFIG[hypothesis.hypothesis_type];
  const statusConfig = STATUS_CONFIG[hypothesis.status];
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  // Calculate evidence ratio
  const totalEvidence = hypothesis.evidence_count;
  const supportingRatio =
    totalEvidence > 0 ? Math.round((hypothesis.supporting_evidence_count / totalEvidence) * 100) : 0;

  return (
    <Card className={cn('hover:shadow-lg transition-shadow', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn('p-2 rounded-lg bg-muted', typeConfig.color)}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <Link
                href={`/data-room/${dataRoomId}/hypotheses/${hypothesis.id}`}
                className="hover:underline"
              >
                <CardTitle className="line-clamp-2">{hypothesis.title}</CardTitle>
              </Link>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={statusConfig.variant} className="text-xs">
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{typeConfig.label}</span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(hypothesis.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onAnalyze && (
                <DropdownMenuItem onClick={() => onAnalyze(hypothesis.id)}>
                  <Play className="h-4 w-4 mr-2" />
                  Analyze Documents
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(hypothesis.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Confidence Score */}
        <div>
          <ConfidenceBadge score={hypothesis.confidence_score} />
        </div>

        {/* Evidence Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-600">{hypothesis.supporting_evidence_count}</p>
            <p className="text-xs text-muted-foreground">Supporting</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-red-600">{hypothesis.contradicting_evidence_count}</p>
            <p className="text-xs text-muted-foreground">Contradicting</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{hypothesis.evidence_count}</p>
            <p className="text-xs text-muted-foreground">Total Evidence</p>
          </div>
        </div>

        {/* Metrics Progress */}
        {hypothesis.metrics_count > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Metrics</span>
            <span className="text-sm text-muted-foreground">
              {hypothesis.metrics_met_count}/{hypothesis.metrics_count} achieved
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground justify-between">
        <span>
          by {hypothesis.creator_name}
        </span>
        <span>
          {formatDistanceToNow(new Date(hypothesis.updated_at), { addSuffix: true })}
        </span>
      </CardFooter>
    </Card>
  );
}
