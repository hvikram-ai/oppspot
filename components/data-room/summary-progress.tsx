'use client';

/**
 * Summary Progress Component
 *
 * Shows extraction progress and status
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { SummaryRun, RunStatus } from '@/lib/data-room/summaries/types';

interface SummaryProgressProps {
  runId: string;
  onComplete?: (run: SummaryRun) => void;
  pollInterval?: number; // ms
}

export function SummaryProgress({
  runId,
  onComplete,
  pollInterval = 2000,
}: SummaryProgressProps) {
  const [run, setRun] = useState<SummaryRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const fetchRunStatus = async () => {
      try {
        // Note: This assumes we'll create a GET endpoint for run status
        // For now, we can get it via the summary endpoint
        const response = await fetch(`/api/data-room/summaries/run/${runId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch run status');
        }

        const data = await response.json();
        setRun(data);
        setLoading(false);

        // Stop polling if run is complete
        if (['success', 'partial', 'error'].includes(data.status)) {
          if (intervalId) {
            clearInterval(intervalId);
          }
          onComplete?.(data);
        }
      } catch (err) {
        console.error('[SummaryProgress] Failed to fetch status:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
        if (intervalId) {
          clearInterval(intervalId);
        }
      }
    };

    // Initial fetch
    fetchRunStatus();

    // Set up polling
    intervalId = setInterval(fetchRunStatus, pollInterval);

    // Cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [runId, pollInterval, onComplete]);

  if (loading && !run) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading extraction status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>Failed to load extraction status: {error}</AlertDescription>
      </Alert>
    );
  }

  if (!run) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Summary Extraction
              <StatusBadge status={run.status} />
            </CardTitle>
            <CardDescription>
              {run.status === 'queued' && 'Waiting to start...'}
              {run.status === 'running' && 'Extracting structured data...'}
              {run.status === 'success' && 'Extraction completed successfully'}
              {run.status === 'partial' && 'Extraction completed with quality issues'}
              {run.status === 'error' && 'Extraction failed'}
            </CardDescription>
          </div>
          {run.duration_ms && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {(run.duration_ms / 1000).toFixed(1)}s
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {run.status === 'running' && (
          <div className="space-y-2">
            <Progress value={undefined} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Processing document...
            </p>
          </div>
        )}

        {/* Metrics */}
        {(run.status === 'success' || run.status === 'partial') && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">Coverage</div>
              <div className="text-2xl font-bold">
                {run.coverage !== null ? `${Math.round(run.coverage * 100)}%` : 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Confidence</div>
              <div className="text-2xl font-bold">
                {run.avg_confidence !== null
                  ? `${Math.round(run.avg_confidence * 100)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Details */}
        {run.details && (
          <div className="space-y-2">
            {run.details.fields_extracted !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fields extracted:</span>
                <span className="font-medium">{run.details.fields_extracted}</span>
              </div>
            )}
            {run.details.reused_extractions !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Reused extractions:</span>
                <span className="font-medium">{run.details.reused_extractions}</span>
              </div>
            )}
            {run.details.llm_extractions !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">LLM extractions:</span>
                <span className="font-medium">{run.details.llm_extractions}</span>
              </div>
            )}
            {run.details.error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{run.details.error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Quality Pass/Fail */}
        {run.quality_pass !== null && (
          <div className="flex items-center justify-center gap-2 py-2">
            {run.quality_pass ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-600">Quality gates passed</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-600">Quality gates not met</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: RunStatus }) {
  switch (status) {
    case 'queued':
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Queued
        </Badge>
      );
    case 'running':
      return (
        <Badge variant="default">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Running
        </Badge>
      );
    case 'success':
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Success
        </Badge>
      );
    case 'partial':
      return (
        <Badge variant="secondary">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Partial
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}
