'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ESGMetric, ESGBenchmark } from '@/types/esg';
import { cn } from '@/lib/utils';

interface BenchmarkBarsProps {
  metrics: (ESGMetric & { benchmark?: ESGBenchmark })[];
  title?: string;
  description?: string;
}

interface PercentileBarProps {
  metric: ESGMetric & { benchmark?: ESGBenchmark };
}

function PercentileBar({ metric }: PercentileBarProps) {
  const { value_numeric, benchmark, metric_name, unit, benchmark_percentile } = metric;

  if (!benchmark || value_numeric === null) {
    return (
      <div className="py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {metric_name}
          </span>
          <Badge variant="outline" className="text-xs">
            No benchmark data
          </Badge>
        </div>
      </div>
    );
  }

  const { p10, p25, p50, p75, p90 } = benchmark;

  // Calculate position on the scale
  const min = p10 || 0;
  const max = p90 || 100;
  const range = max - min;

  const calculatePosition = (value: number | null) => {
    if (value === null) return 0;
    return ((value - min) / range) * 100;
  };

  const yourPosition = calculatePosition(value_numeric);
  const p25Position = calculatePosition(p25);
  const p50Position = calculatePosition(p50);
  const p75Position = calculatePosition(p75);

  // Determine performance level
  const getPerformanceLevel = () => {
    if (value_numeric >= (p75 || 0)) return 'leading';
    if (value_numeric >= (p25 || 0)) return 'par';
    return 'lagging';
  };

  const performanceLevel = getPerformanceLevel();
  const levelColors = {
    leading: 'text-green-600 dark:text-green-400',
    par: 'text-yellow-600 dark:text-yellow-400',
    lagging: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="py-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {metric_name}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">
                  Your value: {value_numeric.toLocaleString()} {unit}
                  <br />
                  Industry median: {p50?.toLocaleString()} {unit}
                  <br />
                  Percentile: {benchmark_percentile?.toFixed(0) || 'N/A'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {value_numeric.toLocaleString()} {unit}
          </span>
          <Badge variant="outline" className={cn('text-xs', levelColors[performanceLevel])}>
            {benchmark_percentile?.toFixed(0) || '?'}th
          </Badge>
        </div>
      </div>

      {/* Percentile Bar */}
      <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
        {/* Colored zones */}
        <div className="absolute inset-0 flex">
          {/* Lagging zone (0 - p25) */}
          <div
            className="bg-red-100 dark:bg-red-900/20"
            style={{ width: `${p25Position}%` }}
          />
          {/* Par zone (p25 - p75) */}
          <div
            className="bg-yellow-100 dark:bg-yellow-900/20"
            style={{ width: `${p75Position - p25Position}%` }}
          />
          {/* Leading zone (p75 - 100) */}
          <div
            className="bg-green-100 dark:bg-green-900/20"
            style={{ width: `${100 - p75Position}%` }}
          />
        </div>

        {/* Benchmark markers */}
        <div className="absolute inset-0">
          {/* p25 marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-500"
            style={{ left: `${p25Position}%` }}
          />
          {/* p50 (median) marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gray-600"
            style={{ left: `${p50Position}%` }}
          />
          {/* p75 marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-green-500"
            style={{ left: `${p75Position}%` }}
          />
        </div>

        {/* Your position marker */}
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center justify-center"
          style={{ left: `${Math.min(95, Math.max(5, yourPosition))}%` }}
        >
          <div className="w-1 h-full bg-blue-600 dark:bg-blue-400" />
          <div className="absolute -top-1 w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full border-2 border-white dark:border-gray-900" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span>p10: {p10?.toLocaleString()}</span>
        <span>p25</span>
        <span className="font-semibold">p50 (median)</span>
        <span>p75</span>
        <span>p90: {p90?.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function BenchmarkBars({ metrics, title, description }: BenchmarkBarsProps) {
  // Filter metrics that have benchmark data
  const metricsWithBenchmarks = metrics.filter(
    (m) => m.benchmark && m.value_numeric !== null
  );

  if (metricsWithBenchmarks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title || 'Benchmark Comparison'}</CardTitle>
          <CardDescription>
            {description || 'Compare your metrics against industry benchmarks'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No benchmark data available for comparison</p>
            <p className="text-sm mt-2">
              Benchmark data will be displayed once metrics are extracted and benchmarks are loaded
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Benchmark Comparison'}</CardTitle>
        <CardDescription>
          {description ||
            `Comparing ${metricsWithBenchmarks.length} metrics against industry peers`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {metricsWithBenchmarks.map((metric) => (
            <PercentileBar key={metric.id} metric={metric} />
          ))}
        </div>

        {/* Sector/Size/Region info */}
        {metricsWithBenchmarks[0]?.benchmark && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Benchmark Details:</span>{' '}
              {metricsWithBenchmarks[0].benchmark.sector}
              {metricsWithBenchmarks[0].benchmark.size_band &&
                ` • ${metricsWithBenchmarks[0].benchmark.size_band}`}
              {metricsWithBenchmarks[0].benchmark.region &&
                ` • ${metricsWithBenchmarks[0].benchmark.region}`}
              {metricsWithBenchmarks[0].benchmark.sample_size &&
                ` • Sample: ${metricsWithBenchmarks[0].benchmark.sample_size} companies`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
