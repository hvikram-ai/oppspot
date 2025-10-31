"use client"

import { AlertTriangle } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

export interface TopCustomer {
  customer_id: string;
  customer_name: string;
  revenue: number;
  revenue_pct: number; // 0-1 (percentage as decimal)
}

export interface ConcentrationData {
  period: string; // e.g., "Dec 2024"
  hhi: number; // 0-10000
  top1_pct: number; // 0-1
  top3_pct: number; // 0-1
  top5_pct: number; // 0-1
  top10_pct: number; // 0-1
  top_customers: TopCustomer[];
}

// ==============================================================================
// CONSTANTS
// ==============================================================================

const CONCENTRATION_THRESHOLD = 0.25; // 25% from FR-016

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getBarColor(index: number, isRisk: boolean): string {
  if (isRisk && index === 0) {
    return '#ef4444'; // red-500 for top customer above threshold
  }
  // Gradient from dark to light blue
  const colors = [
    '#1e40af', // blue-800
    '#1e3a8a', // blue-900
    '#3b82f6', // blue-500
    '#60a5fa', // blue-400
    '#93c5fd', // blue-300
    '#bfdbfe', // blue-200
    '#dbeafe', // blue-100
    '#eff6ff', // blue-50
    '#f8fafc', // slate-50
    '#f1f5f9', // slate-100
  ];
  return colors[index] || colors[colors.length - 1];
}

// ==============================================================================
// CUSTOM TOOLTIP
// ==============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: TopCustomer;
  }>;
  currency?: string;
}

function CustomTooltip({ active, payload, currency = 'USD' }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const customer = payload[0].payload;

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3">
      <p className="font-semibold text-sm">{customer.customer_name}</p>
      <p className="text-sm text-muted-foreground">
        Revenue: {formatCurrency(customer.revenue, currency)}
      </p>
      <p className="text-sm text-muted-foreground">
        Share: {formatPercentage(customer.revenue_pct)}
      </p>
    </div>
  );
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export interface ConcentrationChartProps {
  data: ConcentrationData;
  currency?: string;
  onCustomerClick?: (customerId: string) => void;
  className?: string;
}

export function ConcentrationChart({
  data,
  currency = 'USD',
  onCustomerClick,
  className,
}: ConcentrationChartProps) {
  const isRisk = data.top1_pct > CONCENTRATION_THRESHOLD;
  const displayCustomers = data.top_customers.slice(0, 10);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Revenue Concentration</CardTitle>
        <CardDescription>
          {data.period} • HHI: <span className="font-semibold">{data.hhi.toFixed(0)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Risk Banner */}
        {isRisk && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>High Concentration Risk:</strong> Top customer represents{' '}
              {formatPercentage(data.top1_pct)} of revenue (threshold: 25%)
            </AlertDescription>
          </Alert>
        )}

        {/* Metrics Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div>
            <div className="text-xs text-muted-foreground">Top 1</div>
            <div className="text-lg font-semibold">{formatPercentage(data.top1_pct)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Top 3</div>
            <div className="text-lg font-semibold">{formatPercentage(data.top3_pct)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Top 5</div>
            <div className="text-lg font-semibold">{formatPercentage(data.top5_pct)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Top 10</div>
            <div className="text-lg font-semibold">{formatPercentage(data.top10_pct)}</div>
          </div>
        </div>

        {/* Bar Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={displayCustomers}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="customer_name"
              angle={-45}
              textAnchor="end"
              height={80}
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis
              tickFormatter={(value) => formatPercentage(value)}
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Bar
              dataKey="revenue_pct"
              radius={[4, 4, 0, 0]}
              onClick={(data) => {
                if (onCustomerClick) {
                  onCustomerClick(data.customer_id);
                }
              }}
              className={onCustomerClick ? 'cursor-pointer' : ''}
            >
              {displayCustomers.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(index, isRisk)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Interpretation Guide */}
        <div className="mt-6 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <p className="font-medium mb-1">HHI Interpretation:</p>
          <ul className="space-y-0.5 ml-4 list-disc">
            <li>
              <strong>&lt;1,000:</strong> Low concentration (competitive market)
            </li>
            <li>
              <strong>1,000-1,800:</strong> Moderate concentration
            </li>
            <li>
              <strong>&gt;1,800:</strong> High concentration (potential risk)
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
