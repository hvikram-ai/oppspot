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
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type MoatScoreTrendData = {
  date: string;
  score: number;
  feature_differentiation: number;
  pricing_power: number;
  brand_recognition: number;
};

type MoatScoreTrendChartProps = {
  data: MoatScoreTrendData[];
};

/**
 * Moat Score Trend Chart
 *
 * Time-series line chart showing moat strength evolution over time
 * Displays overall score + key dimension breakdowns
 *
 * Part of T014 Phase 4 implementation
 */
export function MoatScoreTrendChart({ data }: MoatScoreTrendChartProps) {
  // Format data for Recharts
  const chartData = useMemo(() => {
    return data.map(point => ({
      date: format(new Date(point.date), 'MMM d, yyyy'),
      timestamp: new Date(point.date).getTime(),
      'Overall Moat': point.score,
      'Feature Differentiation': point.feature_differentiation,
      'Pricing Power': point.pricing_power,
      'Brand Recognition': point.brand_recognition,
    }));
  }, [data]);

  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return { direction: 'stable', change: 0 };

    const first = chartData[0]['Overall Moat'];
    const last = chartData[chartData.length - 1]['Overall Moat'];
    const change = last - first;

    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      change: Math.abs(change),
    };
  }, [chartData]);

  const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend.direction === 'up' ? 'text-green-600' : trend.direction === 'down' ? 'text-red-600' : 'text-gray-600';

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Moat Strength Trend</CardTitle>
          <CardDescription>No historical data available</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          <p>Trend data will appear after the first automated refresh</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Moat Strength Trend</CardTitle>
            <CardDescription>
              {chartData.length} data point{chartData.length > 1 ? 's' : ''} tracked
            </CardDescription>
          </div>
          <div className={`flex items-center space-x-1 ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {trend.direction === 'up' && `+${trend.change.toFixed(1)}`}
              {trend.direction === 'down' && `-${trend.change.toFixed(1)}`}
              {trend.direction === 'stable' && 'Stable'}
            </span>
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
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Overall Moat"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ fill: '#2563eb', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Feature Differentiation"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 3 }}
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="Pricing Power"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 3 }}
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="Brand Recognition"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 3 }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
