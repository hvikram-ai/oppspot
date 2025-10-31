'use client';

/**
 * Red Flags Summary Widget
 *
 * Dashboard widget showing:
 * - Count of critical and high severity flags
 * - Top 3 most severe open flags
 * - Quick link to full red flags page
 *
 * Used in company dashboard and analytics pages.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RedFlagCard } from '../red-flags/red-flag-card';
import { RedFlag } from '@/lib/red-flags/types';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
} from 'lucide-react';

/**
 * API Response Type
 */
interface RedFlagsSummaryResponse {
  total: number;
  critical_count: number;
  high_count: number;
  top_flags: RedFlag[];
}

/**
 * Props
 */
interface RedFlagsSummaryProps {
  companyId: string;
}

/**
 * Red Flags Summary Widget Component
 */
export function RedFlagsSummary({ companyId }: RedFlagsSummaryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RedFlagsSummaryResponse | null>(null);

  /**
   * Fetch summary data
   */
  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch top 3 critical/high flags
        const params = new URLSearchParams({
          severity: 'critical,high',
          status: 'open',
          sort: 'severity',
          limit: '3',
          page: '1',
        });

        const response = await fetch(
          `/api/companies/${companyId}/red-flags?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch red flags summary');
        }

        const result = await response.json();

        setData({
          total: result.summary.total,
          critical_count: result.summary.by_severity.critical || 0,
          high_count: result.summary.by_severity.high || 0,
          top_flags: result.flags.slice(0, 3),
        });
      } catch (err) {
        console.error('[RedFlagsSummary] Error:', err);
        setError('Failed to load red flags summary');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [companyId]);

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Red Flag Radar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render empty state
   */
  if (!data || data.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Red Flag Radar
          </CardTitle>
          <CardDescription>AI-powered risk detection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Shield className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">All Clear</p>
            <p className="text-xs text-gray-600">No critical red flags detected</p>
          </div>
          <Link href={`/companies/${companyId}/red-flags`}>
            <Button variant="outline" className="w-full mt-4">
              View All Flags
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  /**
   * Main render
   */
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Red Flag Radar
        </CardTitle>
        <CardDescription>
          {data.total} {data.total === 1 ? 'flag' : 'flags'} detected
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          {/* Critical Count */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-900">Critical</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{data.critical_count}</p>
          </div>

          {/* High Count */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-900">High</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{data.high_count}</p>
          </div>
        </div>

        {/* Top Flags */}
        {data.top_flags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Top Concerns</h4>
            <div className="space-y-2">
              {data.top_flags.map((flag) => (
                <Link key={flag.id} href={`/companies/${companyId}/red-flags?selected=${flag.id}`}>
                  <RedFlagCard flag={flag} compact />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* View All Link */}
        <Link href={`/companies/${companyId}/red-flags`}>
          <Button variant="outline" className="w-full">
            View All Flags
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
