'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CompetitorCard,
  DataAgeBadge,
  ExportDialog,
  FeatureMatrix,
  MoatStrengthRadar,
  PricingComparisonChart,
  RefreshButton,
  ShareDialog,
} from '@/components/competitive-analysis';
import { ArrowLeft, Plus, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import type { DashboardData } from '@/lib/competitive-analysis/types';

/**
 * Analysis Dashboard Page
 * Main view showing all competitive intelligence visualizations
 */
export default function AnalysisDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (analysisId) {
      fetchDashboardData();
    }
  }, [analysisId, refreshKey]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/competitive-analysis/${analysisId}`);

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Analysis not found');
          router.push('/competitive-analysis');
          return;
        }
        if (response.status === 403) {
          toast.error('Access denied');
          router.push('/competitive-analysis');
          return;
        }
        throw new Error('Failed to fetch analysis');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleRemoveCompetitor = async (competitorId: string) => {
    if (!confirm('Remove this competitor from the analysis?')) return;

    try {
      const response = await fetch(
        `/api/competitive-analysis/${analysisId}/competitors/${competitorId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to remove competitor');

      toast.success('Competitor removed');
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error('Failed to remove competitor');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!dashboardData || !dashboardData.analysis) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Analysis not found</p>
            <Button onClick={() => router.push('/competitive-analysis')} className="mt-4">
              Back to List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { analysis, competitors, feature_matrix, pricing_comparisons, moat_score } = dashboardData;
  const isOwner = true; // TODO: Check if current user is owner

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{analysis.title}</h1>
          <div className="flex items-center space-x-3">
            <p className="text-muted-foreground">
              Target: <span className="font-medium">{analysis.target_company_name}</span>
            </p>
            <Badge variant="outline">
              <Users className="mr-1 h-3 w-3" />
              {competitors?.length || 0} Competitors
            </Badge>
            <DataAgeBadge lastRefreshedAt={analysis.last_refreshed_at} />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <RefreshButton
            analysisId={analysisId}
            lastRefreshedAt={analysis.last_refreshed_at}
            competitorsCount={competitors?.length || 0}
            onRefreshComplete={handleRefreshComplete}
          />
          <ExportDialog analysisId={analysisId} analysisTitle={analysis.title} />
          <ShareDialog analysisId={analysisId} isOwner={isOwner} />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Competitors */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Competitors</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // TODO: Open add competitor dialog
                    toast.info('Add competitor dialog - to be implemented');
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {competitors && competitors.length > 0 ? (
                competitors.map((competitor) => {
                  const parityScore = dashboardData.feature_parity_scores?.find(
                    (s) => s.competitor_company_id === competitor.competitor_company_id
                  );

                  return (
                    <CompetitorCard
                      key={competitor.id}
                      competitorId={competitor.competitor_company_id || ''}
                      competitorName={competitor.competitor_name}
                      competitorWebsite={competitor.competitor_website || undefined}
                      parityScore={parityScore?.parity_score}
                      lastUpdated={competitor.added_at}
                      isOwner={isOwner}
                      onRemove={handleRemoveCompetitor}
                    />
                  );
                })
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <p>No competitors added yet</p>
                  <Button size="sm" variant="outline" className="mt-3">
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Competitor
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="moat">Moat Analysis</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-primary">
                        {competitors?.length || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Competitors</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-primary">
                        {feature_matrix?.length || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Features</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-primary">
                        {moat_score?.overall_moat_score?.toFixed(0) || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">Moat Score</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-primary">
                        {analysis.status === 'active' ? '✓' : '○'}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {analysis.status}
                      </div>
                    </div>
                  </div>

                  {analysis.target_company_description && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">About Target Company</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysis.target_company_description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Moat Preview */}
              {moat_score && <MoatStrengthRadar moatScore={moat_score} />}
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features">
              <FeatureMatrix
                targetCompanyName={analysis.target_company_name || 'Target'}
                competitors={
                  competitors?.map((c) => ({
                    id: c.competitor_company_id || '',
                    name: c.competitor_name,
                  })) || []
                }
                featureMatrix={feature_matrix || []}
              />
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing">
              <PricingComparisonChart
                targetCompanyName={analysis.target_company_name || 'Target'}
                targetCompanyPrice={analysis.target_company_representative_price || undefined}
                competitors={
                  competitors?.map((c) => ({
                    id: c.competitor_company_id || '',
                    name: c.competitor_name,
                  })) || []
                }
                pricingComparisons={pricing_comparisons || []}
              />
            </TabsContent>

            {/* Moat Analysis Tab */}
            <TabsContent value="moat">
              <MoatStrengthRadar moatScore={moat_score} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
