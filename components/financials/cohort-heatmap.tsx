"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

export interface CohortData {
  cohort_month: string; // YYYY-MM
  period_month: string; // YYYY-MM
  logo_retention: number; // 0-1 (percentage as decimal)
  revenue_retention: number; // 0-1 (percentage as decimal)
}

export interface CohortGrid {
  [cohortMonth: string]: {
    [periodMonth: string]: {
      logo_retention: number;
      revenue_retention: number;
    };
  };
}

export type RetentionType = 'logo' | 'revenue';

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

function formatMonth(dateStr: string): string {
  const date = new Date(dateStr + '-01');
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function getRetentionColor(retention: number): string {
  // Color scale: red (0%) → yellow (50%) → green (100%)
  if (retention >= 0.9) return 'bg-green-600 text-white';
  if (retention >= 0.8) return 'bg-green-500 text-white';
  if (retention >= 0.7) return 'bg-green-400 text-black';
  if (retention >= 0.6) return 'bg-yellow-400 text-black';
  if (retention >= 0.5) return 'bg-yellow-500 text-black';
  if (retention >= 0.4) return 'bg-orange-400 text-black';
  if (retention >= 0.3) return 'bg-orange-500 text-white';
  if (retention >= 0.2) return 'bg-red-400 text-white';
  return 'bg-red-600 text-white';
}

function transformToGrid(cohorts: CohortData[]): CohortGrid {
  const grid: CohortGrid = {};

  for (const cohort of cohorts) {
    if (!grid[cohort.cohort_month]) {
      grid[cohort.cohort_month] = {};
    }
    grid[cohort.cohort_month][cohort.period_month] = {
      logo_retention: cohort.logo_retention,
      revenue_retention: cohort.revenue_retention,
    };
  }

  return grid;
}

function getMonthDifference(cohortMonth: string, periodMonth: string): number {
  const cohort = new Date(cohortMonth + '-01');
  const period = new Date(periodMonth + '-01');
  const diffTime = period.getTime() - cohort.getTime();
  const diffMonths = Math.round(diffTime / (1000 * 60 * 60 * 24 * 30.44));
  return diffMonths;
}

// ==============================================================================
// HEATMAP CELL COMPONENT
// ==============================================================================

interface HeatmapCellProps {
  cohortMonth: string;
  periodMonth: string;
  retention: number;
  retentionType: RetentionType;
}

function HeatmapCell({
  cohortMonth,
  periodMonth,
  retention,
  retentionType,
}: HeatmapCellProps) {
  const monthDiff = getMonthDifference(cohortMonth, periodMonth);
  const colorClass = getRetentionColor(retention);

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center justify-center h-10 w-10 rounded text-xs font-medium cursor-default ${colorClass}`}
          >
            {formatPercentage(retention)}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p>
              <strong>Cohort:</strong> {formatMonth(cohortMonth)}
            </p>
            <p>
              <strong>Period:</strong> {formatMonth(periodMonth)}
            </p>
            <p>
              <strong>Month {monthDiff}:</strong>{' '}
              {formatPercentage(retention)} {retentionType} retention
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export interface CohortHeatmapProps {
  cohorts: CohortData[];
  window?: 12 | 18 | 24; // Number of months to display
  className?: string;
}

export function CohortHeatmap({ cohorts, window = 24, className }: CohortHeatmapProps) {
  const [retentionType, setRetentionType] = useState<RetentionType>('logo');
  const grid = transformToGrid(cohorts);

  // Get unique sorted months
  const cohortMonths = Object.keys(grid).sort().slice(-window);
  const allPeriodMonths = new Set<string>();
  Object.values(grid).forEach((periods) => {
    Object.keys(periods).forEach((month) => allPeriodMonths.add(month));
  });
  const periodMonths = Array.from(allPeriodMonths).sort();

  // Calculate max period offset for each cohort
  const maxOffset = Math.min(window, periodMonths.length);

  if (cohortMonths.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Cohort Retention Analysis</CardTitle>
          <CardDescription>No cohort data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Upload subscription data to generate cohort retention analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cohort Retention Heatmap</CardTitle>
            <CardDescription>
              {window}-month retention analysis by cohort
            </CardDescription>
          </div>
          <Tabs value={retentionType} onValueChange={(v) => setRetentionType(v as RetentionType)}>
            <TabsList>
              <TabsTrigger value="logo">Logo Retention</TabsTrigger>
              <TabsTrigger value="revenue">Revenue Retention</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header Row */}
            <div className="flex gap-1 mb-1">
              <div className="w-24 flex-shrink-0" /> {/* Spacer for cohort labels */}
              {Array.from({ length: maxOffset }, (_, i) => (
                <div
                  key={i}
                  className="h-8 w-10 flex items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  M{i}
                </div>
              ))}
            </div>

            {/* Data Rows */}
            {cohortMonths.map((cohortMonth) => {
              const cohortData = grid[cohortMonth];

              return (
                <div key={cohortMonth} className="flex gap-1 mb-1">
                  {/* Cohort Label */}
                  <div className="w-24 flex-shrink-0 flex items-center text-xs font-medium text-muted-foreground">
                    {formatMonth(cohortMonth)}
                  </div>

                  {/* Retention Cells */}
                  {Array.from({ length: maxOffset }, (_, monthOffset) => {
                    const periodDate = new Date(cohortMonth + '-01');
                    periodDate.setMonth(periodDate.getMonth() + monthOffset);
                    const periodMonth = periodDate.toISOString().slice(0, 7);

                    const cellData = cohortData[periodMonth];

                    if (!cellData) {
                      return <div key={monthOffset} className="h-10 w-10 bg-muted/20 rounded" />;
                    }

                    const retention =
                      retentionType === 'logo'
                        ? cellData.logo_retention
                        : cellData.revenue_retention;

                    return (
                      <HeatmapCell
                        key={monthOffset}
                        cohortMonth={cohortMonth}
                        periodMonth={periodMonth}
                        retention={retention}
                        retentionType={retentionType}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs">
          <span className="text-muted-foreground">Retention:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-red-600" />
            <span className="text-muted-foreground">0-30%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span className="text-muted-foreground">40-60%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-600" />
            <span className="text-muted-foreground">90-100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
