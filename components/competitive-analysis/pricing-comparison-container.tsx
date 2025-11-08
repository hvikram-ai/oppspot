'use client';

import { useEffect, useState } from 'react';
import { PricingComparisonChart } from './pricing-comparison';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import type { DashboardData } from '@/lib/competitive-analysis/types';

export interface PricingComparisonProps {
  analysisId: string;
}

/**
 * Container component that fetches pricing data and renders the chart
 */
export function PricingComparison({ analysisId }: PricingComparisonProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/competitive-analysis/${analysisId}`);

        if (!response.ok) {
          throw new Error('Failed to load pricing data');
        }

        const responseData = await response.json();
        setData(responseData);
      } catch (err) {
        console.error('Error fetching pricing data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (analysisId) {
      fetchData();
    }
  }, [analysisId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading pricing data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error || 'Failed to load pricing data'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { analysis, competitors, pricing_comparisons } = data;

  return (
    <PricingComparisonChart
      targetCompanyName={analysis.target_company_name}
      targetCompanyPrice={analysis.target_company_representative_price}
      competitors={competitors}
      pricingComparisons={pricing_comparisons || []}
    />
  );
}
