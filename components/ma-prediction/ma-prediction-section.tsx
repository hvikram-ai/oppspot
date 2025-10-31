/**
 * M&A Prediction Section Component
 *
 * Displays M&A prediction summary on company profile page with:
 * - Prediction score and likelihood
 * - Top factors
 * - Valuation range (if available)
 * - Potential acquirers (if High/Very High)
 * - Export controls
 *
 * Part of T046 implementation
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import PredictionCard from './prediction-card';
import FactorList from './factor-list';
import ValuationRange from './valuation-range';
import AcquirerProfiles from './acquirer-profiles';
import ExportControls from './export-controls';
import { useMAPredictionStore } from '@/lib/stores/ma-prediction-store';
import {
  Target,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from 'lucide-react';

/**
 * Props
 */
interface MAPredictionSectionProps {
  companyId: string;
  companyName: string;
}

/**
 * M&A Prediction Section Component
 */
export function MAPredictionSection({ companyId, companyName }: MAPredictionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentPrediction, isLoading, error, fetchPrediction } = useMAPredictionStore();

  /**
   * Fetch prediction on mount
   */
  useEffect(() => {
    fetchPrediction(companyId, 'all');
  }, [companyId, fetchPrediction]);

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  /**
   * Render error state or insufficient data
   */
  if (error || !currentPrediction) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            M&A Target Analysis
          </CardTitle>
          <CardDescription>AI-powered acquisition likelihood prediction</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Insufficient data to generate M&A prediction for this company'}
            </AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground mt-3">
            Predictions require recent financial data and operational metrics.
          </p>
        </CardContent>
      </Card>
    );
  }

  /**
   * Main render with prediction data
   */
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          M&A Target Analysis
        </CardTitle>
        <CardDescription>
          AI-powered acquisition likelihood prediction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compact Prediction Card */}
        <PredictionCard
          prediction={currentPrediction}
          compact
          onViewDetails={() => setIsExpanded(!isExpanded)}
        />

        {/* Collapsible Detailed View */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {isExpanded ? 'Hide' : 'Show'} Detailed Analysis
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4 pt-4">
            {/* Top Factors */}
            {currentPrediction.factors && currentPrediction.factors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Key Factors</h4>
                <FactorList factors={currentPrediction.factors.slice(0, 5)} />
              </div>
            )}

            {/* Valuation Range */}
            {currentPrediction.valuation && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Estimated Valuation</h4>
                <ValuationRange valuation={currentPrediction.valuation} />
              </div>
            )}

            {/* Acquirer Profiles */}
            {currentPrediction.acquirer_profiles && currentPrediction.acquirer_profiles.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Potential Acquirers</h4>
                <AcquirerProfiles acquirerProfiles={currentPrediction.acquirer_profiles.slice(0, 5)} />
              </div>
            )}

            {/* Export Controls */}
            <div className="pt-2">
              <ExportControls companyIds={[companyId]} />
            </div>

            {/* Financial Disclaimer */}
            <Alert variant="default" className="bg-muted">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Disclaimer:</strong> This M&A prediction is for informational purposes only
                and should not be considered investment advice. Predictions are based on publicly
                available data and AI analysis. Actual M&A activity depends on numerous factors
                beyond financial metrics.
              </AlertDescription>
            </Alert>
          </CollapsibleContent>
        </Collapsible>

        {/* Link to Full Dashboard */}
        <Link href="/ma-targets">
          <Button variant="outline" className="w-full">
            View All M&A Targets
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
