'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain,
  TrendingUp,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Activity,
  DollarSign,
  Calendar
} from 'lucide-react';

interface AIScoreCardProps {
  companyId: string;
  companyName: string;
  onScoreUpdate?: (score: any) => void;
}

export function AIScoreCard({ companyId, companyName, onScoreUpdate }: AIScoreCardProps) {
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [score, setScore] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchScore();
  }, [companyId]);

  const fetchScore = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/ai-scoring/predictive?company_id=${companyId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch score');
      }

      if (data.scores && data.scores.length > 0) {
        setScore(data.scores[0]);
        onScoreUpdate?.(data.scores[0]);
      }
    } catch (err) {
      console.error('Error fetching AI score:', err);
      setError(err instanceof Error ? err.message : 'Failed to load AI score');
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = async () => {
    try {
      setCalculating(true);
      setError(null);

      const response = await fetch('/api/ai-scoring/predictive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          include_recommendations: true,
          use_ai: true
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate score');
      }

      setScore(data.score);
      onScoreUpdate?.(data.score);
    } catch (err) {
      console.error('Error calculating AI score:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate AI score');
    } finally {
      setCalculating(false);
    }
  };

  const getScoreColor = (value: number) => {
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-blue-600';
    if (value >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProbabilityBadge = (likelihood: string) => {
    const variants: Record<string, any> = {
      'very_high': { variant: 'default', className: 'bg-green-500' },
      'high': { variant: 'default', className: 'bg-blue-500' },
      'medium': { variant: 'secondary', className: '' },
      'low': { variant: 'outline', className: '' },
      'very_low': { variant: 'destructive', className: '' }
    };
    return variants[likelihood] || variants.medium;
  };

  const getTimingBadge = (timing: string) => {
    const labels: Record<string, string> = {
      'immediate': '🔥 Immediate Action',
      'within_24h': '⚡ Within 24 Hours',
      'within_week': '📅 This Week',
      '1_3_months': '🎯 1-3 Months',
      '3_6_months': '📊 3-6 Months',
      '6_12_months': '🌱 6-12 Months',
      'not_ready': '⏸️ Not Ready'
    };
    return labels[timing] || timing;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Predictive Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !score) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Predictive Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            onClick={calculateScore}
            disabled={calculating}
            className="mt-4 w-full"
          >
            {calculating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Calculate AI Score
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Predictive Score
          </CardTitle>
          <CardDescription>
            Advanced AI-powered lead scoring and predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            No AI score calculated yet for {companyName}
          </p>
          <Button
            onClick={calculateScore}
            disabled={calculating}
            className="w-full"
          >
            {calculating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Score
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Predictive Score
            </CardTitle>
            <CardDescription>
              ML-powered insights and predictions
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={calculateScore}
            disabled={calculating}
          >
            <RefreshCw className={`h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score and Deal Probability */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getScoreColor(score.overall_score)}`}>
              {score.overall_score}
            </div>
            <p className="text-xs text-muted-foreground">Overall Score</p>
            <Progress value={score.overall_score} className="mt-2 h-2" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">
              {score.deal_probability?.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">Deal Probability</p>
            <Badge
              {...getProbabilityBadge(score.conversion_likelihood)}
              className="mt-2"
            >
              {score.conversion_likelihood?.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Timing and Deal Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Optimal Timing</span>
            </div>
            <Badge variant="outline">
              {getTimingBadge(score.optimal_engagement_timing)}
            </Badge>
          </div>

          {score.estimated_deal_size && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Est. Deal Size</span>
              </div>
              <span className="font-bold">
                ${(score.estimated_deal_size || 0).toLocaleString()}
              </span>
            </div>
          )}

          {score.estimated_close_date && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Est. Close Date</span>
              </div>
              <span className="text-sm">
                {new Date(score.estimated_close_date).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Component Scores */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Score Breakdown</h4>
          {Object.entries(score.component_scores || {}).map(([key, value]: [string, any]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground capitalize">
                {key.replace('_', ' ')}
              </span>
              <div className="flex items-center gap-2">
                <Progress value={value} className="w-20 h-1.5" />
                <span className="text-xs font-medium w-8">{value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Key Insights */}
        {score.key_strengths && score.key_strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Key Strengths
            </h4>
            <ul className="space-y-1">
              {score.key_strengths.slice(0, 3).map((strength: string, idx: number) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-green-500 mt-0.5">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risk Factors */}
        {score.risk_factors && score.risk_factors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Risk Factors
            </h4>
            <ul className="space-y-1">
              {score.risk_factors.slice(0, 3).map((risk: string, idx: number) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Actions */}
        {score.recommended_actions && score.recommended_actions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Recommended Actions
            </h4>
            <div className="space-y-2">
              {score.recommended_actions.slice(0, 2).map((action: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{action.action}</span>
                    <Badge variant="outline" className="text-xs">
                      {action.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {action.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model Confidence */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Model Confidence: {score.model_confidence}%</span>
            <span>Data: {score.data_completeness}%</span>
          </div>
        </div>

        {/* Expand/View Details */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show Less' : 'View Full Analysis'}
          <ChevronRight
            className={`h-4 w-4 ml-1 transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
          />
        </Button>
      </CardContent>
    </Card>
  );
}