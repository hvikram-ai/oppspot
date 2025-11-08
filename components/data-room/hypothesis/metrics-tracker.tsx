'use client';

/**
 * Metrics Tracker Component
 * Table for tracking hypothesis validation metrics and KPIs
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { HypothesisMetric, MetricStatus } from '@/lib/data-room/types';
import {
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface MetricsTrackerProps {
  hypothesisId: string;
  onMetricsChange?: () => void;
}

const STATUS_CONFIG: Record<
  MetricStatus,
  { icon: React.ElementType; label: string; color: string }
> = {
  not_tested: { icon: Clock, label: 'Not Tested', color: 'text-gray-600' },
  testing: { icon: TrendingUp, label: 'Testing', color: 'text-blue-600' },
  met: { icon: CheckCircle2, label: 'Met', color: 'text-green-600' },
  not_met: { icon: XCircle, label: 'Not Met', color: 'text-red-600' },
  partially_met: { icon: TrendingUp, label: 'Partially Met', color: 'text-yellow-600' },
};

export function MetricsTracker({ hypothesisId, onMetricsChange }: MetricsTrackerProps) {
  const [metrics, setMetrics] = useState<HypothesisMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<HypothesisMetric | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMetrics();
  }, [hypothesisId]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data-room/hypotheses/${hypothesisId}/metrics`);
      const data = await response.json();

      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMetric = () => {
    setEditingMetric(null);
    setEditorOpen(true);
  };

  const handleEditMetric = (metric: HypothesisMetric) => {
    setEditingMetric(metric);
    setEditorOpen(true);
  };

  const handleDeleteMetric = async (metricId: string) => {
    if (!confirm('Are you sure you want to delete this metric?')) {
      return;
    }

    try {
      const response = await fetch(`/api/data-room/hypotheses/metrics/${metricId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Metric deleted successfully',
        });
        fetchMetrics();
        onMetricsChange?.();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete metric',
        variant: 'destructive',
      });
    }
  };

  const handleMetricSaved = () => {
    fetchMetrics();
    onMetricsChange?.();
    setEditorOpen(false);
  };

  if (loading) {
    return <MetricsTrackerSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Metrics ({metrics.length})</h3>
        <Button onClick={handleAddMetric} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Metric
        </Button>
      </div>

      {metrics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No metrics defined</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Define quantitative metrics to validate your hypothesis
            </p>
            <Button onClick={handleAddMetric}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Metric
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric) => (
                  <MetricRow
                    key={metric.id}
                    metric={metric}
                    onEdit={handleEditMetric}
                    onDelete={handleDeleteMetric}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <MetricEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        hypothesisId={hypothesisId}
        metric={editingMetric}
        onSuccess={handleMetricSaved}
      />
    </div>
  );
}

function MetricRow({
  metric,
  onEdit,
  onDelete,
}: {
  metric: HypothesisMetric;
  onEdit: (metric: HypothesisMetric) => void;
  onDelete: (id: string) => void;
}) {
  const statusConfig = STATUS_CONFIG[metric.status];
  const StatusIcon = statusConfig.icon;

  const formatValue = (value: number | null, unit: string | null) => {
    if (value === null) return '-';
    return unit ? `${value} ${unit}` : value.toString();
  };

  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{metric.metric_name}</p>
          {metric.description && (
            <p className="text-xs text-muted-foreground">{metric.description}</p>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">{formatValue(metric.target_value, metric.unit)}</TableCell>
      <TableCell className="text-right">{formatValue(metric.actual_value, metric.unit)}</TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(metric)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(metric.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function MetricEditor({
  open,
  onOpenChange,
  hypothesisId,
  metric,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hypothesisId: string;
  metric: HypothesisMetric | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [metricName, setMetricName] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [actualValue, setActualValue] = useState('');
  const [unit, setUnit] = useState('');
  const [status, setStatus] = useState<MetricStatus>('not_tested');

  useEffect(() => {
    if (open && metric) {
      setMetricName(metric.metric_name);
      setDescription(metric.description || '');
      setTargetValue(metric.target_value?.toString() || '');
      setActualValue(metric.actual_value?.toString() || '');
      setUnit(metric.unit || '');
      setStatus(metric.status);
    } else if (open && !metric) {
      // Reset for new metric
      setMetricName('');
      setDescription('');
      setTargetValue('');
      setActualValue('');
      setUnit('');
      setStatus('not_tested');
    }
  }, [open, metric]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!metricName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Metric name is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const body = {
        metric_name: metricName,
        description: description || undefined,
        target_value: targetValue ? parseFloat(targetValue) : undefined,
        actual_value: actualValue ? parseFloat(actualValue) : undefined,
        unit: unit || undefined,
        status,
      };

      const url = metric
        ? `/api/data-room/hypotheses/metrics/${metric.id}`
        : `/api/data-room/hypotheses/${hypothesisId}/metrics`;

      const method = metric ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: metric ? 'Metric updated successfully' : 'Metric added successfully',
        });
        onSuccess();
      } else {
        throw new Error(data.error || 'Failed to save metric');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{metric ? 'Edit Metric' : 'Add Metric'}</DialogTitle>
          <DialogDescription>
            Define a quantitative metric to track hypothesis validation
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metric_name">
              Metric Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="metric_name"
              placeholder="e.g., Annual Revenue Growth"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_value">Target</Label>
              <Input
                id="target_value"
                type="number"
                step="any"
                placeholder="e.g., 30"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual_value">Actual</Label>
              <Input
                id="actual_value"
                type="number"
                step="any"
                placeholder="e.g., 35"
                value={actualValue}
                onChange={(e) => setActualValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="e.g., %"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as MetricStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_tested">Not Tested</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="met">Met</SelectItem>
                <SelectItem value="not_met">Not Met</SelectItem>
                <SelectItem value="partially_met">Partially Met</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {metric ? 'Update Metric' : 'Add Metric'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MetricsTrackerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
