'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  ChevronRight
} from 'lucide-react';
import { SignalAggregation } from '@/lib/signals/types/buying-signals';

interface SignalAggregationScoreProps {
  aggregation: SignalAggregation | null;
  onActionClick?: (action: string) => void;
  loading?: boolean;
}

export function SignalAggregationScore({
  aggregation,
  onActionClick,
  loading
}: SignalAggregationScoreProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!aggregation) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-muted-foreground">No signal data available</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => onActionClick?.('scan')}
          >
            Scan for Signals
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getPriorityColor = () => {
    switch (aggregation.engagement_priority) {
      case 'immediate':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  // Prepare radar chart data
  const radarData = [
    { metric: 'Intent', value: aggregation.intent_score },
    { metric: 'Timing', value: aggregation.timing_score },
    { metric: 'Fit', value: aggregation.fit_score },
    { metric: 'Composite', value: aggregation.composite_score }
  ];

  // Prepare signal distribution data
  const signalDistribution = [
    { type: 'Funding', count: aggregation.signal_counts.funding_signals, color: '#10b981' },
    { type: 'Executive', count: aggregation.signal_counts.executive_signals, color: '#3b82f6' },
    { type: 'Jobs', count: aggregation.signal_counts.job_signals, color: '#f59e0b' },
    { type: 'Tech', count: aggregation.signal_counts.technology_signals, color: '#8b5cf6' },
    { type: 'Other', count: aggregation.signal_counts.other_signals, color: '#6b7280' }
  ].filter(d => d.count > 0);

  return (
    <div className="grid gap-6">
      {/* Main Score Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Signal Intelligence Score</CardTitle>
              <CardDescription>
                Aggregated buying signal analysis
              </CardDescription>
            </div>
            <Badge className={`${getPriorityColor()} text-sm px-3 py-1`}>
              {aggregation.engagement_priority.toUpperCase()} PRIORITY
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Metrics */}
            <div className="space-y-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Composite Score</p>
                <p className={`text-5xl font-bold ${getScoreColor(aggregation.composite_score)}`}>
                  {aggregation.composite_score}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Based on {aggregation.total_signals} signal{aggregation.total_signals !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Intent Score
                    </span>
                    <span className="font-medium">{aggregation.intent_score}%</span>
                  </div>
                  <Progress value={aggregation.intent_score} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Timing Score
                    </span>
                    <span className="font-medium">{aggregation.timing_score}%</span>
                  </div>
                  <Progress value={aggregation.timing_score} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Fit Score
                    </span>
                    <span className="font-medium">{aggregation.fit_score}%</span>
                  </div>
                  <Progress value={aggregation.fit_score} className="h-2" />
                </div>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" className="text-xs" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Velocity Metrics */}
          {(aggregation.signal_velocity || aggregation.signal_acceleration) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Signal Velocity
                </p>
                <p className="text-lg font-semibold">
                  {aggregation.signal_velocity?.toFixed(1)} / month
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Acceleration
                </p>
                <p className="text-lg font-semibold">
                  {aggregation.signal_acceleration && aggregation.signal_acceleration > 0 ? '+' : ''}
                  {aggregation.signal_acceleration?.toFixed(1)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signal Distribution */}
      {signalDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signal Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={signalDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="type" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {signalDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Strength Distribution */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              {Object.entries(aggregation.strength_distribution).map(([strength, count]) => (
                <div key={strength} className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-xs text-muted-foreground capitalize">
                    {strength.replace('_', ' ')}
                  </p>
                  <p className="text-lg font-semibold">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {aggregation.recommended_approach && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Recommended Approach</p>
                <p className="text-sm text-blue-700 mt-1">
                  {aggregation.recommended_approach}
                </p>
              </div>

              {aggregation.key_talking_points && aggregation.key_talking_points.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Key Talking Points</p>
                  <ul className="space-y-1">
                    {aggregation.key_talking_points.map((point, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aggregation.optimal_contact_date && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-900">Optimal Contact Date</p>
                    <p className="text-sm text-green-700">
                      {new Date(aggregation.optimal_contact_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onActionClick?.('schedule')}
                  >
                    Schedule Outreach
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}