'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Share2, UserPlus, Trash2, Loader2, Eye, Edit } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { AnalysisAccessGrant } from '@/lib/competitive-analysis/types';

export interface ShareDialogProps {
  analysisId: string;
  isOwner: boolean;
}

/**
 * Dialog for inviting users and managing access grants
 */
export function ShareDialog({ analysisId, isOwner }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState<'view' | 'edit'>('view');
  const [isInviting, setIsInviting] = useState(false);
  const [grants, setGrants] = useState<AnalysisAccessGrant[]>([]);
  const [loadingGrants, setLoadingGrants] = useState(false);

  const fetchGrants = useCallback(async () => {
    setLoadingGrants(true);
    try {
      const response = await fetch(`/api/competitive-analysis/${analysisId}/share`);
      if (response.ok) {
        const data = await response.json();
        setGrants(data.grants || []);
      }
    } catch (error) {
      console.error('Error fetching grants:', error);
    } finally {
      setLoadingGrants(false);
    }
  }, [analysisId]);

  // Fetch existing grants when dialog opens
  useEffect(() => {
    if (open && isOwner) {
      fetchGrants();
    }
  }, [open, isOwner, fetchGrants]);

  const handleInvite = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Invalid email', {
        description: 'Please enter a valid email address',
      });
      return;
    }

    setIsInviting(true);

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

      toast.success('Invitation sent', {
        description: `${email} has been granted ${accessLevel} access`,
      });

      // Reset form and refresh grants
      setEmail('');
      setAccessLevel('view');
      await fetchGrants();
    } catch (error) {
      toast.error('Invitation failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async (grantId: string) => {
    try {
      const response = await fetch(
        `/api/competitive-analysis/${analysisId}/share/${grantId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to revoke access');
      }

      toast.success('Access revoked');
      await fetchGrants();
    } catch (error) {
      toast.error('Failed to revoke access', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  if (!isOwner) {
    return (
      <Button variant="outline" disabled>
        <Share2 className="mr-2 h-4 w-4" />
        Share (Owner Only)
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Analysis</DialogTitle>
          <DialogDescription>
            Invite team members to view or edit this competitive analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invite Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isInviting) {
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
              <p className="text-xs text-muted-foreground">
                {accessLevel === 'view'
                  ? 'Can view analysis but cannot make changes'
                  : 'Can view, edit, and refresh analysis data'}
              </p>
            </div>

            <Button onClick={handleInvite} disabled={isInviting} className="w-full">
              {isInviting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inviting...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>

          {/* Existing Grants */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Current Access</Label>
              {grants.length > 0 && (
                <Badge variant="outline">{grants.length} user{grants.length > 1 ? 's' : ''}</Badge>
              )}
            </div>

            {loadingGrants ? (
              <div className="text-center py-6 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : grants.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border rounded-lg">
                No one has been invited yet
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead>Granted</TableHead>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
