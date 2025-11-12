'use client';

/**
 * Integration Playbook Overview
 * Main dashboard showing playbook summary and key metrics
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  TrendingUp,
  AlertTriangle,
  Target,
  CheckCircle2,
  Clock,
  FileText,
  Download,
  Edit,
  Trash2,
  Activity,
} from 'lucide-react';
import type { IntegrationPlaybookWithDetails, PlaybookStatus } from '@/lib/data-room/types';
import { PhaseTimeline } from './phase-timeline';
import { ActivityList } from './activity-list';
import { Day1Checklist } from './day1-checklist';
import { SynergyTracker } from './synergy-tracker';
import { RiskRegister } from './risk-register';
import { ExportDialog } from './export-dialog';

interface PlaybookOverviewProps {
  playbookId: string;
}

export function PlaybookOverview({ playbookId }: PlaybookOverviewProps) {
  const [playbook, setPlaybook] = useState<IntegrationPlaybookWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaybook();
  }, [playbookId]);

  const fetchPlaybook = async () => {
    try {
      const response = await fetch(`/api/integration-playbook/${playbookId}`);
      const result = await response.json();

      if (result.success) {
        setPlaybook(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch playbook:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Loading playbook...</p>
        </div>
      </div>
    );
  }

  if (!playbook) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Playbook not found</h3>
        <p className="text-sm text-gray-500 mt-2">The requested playbook could not be loaded.</p>
      </div>
    );
  }

  const completionPercentage =
    playbook.total_activities > 0
      ? Math.round((playbook.completed_activities / playbook.total_activities) * 100)
      : 0;

  const synergyRealizationPercentage =
    playbook.total_synergies > 0
      ? Math.round((playbook.realized_synergies / playbook.total_synergies) * 100)
      : 0;

  const statusColors: Record<PlaybookStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-gray-900">{playbook.playbook_name}</h1>
            <Badge className={statusColors[playbook.status]}>{playbook.status}</Badge>
            {playbook.confidence_score && (
              <Badge variant="outline">
                {playbook.confidence_score}% confidence
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Created {new Date(playbook.created_at).toLocaleDateString()}
            {playbook.creator_email && ` by ${playbook.creator_email}`}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <ExportDialog playbookId={playbook.id} playbookName={playbook.playbook_name} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Activity Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">
                {playbook.completed_activities}/{playbook.total_activities}
              </span>
              <span className="text-sm text-gray-500">activities</span>
            </div>
            <Progress value={completionPercentage} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">{completionPercentage}% complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Synergy Realization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">
                ${(playbook.realized_synergies / 1000000).toFixed(1)}M
              </span>
              <span className="text-sm text-gray-500">
                / ${(playbook.total_synergies / 1000000).toFixed(1)}M
              </span>
            </div>
            <Progress value={synergyRealizationPercentage} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">
              {synergyRealizationPercentage}% realized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Open Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">
                {playbook.risks?.filter((r) => r.status === 'open').length || 0}
              </span>
              <span className="text-sm text-gray-500">
                / {playbook.risks?.length || 0} total
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-gray-500">
                {playbook.risks?.filter((r) => r.impact === 'critical').length || 0} critical
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Target Close Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-lg font-semibold">
                {playbook.target_close_date
                  ? new Date(playbook.target_close_date).toLocaleDateString()
                  : 'Not set'}
              </span>
            </div>
            {playbook.target_close_date && (
              <p className="text-xs text-gray-500 mt-2">
                {Math.ceil(
                  (new Date(playbook.target_close_date).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                days remaining
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deal Rationale */}
      {playbook.deal_rationale && (
        <Card>
          <CardHeader>
            <CardTitle>Deal Rationale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{playbook.deal_rationale}</p>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="activities">
            Activities
            <Badge variant="outline" className="ml-2">
              {playbook.total_activities}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="day1">Day 1</TabsTrigger>
          <TabsTrigger value="synergies">Synergies</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <PhaseTimeline phases={playbook.phases} />
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <ActivityList
            playbookId={playbook.id}
            phases={playbook.phases}
            workstreams={playbook.workstreams}
          />
        </TabsContent>

        <TabsContent value="day1" className="space-y-4">
          <Day1Checklist playbookId={playbook.id} />
        </TabsContent>

        <TabsContent value="synergies" className="space-y-4">
          <SynergyTracker playbookId={playbook.id} />
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <RiskRegister playbookId={playbook.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
