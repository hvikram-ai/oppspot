'use client';

import { useState, useEffect } from 'react';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Brain,
  TrendingUp,
  Target,
  Clock,
  DollarSign,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface LeadScore {
  id: string;
  company_id: string;
  overall_score: number;
  deal_probability: number;
  conversion_likelihood: string;
  optimal_engagement_timing: string;
  estimated_deal_size: number;
  estimated_close_date: string;
  businesses?: {
    name: string;
    website: string;
    city: string;
    country: string;
  };
  key_strengths: string[];
  risk_factors: string[];
  model_confidence: number;
  calculated_at: string;
}

interface User {
  id: string;
  email?: string;
}

export default function AIScoringPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<LeadScore[]>([]);
  const [filteredScores, setFilteredScores] = useState<LeadScore[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timingFilter, setTimingFilter] = useState('all');
  const [minScoreFilter, setMinScoreFilter] = useState('0');
  const [refreshing, setRefreshing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    filterScores();
  }, [scores, searchTerm, timingFilter, minScoreFilter]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await fetchScores();
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScores = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/ai-scoring/predictive');
      const data = await response.json();

      if (data.success) {
        setScores(data.scores || []);
      } else {
        toast.error('Failed to fetch AI scores');
      }
    } catch (error) {
      console.error('Error fetching scores:', error);
      toast.error('Failed to load AI scores');
    } finally {
      setRefreshing(false);
    }
  };

  const filterScores = () => {
    let filtered = [...scores];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(score =>
        score.businesses?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Timing filter
    if (timingFilter !== 'all') {
      filtered = filtered.filter(score =>
        score.optimal_engagement_timing === timingFilter
      );
    }

    // Min score filter
    const minScore = parseInt(minScoreFilter);
    if (minScore > 0) {
      filtered = filtered.filter(score => score.overall_score >= minScore);
    }

    setFilteredScores(filtered);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTimingBadge = (timing: string) => {
    const badges: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
      'immediate': { label: '🔥 Immediate', variant: 'destructive' },
      'within_24h': { label: '⚡ 24 Hours', variant: 'destructive' },
      'within_week': { label: '📅 This Week', variant: 'default' },
      '1_3_months': { label: '🎯 1-3 Months', variant: 'secondary' },
      '3_6_months': { label: '📊 3-6 Months', variant: 'outline' },
      '6_12_months': { label: '🌱 6-12 Months', variant: 'outline' },
      'not_ready': { label: '⏸️ Not Ready', variant: 'outline' }
    };
    return badges[timing] || { label: timing, variant: 'outline' };
  };

  const getLikelihoodBadge = (likelihood: string) => {
    const badges: Record<string, string> = {
      'very_high': 'bg-green-100 text-green-800',
      'high': 'bg-blue-100 text-blue-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-orange-100 text-orange-800',
      'very_low': 'bg-red-100 text-red-800'
    };
    return badges[likelihood] || 'bg-gray-100 text-gray-800';
  };

  // Calculate summary metrics
  const summaryMetrics = {
    totalLeads: scores.length,
    hotLeads: scores.filter(s => s.deal_probability >= 70).length,
    immediateAction: scores.filter(s =>
      s.optimal_engagement_timing === 'immediate' ||
      s.optimal_engagement_timing === 'within_24h'
    ).length,
    totalPipeline: scores.reduce((sum, s) => sum + (s.estimated_deal_size || 0), 0),
    avgScore: scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.overall_score, 0) / scores.length)
      : 0
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
    );
  }

  if (!user) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please sign in to access AI-powered lead scoring.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <ProtectedLayout>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">AI Lead Scoring</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Predictive scoring with deal probability, optimal timing, and actionable insights
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.totalLeads}</div>
              <p className="text-xs text-muted-foreground mt-1">In pipeline</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Hot Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summaryMetrics.hotLeads}
              </div>
              <p className="text-xs text-muted-foreground mt-1">≥70% probability</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Urgent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {summaryMetrics.immediateAction}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Need action now</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Pipeline Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(summaryMetrics.totalPipeline / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-muted-foreground mt-1">Estimated total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <Target className="h-4 w-4" />
                Avg Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(summaryMetrics.avgScore)}`}>
                {summaryMetrics.avgScore}
              </div>
              <Progress value={summaryMetrics.avgScore} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search companies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Timing</label>
                <Select value={timingFilter} onValueChange={setTimingFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Timings</SelectItem>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="within_24h">Within 24h</SelectItem>
                    <SelectItem value="within_week">This Week</SelectItem>
                    <SelectItem value="1_3_months">1-3 Months</SelectItem>
                    <SelectItem value="3_6_months">3-6 Months</SelectItem>
                    <SelectItem value="6_12_months">6-12 Months</SelectItem>
                    <SelectItem value="not_ready">Not Ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Min Score</label>
                <Select value={minScoreFilter} onValueChange={setMinScoreFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">All Scores</SelectItem>
                    <SelectItem value="40">≥ 40</SelectItem>
                    <SelectItem value="60">≥ 60</SelectItem>
                    <SelectItem value="80">≥ 80</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={fetchScores}
                  disabled={refreshing}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Scores
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scored Leads */}
        <div className="space-y-4">
          {filteredScores.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Scored Leads Found</h3>
                <p className="text-muted-foreground mb-4">
                  Start scoring your leads to see AI-powered insights
                </p>
                <Button>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Score New Leads
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredScores.map((score) => (
              <Card key={score.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {score.businesses?.name || 'Unknown Company'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {score.businesses?.city}, {score.businesses?.country}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(score.overall_score)}`}>
                        {score.overall_score}
                      </div>
                      <p className="text-xs text-muted-foreground">Overall Score</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Deal Probability</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">{score.deal_probability}%</span>
                        <Badge className={getLikelihoodBadge(score.conversion_likelihood)}>
                          {score.conversion_likelihood.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Optimal Timing</p>
                      <Badge variant={getTimingBadge(score.optimal_engagement_timing).variant}>
                        {getTimingBadge(score.optimal_engagement_timing).label}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Est. Deal Size</p>
                      <span className="text-lg font-semibold">
                        ${(score.estimated_deal_size || 0).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Est. Close</p>
                      <span className="text-sm">
                        {score.estimated_close_date
                          ? new Date(score.estimated_close_date).toLocaleDateString()
                          : 'TBD'}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {score.key_strengths && score.key_strengths.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Key Strengths
                        </p>
                        <ul className="space-y-1">
                          {score.key_strengths.slice(0, 2).map((strength, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground">
                              • {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {score.risk_factors && score.risk_factors.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Risk Factors
                        </p>
                        <ul className="space-y-1">
                          {score.risk_factors.slice(0, 2).map((risk, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground">
                              • {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-xs text-muted-foreground">
                      Confidence: {score.model_confidence}% •
                      Updated: {new Date(score.calculated_at).toLocaleString()}
                    </div>
                    <Button size="sm" variant="ghost">
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}