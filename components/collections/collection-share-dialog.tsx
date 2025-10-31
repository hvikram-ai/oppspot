/**
 * CollectionShareDialog Component
 * Share collections with other users and manage permissions
 */

'use client';

import { useState } from 'react';
import { Share2, UserPlus, Trash2, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  useCollectionAccess,
  useGrantAccess,
  useRevokeAccess,
  useUpdatePermission,
} from '@/lib/collections/collection-hooks';
import type { PermissionLevel } from '@/lib/collections/types';

interface CollectionShareDialogProps {
  collectionId: string | null;
  collectionName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollectionShareDialog({
  collectionId,
  collectionName,
  open,
  onOpenChange,
}: CollectionShareDialogProps) {
  const [userEmail, setUserEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('view');
  const [isGranting, setIsGranting] = useState(false);

  const { toast } = useToast();
  const { grants, isLoading, refetch } = useCollectionAccess(collectionId);
  const grantAccess = useGrantAccess();
  const revokeAccess = useRevokeAccess();
  const updatePermission = useUpdatePermission();

  const handleGrantAccess = async () => {
    if (!collectionId || !userEmail.trim()) return;

    // Basic email validation
    if (!userEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setIsGranting(true);
    try {
      // TODO: Need to look up user by email to get user_id
      // For now, we'll show a message
      toast({
        title: 'Feature in progress',
        description: 'User lookup by email needs to be implemented',
        variant: 'destructive',
      });

      // When implemented, this should be:
      // const userId = await lookupUserByEmail(userEmail);
      // await grantAccess(collectionId, userId, permissionLevel);
      // toast({ title: 'Access granted', description: `Shared with ${userEmail}` });
      // setUserEmail('');
      // setPermissionLevel('view');
      // refetch();
    } catch (error) {
      toast({
        title: 'Failed to share',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokeAccess = async (accessId: string, userEmail: string) => {
    if (!collectionId) return;
    if (!confirm(`Revoke access for ${userEmail}?`)) return;

    try {
      await revokeAccess(collectionId, accessId);
      toast({
        title: 'Access revoked',
        description: `${userEmail} no longer has access`,
      });
    } catch (error) {
      toast({
        title: 'Failed to revoke',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePermission = async (
    accessId: string,
    newPermission: PermissionLevel,
    userEmail: string
  ) => {
    if (!collectionId) return;

    try {
      await updatePermission(collectionId, accessId, newPermission);
      toast({
        title: 'Permission updated',
        description: `${userEmail} now has ${newPermission} access`,
      });
    } catch (error) {
      toast({
        title: 'Failed to update',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const getPermissionBadgeVariant = (level: PermissionLevel) => {
    switch (level) {
      case 'view':
        return 'secondary';
      case 'edit':
        return 'default';
      case 'manage':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Collection
          </DialogTitle>
          <DialogDescription>
            {collectionName && `Share "${collectionName}" with other users`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invite form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-email">Email Address</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="user@example.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="pl-9"
                    disabled={isGranting}
                  />
                </div>
                <Select
                  value={permissionLevel}
                  onValueChange={(value) => setPermissionLevel(value as PermissionLevel)}
                  disabled={isGranting}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View</SelectItem>
                    <SelectItem value="edit">Edit</SelectItem>
                    <SelectItem value="manage">Manage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                {permissionLevel === 'view' && 'Can view items only'}
                {permissionLevel === 'edit' && 'Can view and add/remove items'}
                {permissionLevel === 'manage' &&
                  'Can view, edit, and invite others'}
              </p>
            </div>

            <Button
              onClick={handleGrantAccess}
              disabled={isGranting || !userEmail.trim()}
              className="w-full gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {isGranting ? 'Inviting...' : 'Invite User'}
            </Button>
          </div>

          {/* Current access grants */}
          <div className="space-y-3">
            <Label>People with Access</Label>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : grants.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  No one has access yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {grants.map((grant) => (
                  <Card key={grant.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{grant.user_email}</p>
                          {grant.user_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {grant.user_name}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={grant.permission_level}
                            onValueChange={(value) =>
                              handleUpdatePermission(
                                grant.id,
                                value as PermissionLevel,
                                grant.user_email
                              )
                            }
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">View</SelectItem>
                              <SelectItem value="edit">Edit</SelectItem>
                              <SelectItem value="manage">Manage</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRevokeAccess(grant.id, grant.user_email)
                            }
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
