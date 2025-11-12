'use client';

/**
 * Hypothesis Detail Component
 * Full detail view with tabs for overview, evidence, metrics, and activity
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfidenceMeter } from './confidence-meter';
import { EvidencePanel } from './evidence-panel';
import { MetricsTracker } from './metrics-tracker';
import { HypothesisAIPanel } from './hypothesis-ai-panel';
import { HypothesisWithDetails, HypothesisStatus, HypothesisType } from '@/lib/data-room/types';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  TrendingUp,
  Activity,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface HypothesisDetailProps {
  hypothesisId: string;
  dataRoomId: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onAnalyze?: () => void;
}

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

export function HypothesisDetail({
  hypothesisId,
  dataRoomId,
  onEdit,
  onDelete,
  onAnalyze,
}: HypothesisDetailProps) {
  const [hypothesis, setHypothesis] = useState<HypothesisWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Wrap fetchHypothesis in useCallback to prevent stale closures
  const fetchHypothesis = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data-room/hypotheses/${hypothesisId}`);
      const data = await response.json();

      if (data.success) {
        setHypothesis(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch hypothesis:', error);
    } finally {
      setLoading(false);
    }
  }, [hypothesisId]);

  useEffect(() => {
    fetchHypothesis();
  }, [fetchHypothesis]);

  const handleRefresh = () => {
    fetchHypothesis();
  };

  if (loading) {
    return <HypothesisDetailSkeleton />;
  }

  if (!hypothesis) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <XCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Hypothesis not found</h3>
          <Link href={`/data-room/${dataRoomId}/hypotheses`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Hypotheses
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[hypothesis.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Link href={`/data-room/${dataRoomId}/hypotheses`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <Badge variant={statusConfig.variant}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          <div>
            <h1 className="text-3xl font-bold">{hypothesis.title}</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Created by {hypothesis.creator_name} •{' '}
              {formatDistanceToNow(new Date(hypothesis.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {onAnalyze && (
            <Button onClick={onAnalyze}>
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Confidence Score */}
      <Card>
        <CardContent className="pt-6">
          <ConfidenceMeter
            score={hypothesis.confidence_score}
            size="lg"
            showLabel
            showBreakdown
            breakdown={{
              supporting_evidence: hypothesis.supporting_evidence_count,
              contradicting_evidence: hypothesis.contradicting_evidence_count,
              avg_relevance: hypothesis.avg_relevance_score || 0,
              metrics_met: hypothesis.metrics_met_count,
            }}
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="evidence">
            Evidence ({hypothesis.evidence_count})
          </TabsTrigger>
          <TabsTrigger value="metrics">
            Metrics ({hypothesis.metrics_count})
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Analysis
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {hypothesis.description}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Evidence Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Evidence Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Evidence</span>
                  <span className="text-2xl font-bold">{hypothesis.evidence_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">Supporting</span>
                  <span className="text-xl font-bold text-green-600">
                    {hypothesis.supporting_evidence_count}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-600">Contradicting</span>
                  <span className="text-xl font-bold text-red-600">
                    {hypothesis.contradicting_evidence_count}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Metrics Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Metrics</span>
                  <span className="text-2xl font-bold">{hypothesis.metrics_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">Achieved</span>
                  <span className="text-xl font-bold text-green-600">
                    {hypothesis.metrics_met_count}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completion</span>
                  <span className="text-xl font-bold">
                    {hypothesis.metrics_completion_rate.toFixed(0)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Validations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Validations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Validations</span>
                  <span className="text-2xl font-bold">{hypothesis.validations.length}</span>
                </div>
                {hypothesis.validations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {hypothesis.validations.slice(0, 3).map((validation) => (
                      <div key={validation.id} className="text-xs text-muted-foreground">
                        {validation.validation_status} •{' '}
                        {formatDistanceToNow(new Date(validation.created_at), { addSuffix: true })}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tags */}
          {hypothesis.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {hypothesis.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence">
          <EvidencePanel
            hypothesisId={hypothesisId}
            dataRoomId={dataRoomId}
            onViewDocument={(docId, page) => {
              // Handle document viewing - could open in modal or navigate
              console.log('View document:', docId, page);
            }}
          />
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <MetricsTracker hypothesisId={hypothesisId} onMetricsChange={handleRefresh} />
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="analysis">
          <HypothesisAIPanel hypothesisId={hypothesisId} onAnalysisComplete={handleRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function HypothesisDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-full max-w-2xl" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-96" />
    </div>
  );
}
