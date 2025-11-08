'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export interface StaleAnalysis {
  id: string;
  title: string;
  last_refreshed_at: string | null;
  days_since_refresh: number;
}

/**
 * Alert banner displayed on login when analyses have stale data (>30 days)
 */
export function StaleDataAlert() {
  const [staleAnalyses, setStaleAnalyses] = useState<StaleAnalysis[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for dismissed state
    const isDismissed = localStorage.getItem('stale-alert-dismissed');
    if (isDismissed) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    // Fetch stale analyses
    fetch('/api/competitive-analysis/stale-alerts')
      .then((res) => res.json())
      .then((data) => {
        if (data.stale_analyses && data.stale_analyses.length > 0) {
          setStaleAnalyses(data.stale_analyses);
        }
      })
      .catch((error) => {
        console.error('Error fetching stale alerts:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('stale-alert-dismissed', 'true');
    // Clear dismissal after 24 hours
    setTimeout(() => {
      localStorage.removeItem('stale-alert-dismissed');
    }, 24 * 60 * 60 * 1000);
  };

  if (loading || dismissed || staleAnalyses.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6 relative">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="mb-2">Stale Data Detected</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <p>
            {staleAnalyses.length === 1
              ? 'Your analysis has stale data'
              : `${staleAnalyses.length} of your analyses have stale data`}{' '}
            (not refreshed in 30+ days). Consider refreshing to get the latest competitor
            intelligence.
          </p>
          <div className="space-y-1 mt-3">
            {staleAnalyses.slice(0, 3).map((analysis) => (
              <div key={analysis.id} className="flex items-center justify-between text-sm">
                <Link
                  href={`/competitive-analysis/${analysis.id}`}
                  className="hover:underline font-medium"
                >
                  {analysis.title}
                </Link>
                <span className="text-xs">
                  {analysis.days_since_refresh} days old
                </span>
              </div>
            ))}
            {staleAnalyses.length > 3 && (
              <p className="text-xs mt-2">
                And {staleAnalyses.length - 3} more...
              </p>
            )}
          </div>
          <div className="flex space-x-2 mt-4">
            <Link href="/competitive-analysis">
              <Button size="sm" variant="secondary">
                View All Analyses
              </Button>
            </Link>
          </div>
        </div>
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </Alert>
  );
}
