'use client';

/**
 * Valuation Card Component
 *
 * Displays valuation range prominently (e.g., "$75M-$120M")
 * Shows key metrics, confidence score, and quick actions
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  MoreVertical,
  FileText,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ValuationModelWithStats } from '@/lib/data-room/valuation/types';

interface ValuationCardProps {
  valuation: ValuationModelWithStats;
  onView?: () => void;
  onRecalculate?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
}

export function ValuationCard({
  valuation,
  onView,
  onRecalculate,
  onExport,
  onDelete,
}: ValuationCardProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    const symbol = valuation.currency === 'GBP' ? '£' : valuation.currency === 'EUR' ? '€' : '$';
    if (amount >= 1000000) {
      return `${symbol}${(amount / 1000000).toFixed(0)}M`;
    } else if (amount >= 1000) {
      return `${symbol}${(amount / 1000).toFixed(0)}K`;
    } else {
      return `${symbol}${amount.toFixed(0)}`;
    }
  };

  // Format valuation range
  const valuationRange =
    valuation.estimated_valuation_low && valuation.estimated_valuation_high
      ? `${formatCurrency(valuation.estimated_valuation_low)}-${formatCurrency(valuation.estimated_valuation_high)}`
      : 'Not calculated';

  // Status badge color
  const statusColor = {
    draft: 'secondary',
    extracting: 'default',
    calculating: 'default',
    complete: 'success',
    error: 'destructive',
  }[valuation.status] as 'secondary' | 'default' | 'success' | 'destructive';

  // Confidence level
  const confidenceLevel =
    (valuation.valuation_confidence || 0) >= 0.7
      ? 'High'
      : (valuation.valuation_confidence || 0) >= 0.4
        ? 'Medium'
        : 'Low';

  const confidenceColor =
    confidenceLevel === 'High'
      ? 'text-green-600'
      : confidenceLevel === 'Medium'
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{valuation.model_name}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span>{valuation.company_name}</span>
              <span className="text-muted-foreground">•</span>
              <Calendar className="h-3 w-3" />
              <span>{new Date(valuation.valuation_date).toLocaleDateString()}</span>
            </CardDescription>
          </div>
          <CardAction>
            <Badge variant={statusColor}>{valuation.status}</Badge>
          </CardAction>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Valuation Range - Prominent Display */}
        {valuation.status === 'complete' && (
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-4 border">
            <div className="text-sm font-medium text-muted-foreground mb-1">Estimated Valuation</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{valuationRange}</div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Base: {formatCurrency(valuation.estimated_valuation_mid || 0)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`font-medium ${confidenceColor}`}>
                  {confidenceLevel} Confidence
                </span>
              </div>
            </div>
          </div>
        )}

        {/* In Progress State */}
        {(valuation.status === 'extracting' || valuation.status === 'calculating') && (
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="text-sm font-medium mb-2">
              {valuation.status === 'extracting' ? 'Extracting financials...' : 'Calculating valuation...'}
            </div>
            <Progress value={valuation.status === 'extracting' ? 33 : 66} className="h-2" />
          </div>
        )}

        {/* Key Metrics */}
        {valuation.status === 'complete' && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-muted-foreground text-xs mb-1">Revenue Multiple</div>
              <div className="font-semibold">
                {valuation.revenue_multiple_mid?.toFixed(1) || '-'}x
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-muted-foreground text-xs mb-1">Data Quality</div>
              <div className="font-semibold">
                {((valuation.data_quality_score || 0) * 100).toFixed(0)}%
              </div>
            </div>
            {valuation.revenue_growth_rate && (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-muted-foreground text-xs mb-1">Growth Rate</div>
                <div className="font-semibold flex items-center gap-1">
                  {valuation.revenue_growth_rate > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  {valuation.revenue_growth_rate.toFixed(0)}%
                </div>
              </div>
            )}
            {valuation.comparables_count > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-muted-foreground text-xs mb-1">Comparables</div>
                <div className="font-semibold">{valuation.comparables_count}</div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
            <FileText className="h-4 w-4 mr-2" />
            View Details
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRecalculate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Recalculate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
