'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserPlus,
  Shield,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { StakeholderDialog } from '@/components/stakeholders/stakeholder-dialog';
import type { Stakeholder } from '@/lib/stakeholder-tracking/types/stakeholder';

interface BusinessStakeholdersProps {
  businessId: string;
  businessName: string;
}

export function BusinessStakeholders({ businessId, businessName }: BusinessStakeholdersProps) {
  const [loading, setLoading] = useState(true);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStakeholders();
  }, [businessId]);

  const fetchStakeholders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/stakeholders?company_id=${businessId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stakeholders');
      }

      setStakeholders(data.stakeholders || []);
    } catch (err) {
      console.error('Error fetching stakeholders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stakeholders');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStakeholder = () => {
    setSelectedStakeholder(null);
    setDialogOpen(true);
  };

  const handleEditStakeholder = (stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder);
    setDialogOpen(true);
  };

  const handleStakeholderSuccess = () => {
    fetchStakeholders();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'champion':
        return 'default';
      case 'decision_maker':
        return 'secondary';
      case 'detractor':
        return 'destructive';
      case 'influencer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'champion':
        return <Shield className="h-3 w-3" />;
      case 'detractor':
        return <AlertTriangle className="h-3 w-3" />;
      case 'influencer':
        return <TrendingUp className="h-3 w-3" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Stakeholders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Stakeholders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Stakeholders
              </CardTitle>
              <CardDescription>
                Key contacts and decision makers
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddStakeholder}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add
              </Button>
              <Link href={`/stakeholders?company_id=${businessId}`}>
                <Button size="sm" variant="ghost">
                  View All
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stakeholders.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                No stakeholders tracked yet
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddStakeholder}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add First Stakeholder
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Show top 5 stakeholders */}
              {stakeholders.slice(0, 5).map((stakeholder) => (
                <div
                  key={stakeholder.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleEditStakeholder(stakeholder)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{stakeholder.name}</p>
                      {stakeholder.role_type && (
                        <Badge variant={getRoleBadgeVariant(stakeholder.role_type)} className="text-xs">
                          {getRoleIcon(stakeholder.role_type)}
                          <span className="ml-1">
                            {stakeholder.role_type.replace('_', ' ')}
                          </span>
                        </Badge>
                      )}
                    </div>
                    {stakeholder.title && (
                      <p className="text-sm text-muted-foreground">{stakeholder.title}</p>
                    )}
                    {stakeholder.email && (
                      <p className="text-xs text-muted-foreground">{stakeholder.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {stakeholder.influence_level && stakeholder.influence_level >= 7 && (
                      <Badge variant="secondary" className="text-xs">
                        High Influence
                      </Badge>
                    )}
                    {stakeholder.decision_authority && (
                      <Badge variant="outline" className="text-xs">
                        Decision Maker
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}

              {/* Show count if more than 5 */}
              {stakeholders.length > 5 && (
                <div className="pt-2 border-t">
                  <Link href={`/stakeholders?company_id=${businessId}`}>
                    <Button variant="ghost" size="sm" className="w-full">
                      View all {stakeholders.length} stakeholders
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Summary Stats */}
          {stakeholders.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {stakeholders.filter(s => s.role_type === 'champion').length}
                </p>
                <p className="text-xs text-muted-foreground">Champions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {stakeholders.filter(s => s.decision_authority).length}
                </p>
                <p className="text-xs text-muted-foreground">Decision Makers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {Math.round(
                    stakeholders.reduce((sum, s) => sum + (s.engagement_score || 0), 0) /
                    stakeholders.length
                  )}%
                </p>
                <p className="text-xs text-muted-foreground">Avg Engagement</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Add/Edit */}
      <StakeholderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        stakeholder={selectedStakeholder}
        companyId={businessId}
        onSuccess={handleStakeholderSuccess}
      />
    </>
  );
}