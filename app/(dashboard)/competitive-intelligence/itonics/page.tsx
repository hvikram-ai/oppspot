'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertRulesDialog,
  CompetitorCard,
  CompetitorParityTrendChart,
  DataAgeBadge,
  ExportDialog,
  FeatureMatrix,
  FeatureVelocityChart,
  MoatScoreTrendChart,
  MoatStrengthRadar,
  NotificationCenter,
  PricingComparisonChart,
  PricingTrendChart,
  RefreshButton,
  ShareDialog,
} from '@/components/competitive-analysis';
import {
  Shield,
  TrendingUp,
  Users,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Info,
  Radio
} from 'lucide-react';
import { toast } from 'sonner';
import type { DashboardData } from '@/lib/competitive-analysis/types';
import { RealtimeActivityFeed } from '@/components/competitive-analysis/realtime-activity-feed';

/**
 * ITONICS Competitive Intelligence Dashboard
 *
 * Real-time dashboard tracking ITONICS vs 8-10 competitors
 * Shows: Feature parity, pricing, market positioning, moat strength
 *
 * Key Question: "Can ITONICS defend against Microsoft/Miro?"
 */

// ITONICS competitor configuration
const ITONICS_COMPETITORS = [
  'Miro',
  'Microsoft Whiteboard',
  'Mural',
  'Lucidspark',
  'FigJam',
  'Stormboard',
  'Conceptboard',
  'Padlet'
];

const PLATFORM_COMPETITORS = ['Miro', 'Microsoft Whiteboard', 'FigJam'];

export default function ITONICSDashboardPage() {
  const router = useRouter();

  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [trendsData, setTrendsData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  /**
   * Initialize or fetch ITONICS analysis
   * Creates a dedicated ITONICS analysis if one doesn't exist
   */
  const initializeAnalysis = useCallback(async () => {
    setInitializing(true);

    try {
      // Check if ITONICS analysis already exists
      const listResponse = await fetch('/api/competitive-analysis?limit=100');
      if (!listResponse.ok) throw new Error('Failed to fetch analyses');

      const { analyses } = await listResponse.json();
      const existingItonicsAnalysis = analyses?.find(
        (a: { target_company_name: string; title: string }) =>
          a.target_company_name === 'ITONICS' ||
          a.title.includes('ITONICS Intelligence')
      );

      if (existingItonicsAnalysis) {
        setAnalysisId(existingItonicsAnalysis.id);
        return existingItonicsAnalysis.id;
      }

      // Create new ITONICS analysis
      const createResponse = await fetch('/api/competitive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'ITONICS Intelligence Dashboard',
          description: 'Real-time competitive intelligence tracking ITONICS vs key competitors. Focus: Can ITONICS defend against platform players like Microsoft and Miro?',
          target_company_name: 'ITONICS',
          target_company_website: 'https://www.itonics-innovation.com',
          industry: 'Innovation Management Software',
          market_segment: 'Enterprise Innovation & Ideation Platforms'
        })
      });

      if (!createResponse.ok) throw new Error('Failed to create analysis');

      const { id: newAnalysisId } = await createResponse.json();
      setAnalysisId(newAnalysisId);

      // Add competitors
      for (const competitorName of ITONICS_COMPETITORS) {
        try {
          await fetch(`/api/competitive-analysis/${newAnalysisId}/competitors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              competitor_name: competitorName,
              website: getCompetitorWebsite(competitorName)
            })
          });
        } catch (error) {
          console.error(`Failed to add competitor ${competitorName}:`, error);
        }
      }

      toast.success('ITONICS Dashboard initialized!');
      return newAnalysisId;

    } catch (error) {
      console.error('Error initializing ITONICS analysis:', error);
      toast.error('Failed to initialize dashboard');
      throw error;
    } finally {
      setInitializing(false);
    }
  }, []);

  /**
   * Fetch dashboard data for ITONICS analysis
   */
  const fetchDashboardData = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/competitive-analysis/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch analysis');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch historical trends data
   */
  const fetchTrendsData = useCallback(async (id: string) => {
    setLoadingTrends(true);
    try {
      const response = await fetch(`/api/competitive-analysis/${id}/trends`);

      if (!response.ok) {
        throw new Error('Failed to fetch trends');
      }

      const data = await response.json();
      setTrendsData(data);
    } catch (error) {
      console.error('Error fetching trends data:', error);
      toast.error('Failed to load trends');
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const id = await initializeAnalysis();
      if (id) {
        await fetchDashboardData(id);
        await fetchTrendsData(id);
      }
    };
    init();
  }, [refreshKey, initializeAnalysis, fetchDashboardData, fetchTrendsData]);

  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!analysisId) return;

    const supabase = createClient();

    console.log('[Realtime] Setting up subscriptions for analysis:', analysisId);

    // Subscribe to competitive_analyses table changes
    const analysisChannel = supabase
      .channel(`analysis-${analysisId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'competitive_analyses',
          filter: `id=eq.${analysisId}`
        },
        (payload) => {
          console.log('[Realtime] Analysis updated:', payload);
          setLastUpdate(new Date());
          // Refetch dashboard data when analysis changes
          fetchDashboardData(analysisId);
          toast.info('Competitive analysis updated', {
            description: 'Dashboard data refreshed'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'competitive_moat_scores',
          filter: `analysis_id=eq.${analysisId}`
        },
        (payload) => {
          console.log('[Realtime] Moat score updated:', payload);
          setLastUpdate(new Date());
          fetchDashboardData(analysisId);
          toast.success('Moat strength updated', {
            description: 'New competitive scores available'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_parity_scores',
          filter: `analysis_id=eq.${analysisId}`
        },
        (payload) => {
          console.log('[Realtime] Feature parity updated:', payload);
          setLastUpdate(new Date());
          fetchDashboardData(analysisId);
          toast.info('Feature parity scores updated');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pricing_comparisons',
          filter: `analysis_id=eq.${analysisId}`
        },
        (payload) => {
          console.log('[Realtime] Pricing updated:', payload);
          setLastUpdate(new Date());
          fetchDashboardData(analysisId);
          toast.info('Pricing data updated');
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Channel status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');

        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✓ Connected - listening for updates');
        } else if (status === 'CHANNEL_ERROR') {
          toast.error('Real-time connection error', {
            description: 'Updates may be delayed'
          });
        }
      });

    // Cleanup on unmount
    return () => {
      console.log('[Realtime] Cleaning up subscriptions');
      supabase.removeChannel(analysisChannel);
    };
  }, [analysisId, fetchDashboardData]);

  const handleRefreshComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  // Calculate platform threat level
  const calculatePlatformThreat = (): 'high' | 'medium' | 'low' => {
    if (!dashboardData?.moat_score) return 'medium';

    const { overall_moat_score, risk_factors } = dashboardData.moat_score;
    const hasPlatformCompetitor = dashboardData.competitors?.some(c =>
      PLATFORM_COMPETITORS.includes(c.competitor_name)
    );

    if (overall_moat_score < 50 && hasPlatformCompetitor) return 'high';
    if (overall_moat_score < 70 && hasPlatformCompetitor) return 'medium';
    return 'low';
  };

  if (initializing || loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg font-medium">
              {initializing ? 'Initializing ITONICS Dashboard...' : 'Loading competitive intelligence...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData || !dashboardData.analysis) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium mb-2">Failed to Load Dashboard</p>
            <p className="text-muted-foreground mb-4">Unable to initialize ITONICS competitive intelligence</p>
            <Button onClick={() => setRefreshKey(k => k + 1)}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { analysis, competitors, feature_matrix, pricing_comparisons, moat_score } = dashboardData;
  const platformThreat = calculatePlatformThreat();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with ITONICS Branding */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight">ITONICS Intelligence</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Real-time competitive analysis vs. {competitors?.length || 0} key competitors
            </p>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-sm">
                <Users className="mr-1 h-3 w-3" />
                {competitors?.length || 0} Competitors
              </Badge>
              <DataAgeBadge lastRefreshedAt={analysis.last_refreshed_at} />
              <Badge
                variant={isRealtimeConnected ? "default" : "secondary"}
                className={`text-sm ${isRealtimeConnected ? 'bg-green-600' : 'bg-gray-400'}`}
              >
                <Radio className={`mr-1 h-3 w-3 ${isRealtimeConnected ? 'animate-pulse' : ''}`} />
                {isRealtimeConnected ? 'Live Updates' : 'Connecting...'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <NotificationCenter analysisId={analysisId!} />
            <AlertRulesDialog analysisId={analysisId!} />
            <RefreshButton
              analysisId={analysisId!}
              lastRefreshedAt={analysis.last_refreshed_at}
              competitorsCount={competitors?.length || 0}
              onRefreshComplete={handleRefreshComplete}
            />
            <ExportDialog analysisId={analysisId!} targetCompany="ITONICS" />
            <ShareDialog analysisId={analysisId!} />
          </div>
        </div>

        {/* Platform Threat Alert */}
        {platformThreat === 'high' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Platform Threat Detected</AlertTitle>
            <AlertDescription>
              ITONICS faces significant competition from platform players (Microsoft, Miro).
              Moat score below 50 indicates vulnerability. Immediate strategic action recommended.
            </AlertDescription>
          </Alert>
        )}

        {platformThreat === 'medium' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Platform Competition Detected</AlertTitle>
            <AlertDescription>
              Monitor closely: Platform players present in competitive landscape.
              Current moat strength provides moderate defense.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Moat Strength</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {moat_score?.overall_moat_score?.toFixed(0) || 'N/A'}/100
            </div>
            <p className="text-xs text-muted-foreground">
              {getMoatInterpretation(moat_score?.overall_moat_score || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Feature Parity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateAvgParity(dashboardData)}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs. competitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Platform Threat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={platformThreat === 'high' ? 'destructive' : platformThreat === 'medium' ? 'default' : 'secondary'}>
                {platformThreat.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {PLATFORM_COMPETITORS.filter(c => competitors?.some(comp => comp.competitor_name === c)).length} platform competitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pricing Power</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {moat_score?.pricing_power_score?.toFixed(0) || 'N/A'}/100
            </div>
            <p className="text-xs text-muted-foreground">
              {getPricingInterpretation(moat_score?.pricing_power_score || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="competitors">Competitors ({competitors?.length || 0})</TabsTrigger>
          <TabsTrigger value="features">Feature Matrix</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="moat">Competitive Moat</TabsTrigger>
          <TabsTrigger value="trends">Trends & Velocity</TabsTrigger>
          <TabsTrigger value="activity">
            Live Activity
            {isRealtimeConnected && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Moat Strength Visualization */}
          {moat_score && (
            <Card>
              <CardHeader>
                <CardTitle>Competitive Moat Analysis</CardTitle>
                <CardDescription>
                  Multi-dimensional assessment of ITONICS's defensive positioning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MoatStrengthRadar moatScore={moat_score} />
              </CardContent>
            </Card>
          )}

          {/* Competitors Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Competitor Overview</CardTitle>
              <CardDescription>
                {competitors?.length || 0} competitors tracked
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {competitors?.map((competitor) => (
                  <CompetitorCard
                    key={competitor.id}
                    competitor={competitor}
                    onRemove={() => {}} // Read-only in this view
                    isPlatformThreat={PLATFORM_COMPETITORS.includes(competitor.competitor_name)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors">
          <Card>
            <CardHeader>
              <CardTitle>Competitor Profiles</CardTitle>
              <CardDescription>
                Detailed competitor information and metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {competitors?.map((competitor) => (
                  <CompetitorCard
                    key={competitor.id}
                    competitor={competitor}
                    onRemove={() => {}}
                    isPlatformThreat={PLATFORM_COMPETITORS.includes(competitor.competitor_name)}
                    expanded
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          {feature_matrix && feature_matrix.length > 0 ? (
            <FeatureMatrix
              entries={feature_matrix}
              targetCompany="ITONICS"
              competitors={competitors || []}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No feature data available yet</p>
                <p className="text-sm mt-2">Click Refresh to gather competitive data</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pricing">
          {pricing_comparisons && pricing_comparisons.length > 0 ? (
            <PricingComparisonChart
              comparisons={pricing_comparisons}
              targetCompany="ITONICS"
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pricing data available yet</p>
                <p className="text-sm mt-2">Click Refresh to gather competitive data</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="moat">
          {moat_score ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Competitive Moat Strength</CardTitle>
                  <CardDescription>
                    ITONICS's ability to defend against competitive threats
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MoatStrengthRadar moatScore={moat_score} />
                </CardContent>
              </Card>

              {moat_score.risk_factors && moat_score.risk_factors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Factors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {moat_score.risk_factors.map((risk, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                          <span className="text-sm">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No moat analysis available yet</p>
                <p className="text-sm mt-2">Click Refresh to generate competitive moat score</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends">
          {loadingTrends ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="py-12 text-center">
                  <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                  <p className="text-lg font-medium">Loading trends data...</p>
                </CardContent>
              </Card>
            </div>
          ) : trendsData ? (
            <div className="space-y-6">
              {/* Moat Score Trend */}
              <MoatScoreTrendChart data={trendsData.moat_score_trend as Array<{
                date: string;
                score: number;
                feature_differentiation: number;
                pricing_power: number;
                brand_recognition: number;
              }>} />

              {/* Feature Velocity */}
              <FeatureVelocityChart data={trendsData.feature_velocity as Array<{
                period: string;
                features_added: number;
                features_total: number;
              }>} />

              {/* Competitor Parity Trends */}
              <CompetitorParityTrendChart
                data={trendsData.competitor_parity_trend as Array<{
                  date: string;
                  competitor_name: string;
                  parity_score: number;
                }>}
                platformCompetitors={PLATFORM_COMPETITORS}
              />

              {/* Pricing Trends */}
              <PricingTrendChart data={trendsData.pricing_trend as Array<{
                date: string;
                competitor_name: string;
                price: number;
                currency: string;
              }>} />

              {/* Trends Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Trends Summary</CardTitle>
                  <CardDescription>Historical data insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Data Points Tracked</p>
                      <p className="text-2xl font-bold mt-1">{trendsData.data_points || 0}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Oldest Snapshot</p>
                      <p className="text-lg font-medium mt-1">
                        {trendsData.oldest_snapshot
                          ? new Date(trendsData.oldest_snapshot as string).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Latest Snapshot</p>
                      <p className="text-lg font-medium mt-1">
                        {trendsData.latest_snapshot
                          ? new Date(trendsData.latest_snapshot as string).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No trends data available</p>
                <p className="text-sm mt-2">Trends will appear after the first automated refresh</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity">
          <RealtimeActivityFeed analysisId={analysisId!} maxEvents={50} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions
function getCompetitorWebsite(name: string): string {
  const websites: Record<string, string> = {
    'Miro': 'https://miro.com',
    'Microsoft Whiteboard': 'https://www.microsoft.com/microsoft-365/microsoft-whiteboard',
    'Mural': 'https://www.mural.co',
    'Lucidspark': 'https://lucidspark.com',
    'FigJam': 'https://www.figma.com/figjam',
    'Stormboard': 'https://stormboard.com',
    'Conceptboard': 'https://conceptboard.com',
    'Padlet': 'https://padlet.com'
  };
  return websites[name] || '';
}

function getMoatInterpretation(score: number): string {
  if (score >= 80) return 'Excellent defense';
  if (score >= 65) return 'Good positioning';
  if (score >= 50) return 'Moderate strength';
  if (score >= 35) return 'Needs improvement';
  return 'Critical vulnerability';
}

function getPricingInterpretation(score: number): string {
  if (score >= 80) return 'Premium positioning';
  if (score >= 60) return 'Competitive pricing';
  if (score >= 40) return 'Price pressure';
  return 'Pricing disadvantage';
}

function calculateAvgParity(data: DashboardData | null): number {
  if (!data?.competitors) return 0;

  const parityScores = data.competitors
    .map(c => c.parity_score?.parity_score)
    .filter((s): s is number => s !== undefined && s !== null);

  if (parityScores.length === 0) return 0;

  const avg = parityScores.reduce((sum, s) => sum + s, 0) / parityScores.length;
  return Math.round(avg);
}
