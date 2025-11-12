'use client';

/**
 * Evidence Panel Component
 * Displays linked document evidence with excerpts and AI reasoning
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EvidenceWithDocument, EvidenceType } from '@/lib/data-room/types';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  FileText,
  ExternalLink,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvidencePanelProps {
  hypothesisId: string;
  dataRoomId: string;
  onViewDocument?: (documentId: string, pageNumber?: number) => void;
}

const EVIDENCE_TYPE_CONFIG: Record<
  EvidenceType,
  { icon: React.ElementType; label: string; color: string; bgColor: string }
> = {
  supporting: {
    icon: CheckCircle2,
    label: 'Supporting',
    color: 'text-green-700',
    bgColor: 'bg-green-100 dark:bg-green-900',
  },
  contradicting: {
    icon: XCircle,
    label: 'Contradicting',
    color: 'text-red-700',
    bgColor: 'bg-red-100 dark:bg-red-900',
  },
  neutral: {
    icon: MinusCircle,
    label: 'Neutral',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 dark:bg-gray-900',
  },
};

export function EvidencePanel({ hypothesisId, dataRoomId, onViewDocument }: EvidencePanelProps) {
  const [evidence, setEvidence] = useState<EvidenceWithDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EvidenceType | 'all'>('all');

  const fetchEvidence = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data-room/hypotheses/${hypothesisId}/evidence`);
      const data = await response.json();

      if (data.success) {
        setEvidence(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch evidence:', error);
    } finally {
      setLoading(false);
    }
  }, [hypothesisId]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  const filteredEvidence =
    filter === 'all' ? evidence : evidence.filter((e) => e.evidence_type === filter);

  const evidenceCounts = {
    supporting: evidence.filter((e) => e.evidence_type === 'supporting').length,
    contradicting: evidence.filter((e) => e.evidence_type === 'contradicting').length,
    neutral: evidence.filter((e) => e.evidence_type === 'neutral').length,
  };

  if (loading) {
    return <EvidencePanelSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Header with counts */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Evidence ({evidence.length})</h3>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({evidence.length})
          </Button>
          <Button
            variant={filter === 'supporting' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('supporting')}
            className="text-green-600"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {evidenceCounts.supporting}
          </Button>
          <Button
            variant={filter === 'contradicting' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('contradicting')}
            className="text-red-600"
          >
            <XCircle className="h-4 w-4 mr-1" />
            {evidenceCounts.contradicting}
          </Button>
          <Button
            variant={filter === 'neutral' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('neutral')}
          >
            <MinusCircle className="h-4 w-4 mr-1" />
            {evidenceCounts.neutral}
          </Button>
        </div>
      </div>

      {/* Evidence list */}
      {filteredEvidence.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No evidence found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {filter === 'all'
                ? 'Run AI analysis to automatically extract evidence from documents'
                : `No ${filter} evidence found. Try a different filter.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvidence.map((item) => (
            <EvidenceCard
              key={item.id}
              evidence={item}
              onViewDocument={onViewDocument}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EvidenceCard({
  evidence,
  onViewDocument,
}: {
  evidence: EvidenceWithDocument;
  onViewDocument?: (documentId: string, pageNumber?: number) => void;
}) {
  const config = EVIDENCE_TYPE_CONFIG[evidence.evidence_type];
  const Icon = config.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn('p-2 rounded-lg', config.bgColor)}>
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">{evidence.document_filename}</CardTitle>
                {evidence.page_number && (
                  <Badge variant="outline" className="text-xs">
                    Page {evidence.page_number}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={cn('text-xs', config.color, config.bgColor)}>
                  {config.label}
                </Badge>
                {evidence.relevance_score !== null && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {evidence.relevance_score}% relevant
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>AI-calculated relevance score</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {evidence.manually_verified && (
                  <Badge variant="outline" className="text-xs text-blue-600">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {onViewDocument && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDocument(evidence.document_id, evidence.page_number || undefined)}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Excerpt */}
        {evidence.excerpt_text && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm italic text-muted-foreground line-clamp-4">
              {`"${evidence.excerpt_text}"`}
            </p>
          </div>
        )}

        {/* AI Reasoning */}
        {evidence.ai_reasoning && (
          <div className="flex gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-xs text-muted-foreground mb-1">AI Analysis:</p>
              <p className="text-muted-foreground">{evidence.ai_reasoning}</p>
            </div>
          </div>
        )}

        {/* Manual Note */}
        {evidence.manual_note && (
          <div className="flex gap-2 text-sm">
            <FileText className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-xs text-muted-foreground mb-1">Note:</p>
              <p className="text-muted-foreground">{evidence.manual_note}</p>
            </div>
          </div>
        )}

        {/* Confidence indicator */}
        {evidence.ai_confidence !== null && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>AI Confidence:</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  evidence.ai_confidence >= 0.7
                    ? 'bg-green-500'
                    : evidence.ai_confidence >= 0.4
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${evidence.ai_confidence * 100}%` }}
              />
            </div>
            <span>{Math.round(evidence.ai_confidence * 100)}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EvidencePanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}
