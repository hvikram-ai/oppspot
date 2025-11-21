'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, TrendingUp } from 'lucide-react';

type FeatureVelocityData = {
  period: string;
  features_added: number;
  features_total: number;
};

type FeatureVelocityChartProps = {
  data: FeatureVelocityData[];
};

/**
 * Feature Velocity Chart
 *
 * Bar chart showing features added per time period
 * Helps track competitive feature development pace
 *
 * Part of T014 Phase 4 implementation
 */
export function FeatureVelocityChart({ data }: FeatureVelocityChartProps) {
  // Calculate average velocity
  const avgVelocity = useMemo(() => {
    if (data.length === 0) return 0;
    const total = data.reduce((sum, d) => sum + d.features_added, 0);
    return Math.round(total / data.length);
  }, [data]);

  // Determine bar color based on velocity (green = high, yellow = medium, red = low)
  const getBarColor = (featuresAdded: number): string => {
    if (featuresAdded >= avgVelocity + 5) return '#10b981'; // green
    if (featuresAdded >= avgVelocity) return '#3b82f6'; // blue
    if (featuresAdded >= avgVelocity - 5) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Velocity</CardTitle>
          <CardDescription>No velocity data available</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          <p>Feature velocity will be calculated after multiple snapshots</p>
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
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>Feature Velocity</span>
            </CardTitle>
            <CardDescription>
              Features added per period (avg: {avgVelocity} features)
            </CardDescription>
          </div>
          <div className="flex items-center space-x-1 text-blue-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">
              {data[data.length - 1]?.features_total || 0} total features
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Features Added', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'features_added') return [value, 'Features Added'];
                if (name === 'features_total') return [value, 'Total Features'];
                return [value, name];
              }}
            />
            <Legend
              formatter={(value) => {
                if (value === 'features_added') return 'Features Added';
                if (value === 'features_total') return 'Total Features';
                return value;
              }}
            />
            <Bar dataKey="features_added" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.features_added)} />
              ))}
            </Bar>
            <Bar dataKey="features_total" fill="#94a3b8" opacity={0.3} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Velocity interpretation */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Interpretation:</span>{' '}
            {avgVelocity > 10 && 'High velocity - rapid feature development pace'}
            {avgVelocity >= 5 && avgVelocity <= 10 && 'Moderate velocity - steady feature growth'}
            {avgVelocity < 5 && 'Low velocity - slow feature development'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
