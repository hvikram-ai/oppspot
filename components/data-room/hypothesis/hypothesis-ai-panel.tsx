'use client';

/**
 * Hypothesis AI Panel Component
 * Controls for triggering AI analysis and viewing progress
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHypothesisStore, useAnalysisProgress } from '@/lib/stores/hypothesis-store';
import { Play, Loader2, CheckCircle2, XCircle, Sparkles, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface HypothesisAIPanelProps {
  hypothesisId: string;
  onAnalysisComplete?: () => void;
}

export function HypothesisAIPanel({ hypothesisId, onAnalysisComplete }: HypothesisAIPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();
  const { updateAnalysisProgress, clearAnalysisProgress } = useHypothesisStore();
  const analysisProgress = useAnalysisProgress(hypothesisId);

  const handleAnalyze = async () => {
    setAnalyzing(true);

    // Initialize progress
    updateAnalysisProgress(hypothesisId, {
      total_documents: 0,
      processed_documents: 0,
      evidence_found: 0,
      status: 'running',
    });

    try {
      const response = await fetch(`/api/data-room/hypotheses/${hypothesisId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Analyze all documents
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.status === 'running') {
          // Analysis is running in background
          toast({
            title: 'Analysis Started',
            description: 'AI is analyzing documents in the background. This may take a few minutes.',
          });

          // Poll for completion (simple approach)
          pollAnalysisStatus(hypothesisId);
        } else {
          // Analysis completed immediately
          updateAnalysisProgress(hypothesisId, {
            total_documents: data.data.results?.length || 0,
            processed_documents: data.data.results?.length || 0,
            evidence_found: data.data.evidence_found || 0,
            status: 'completed',
          });

          toast({
            title: 'Analysis Complete',
            description: `Found ${data.data.evidence_found} pieces of evidence`,
          });

          onAnalysisComplete?.();
        }
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      updateAnalysisProgress(hypothesisId, {
        total_documents: 0,
        processed_documents: 0,
        evidence_found: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const pollAnalysisStatus = (hypothesisId: string) => {
    // Simple polling every 5 seconds
    const pollInterval = setInterval(async () => {
      try {
        // Check if hypothesis was updated (you could add a status endpoint)
        const response = await fetch(`/api/data-room/hypotheses/${hypothesisId}`);
        const data = await response.json();

        if (data.success) {
          const hypothesis = data.data;

          // If last_analyzed_at is recent (within last minute), analysis likely completed
          if (hypothesis.last_analyzed_at) {
            const lastAnalyzed = new Date(hypothesis.last_analyzed_at);
            const now = new Date();
            const diffSeconds = (now.getTime() - lastAnalyzed.getTime()) / 1000;

            if (diffSeconds < 60) {
              // Analysis completed recently
              updateAnalysisProgress(hypothesisId, {
                total_documents: hypothesis.evidence_count || 0,
                processed_documents: hypothesis.evidence_count || 0,
                evidence_found: hypothesis.evidence_count || 0,
                status: 'completed',
              });

              clearInterval(pollInterval);
              onAnalysisComplete?.();

              toast({
                title: 'Analysis Complete',
                description: `Found ${hypothesis.evidence_count} pieces of evidence`,
              });
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(pollInterval);
      }
    }, 5000);

    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 120000);
  };

  const handleClearProgress = () => {
    clearAnalysisProgress(hypothesisId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Analysis
            </CardTitle>
            <CardDescription>
              Automatically extract evidence from documents using AI
            </CardDescription>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || analysisProgress?.status === 'running'}
          >
            {analyzing || analysisProgress?.status === 'running' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Analysis
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Analysis Progress */}
        {analysisProgress && (
          <div className="space-y-3">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <Badge
                variant={
                  analysisProgress.status === 'completed'
                    ? 'default'
                    : analysisProgress.status === 'failed'
                    ? 'destructive'
                    : 'secondary'
                }
                className="text-xs"
              >
                {analysisProgress.status === 'running' && (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                )}
                {analysisProgress.status === 'completed' && (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                )}
                {analysisProgress.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                {analysisProgress.status === 'idle' && 'Idle'}
                {analysisProgress.status === 'running' && 'Running'}
                {analysisProgress.status === 'completed' && 'Completed'}
                {analysisProgress.status === 'failed' && 'Failed'}
              </Badge>

              {analysisProgress.status === 'completed' && (
                <Button variant="ghost" size="sm" onClick={handleClearProgress}>
                  Clear
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            {analysisProgress.status === 'running' && analysisProgress.total_documents > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {analysisProgress.processed_documents} / {analysisProgress.total_documents}{' '}
                    documents
                  </span>
                  <span className="font-medium">
                    {Math.round(
                      (analysisProgress.processed_documents / analysisProgress.total_documents) *
                        100
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    (analysisProgress.processed_documents / analysisProgress.total_documents) * 100
                  }
                />
              </div>
            )}

            {/* Results Summary */}
            {analysisProgress.status === 'completed' && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Analysis complete! Found <strong>{analysisProgress.evidence_found}</strong> pieces
                  of evidence from <strong>{analysisProgress.total_documents}</strong> documents.
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {analysisProgress.status === 'failed' && analysisProgress.error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{analysisProgress.error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* How it Works */}
        {!analysisProgress && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              AI will analyze all documents in this data room to find evidence that supports or
              contradicts your hypothesis.
            </p>

            <div className="space-y-2">
              <div className="flex gap-3 text-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-xs font-semibold text-purple-600">
                  1
                </div>
                <div>
                  <p className="font-medium">Vector Search</p>
                  <p className="text-xs text-muted-foreground">
                    Find relevant document chunks using semantic similarity
                  </p>
                </div>
              </div>

              <div className="flex gap-3 text-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-xs font-semibold text-purple-600">
                  2
                </div>
                <div>
                  <p className="font-medium">AI Classification</p>
                  <p className="text-xs text-muted-foreground">
                    Classify evidence as supporting, contradicting, or neutral
                  </p>
                </div>
              </div>

              <div className="flex gap-3 text-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-xs font-semibold text-purple-600">
                  3
                </div>
                <div>
                  <p className="font-medium">Confidence Scoring</p>
                  <p className="text-xs text-muted-foreground">
                    Calculate overall hypothesis confidence (0-100)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
