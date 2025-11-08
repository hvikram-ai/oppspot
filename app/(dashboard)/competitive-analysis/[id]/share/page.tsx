'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, UserPlus, Trash2, Eye, Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AnalysisAccessGrant, CompetitiveAnalysis } from '@/lib/competitive-analysis/types';

/**
 * Share & Permissions Management Page
 * Dedicated page for managing access grants
 */
export default function SharePermissionsPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  const [analysis, setAnalysis] = useState<CompetitiveAnalysis | null>(null);
  const [grants, setGrants] = useState<AnalysisAccessGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState<'view' | 'edit'>('view');

  useEffect(() => {
    if (analysisId) {
      fetchData();
    }
  }, [analysisId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch analysis details
      const analysisResponse = await fetch(`/api/competitive-analysis/${analysisId}`);
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        setAnalysis(analysisData.analysis);
      }

      // Fetch grants
      const grantsResponse = await fetch(`/api/competitive-analysis/${analysisId}/share`);
      if (grantsResponse.ok) {
        const grantsData = await grantsResponse.json();
        setGrants(grantsData.grants || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Invalid email address');
      return;
    }

    setInviting(true);

    try {
      const response = await fetch(`/api/competitive-analysis/${analysisId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: email,
          access_level: accessLevel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to invite user');
      }

      toast.success('Invitation sent successfully');
      setEmail('');
      setAccessLevel('view');
      await fetchData();
    } catch (error) {
      toast.error('Invitation failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (grantId: string) => {
    if (!confirm('Revoke access for this user?')) return;

    try {
      const response = await fetch(
        `/api/competitive-analysis/${analysisId}/share/${grantId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to revoke access');

      toast.success('Access revoked');
      await fetchData();
    } catch (error) {
      toast.error('Failed to revoke access');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Analysis
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Share & Permissions</h1>
        <p className="text-muted-foreground">
          {analysis?.title || 'Analysis'} - Manage team access
        </p>
      </div>

      {/* Invite Section */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Team Member</CardTitle>
          <CardDescription>
            Grant access to this competitive analysis to colleagues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !inviting) {
                    handleInvite();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-level">Access Level</Label>
              <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as 'view' | 'edit')}>
                <SelectTrigger id="access-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      View Only
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center">
                      <Edit className="mr-2 h-4 w-4" />
                      Can Edit
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleInvite} disabled={inviting || !email} className="w-full">
            {inviting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Invitation...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Send Invitation
              </>
            )}
          </Button>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="text-muted-foreground">
              <strong>View Only:</strong> Can view analysis but cannot make changes
              <br />
              <strong>Can Edit:</strong> Can view, edit, and refresh analysis data
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Access Grants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Access</CardTitle>
              <CardDescription>Team members with access to this analysis</CardDescription>
            </div>
            {grants.length > 0 && (
              <Badge variant="outline">
                {grants.length} user{grants.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {grants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No team members have been invited yet</p>
              <p className="text-sm mt-2">Invite someone above to share this analysis</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead>Granted By</TableHead>
                    <TableHead>Granted Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grants.map((grant) => (
                    <TableRow key={grant.id}>
                      <TableCell className="font-medium">
                        {grant.invitation_email || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={grant.access_level === 'edit' ? 'default' : 'secondary'}>
                          {grant.access_level === 'edit' ? (
                            <>
                              <Edit className="mr-1 h-3 w-3" />
                              Edit
                            </>
                          ) : (
                            <>
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {grant.granted_by || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(grant.granted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(grant.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
