'use client';

/**
 * Synergy Tracker Component
 * Track cost and revenue synergies
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { IntegrationSynergy, SynergyType } from '@/lib/data-room/types';

interface SynergyTrackerProps {
  playbookId: string;
}

export function SynergyTracker({ playbookId }: SynergyTrackerProps) {
  const [synergies, setSynergies] = useState<IntegrationSynergy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSynergies();
  }, [playbookId]);

  const fetchSynergies = async () => {
    try {
      const response = await fetch(`/api/integration-playbook/${playbookId}/synergies`);
      const result = await response.json();

      if (result.success) {
        setSynergies(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch synergies:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalTarget = synergies.reduce((sum, s) => sum + (s.total_target || 0), 0);
  const totalActual = synergies.reduce((sum, s) => sum + (s.total_actual || 0), 0);
  const realizationPercentage = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

  const costSynergies = synergies.filter((s) => s.synergy_type === 'cost');
  const revenueSynergies = synergies.filter((s) => s.synergy_type === 'revenue');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const typeColors: Record<SynergyType, string> = {
    cost: 'bg-green-100 text-green-800',
    revenue: 'bg-blue-100 text-blue-800',
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Synergies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">{formatCurrency(totalActual)}</span>
              <span className="text-sm text-gray-500">/ {formatCurrency(totalTarget)}</span>
            </div>
            <Progress value={realizationPercentage} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">{realizationPercentage}% realized</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <TrendingDown className="mr-1 h-4 w-4 text-green-600" />
              Cost Synergies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">
                {formatCurrency(
                  costSynergies.reduce((sum, s) => sum + (s.total_actual || 0), 0)
                )}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{costSynergies.length} initiatives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <TrendingUp className="mr-1 h-4 w-4 text-blue-600" />
              Revenue Synergies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">
                {formatCurrency(
                  revenueSynergies.reduce((sum, s) => sum + (s.total_actual || 0), 0)
                )}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{revenueSynergies.length} initiatives</p>
          </CardContent>
        </Card>
      </div>

      {/* Synergies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Synergy Details</CardTitle>
          <CardDescription>{synergies.length} synergy initiatives</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Synergy</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Year 1</TableHead>
                  <TableHead className="text-right">Year 2</TableHead>
                  <TableHead className="text-right">Year 3</TableHead>
                  <TableHead className="text-right">Total Target</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {synergies.map((synergy) => (
                  <TableRow key={synergy.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{synergy.synergy_name}</p>
                        <p className="text-xs text-gray-500 mt-1">{synergy.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={typeColors[synergy.synergy_type]}>
                        {synergy.synergy_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{synergy.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(synergy.year_1_target || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(synergy.year_2_target || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(synergy.year_3_target || 0)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(synergy.total_target || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          synergy.status === 'realized'
                            ? 'default'
                            : synergy.status === 'on_track'
                            ? 'outline'
                            : 'destructive'
                        }
                      >
                        {synergy.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
