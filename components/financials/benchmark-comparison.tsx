"use client"

import { CheckCircle2, Circle, XCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SectorBenchmark, SizeBand } from "@/lib/financials/types"

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

export interface BenchmarkMetric {
  metric_key: string;
  metric_name: string;
  company_value: number;
  p25: number | null;
  p50: number; // median
  p75: number | null;
  unit: 'percentage' | 'ratio' | 'currency';
}

export interface BenchmarkComparisonData {
  sector: string;
  size_band: SizeBand;
  period: string;
  metrics: BenchmarkMetric[];
}

type PerformanceTier = 'above' | 'at' | 'below';

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

function formatValue(value: number, unit: 'percentage' | 'ratio' | 'currency', currency: string = 'USD'): string {
  switch (unit) {
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'ratio':
      return `${value.toFixed(2)}x`;
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
  }
}

function getPerformanceTier(
  companyValue: number,
  p25: number | null,
  p50: number,
  p75: number | null,
  higherIsBetter: boolean = true
): PerformanceTier {
  if (higherIsBetter) {
    if (p75 !== null && companyValue >= p75) return 'above';
    if (companyValue >= p50) return 'at';
    return 'below';
  } else {
    // Lower is better (e.g., CAC)
    if (p25 !== null && companyValue <= p25) return 'above';
    if (companyValue <= p50) return 'at';
    return 'below';
  }
}

function getTierIcon(tier: PerformanceTier) {
  switch (tier) {
    case 'above':
      return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
    case 'at':
      return <Circle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
    case 'below':
      return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
  }
}

function getTierLabel(tier: PerformanceTier): string {
  switch (tier) {
    case 'above':
      return 'Above Median';
    case 'at':
      return 'At Median';
    case 'below':
      return 'Below Median';
  }
}

function getTierColor(tier: PerformanceTier): string {
  switch (tier) {
    case 'above':
      return 'text-green-600 dark:text-green-400';
    case 'at':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'below':
      return 'text-red-600 dark:text-red-400';
  }
}

// Metrics where lower is better
const LOWER_IS_BETTER_METRICS = ['cac', 'churn_rate'];

// ==============================================================================
// METRIC CARD COMPONENT
// ==============================================================================

interface BenchmarkMetricCardProps {
  metric: BenchmarkMetric;
  currency?: string;
}

function BenchmarkMetricCard({ metric, currency = 'USD' }: BenchmarkMetricCardProps) {
  const higherIsBetter = !LOWER_IS_BETTER_METRICS.includes(metric.metric_key);
  const tier = getPerformanceTier(
    metric.company_value,
    metric.p25,
    metric.p50,
    metric.p75,
    higherIsBetter
  );

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-medium">{metric.metric_name}</div>
          <div className="text-2xl font-bold mt-1">
            {formatValue(metric.company_value, metric.unit, currency)}
          </div>
        </div>
        {getTierIcon(tier)}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">P75 (Top Quartile)</span>
          <span className="font-medium">
            {metric.p75 !== null ? formatValue(metric.p75, metric.unit, currency) : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">P50 (Median)</span>
          <span className="font-medium">{formatValue(metric.p50, metric.unit, currency)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">P25 (Bottom Quartile)</span>
          <span className="font-medium">
            {metric.p25 !== null ? formatValue(metric.p25, metric.unit, currency) : 'N/A'}
          </span>
        </div>
      </div>

      <div className={`mt-3 pt-3 border-t text-xs font-medium ${getTierColor(tier)}`}>
        {getTierLabel(tier)}
      </div>
    </div>
  );
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export interface BenchmarkComparisonProps {
  data: BenchmarkComparisonData;
  currency?: string;
  className?: string;
}

export function BenchmarkComparison({
  data,
  currency = 'USD',
  className,
}: BenchmarkComparisonProps) {
  if (data.metrics.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Benchmark Comparison</CardTitle>
          <CardDescription>No benchmark data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sector benchmarks are not yet available for {data.sector} ({data.size_band}).
            Benchmarks will be displayed once sufficient industry data is collected.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Sector Benchmark Comparison</CardTitle>
        <CardDescription>
          {data.period} • {data.sector} • {data.size_band}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.metrics.map((metric) => (
            <BenchmarkMetricCard
              key={metric.metric_key}
              metric={metric}
              currency={currency}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 p-3 bg-muted/50 rounded-lg">
          <div className="text-xs font-medium mb-2">Performance Indicators:</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-muted-foreground">Top Quartile (P75+)</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-muted-foreground">Median (P50-P75)</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-muted-foreground">Below Median (&lt;P50)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==============================================================================
// DATA TRANSFORMER (SectorBenchmark[] to BenchmarkComparisonData)
// ==============================================================================

export interface BenchmarkInput {
  sector: string;
  size_band: SizeBand;
  period: string;
  benchmarks: SectorBenchmark[];
  company_metrics: {
    [metric_key: string]: number;
  };
}

const METRIC_NAMES: Record<string, string> = {
  nrr: 'Net Revenue Retention',
  grr: 'Gross Revenue Retention',
  gross_margin: 'Gross Margin',
  cac: 'Customer Acquisition Cost',
  ltv_cac_ratio: 'LTV:CAC Ratio',
  arr_growth: 'ARR Growth',
  churn_rate: 'Churn Rate',
};

const METRIC_UNITS: Record<string, 'percentage' | 'ratio' | 'currency'> = {
  nrr: 'percentage',
  grr: 'percentage',
  gross_margin: 'percentage',
  cac: 'currency',
  ltv_cac_ratio: 'ratio',
  arr_growth: 'percentage',
  churn_rate: 'percentage',
};

export function transformBenchmarks(input: BenchmarkInput): BenchmarkComparisonData {
  const metrics: BenchmarkMetric[] = [];

  for (const benchmark of input.benchmarks) {
    const company_value = input.company_metrics[benchmark.metric_key];
    if (company_value === undefined) continue;

    metrics.push({
      metric_key: benchmark.metric_key,
      metric_name: METRIC_NAMES[benchmark.metric_key] || benchmark.metric_key,
      company_value,
      p25: benchmark.p25,
      p50: benchmark.p50,
      p75: benchmark.p75,
      unit: METRIC_UNITS[benchmark.metric_key] || 'percentage',
    });
  }

  return {
    sector: input.sector,
    size_band: input.size_band,
    period: input.period,
    metrics,
  };
}
