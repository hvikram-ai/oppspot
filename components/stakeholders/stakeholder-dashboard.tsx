'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Shield,
  AlertTriangle,
  TrendingUp,
  Target,
  UserPlus,
  BarChart3,
  Activity,
  AlertCircle,
  ChevronRight,
  Filter,
  RefreshCw
} from 'lucide-react';
import { StakeholderCard } from './stakeholder-card';
import type {
  Stakeholder,
  StakeholderDashboardData,
  ChampionTracking,
  DetractorManagement,
  InfluenceScores
} from '@/lib/stakeholder-tracking/types/stakeholder';

interface StakeholderDashboardProps {
  companyId?: string;
  orgId?: string;
}

export function StakeholderDashboard({ companyId, orgId }: StakeholderDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [dashboardData, setDashboardData] = useState<StakeholderDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [companyId, orgId]);

  const fetchDashboardData = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (companyId) params.append('company_id', companyId);
      if (orgId) params.append('org_id', orgId);

      // Fetch stakeholders
      const stakeholdersResponse = await fetch(`/api/stakeholders?${params}`);
      const stakeholdersData = await stakeholdersResponse.json();

      if (!stakeholdersResponse.ok) {
        throw new Error(stakeholdersData.error || 'Failed to fetch stakeholders');
      }

      setStakeholders(stakeholdersData.stakeholders || []);

      // Calculate dashboard metrics
      const champions = stakeholdersData.stakeholders.filter(
        (s: Stakeholder) => s.role_type === 'champion'
      );
      const detractors = stakeholdersData.stakeholders.filter(
        (s: Stakeholder) => s.role_type === 'detractor'
      );

      const dashboardMetrics: StakeholderDashboardData = {
        total_stakeholders: stakeholdersData.total_count,
        champions: {
          active: champions.filter((c: Stakeholder) => c.champion_status === 'active').length,
          developing: champions.filter((c: Stakeholder) => c.champion_status === 'developing').length,
          at_risk: champions.filter((c: Stakeholder) => c.champion_status === 'at_risk').length
        },
        detractors: {
          active: detractors.length,
          being_mitigated: detractors.filter(
            (d: any) => d.detractor_management?.[0]?.mitigation_status === 'in_progress'
          ).length,
          converted: detractors.filter(
            (d: any) => d.detractor_management?.[0]?.mitigation_status === 'converted'
          ).length
        },
        engagement_metrics: {
          avg_engagement_score:
            stakeholdersData.stakeholders.reduce(
              (sum: number, s: Stakeholder) => sum + (s.engagement_score || 0), 0
            ) / (stakeholdersData.total_count || 1),
          recent_engagements: 0, // Would need separate API call
          overdue_follow_ups: stakeholdersData.stakeholders.filter(
            (s: Stakeholder) =>
              s.next_action_date && new Date(s.next_action_date) < new Date()
          ).length
        },
        alerts: [], // Would need separate API call
        upcoming_actions: stakeholdersData.stakeholders
          .filter((s: Stakeholder) => s.next_action_date)
          .map((s: Stakeholder) => ({
            stakeholder: s,
            action: 'Follow-up required',
            due_date: s.next_action_date!
          }))
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
          .slice(0, 5),
        relationship_map: {
          nodes: [],
          edges: []
        }
      };

      setDashboardData(dashboardMetrics);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFilteredStakeholders = () => {
    switch (activeTab) {
      case 'champions':
        return stakeholders.filter(s => s.role_type === 'champion');
      case 'detractors':
        return stakeholders.filter(s => s.role_type === 'detractor');
      case 'influential':
        return stakeholders.filter(s => (s.influence_level || 0) >= 7);
      case 'at-risk':
        return stakeholders.filter(s =>
          s.relationship_status === 'at_risk' ||
          s.champion_status === 'at_risk'
        );
      default:
        return stakeholders;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stakeholder Management</h2>
          <p className="text-muted-foreground">
            Track and manage your key stakeholder relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Stakeholder
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total Stakeholders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {dashboardData?.total_stakeholders || 0}
              </span>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Active Champions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">
                  {dashboardData?.champions.active || 0}
                </span>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    Dev: {dashboardData?.champions.developing || 0}
                  </Badge>
                  <Badge variant="destructive" className="text-xs">
                    Risk: {dashboardData?.champions.at_risk || 0}
                  </Badge>
                </div>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Detractors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">
                  {dashboardData?.detractors.active || 0}
                </span>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    Mitigating: {dashboardData?.detractors.being_mitigated || 0}
                  </Badge>
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Avg. Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">
                  {Math.round(dashboardData?.engagement_metrics.avg_engagement_score || 0)}%
                </span>
                <Progress
                  value={dashboardData?.engagement_metrics.avg_engagement_score || 0}
                  className="mt-2 h-2"
                />
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Actions */}
      {dashboardData && dashboardData.engagement_metrics.overdue_follow_ups > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have {dashboardData.engagement_metrics.overdue_follow_ups} overdue follow-ups.
            Review your upcoming actions to stay on track.
          </AlertDescription>
        </Alert>
      )}

      {/* Upcoming Actions */}
      {dashboardData && dashboardData.upcoming_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Upcoming Actions
            </CardTitle>
            <CardDescription>
              Next steps for stakeholder engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.upcoming_actions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{action.stakeholder.name}</p>
                    <p className="text-sm text-muted-foreground">{action.action}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {new Date(action.due_date).toLocaleDateString()}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stakeholder List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">
              All ({stakeholders.length})
            </TabsTrigger>
            <TabsTrigger value="champions">
              Champions ({stakeholders.filter(s => s.role_type === 'champion').length})
            </TabsTrigger>
            <TabsTrigger value="detractors">
              Detractors ({stakeholders.filter(s => s.role_type === 'detractor').length})
            </TabsTrigger>
            <TabsTrigger value="influential">
              Influential ({stakeholders.filter(s => (s.influence_level || 0) >= 7).length})
            </TabsTrigger>
            <TabsTrigger value="at-risk">
              At Risk ({stakeholders.filter(s =>
                s.relationship_status === 'at_risk' ||
                s.champion_status === 'at_risk'
              ).length})
            </TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getFilteredStakeholders().map((stakeholder) => (
              <StakeholderCard
                key={stakeholder.id}
                stakeholder={stakeholder}
                onEdit={(s) => console.log('Edit:', s)}
                onDelete={(s) => console.log('Delete:', s)}
                onEngagement={(s) => console.log('Engagement:', s)}
                onViewDetails={(s) => console.log('View:', s)}
              />
            ))}
          </div>

          {getFilteredStakeholders().length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  No stakeholders found in this category
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}