'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, DollarSign, Users, Target, Clock } from 'lucide-react';
import { BANTQualification } from '@/lib/qualification/types/qualification';

interface BANTScoreCardProps {
  qualification: BANTQualification | null;
  onRefresh?: () => void;
  loading?: boolean;
}

export function BANTScoreCard({ qualification, onRefresh, loading }: BANTScoreCardProps) {
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
          <p className="text-muted-foreground">No BANT qualification data available</p>
          {onRefresh && (
            <Button onClick={onRefresh} className="mt-4">
              Run BANT Analysis
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (qualification.qualification_status) {
      case 'qualified':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'nurture':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'disqualified':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (qualification.qualification_status) {
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'nurture':
        return 'bg-yellow-100 text-yellow-800';
      case 'disqualified':
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
      key: 'budget',
      label: 'Budget',
      icon: DollarSign,
      score: qualification.budget.score,
      details: [
        { label: 'Range', value: qualification.budget.budget_range.replace(/_/g, ' ').toUpperCase() },
        { label: 'Confirmed', value: qualification.budget.budget_confirmed ? 'Yes' : 'No' },
        { label: 'Source', value: qualification.budget.budget_source }
      ]
    },
    {
      key: 'authority',
      label: 'Authority',
      icon: Users,
      score: qualification.authority.score,
      details: [
        { label: 'Decision Makers', value: qualification.authority.decision_makers.length },
        { label: 'Committee Size', value: qualification.authority.buying_committee_size },
        { label: 'Executive Engagement', value: `${qualification.authority.engagement_level.executive}%` }
      ]
    },
    {
      key: 'need',
      label: 'Need',
      icon: Target,
      score: qualification.need.score,
      details: [
        { label: 'Pain Points', value: qualification.need.pain_points.length },
        { label: 'Urgency', value: qualification.need.urgency_level },
        { label: 'Solution Fit', value: `${qualification.need.solution_fit_score}%` }
      ]
    },
    {
      key: 'timeline',
      label: 'Timeline',
      icon: Clock,
      score: qualification.timeline.score,
      details: [
        { label: 'Buying Stage', value: qualification.timeline.buying_stage },
        { label: 'Decision Date', value: qualification.timeline.decision_date ? new Date(qualification.timeline.decision_date).toLocaleDateString() : 'TBD' },
        { label: 'Confidence', value: `${qualification.timeline.timeline_confidence}%` }
      ]
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>BANT Qualification</CardTitle>
            {getStatusIcon()}
          </div>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" size="sm">
              Refresh
            </Button>
          )}
        </div>
        <CardDescription>
          Lead qualification assessment based on Budget, Authority, Need, and Timeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">
              <span className={getScoreColor(qualification.overall_score)}>
                {qualification.overall_score}%
              </span>
            </div>
            <Badge className={getStatusColor()}>
              {qualification.qualification_status.toUpperCase()}
            </Badge>
          </div>

          {/* Score Breakdown */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {dimensions.map((dim) => {
                const Icon = dim.icon;
                return (
                  <div key={dim.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{dim.label}</span>
                      </div>
                      <span className={`font-semibold ${getScoreColor(dim.score)}`}>
                        {dim.score}%
                      </span>
                    </div>
                    <Progress value={dim.score} className="h-2" />
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              {dimensions.map((dim) => (
                <div key={dim.key} className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    {React.createElement(dim.icon, { className: 'h-4 w-4' })}
                    {dim.label}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {dim.details.map((detail, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-muted-foreground">{detail.label}:</span>
                        <span className="font-medium">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          {/* Next Actions */}
          {qualification.next_actions && qualification.next_actions.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Recommended Actions</h4>
              <div className="space-y-2">
                {qualification.next_actions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Badge variant={action.priority === 'urgent' ? 'destructive' : 'secondary'} className="mt-0.5">
                      {action.priority}
                    </Badge>
                    <span className="text-sm">{action.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}