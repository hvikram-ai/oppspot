'use client';

/**
 * Enhanced Stats Grid Component
 *
 * 4 stat cards with predictions and micro actions
 * - Shows current value, trend, and prediction
 * - Micro actions for quick tasks
 * - Responsive grid layout
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Save,
  FileText,
  Users,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

interface Stat {
  id: string;
  label: string;
  value: number;
  unit?: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: number;
  prediction?: string;
  icon: React.ReactNode;
  color: string;
  action?: {
    label: string;
    href: string;
  };
}

interface MetricsData {
  searches_count: number;
  searches_trend: number;
  saved_businesses_count: number;
  saved_trend: number;
  research_reports_count: number;
  research_trend: number;
  active_leads_count: number;
  leads_trend: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function EnhancedStatsGrid() {
  const router = useRouter();

  const { data: metrics, error, isLoading } = useSWR<MetricsData>(
    '/api/dashboard/metrics?period=week',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const stats: Stat[] = [
    {
      id: 'searches',
      label: 'Searches This Week',
      value: metrics?.searches_count ?? 0,
      trend: (metrics?.searches_trend ?? 0) > 0 ? 'up' : (metrics?.searches_trend ?? 0) < 0 ? 'down' : 'neutral',
      trendValue: Math.abs(metrics?.searches_trend ?? 0),
      prediction: metrics?.searches_count && metrics.searches_count > 50
        ? 'On track to hit 100 by Friday'
        : 'Start searching to discover opportunities',
      icon: <Search className="h-5 w-5" />,
      color: 'text-blue-600',
      action: {
        label: 'New Search',
        href: '/search',
      },
    },
    {
      id: 'saved',
      label: 'Saved Businesses',
      value: metrics?.saved_businesses_count ?? 0,
      trend: (metrics?.saved_trend ?? 0) > 0 ? 'up' : (metrics?.saved_trend ?? 0) < 0 ? 'down' : 'neutral',
      trendValue: Math.abs(metrics?.saved_trend ?? 0),
      prediction: metrics?.saved_businesses_count && metrics.saved_businesses_count > 10
        ? `${metrics.saved_businesses_count} businesses ready for outreach`
        : 'Save businesses to build your pipeline',
      icon: <Save className="h-5 w-5" />,
      color: 'text-green-600',
      action: {
        label: 'View All',
        href: '/saved',
      },
    },
    {
      id: 'research',
      label: 'Research Reports',
      value: metrics?.research_reports_count ?? 0,
      trend: (metrics?.research_trend ?? 0) > 0 ? 'up' : (metrics?.research_trend ?? 0) < 0 ? 'down' : 'neutral',
      trendValue: Math.abs(metrics?.research_trend ?? 0),
      prediction: metrics?.research_reports_count && metrics.research_reports_count > 0
        ? 'Great insights for your pipeline'
        : 'Generate AI research reports',
      icon: <FileText className="h-5 w-5" />,
      color: 'text-indigo-600',
      action: {
        label: 'Generate',
        href: '/research',
      },
    },
    {
      id: 'leads',
      label: 'Active Leads',
      value: metrics?.active_leads_count ?? 0,
      trend: (metrics?.leads_trend ?? 0) > 0 ? 'up' : (metrics?.leads_trend ?? 0) < 0 ? 'down' : 'neutral',
      trendValue: Math.abs(metrics?.leads_trend ?? 0),
      prediction: metrics?.active_leads_count && metrics.active_leads_count > 20
        ? `${metrics.active_leads_count} leads need follow-up`
        : 'Build your pipeline by saving businesses',
      icon: <Users className="h-5 w-5" />,
      color: 'text-purple-600',
      action: {
        label: 'View CRM',
        href: '/pipeline',
      },
    },
  ];

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-400';
  };

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardContent className="p-6 text-center text-muted-foreground">
            Failed to load metrics. Please try again.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${stat.color}`}>
                {stat.icon}
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(stat.trend)}
                <span className={`text-sm font-medium ${getTrendColor(stat.trend)}`}>
                  {stat.trendValue > 0 ? `${stat.trendValue}%` : '—'}
                </span>
              </div>
            </div>

            {/* Value */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                {stat.label}
              </div>
              <div className="text-3xl font-bold">
                {isLoading ? '—' : stat.value.toLocaleString()}
                {stat.unit && <span className="text-lg text-muted-foreground ml-1">{stat.unit}</span>}
              </div>
            </div>

            {/* Prediction */}
            {stat.prediction && (
              <div className="mt-3 text-xs text-muted-foreground italic">
                {stat.prediction}
              </div>
            )}

            {/* Micro Action */}
            {stat.action && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-4 text-xs"
                onClick={() => router.push(stat.action!.href)}
              >
                {stat.action.label}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
