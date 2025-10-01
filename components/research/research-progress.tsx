'use client';

/**
 * Research Progress Component
 *
 * Shows real-time progress during research generation
 * Polls status endpoint every 2 seconds
 */

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface ResearchProgressProps {
  reportId: string;
  onComplete?: () => void;
}

interface ProgressData {
  status: string;
  sections_complete: number;
  total_sections: number;
  estimated_completion_seconds?: number;
  current_step?: string;
}

export function ResearchProgress({ reportId, onComplete }: ResearchProgressProps) {
  const [progress, setProgress] = useState<ProgressData>({
    status: 'pending',
    sections_complete: 0,
    total_sections: 6,
  });

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/research/${reportId}/status`);
        if (response.ok) {
          const data = await response.json();
          setProgress(data);

          if (data.status === 'complete' && onComplete) {
            onComplete();
          }
        }
      } catch (error) {
        console.error('Failed to poll status:', error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Initial poll

    return () => clearInterval(interval);
  }, [reportId, onComplete]);

  const percentage = (progress.sections_complete / progress.total_sections) * 100;
  const isComplete = progress.status === 'complete';

  return (
    <Card className="p-6" data-testid="research-progress">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            )}
            <h3 className="font-semibold">
              {isComplete ? 'Research Complete' : 'Generating Research'}
            </h3>
          </div>
          <span className="text-sm text-muted-foreground">
            {progress.sections_complete}/{progress.total_sections} sections
          </span>
        </div>

        <Progress value={percentage} className="h-2" />

        {progress.current_step && !isComplete && (
          <p className="text-sm text-muted-foreground">
            {progress.current_step}
          </p>
        )}

        {progress.estimated_completion_seconds && progress.estimated_completion_seconds > 0 && (
          <p className="text-xs text-muted-foreground">
            Estimated time remaining: ~{progress.estimated_completion_seconds} seconds
          </p>
        )}
      </div>
    </Card>
  );
}
