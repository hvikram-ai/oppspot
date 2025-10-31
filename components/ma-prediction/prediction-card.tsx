/**
 * Prediction Card Component
 *
 * Displays M&A prediction summary with score, likelihood, and details button
 *
 * Props:
 * - prediction: MAPrediction
 * - compact: boolean (optional, default false)
 * - onViewDetails: () => void (optional click handler)
 *
 * Part of T040 implementation
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PredictionScoreBadge from './prediction-score-badge';
import type { MAPrediction } from '@/lib/types/ma-prediction';
import { formatDistanceToNow } from 'date-fns';

interface PredictionCardProps {
  prediction: MAPrediction;
  compact?: boolean;
  onViewDetails?: () => void;
}

export default function PredictionCard({
  prediction,
  compact = false,
  onViewDetails
}: PredictionCardProps) {
  // Get confidence badge color
  const getConfidenceBadgeVariant = (confidence: string): 'default' | 'secondary' | 'destructive' => {
    if (confidence === 'High') return 'default';
    if (confidence === 'Medium') return 'secondary';
    return 'destructive';
  };

  return (
    <Card className="w-full">
      <CardHeader className={compact ? 'pb-3' : ''}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">M&A Target Prediction</CardTitle>
            <CardDescription>
              Last updated {formatDistanceToNow(new Date(prediction.updated_at), { addSuffix: true })}
            </CardDescription>
          </div>
          <PredictionScoreBadge score={prediction.prediction_score} size={compact ? 'sm' : 'md'} />
        </div>
      </CardHeader>

      <CardContent className={compact ? 'pt-0' : ''}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="outline" className="font-semibold">
            {prediction.likelihood_category} Likelihood
          </Badge>
          <Badge variant={getConfidenceBadgeVariant(prediction.confidence_level)}>
            {prediction.confidence_level} Confidence
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {prediction.algorithm_type}
          </Badge>
        </div>

        {!compact && (
          <div className="space-y-2 text-sm text-muted-foreground mb-4">
            <div className="flex justify-between">
              <span>Analysis Version:</span>
              <span className="font-mono">{prediction.analysis_version}</span>
            </div>
            {prediction.calculation_time_ms && (
              <div className="flex justify-between">
                <span>Calculation Time:</span>
                <span>{prediction.calculation_time_ms}ms</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Data Refreshed:</span>
              <span>{formatDistanceToNow(new Date(prediction.data_last_refreshed), { addSuffix: true })}</span>
            </div>
          </div>
        )}

        {onViewDetails && (
          <Button onClick={onViewDetails} variant="default" className="w-full">
            View Detailed Analysis
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
