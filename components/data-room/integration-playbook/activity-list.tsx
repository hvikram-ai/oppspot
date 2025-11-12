'use client';

/**
 * Activity List Component
 * Filterable table of integration activities
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Clock, AlertCircle, XCircle, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';
import type {
  IntegrationActivity,
  IntegrationPhase,
  IntegrationWorkstream,
  ActivityStatus,
  ActivityPriority,
} from '@/lib/data-room/types';

interface ActivityListProps {
  playbookId: string;
  phases: IntegrationPhase[];
  workstreams: IntegrationWorkstream[];
}

export function ActivityList({ playbookId, phases, workstreams }: ActivityListProps) {
  const [activities, setActivities] = useState<IntegrationActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [workstreamFilter, setWorkstreamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ActivityPriority | 'all'>('all');

  useEffect(() => {
    fetchActivities();
  }, [playbookId, phaseFilter, workstreamFilter, statusFilter, priorityFilter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (phaseFilter !== 'all') params.append('phase_id', phaseFilter);
      if (workstreamFilter !== 'all') params.append('workstream_id', workstreamFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

      const response = await fetch(
        `/api/integration-playbook/${playbookId}/activities?${params.toString()}`
      );
      const result = await response.json();

      if (result.success) {
        setActivities(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (activityId: string, newStatus: ActivityStatus) => {
    try {
      const response = await fetch(
        `/api/integration-playbook/${playbookId}/activities/${activityId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        toast.success('Activity status updated');
        fetchActivities();
      }
    } catch (error) {
      toast.error('Failed to update activity');
    }
  };

  const filteredActivities = activities.filter((activity) =>
    activity.activity_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusIcons: Record<ActivityStatus, JSX.Element> = {
    not_started: <Clock className="h-4 w-4 text-gray-400" />,
    in_progress: <Clock className="h-4 w-4 text-blue-500 animate-pulse" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    blocked: <XCircle className="h-4 w-4 text-red-500" />,
    at_risk: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  };

  const priorityColors: Record<ActivityPriority, string> = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Integration Activities</CardTitle>
            <CardDescription>
              {filteredActivities.length} activities
              {searchTerm && ` matching "${searchTerm}"`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Phases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              {phases.map((phase) => (
                <SelectItem key={phase.id} value={phase.id}>
                  {phase.phase_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={workstreamFilter} onValueChange={setWorkstreamFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Workstreams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workstreams</SelectItem>
              {workstreams.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>
                  {ws.workstream_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Activities Table */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Filter className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No activities found</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>{statusIcons[activity.status]}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{activity.activity_name}</p>
                        {activity.description && (
                          <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[activity.priority]}>
                        {activity.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={activity.status}
                        onValueChange={(value) =>
                          handleStatusChange(activity.id, value as ActivityStatus)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                          <SelectItem value="at_risk">At Risk</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {activity.duration_days} days
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
