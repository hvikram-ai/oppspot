'use client';

/**
 * Red Flag List Component
 *
 * Main list view for displaying red flags with:
 * - Filtering and search
 * - Summary statistics
 * - Pagination
 * - Flag cards
 * - Loading and empty states
 *
 * Integrates with Zustand store for client state and URL params for filter persistence.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useRedFlagsStore } from '@/lib/stores/red-flags-store';
import { RedFlag, FlagCategory, FlagSeverity, FlagStatus } from '@/lib/red-flags/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { RedFlagCard } from './red-flag-card';
import {
  AlertCircle,
  Shield,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

/**
 * API Response Types
 */
interface FlagListResponse {
  flags: RedFlag[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  summary: {
    total: number;
    by_category: Record<FlagCategory, number>;
    by_severity: Record<FlagSeverity, number>;
    by_status: Record<FlagStatus, number>;
  };
}

/**
 * Props
 */
interface RedFlagListProps {
  companyId: string;
}


/**
 * Red Flag List Component
 */
export function RedFlagList({ companyId }: RedFlagListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Zustand store
  const {
    filters,
    isLoading,
    error,
    setLoading,
    setError,
    setCurrentEntity,
    openFlagDetail,
  } = useRedFlagsStore();

  // Local state for fetched data
  const [data, setData] = useState<FlagListResponse | null>(null);
  const [isRecomputing, setIsRecomputing] = useState(false);

  /**
   * Sync URL params to Zustand store on mount and when URL changes
   */
  useEffect(() => {
    setCurrentEntity('company', companyId);
  }, [companyId, setCurrentEntity]);

  /**
   * Fetch flags from API
   */
  const fetchFlags = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query string from filters
      const params = new URLSearchParams();

      if (filters.category && filters.category.length > 0) {
        filters.category.forEach((c) => params.append('category', c));
      }
      if (filters.severity && filters.severity.length > 0) {
        filters.severity.forEach((s) => params.append('severity', s));
      }
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach((st) => params.append('status', st));
      }
      if (filters.search) {
        params.set('search', filters.search);
      }
      if (filters.sort) {
        params.set('sort', filters.sort);
      }
      params.set('page', String(filters.page || 1));
      params.set('limit', String(filters.limit || 20));

      const response = await fetch(`/api/companies/${companyId}/red-flags?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch red flags: ${response.statusText}`);
      }

      const result: FlagListResponse = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load red flags';
      setError(errorMessage);
      console.error('[RedFlagList] Error fetching flags:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, filters, setLoading, setError]);

  /**
   * Fetch on mount and when filters change
   */
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  /**
   * Trigger recompute detection run
   */
  const handleRecompute = async () => {
    setIsRecomputing(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/red-flags/recompute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.status === 429) {
        const result = await response.json();
        alert(result.message || 'Rate limit exceeded. Please try again later.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to trigger recompute');
      }

      const result = await response.json();

      // Poll for completion
      await pollRunStatus(result.run_id);

      // Refresh flags after completion
      await fetchFlags();
    } catch (err) {
      console.error('[RedFlagList] Error recomputing:', err);
      alert('Failed to recompute red flags. Please try again.');
    } finally {
      setIsRecomputing(false);
    }
  };

  /**
   * Poll run status until complete
   */
  const pollRunStatus = async (runId: string) => {
    const maxPolls = 30; // 30 polls * 2 seconds = 60 seconds max
    let polls = 0;

    while (polls < maxPolls) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

      const response = await fetch(`/api/companies/${companyId}/red-flags/runs/${runId}`);

      if (!response.ok) break;

      const status = await response.json();

      if (status.status === 'success' || status.status === 'partial' || status.status === 'error') {
        break;
      }

      polls++;
    }
  };

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    useRedFlagsStore.getState().updateFilters({ page: newPage });
  };

  /**
   * Render loading skeleton
   */
  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-32 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  /**
   * Render empty state
   */
  if (!data || data.flags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Shield className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Red Flags Found</h3>
        <p className="text-gray-600 text-center mb-6">
          {filters.search || filters.category || filters.severity || filters.status
            ? 'No flags match your current filters. Try adjusting your search criteria.'
            : 'No red flags have been detected yet. Click Scan Now to run detection.'}
        </p>
        <Button onClick={handleRecompute} disabled={isRecomputing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRecomputing ? 'animate-spin' : ''}`} />
          {isRecomputing ? 'Scanning...' : 'Scan Now'}
        </Button>
      </div>
    );
  }

  /**
   * Main render
   */
  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Flags</CardDescription>
            <CardTitle className="text-3xl">{data.summary.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {data.summary.by_severity.critical || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {data.summary.by_severity.high || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {data.summary.by_status.open || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Flag List */}
      <div className="space-y-3">
        {data.flags.map((flag) => (
          <RedFlagCard
            key={flag.id}
            flag={flag}
            onClick={() => openFlagDetail(flag)}
          />
        ))}
      </div>

      {/* Pagination */}
      {data.pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to{' '}
            {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
            {data.pagination.total} flags
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(data.pagination.page - 1)}
              disabled={data.pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center px-4 text-sm">
              Page {data.pagination.page} of {data.pagination.pages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(data.pagination.page + 1)}
              disabled={data.pagination.page === data.pagination.pages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
