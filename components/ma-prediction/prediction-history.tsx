/**
 * Prediction History Chart Component
 *
 * Shows prediction score trends over time
 * Part of T044 implementation
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MAPrediction } from '@/lib/types/ma-prediction';
import { format } from 'date-fns';

interface PredictionHistoryProps {
  history: MAPrediction[];
}

export default function PredictionHistory({ history }: PredictionHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prediction History</CardTitle>
          <CardDescription>Score trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No historical data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Simple timeline view (simplified version without charts library)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prediction History</CardTitle>
        <CardDescription>{history.length} previous predictions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((pred) => (
            <div key={pred.id} className="flex items-center justify-between p-2 rounded border">
              <div className="flex-1">
                <p className="text-sm font-medium">{format(new Date(pred.created_at), 'MMM dd, yyyy')}</p>
                <p className="text-xs text-muted-foreground">{pred.likelihood_category}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{pred.prediction_score}</p>
                <p className="text-xs text-muted-foreground">{pred.confidence_level} conf.</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
