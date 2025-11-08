'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Shield, TrendingUp, Award, Lock, Network } from 'lucide-react';
import type { CompetitiveMoatScore } from '@/lib/competitive-analysis/types';

export interface MoatStrengthRadarProps {
  moatScore?: CompetitiveMoatScore | null;
  className?: string;
}

/**
 * Radar chart showing 5 dimensions of competitive moat
 * - Feature Differentiation (35%)
 * - Pricing Power (25%)
 * - Brand Recognition (20%)
 * - Customer Lock-In (10%)
 * - Network Effects (10%)
 */
export function MoatStrengthRadar({ moatScore, className }: MoatStrengthRadarProps) {
  if (!moatScore) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Competitive Moat Strength</CardTitle>
          <CardDescription>No moat analysis available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Moat score will be calculated after data refresh
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare radar chart data
  const radarData = [
    {
      dimension: 'Feature\nDifferentiation',
      score: moatScore.feature_differentiation_score || 0,
      weight: 35,
      icon: Shield,
      fullName: 'Feature Differentiation',
    },
    {
      dimension: 'Pricing\nPower',
      score: moatScore.pricing_power_score || 0,
      weight: 25,
      icon: TrendingUp,
      fullName: 'Pricing Power',
    },
    {
      dimension: 'Brand\nRecognition',
      score: moatScore.brand_recognition_score || 0,
      weight: 20,
      icon: Award,
      fullName: 'Brand Recognition',
    },
    {
      dimension: 'Customer\nLock-In',
      score: moatScore.customer_lockin_score || 0,
      weight: 10,
      icon: Lock,
      fullName: 'Customer Lock-In',
    },
    {
      dimension: 'Network\nEffects',
      score: moatScore.network_effects_score || 0,
      weight: 10,
      icon: Network,
      fullName: 'Network Effects',
    },
  ];

  const overallScore = moatScore.overall_moat_score || 0;

  // Determine score interpretation
  const getScoreInterpretation = (score: number) => {
    if (score >= 80)
      return {
        label: 'Excellent',
        color: 'bg-green-100 text-green-800 border-green-300',
        description: 'Strong competitive moat with multiple defensive advantages',
      };
    if (score >= 60)
      return {
        label: 'Good',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        description: 'Solid competitive position with notable advantages',
      };
    if (score >= 40)
      return {
        label: 'Moderate',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        description: 'Some competitive advantages but room for improvement',
      };
    return {
      label: 'Weak',
      color: 'bg-red-100 text-red-800 border-red-300',
      description: 'Limited competitive advantages, vulnerable to competition',
    };
  };

  const scoreInterpretation = getScoreInterpretation(overallScore);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Competitive Moat Strength</CardTitle>
        <CardDescription>Multi-factor analysis of competitive advantages</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Overall Score */}
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-primary mb-2">{overallScore.toFixed(0)}</div>
          <Badge variant="outline" className={scoreInterpretation.color}>
            {scoreInterpretation.label} Moat
          </Badge>
          <p className="text-sm text-muted-foreground mt-2">
            {scoreInterpretation.description}
          </p>
        </div>

        {/* Radar Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#cbd5e1" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              tickCount={6}
            />
            <Radar
              name="Moat Score"
              dataKey="score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(1)}/100`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Dimension Breakdown */}
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-semibold">Moat Dimensions</h4>
          {radarData.map((dimension, index) => {
            const Icon = dimension.icon;
            return (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">{dimension.fullName}</div>
                    <div className="text-xs text-muted-foreground">Weight: {dimension.weight}%</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${dimension.score}%` }}
                    />
                  </div>
                  <span className="font-semibold text-sm w-12 text-right">
                    {dimension.score.toFixed(0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Formula Explanation */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Calculation Formula</h4>
          <p className="text-xs text-muted-foreground">
            Overall Moat Score = (35% × Feature Differentiation) + (25% × Pricing Power) + (20% ×
            Brand Recognition) + (10% × Customer Lock-In) + (10% × Network Effects)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
