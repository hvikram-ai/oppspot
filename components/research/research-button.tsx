'use client';

/**
 * Research Button Component
 *
 * Initiates research generation for a company
 * - Checks quota before generating
 * - Shows loading state during generation
 * - Displays cached indicator if report exists
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ResearchButtonProps {
  companyId: string;
  companyName: string;
  existingReportId?: string;
  isCached?: boolean;
  onGenerate?: (reportId: string) => void;
}

export function ResearchButton({
  companyId,
  companyName,
  existingReportId,
  isCached = false,
  onGenerate,
}: ResearchButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async (forceRefresh = false) => {
    setIsGenerating(true);
    setError(null);

    try {
      const url = forceRefresh
        ? `/api/research/${companyId}?force_refresh=true`
        : `/api/research/${companyId}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to generate research');
      }

      const data = await response.json();

      // Navigate to report or trigger callback
      if (onGenerate) {
        onGenerate(data.report_id);
      } else {
        router.push(`/research/${data.report_id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  if (existingReportId && isCached) {
    return (
      <div className="flex gap-2">
        <Button
          onClick={() => router.push(`/research/${existingReportId}`)}
          variant="outline"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          View Research
        </Button>
        <Button
          onClick={() => handleGenerate(true)}
          disabled={isGenerating}
          variant="ghost"
          size="icon"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={() => handleGenerate(false)}
        disabled={isGenerating}
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Research...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Deep Research
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
