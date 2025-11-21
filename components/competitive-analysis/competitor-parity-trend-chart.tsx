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
import { Grid3x3 } from 'lucide-react';

type CompetitorParityTrendData = {
  date: string;
  competitor_name: string;
  parity_score: number;
};

type CompetitorParityTrendChartProps = {
  data: CompetitorParityTrendData[];
  platformCompetitors?: string[];
};

/**
 * Competitor Parity Trend Chart
 *
 * Time-series line chart showing feature parity evolution per competitor
 * Highlights platform threats (Microsoft, Miro, FigJam)
 *
 * Part of T014 Phase 4 implementation
 */
export function CompetitorParityTrendChart({
  data,
  platformCompetitors = ['Miro', 'Microsoft Whiteboard', 'FigJam'],
}: CompetitorParityTrendChartProps) {
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

      acc[dateKey][point.competitor_name] = point.parity_score;

      return acc;
    }, {} as Record<string, Record<string, string | number>>);

    return Object.values(grouped).sort((a, b) => (a.timestamp as number) - (b.timestamp as number));
  }, [data]);

  // Get unique competitors and separate platform threats
  const { competitors, platformThreats } = useMemo(() => {
    const allCompetitors = Array.from(new Set(data.map(d => d.competitor_name)));
    const platformThreats = allCompetitors.filter(c => platformCompetitors.includes(c));
    const regularCompetitors = allCompetitors.filter(c => !platformCompetitors.includes(c));

    return {
      competitors: regularCompetitors,
      platformThreats,
    };
  }, [data, platformCompetitors]);

  // Color palette
  const platformColor = '#ef4444'; // red for platform threats
  const regularColors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#06b6d4', // cyan
  ];

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Competitor Feature Parity Trends</CardTitle>
          <CardDescription>No parity data available</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center text-muted-foreground">
          <p>Parity trends will appear after feature analysis is complete</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center space-x-2">
            <Grid3x3 className="h-5 w-5" />
            <span>Competitor Feature Parity Trends</span>
          </CardTitle>
          <CardDescription>
            Tracking {competitors.length + platformThreats.length} competitors
            {platformThreats.length > 0 && (
              <span className="text-red-600 font-medium ml-1">
                ({platformThreats.length} platform threat{platformThreats.length > 1 ? 's' : ''})
              </span>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
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
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
            />
            <Legend />

            {/* Platform threats - thicker red lines */}
            {platformThreats.map((competitor) => (
              <Line
                key={competitor}
                type="monotone"
                dataKey={competitor}
                stroke={platformColor}
                strokeWidth={3}
                dot={{ fill: platformColor, r: 5 }}
                activeDot={{ r: 7 }}
                connectNulls
              />
            ))}

            {/* Regular competitors - normal colored lines */}
            {competitors.map((competitor, index) => (
              <Line
                key={competitor}
                type="monotone"
                dataKey={competitor}
                stroke={regularColors[index % regularColors.length]}
                strokeWidth={2}
                dot={{ fill: regularColors[index % regularColors.length], r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Legend explanation */}
        {platformThreats.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <span className="font-medium">Platform Threats (Red):</span>{' '}
              {platformThreats.join(', ')} - Large ecosystem players with significant market power
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
