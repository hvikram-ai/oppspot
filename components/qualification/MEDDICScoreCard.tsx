'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  UserCheck,
  FileText,
  GitBranch,
  AlertTriangle,
  Trophy,
  BarChart3
} from 'lucide-react';
import { MEDDICQualification } from '@/lib/qualification/types/qualification';

interface MEDDICScoreCardProps {
  qualification: MEDDICQualification | null;
  onRefresh?: () => void;
  loading?: boolean;
}

export function MEDDICScoreCard({ qualification, onRefresh, loading }: MEDDICScoreCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!qualification) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No MEDDIC qualification data available</p>
          {onRefresh && (
            <Button onClick={onRefresh} className="mt-4">
              Run MEDDIC Analysis
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const getForecastColor = () => {
    switch (qualification.forecast_category) {
      case 'commit':
        return 'bg-green-100 text-green-800';
      case 'best_case':
        return 'bg-blue-100 text-blue-800';
      case 'pipeline':
        return 'bg-yellow-100 text-yellow-800';
      case 'omitted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const dimensions = [
    {
      key: 'metrics',
      label: 'Metrics',
      icon: BarChart3,
      score: qualification.metrics.score,
      details: [
        { label: 'KPIs Identified', value: qualification.metrics.kpis_identified.length },
        { label: 'Success Criteria', value: qualification.metrics.success_criteria.length },
        {
          label: 'ROI',
          value: qualification.metrics.roi_calculation
            ? `${qualification.metrics.roi_calculation.expected_return / qualification.metrics.roi_calculation.investment}x`
            : 'TBD'
        }
      ]
    },
    {
      key: 'economic_buyer',
      label: 'Economic Buyer',
      icon: UserCheck,
      score: qualification.economic_buyer.score,
      details: [
        { label: 'Identified', value: qualification.economic_buyer.identified ? 'Yes' : 'No' },
        { label: 'Engagement', value: `${qualification.economic_buyer.engagement_level}%` },
        { label: 'Budget Authority', value: qualification.economic_buyer.buying_power_confirmed ? 'Confirmed' : 'Pending' }
      ]
    },
    {
      key: 'decision_criteria',
      label: 'Decision Criteria',
      icon: FileText,
      score: qualification.decision_criteria.score,
      details: [
        { label: 'Tech Requirements', value: qualification.decision_criteria.technical_requirements.length },
        { label: 'Business Requirements', value: qualification.decision_criteria.business_requirements.length },
        { label: 'Vendor Preferences', value: qualification.decision_criteria.vendor_preferences?.length || 0 }
      ]
    },
    {
      key: 'decision_process',
      label: 'Decision Process',
      icon: GitBranch,
      score: qualification.decision_process.score,
      details: [
        { label: 'Current Stage', value: qualification.decision_process.current_stage },
        { label: 'Process Steps', value: qualification.decision_process.stages.length },
        { label: 'Stakeholders', value: qualification.decision_process.stakeholders.length }
      ]
    },
    {
      key: 'identify_pain',
      label: 'Identify Pain',
      icon: AlertTriangle,
      score: qualification.identify_pain.score,
      details: [
        { label: 'Pain Points', value: qualification.identify_pain.pain_points.length },
        { label: 'Urgency Level', value: `${qualification.identify_pain.urgency_level}/10` },
        {
          label: 'Cost of Inaction',
          value: qualification.identify_pain.cost_of_inaction
            ? `$${(qualification.identify_pain.cost_of_inaction / 1000).toFixed(0)}K`
            : 'TBD'
        }
      ]
    },
    {
      key: 'champion',
      label: 'Champion',
      icon: Trophy,
      score: qualification.champion.score,
      details: [
        { label: 'Identified', value: qualification.champion.identified ? 'Yes' : 'No' },
        { label: 'Influence', value: `${qualification.champion.influence_level}%` },
        { label: 'Relationship', value: `${qualification.champion.relationship_strength}%` }
      ]
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>MEDDIC Qualification</CardTitle>
            <CardDescription>
              Enterprise sales qualification framework
            </CardDescription>
          </div>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" size="sm">
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Score and Forecast */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
              <div className="text-3xl font-bold">
                <span className={getScoreColor(qualification.overall_score)}>
                  {qualification.overall_score}%
                </span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Forecast</p>
              <Badge className={`${getForecastColor()} mt-2`}>
                {qualification.forecast_category.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Confidence Level */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Qualification Confidence</span>
              <span className="font-medium">{qualification.qualification_confidence}%</span>
            </div>
            <Progress value={qualification.qualification_confidence} className="h-2" />
          </div>

          {/* Dimension Scores */}
          <Tabs defaultValue="scores" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="scores" className="space-y-3">
              {dimensions.map((dim) => {
                const Icon = dim.icon;
                return (
                  <div key={dim.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{dim.label}</span>
                      </div>
                      <span className={`text-sm font-semibold ${getScoreColor(dim.score)}`}>
                        {dim.score}%
                      </span>
                    </div>
                    <Progress value={dim.score} className="h-2" />
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {dimensions.map((dim) => (
                  <div key={dim.key} className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      {React.createElement(dim.icon, { className: 'h-3 w-3' })}
                      {dim.label}
                    </h4>
                    <div className="space-y-1">
                      {dim.details.map((detail, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{detail.label}:</span>
                          <span className="font-medium">{detail.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">Strengths</h4>
                  <div className="space-y-1">
                    {dimensions
                      .filter(d => d.score >= 70)
                      .map((dim) => (
                        <div key={dim.key} className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-xs">{dim.label}: Strong ({dim.score}%)</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Areas for Improvement</h4>
                  <div className="space-y-1">
                    {dimensions
                      .filter(d => d.score < 70)
                      .map((dim) => (
                        <div key={dim.key} className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs">{dim.label}: Needs attention ({dim.score}%)</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium mb-2">Risk Assessment</h4>
                  <div className="space-y-1 text-xs">
                    {!qualification.economic_buyer.identified && (
                      <div className="text-red-600">• Economic buyer not identified</div>
                    )}
                    {!qualification.champion.identified && (
                      <div className="text-yellow-600">• No internal champion</div>
                    )}
                    {qualification.identify_pain.urgency_level < 5 && (
                      <div className="text-yellow-600">• Low urgency level</div>
                    )}
                    {qualification.metrics.kpis_identified.length === 0 && (
                      <div className="text-yellow-600">• No KPIs defined</div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}