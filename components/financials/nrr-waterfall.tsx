"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

export interface NRRWaterfallData {
  start_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churn_mrr: number;
  end_mrr: number;
  period: string; // e.g., "Dec 2024"
}

interface WaterfallBar {
  name: string;
  value: number;
  cumulative: number;
  type: 'positive' | 'negative' | 'total';
}

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
}

function transformToWaterfallData(data: NRRWaterfallData): WaterfallBar[] {
  let cumulative = 0;

  return [
    {
      name: 'Start MRR',
      value: data.start_mrr,
      cumulative: cumulative,
      type: 'total' as const,
    },
    {
      name: 'Expansion',
      value: data.expansion_mrr,
      cumulative: (cumulative += data.expansion_mrr),
      type: 'positive' as const,
    },
    {
      name: 'Contraction',
      value: -data.contraction_mrr, // Negative for display
      cumulative: (cumulative -= data.contraction_mrr),
      type: 'negative' as const,
    },
    {
      name: 'Churn',
      value: -data.churn_mrr, // Negative for display
      cumulative: (cumulative -= data.churn_mrr),
      type: 'negative' as const,
    },
    {
      name: 'End MRR',
      value: data.end_mrr,
      cumulative: data.end_mrr,
      type: 'total' as const,
    },
  ];
}

function getBarColor(type: 'positive' | 'negative' | 'total'): string {
  switch (type) {
    case 'positive':
      return '#10b981'; // green-500
    case 'negative':
      return '#ef4444'; // red-500
    case 'total':
      return '#3b82f6'; // blue-500
  }
}

function calculateNRR(data: NRRWaterfallData): number {
  if (data.start_mrr === 0) return 0;
  return (data.end_mrr / data.start_mrr) * 100;
}

// ==============================================================================
// CUSTOM TOOLTIP
// ==============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: WaterfallBar;
  }>;
  currency?: string;
}

function CustomTooltip({ active, payload, currency = 'USD' }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3">
      <p className="font-semibold text-sm">{data.name}</p>
      <p className="text-sm text-muted-foreground">
        {formatCurrency(data.value, currency)}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Cumulative: {formatCurrency(data.cumulative, currency)}
      </p>
    </div>
  );
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export interface NRRWaterfallProps {
  data: NRRWaterfallData;
  currency?: string;
  className?: string;
}

export function NRRWaterfall({ data, currency = 'USD', className }: NRRWaterfallProps) {
  const waterfallData = transformToWaterfallData(data);
  const nrr = calculateNRR(data);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Net Revenue Retention Waterfall</CardTitle>
        <CardDescription>
          {data.period} • NRR: <span className="font-semibold">{nrr.toFixed(1)}%</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={waterfallData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value, currency)}
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {waterfallData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(value: number) => formatCurrency(value, currency)}
                className="text-xs fill-foreground"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-muted-foreground">Total</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-muted-foreground">Expansion</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-muted-foreground">Reduction</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
