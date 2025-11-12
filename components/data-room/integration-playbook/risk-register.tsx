'use client';

/**
 * Risk Register Component
 * Track and manage integration risks
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';
import type { IntegrationRisk, RiskImpact, RiskProbability } from '@/lib/data-room/types';

interface RiskRegisterProps {
  playbookId: string;
}

export function RiskRegister({ playbookId }: RiskRegisterProps) {
  const [risks, setRisks] = useState<(IntegrationRisk & { risk_score: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRisks();
  }, [playbookId]);

  const fetchRisks = async () => {
    try {
      const response = await fetch(`/api/integration-playbook/${playbookId}/risks`);
      const result = await response.json();

      if (result.success) {
        setRisks(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch risks:', error);
    } finally {
      setLoading(false);
    }
  };

  const openRisks = risks.filter((r) => r.status === 'open');
  const criticalRisks = risks.filter((r) => r.impact === 'critical');
  const highProbabilityRisks = risks.filter((r) => r.probability === 'high');

  const impactColors: Record<RiskImpact, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  const probabilityColors: Record<RiskProbability, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 9) return 'bg-red-500';
    if (score >= 6) return 'bg-orange-500';
    if (score >= 3) return 'bg-yellow-500';
    return 'bg-green-500';
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">{risks.length}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Identified risks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <AlertTriangle className="mr-1 h-4 w-4 text-red-600" />
              Open Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">{openRisks.length}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <AlertTriangle className="mr-1 h-4 w-4 text-orange-600" />
              Critical Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">{criticalRisks.length}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">High severity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <Shield className="mr-1 h-4 w-4 text-green-600" />
              Mitigated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">
                {risks.filter((r) => r.status === 'mitigated').length}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Successfully managed</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Matrix Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Matrix</CardTitle>
          <CardDescription>Impact vs. Probability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {/* Header Row */}
            <div className="text-xs font-medium text-gray-500"></div>
            <div className="text-xs font-medium text-center text-gray-500">Low</div>
            <div className="text-xs font-medium text-center text-gray-500">Medium</div>
            <div className="text-xs font-medium text-center text-gray-500">High</div>

            {/* Critical Row */}
            <div className="text-xs font-medium text-gray-500">Critical</div>
            <div className="h-16 bg-orange-300 rounded flex items-center justify-center text-sm font-bold">
              {risks.filter((r) => r.impact === 'critical' && r.probability === 'low').length}
            </div>
            <div className="h-16 bg-red-300 rounded flex items-center justify-center text-sm font-bold">
              {risks.filter((r) => r.impact === 'critical' && r.probability === 'medium').length}
            </div>
            <div className="h-16 bg-red-500 text-white rounded flex items-center justify-center text-sm font-bold">
              {risks.filter((r) => r.impact === 'critical' && r.probability === 'high').length}
            </div>

            {/* High Row */}
            <div className="text-xs font-medium text-gray-500">High</div>
            <div className="h-16 bg-yellow-300 rounded flex items-center justify-center text-sm font-bold">
              {risks.filter((r) => r.impact === 'high' && r.probability === 'low').length}
            </div>
            <div className="h-16 bg-orange-300 rounded flex items-center justify-center text-sm font-bold">
              {risks.filter((r) => r.impact === 'high' && r.probability === 'medium').length}
            </div>
            <div className="h-16 bg-red-300 rounded flex items-center justify-center text-sm font-bold">
              {risks.filter((r) => r.impact === 'high' && r.probability === 'high').length}
            </div>

            {/* Medium Row */}
            <div className="text-xs font-medium text-gray-500">Medium</div>
            <div className="h-16 bg-green-300 rounded flex items-center justify-center text-sm font-bold">
              {risks.filter((r) => r.impact === 'medium' && r.probability === 'low').length}
            </div>
            <div className="h-16 bg-yellow-300 rounded flex items-center justify-center text-sm font-bold">
              {risks.filter((r) => r.impact === 'medium' && r.probability === 'medium').length}
            </div>
            <div className="h-16 bg-orange-300 rounded flex items-center justify-center text-sm font-bold">
              {risks.filter((r) => r.impact === 'medium' && r.probability === 'high').length}
            </div>

            {/* Low Row */}
            <div className="text-xs font-medium text-gray-500">Low</div>
            <div className="h-16 bg-green-200 rounded flex items-center justify-center text-sm font-bold">
              {risks.filter((r) => r.impact === 'low' && r.probability === 'low').length}
            </div>
            <div className="h-16 bg-green-300 rounded flex items-center justify-center text-sm font-bold">
              {risks.filter((r) => r.impact === 'low' && r.probability === 'medium').length}
            </div>
            <div className="h-16 bg-yellow-300 rounded flex items-center justify-center text-sm font-bold">
              {risks.filter((r) => r.impact === 'low' && r.probability === 'high').length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Details</CardTitle>
          <CardDescription>Sorted by risk score (high to low)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Score</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.map((risk) => (
                  <TableRow key={risk.id}>
                    <TableCell>
                      <div
                        className={`w-8 h-8 rounded-full ${getRiskScoreColor(
                          risk.risk_score
                        )} text-white flex items-center justify-center text-sm font-bold`}
                      >
                        {risk.risk_score}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{risk.risk_name}</p>
                        <p className="text-xs text-gray-500 mt-1">{risk.risk_description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{risk.risk_category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={impactColors[risk.impact]}>{risk.impact}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={probabilityColors[risk.probability]}>
                        {risk.probability}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          risk.status === 'mitigated'
                            ? 'default'
                            : risk.status === 'accepted'
                            ? 'outline'
                            : 'destructive'
                        }
                      >
                        {risk.status}
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
