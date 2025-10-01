'use client';

/**
 * Quota Display Component
 *
 * Shows user's research quota in header/nav
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QuotaData {
  researches_used: number;
  researches_limit: number;
  researches_remaining: number;
  percentage_used: number;
  warning: boolean;
  warning_message?: string;
}

export function QuotaDisplay() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuota();
  }, []);

  const fetchQuota = async () => {
    try {
      const response = await fetch('/api/research/quota');
      if (response.ok) {
        const data = await response.json();
        setQuota(data);
      }
    } catch (error) {
      console.error('Failed to fetch quota:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !quota) {
    return null;
  }

  const getVariant = () => {
    if (quota.percentage_used >= 100) return 'destructive';
    if (quota.percentage_used >= 90) return 'warning';
    return 'default';
  };

  const getColor = () => {
    if (quota.percentage_used >= 100) return 'text-red-600';
    if (quota.percentage_used >= 90) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" data-testid="quota-display">
            <Sparkles className="mr-2 h-4 w-4" />
            <span className={getColor()}>
              {quota.researches_used}/{quota.researches_limit}
            </span>
            {quota.warning && (
              <AlertCircle className="ml-2 h-4 w-4 text-yellow-600" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <p className="font-semibold">Research Quota</p>
            <p className="text-sm">
              {quota.researches_remaining} researches remaining this month
            </p>
            {quota.warning_message && (
              <p className="text-sm text-yellow-600">{quota.warning_message}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
