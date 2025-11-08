'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { RefreshButton } from '@/components/competitive-analysis/refresh-button';
import { ShareDialog } from '@/components/competitive-analysis/share-dialog';
import { DataAgeBadge } from '@/components/competitive-analysis/data-age-badge';
import { CompetitorCard } from '@/components/competitive-analysis/competitor-card';
import { FeatureMatrix } from '@/components/competitive-analysis/feature-matrix';
import { PricingComparison } from '@/components/competitive-analysis/pricing-comparison';
import { MoatStrengthRadar } from '@/components/competitive-analysis/moat-strength-radar';
import { ExportDialog } from '@/components/competitive-analysis/export-dialog';
import { CompetitorManagement } from '@/components/competitive-analysis/competitor-management';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Globe,
  MapPin,
  Calendar,
  TrendingUp,
  Users,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import type { DashboardData } from '@/lib/competitive-analysis/types';

/**
 * Competitive Analysis Detail Page
 *
 * Displays full dashboard with:
 * - Analysis metadata and stats
 * - Competitor cards
 * - Feature matrix
 * - Pricing comparison
 * - Moat score radar chart
 * - Refresh, share, and export controls
 */
export default function CompetitiveAnalysisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (analysisId) {
      fetchAnalysisData();
    }
  }, [analysisId]);

  const fetchAnalysisData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/competitive-analysis/${analysisId}`);
      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('You must be logged in to view this analysis');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to view this analysis');
        } else if (response.status === 404) {
          throw new Error('Analysis not found');
        } else {
          throw new Error(responseData.error || 'Failed to load analysis');
        }
      }

      setData(responseData);

      // Get current user ID from the analysis data
      setUserId(responseData.analysis?.created_by || null);
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast.error('Failed to load analysis', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshComplete = () => {
    fetchAnalysisData();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-12">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Error Loading Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error || 'Unknown error'}</p>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button onClick={fetchAnalysisData}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { analysis, competitors, feature_parity_scores, moat_score } = data;
  const isOwner = userId === analysis.created_by;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Link href="/competitive-intelligence">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Analyses
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{analysis.title}</h1>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Globe className="h-4 w-4" />
              <span>{analysis.target_company_name}</span>
            </div>
            {analysis.market_segment && (
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4" />
                <span>{analysis.market_segment}</span>
              </div>
            )}
            {analysis.geography && (
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{analysis.geography}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Created {new Date(analysis.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Badge variant={analysis.status === 'draft' ? 'outline' : 'default'}>
            {analysis.status}
          </Badge>
          <DataAgeBadge lastRefreshedAt={analysis.last_refreshed_at} />
        </div>
      </div>

      {/* Description */}
      {analysis.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analysis Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{analysis.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.competitor_count || 0}</div>
            <p className="text-xs text-muted-foreground">Active competitors tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Feature Parity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analysis.avg_feature_parity_score
                ? `${analysis.avg_feature_parity_score.toFixed(1)}%`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all competitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moat Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {moat_score ? `${moat_score.moat_score.toFixed(1)}` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Competitive defensibility</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deal Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-sm">
              {analysis.deal_status.replace('_', ' ')}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <RefreshButton
            analysisId={analysisId}
            lastRefreshedAt={analysis.last_refreshed_at}
            competitorsCount={analysis.competitor_count || 0}
            onRefreshComplete={handleRefreshComplete}
          />
          <ShareDialog analysisId={analysisId} isOwner={isOwner} />
          <ExportDialog analysisId={analysisId} analysisTitle={analysis.title} />
        </div>
      </div>

      <Separator />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="features">Feature Matrix</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="moat">Competitive Moat</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Competitors Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Competitors ({competitors.length})</CardTitle>
              <CardDescription>
                Companies tracked in this competitive analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {competitors.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No competitors added yet</p>
                  <CompetitorManagement
                    analysisId={analysisId}
                    competitors={competitors}
                    onUpdate={fetchAnalysisData}
                  />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {competitors.map((competitor) => (
                    <CompetitorCard
                      key={competitor.id}
                      competitor={competitor}
                      parityScore={
                        feature_parity_scores.find((s) => s.competitor_id === competitor.id)
                          ?.parity_score
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {moat_score && (
            <Card>
              <CardHeader>
                <CardTitle>Competitive Moat Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Feature Differentiation
                    </p>
                    <p className="text-2xl font-bold">
                      {moat_score.feature_differentiation_score?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pricing Power</p>
                    <p className="text-2xl font-bold">
                      {moat_score.pricing_power_score?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Brand Recognition
                    </p>
                    <p className="text-2xl font-bold">
                      {moat_score.brand_recognition_score?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Customer Lock-in
                    </p>
                    <p className="text-2xl font-bold">
                      {moat_score.customer_lock_in_score?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Network Effects</p>
                    <p className="text-2xl font-bold">
                      {moat_score.network_effects_score?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="competitors">
          <CompetitorManagement
            analysisId={analysisId}
            competitors={competitors}
            onUpdate={fetchAnalysisData}
          />
        </TabsContent>

        <TabsContent value="features">
          <FeatureMatrix analysisId={analysisId} />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingComparison analysisId={analysisId} />
        </TabsContent>

        <TabsContent value="moat">
          {moat_score ? (
            <MoatStrengthRadar moatScore={moat_score} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Moat score not yet calculated. Add competitors and refresh data to generate
                  insights.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
