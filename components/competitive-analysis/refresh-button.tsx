'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export interface RefreshButtonProps {
  analysisId: string;
  lastRefreshedAt?: string | null;
  competitorsCount?: number;
  onRefreshComplete?: () => void;
  className?: string;
}

/**
 * Button to trigger data refresh with progress modal
 */
export function RefreshButton({
  analysisId,
  lastRefreshedAt,
  competitorsCount = 0,
  onRefreshComplete,
  className,
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [estimatedSeconds, setEstimatedSeconds] = useState<number>(0);

  const handleRefresh = async () => {
    if (competitorsCount === 0) {
      toast.error('No competitors to refresh', {
        description: 'Add competitors before refreshing data',
      });
      return;
    }

    setIsRefreshing(true);
    setShowModal(true);
    setProgress(0);
    setStatus('processing');
    setError(null);

    try {
      // Start refresh
      const response = await fetch(`/api/competitive-analysis/${analysisId}/refresh`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start refresh');
      }

      const data = await response.json();
      setEstimatedSeconds(data.estimated_completion_seconds || 60);

      // Simulate progress (since we don't have real-time updates yet)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, (data.estimated_completion_seconds || 60) * 1000 / 20); // Update 20 times

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `/api/competitive-analysis/${analysisId}/refresh`
          );
          const statusData = await statusResponse.json();

          // Check if last_refreshed_at was updated (indicating completion)
          if (
            statusData.last_refreshed_at &&
            (!lastRefreshedAt || new Date(statusData.last_refreshed_at) > new Date(lastRefreshedAt))
          ) {
            clearInterval(pollInterval);
            clearInterval(progressInterval);
            setProgress(100);
            setStatus('completed');
            setIsRefreshing(false);
            toast.success('Data refreshed successfully');

            // Close modal after 2 seconds
            setTimeout(() => {
              setShowModal(false);
              if (onRefreshComplete) {
                onRefreshComplete();
              }
            }, 2000);
          }
        } catch (pollError) {
          console.error('Error polling refresh status:', pollError);
        }
      }, 5000); // Poll every 5 seconds

      // Timeout after estimated time + buffer
      setTimeout(() => {
        clearInterval(pollInterval);
        clearInterval(progressInterval);
        if (status === 'processing') {
          setStatus('completed');
          setProgress(100);
          setIsRefreshing(false);
          toast.success('Refresh initiated', {
            description: 'Data is being refreshed in the background',
          });
          setTimeout(() => {
            setShowModal(false);
            if (onRefreshComplete) {
              onRefreshComplete();
            }
          }, 2000);
        }
      }, (data.estimated_completion_seconds + 30) * 1000);
    } catch (error) {
      setStatus('failed');
      setError(error instanceof Error ? error.message : 'Unknown error');
      setIsRefreshing(false);
      toast.error('Refresh failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <>
      <Button
        onClick={handleRefresh}
        disabled={isRefreshing || competitorsCount === 0}
        className={className}
        variant="default"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
      </Button>

      {lastRefreshedAt && !isRefreshing && (
        <p className="text-xs text-muted-foreground mt-1">
          Last updated: {new Date(lastRefreshedAt).toLocaleString()}
        </p>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {status === 'processing' && 'Refreshing Data'}
              {status === 'completed' && 'Refresh Complete'}
              {status === 'failed' && 'Refresh Failed'}
            </DialogTitle>
            <DialogDescription>
              {status === 'processing' &&
                `Gathering fresh data for ${competitorsCount} competitor${
                  competitorsCount > 1 ? 's' : ''
                }...`}
              {status === 'completed' && 'Your competitive analysis has been updated'}
              {status === 'failed' && 'An error occurred while refreshing data'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {status === 'processing' && (
              <>
                <Progress value={progress} className="w-full" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{progress.toFixed(0)}%</span>
                </div>
                {estimatedSeconds > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Estimated time: ~{estimatedSeconds} seconds
                  </p>
                )}
              </>
            )}

            {status === 'completed' && (
              <div className="flex flex-col items-center space-y-3 py-4">
                <CheckCircle className="h-16 w-16 text-green-600" />
                <p className="text-sm text-center">
                  Feature matrix, pricing, and moat scores have been updated
                </p>
              </div>
            )}

            {status === 'failed' && (
              <div className="flex flex-col items-center space-y-3 py-4">
                <AlertCircle className="h-16 w-16 text-red-600" />
                <p className="text-sm text-center text-muted-foreground">{error}</p>
                <Button onClick={() => setShowModal(false)} variant="outline" className="mt-4">
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
