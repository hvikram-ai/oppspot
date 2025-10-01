'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Users,
  Target,
  Clock,
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { BANTScoreCard } from '@/components/qualification/BANTScoreCard';
import { MEDDICScoreCard } from '@/components/qualification/MEDDICScoreCard';
import { QualificationDashboardData } from '@/lib/qualification/types/qualification';

export default function QualificationDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<QualificationDashboardData | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<'BANT' | 'MEDDIC'>('BANT');
  const [dateRange, setDateRange] = useState('30d');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // Calculate date range
      const now = new Date();
      const from = new Date();
      switch (dateRange) {
        case '7d':
          from.setDate(now.getDate() - 7);
          break;
        case '30d':
          from.setDate(now.getDate() - 30);
          break;
        case '90d':
          from.setDate(now.getDate() - 90);
          break;
      }
      params.append('date_from', from.toISOString());
      params.append('date_to', now.toISOString());

      const response = await fetch(`/api/qualification/dashboard?${params}`);
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const MetricCard = ({
    title,
    value,
    change,
    icon: Icon,
    color = 'blue'
  }: {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ElementType;
    color?: string;
  }) => {
    const getColorClasses = () => {
      switch (color) {
        case 'green':
          return 'bg-green-50 text-green-600';
        case 'yellow':
          return 'bg-yellow-50 text-yellow-600';
        case 'red':
          return 'bg-red-50 text-red-600';
        default:
          return 'bg-blue-50 text-blue-600';
      }
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {change !== undefined && (
                <div className="flex items-center gap-1">
                  {change > 0 ? (
                    <ArrowUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(change)}%
                  </span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-lg ${getColorClasses()}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Qualification Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage lead qualification workflows
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchDashboardData} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Leads"
          value={dashboardData?.total_leads || 0}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Qualified Leads"
          value={dashboardData?.qualified_leads || 0}
          change={12}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Qualification Rate"
          value={`${Math.round(dashboardData?.qualification_rate || 0)}%`}
          change={-5}
          icon={Target}
          color="yellow"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${Math.round(dashboardData?.routing_metrics.avg_response_time || 0)}m`}
          icon={Clock}
          color="blue"
        />
      </div>

      {/* Framework Tabs */}
      <Tabs value={selectedFramework} onValueChange={(v) => setSelectedFramework(v as 'BANT' | 'MEDDIC')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="BANT">BANT Framework</TabsTrigger>
          <TabsTrigger value="MEDDIC">MEDDIC Framework</TabsTrigger>
        </TabsList>

        <TabsContent value="BANT" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BANT Score Overview */}
            <Card>
              <CardHeader>
                <CardTitle>BANT Score Distribution</CardTitle>
                <CardDescription>Average scores across all dimensions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Budget</span>
                      <span className="font-medium">
                        {Math.round(dashboardData?.bant_scores.average_budget || 0)}%
                      </span>
                    </div>
                    <Progress value={dashboardData?.bant_scores.average_budget || 0} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Authority</span>
                      <span className="font-medium">
                        {Math.round(dashboardData?.bant_scores.average_authority || 0)}%
                      </span>
                    </div>
                    <Progress value={dashboardData?.bant_scores.average_authority || 0} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Need</span>
                      <span className="font-medium">
                        {Math.round(dashboardData?.bant_scores.average_need || 0)}%
                      </span>
                    </div>
                    <Progress value={dashboardData?.bant_scores.average_need || 0} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Timeline</span>
                      <span className="font-medium">
                        {Math.round(dashboardData?.bant_scores.average_timeline || 0)}%
                      </span>
                    </div>
                    <Progress value={dashboardData?.bant_scores.average_timeline || 0} />
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="font-medium">Overall Average</span>
                      <span className="text-lg font-bold">
                        {Math.round(dashboardData?.bant_scores.average_overall || 0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sample BANT Score Card */}
            <BANTScoreCard qualification={null} loading={false} />
          </div>
        </TabsContent>

        <TabsContent value="MEDDIC" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MEDDIC Forecast Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Forecast Distribution</CardTitle>
                <CardDescription>Pipeline categorization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Commit</p>
                      <p className="text-2xl font-bold text-green-600">
                        {dashboardData?.meddic_scores.forecast_distribution.commit || 0}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Best Case</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {dashboardData?.meddic_scores.forecast_distribution.best_case || 0}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Pipeline</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {dashboardData?.meddic_scores.forecast_distribution.pipeline || 0}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Omitted</p>
                      <p className="text-2xl font-bold text-red-600">
                        {dashboardData?.meddic_scores.forecast_distribution.omitted || 0}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="font-medium">Average MEDDIC Score</span>
                      <span className="text-lg font-bold">
                        {Math.round(dashboardData?.meddic_scores.average_overall || 0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sample MEDDIC Score Card */}
            <MEDDICScoreCard qualification={null} loading={false} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Routing Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Routing Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Assignments</span>
                <span className="font-medium">{dashboardData?.routing_metrics.total_assignments || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">SLA Compliance</span>
                <span className="font-medium">
                  {Math.round(dashboardData?.routing_metrics.sla_compliance || 0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reassignment Rate</span>
                <span className="font-medium">
                  {Math.round(dashboardData?.routing_metrics.reassignment_rate || 0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checklist Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Checklist Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <span className="font-medium">
                  {Math.round(dashboardData?.checklist_metrics.completion_rate || 0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Avg Items Completed</span>
                <span className="font-medium">
                  {Math.round(dashboardData?.checklist_metrics.avg_items_completed || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Abandoned Rate</span>
                <span className="font-medium">
                  {Math.round(dashboardData?.checklist_metrics.abandoned_rate || 0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recycling Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Recycling</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Recycled</span>
                <span className="font-medium">{dashboardData?.recycling_metrics.total_recycled || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Re-qualification Rate</span>
                <span className="font-medium">
                  {Math.round(dashboardData?.recycling_metrics.re_qualification_rate || 0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Nurture Conversion</span>
                <span className="font-medium">
                  {Math.round(dashboardData?.recycling_metrics.nurture_conversion_rate || 0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Qualification Activities</CardTitle>
          <CardDescription>Latest updates and actions</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData?.recent_activities?.length ? (
            <div className="space-y-2">
              {dashboardData.recent_activities.slice(0, 5).map((activity: {
                lead_name?: string;
                action?: string;
                timestamp?: string;
                activity_type?: string;
                lead?: { company?: { name?: string } };
                created_at?: string;
              }, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium text-sm">{activity.activity_type || activity.action || 'Activity'}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.lead?.company?.name || activity.lead_name || 'Unknown Company'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.created_at || activity.timestamp || '').toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No recent activities</p>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}