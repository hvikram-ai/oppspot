'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

type PricingTrendData = {
  date: string;
  competitor_name: string;
  price: number;
  currency: string;
};

type PricingTrendChartProps = {
  data: PricingTrendData[];
};

/**
 * Pricing Trend Chart
 *
 * Time-series line chart showing pricing evolution per competitor
 * Helps identify pricing strategy changes and competitive pressure
 *
 * Part of T014 Phase 4 implementation
 */
export function PricingTrendChart({ data }: PricingTrendChartProps) {
  // Transform data for Recharts (group by date, pivot competitors)
  const chartData = useMemo(() => {
    const grouped = data.reduce((acc, point) => {
      const dateKey = format(new Date(point.date), 'MMM d, yyyy');

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          timestamp: new Date(point.date).getTime(),
        };
      }

      acc[dateKey][point.competitor_name] = point.price;

      return acc;
    }, {} as Record<string, Record<string, string | number>>);

    return Object.values(grouped).sort((a, b) => (a.timestamp as number) - (b.timestamp as number));
  }, [data]);

  // Get unique competitors for line configuration
  const competitors = useMemo(() => {
    return Array.from(new Set(data.map(d => d.competitor_name)));
  }, [data]);

  // Color palette for competitors
  const colors = [
    '#2563eb', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#f97316', // orange
  ];

  if (chartData.length === 0 || competitors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pricing Trend Analysis</CardTitle>
          <CardDescription>No pricing data available</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          <p>Pricing trends will appear after competitive data is collected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Pricing Trend Analysis</span>
            </CardTitle>
            <CardDescription>
              Tracking {competitors.length} competitor{competitors.length > 1 ? 's' : ''} over time
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
            />
            <Legend />
            {competitors.map((competitor, index) => (
              <Line
                key={competitor}
                type="monotone"
                dataKey={competitor}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[index % colors.length], r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
