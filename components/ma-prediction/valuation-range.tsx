/**
 * Valuation Range Component
 *
 * Displays estimated acquisition valuation range
 *
 * Props:
 * - valuation: MAValuationEstimate | null
 *
 * Part of T042 implementation
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MAValuationEstimate } from '@/lib/types/ma-prediction';

interface ValuationRangeProps {
  valuation: MAValuationEstimate | null;
}

export default function ValuationRange({ valuation }: ValuationRangeProps) {
  if (!valuation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Valuation Estimate</CardTitle>
          <CardDescription>Not available for Low likelihood predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            N/A
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `£${(amount / 1000000).toFixed(1)}M`;
    }
    return `£${amount.toLocaleString()}`;
  };

  // Get confidence badge variant
  const getConfidenceBadgeVariant = (confidence: string): 'default' | 'secondary' | 'destructive' => {
    if (confidence === 'High') return 'default';
    if (confidence === 'Medium') return 'secondary';
    return 'destructive';
  };

  // Calculate percentage through range (for visual bar)
  const minVal = valuation.min_valuation_gbp;
  const maxVal = valuation.max_valuation_gbp;
  const range = maxVal - minVal;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Valuation Estimate</CardTitle>
            <CardDescription>Estimated acquisition price range</CardDescription>
          </div>
          <Badge variant={getConfidenceBadgeVariant(valuation.confidence_level)}>
            {valuation.confidence_level} Confidence
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main valuation range */}
        <div className="text-center">
          <p className="text-3xl font-bold">
            {formatCurrency(minVal)} - {formatCurrency(maxVal)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{valuation.currency}</p>
        </div>

        {/* Visual range bar */}
        <div className="relative h-8 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
            style={{ width: '100%' }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-4 text-xs font-semibold text-white">
            <span>{formatCurrency(minVal)}</span>
            <span>{formatCurrency(maxVal)}</span>
          </div>
        </div>

        {/* Valuation method */}
        <div className="bg-muted p-3 rounded-md space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Valuation Method:</span>
            <Badge variant="outline">
              {valuation.valuation_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
          </div>

          {valuation.key_assumptions && Object.keys(valuation.key_assumptions).length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold mb-2">Key Assumptions</p>
              <dl className="space-y-1">
                {Object.entries(valuation.key_assumptions).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <dt className="text-muted-foreground">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                    </dt>
                    <dd className="font-mono">
                      {typeof value === 'number' ? value.toLocaleString() : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground italic">
          This is an estimated range based on comparable transactions and industry multiples.
          Actual acquisition valuations may vary significantly based on market conditions and negotiation.
        </p>
      </CardContent>
    </Card>
  );
}
