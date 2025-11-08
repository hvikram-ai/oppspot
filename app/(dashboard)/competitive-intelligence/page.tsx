'use client';

import { useState, useEffect } from 'react';
import { AnalysisList } from '@/components/competitive-analysis/analysis-list';
import { CreateAnalysisDialog } from '@/components/competitive-analysis/create-analysis-dialog';
import { StaleDataAlert } from '@/components/competitive-analysis/stale-data-alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Target, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Competitive Intelligence Dashboard - Main Page
 *
 * Features:
 * - List of analyses with filters and pagination
 * - Create new analysis dialog
 * - Stale data alerts
 * - Quick stats overview with real-time metrics
 */

interface DashboardStats {
  active_analyses: number;
  total_competitors: number;
  avg_parity_score: number | null;
  avg_moat_score: number | null;
}

export default function CompetitiveIntelligencePage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch('/api/competitive-analysis/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const getMoatColorClass = (score: number): string => {
    if (score >= 70) return 'text-green-600 dark:text-green-500';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-500';
    return 'text-red-600 dark:text-red-500';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Competitive Intelligence</h1>
          <p className="text-muted-foreground mt-2">
            Track and analyze your competitive landscape with AI-powered insights
          </p>
        </div>
      </div>

      {/* Stale Data Alerts */}
      <StaleDataAlert />

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Analyses</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                stats?.active_analyses ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Your active competitive analyses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competitors Tracked</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                stats?.total_competitors ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total competitors across all analyses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Parity Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : stats?.avg_parity_score !== null ? (
                <>{stats.avg_parity_score.toFixed(1)}%</>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Average feature parity across competitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moat Strength</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : stats?.avg_moat_score !== null ? (
                <span className={getMoatColorClass(stats.avg_moat_score)}>
                  {stats.avg_moat_score.toFixed(0)}/100
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Your competitive moat score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analysis List */}
      <AnalysisList onCreateNew={() => setShowCreateDialog(true)} />

      {/* Create Dialog */}
      <CreateAnalysisDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
