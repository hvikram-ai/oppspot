"use client"

import { ArrowDown, ArrowRight, ArrowUp, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormulaTooltip, type MetricKey } from "./formula-tooltip"
import { KPISnapshot } from "@/lib/financials/types"

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

export interface KPITrend {
  current: number | null;
  previous: number | null;
  change_pct: number | null;
}

export interface KPIWithTrend {
  arr: KPITrend;
  mrr: KPITrend;
  nrr: KPITrend;
  grr: KPITrend;
  cac: KPITrend;
  ltv: KPITrend;
  gross_margin: KPITrend;
  arpu: KPITrend;
}

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

function formatCurrency(value: number | null, currency: string = 'USD'): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number | null): string {
  if (value === null) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getTrendIndicator(change_pct: number | null, invertColors: boolean = false) {
  if (change_pct === null || change_pct === 0) {
    return {
      icon: <ArrowRight className="h-4 w-4" />,
      color: 'text-muted-foreground',
      label: 'No change',
    };
  }

  const isPositive = change_pct > 0;
  const isGood = invertColors ? !isPositive : isPositive;

  return {
    icon: isPositive ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    ),
    color: isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
    label: `${isPositive ? '+' : ''}${(change_pct * 100).toFixed(1)}%`,
  };
}

// ==============================================================================
// KPI CARD COMPONENT
// ==============================================================================

export interface KPICardProps {
  title: string;
  value: string;
  trend?: {
    icon: React.ReactNode;
    color: string;
    label: string;
  };
  metricKey: MetricKey;
  className?: string;
}

export function KPICard({ title, value, trend, metricKey, className }: KPICardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <FormulaTooltip metric={metricKey} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${trend.color}`}>
            {trend.icon}
            <span>{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==============================================================================
// KPI OVERVIEW COMPONENT
// ==============================================================================

export interface KPIOverviewProps {
  data: KPIWithTrend;
  currency?: string;
  className?: string;
}

export function KPIOverview({ data, currency = 'USD', className }: KPIOverviewProps) {
  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className || ''}`}>
      {/* Row 1: Revenue Metrics */}
      <KPICard
        title="ARR"
        value={formatCurrency(data.arr.current, currency)}
        trend={getTrendIndicator(data.arr.change_pct)}
        metricKey="ARR"
      />
      <KPICard
        title="MRR"
        value={formatCurrency(data.mrr.current, currency)}
        trend={getTrendIndicator(data.mrr.change_pct)}
        metricKey="MRR"
      />
      <KPICard
        title="NRR"
        value={formatPercentage(data.nrr.current)}
        trend={getTrendIndicator(data.nrr.change_pct)}
        metricKey="NRR"
      />
      <KPICard
        title="GRR"
        value={formatPercentage(data.grr.current)}
        trend={getTrendIndicator(data.grr.change_pct)}
        metricKey="GRR"
      />

      {/* Row 2: Customer Economics */}
      <KPICard
        title="CAC"
        value={formatCurrency(data.cac.current, currency)}
        trend={getTrendIndicator(data.cac.change_pct, true)} // Lower CAC is better
        metricKey="CAC"
      />
      <KPICard
        title="LTV"
        value={formatCurrency(data.ltv.current, currency)}
        trend={getTrendIndicator(data.ltv.change_pct)}
        metricKey="LTV"
      />
      <KPICard
        title="Gross Margin"
        value={formatPercentage(data.gross_margin.current)}
        trend={getTrendIndicator(data.gross_margin.change_pct)}
        metricKey="GROSS_MARGIN"
      />
      <KPICard
        title="ARPU"
        value={formatCurrency(data.arpu.current, currency)}
        trend={getTrendIndicator(data.arpu.change_pct)}
        metricKey="ARPU"
      />
    </div>
  );
}

// ==============================================================================
// DATA TRANSFORMER (KPISnapshot to KPIWithTrend)
// ==============================================================================

export function transformKPISnapshots(
  current: KPISnapshot,
  previous: KPISnapshot | null
): KPIWithTrend {
  function calculateTrend(
    currentValue: number | null,
    previousValue: number | null
  ): KPITrend {
    let change_pct: number | null = null;

    if (
      currentValue !== null &&
      previousValue !== null &&
      previousValue !== 0
    ) {
      change_pct = (currentValue - previousValue) / previousValue;
    }

    return {
      current: currentValue,
      previous: previousValue,
      change_pct,
    };
  }

  return {
    arr: calculateTrend(current.arr, previous?.arr ?? null),
    mrr: calculateTrend(current.mrr, previous?.mrr ?? null),
    nrr: calculateTrend(current.nrr, previous?.nrr ?? null),
    grr: calculateTrend(current.grr, previous?.grr ?? null),
    cac: calculateTrend(current.cac, previous?.cac ?? null),
    ltv: calculateTrend(current.ltv, previous?.ltv ?? null),
    gross_margin: calculateTrend(
      current.gross_margin,
      previous?.gross_margin ?? null
    ),
    arpu: calculateTrend(current.arpu, previous?.arpu ?? null),
  };
}
