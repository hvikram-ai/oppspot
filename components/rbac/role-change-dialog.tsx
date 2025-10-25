'use client';

/**
 * Role Change Dialog Component
 * Dialog for changing a user's role with validation and confirmation
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoleBadge } from './role-badge';
import { useIsSuperAdmin, useRole } from '@/lib/rbac/hooks';
import {
  UserRole,
  USER_ROLE_LABELS,
  USER_ROLE_DESCRIPTIONS,
  canAssignRole,
} from '@/lib/rbac/types';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string | null;
    full_name: string | null;
    role: UserRole;
  };
  onSuccess: () => void;
  onOptimisticUpdate?: (userId: string, newRole: UserRole) => void;
  onRollback?: (userId: string, previousRole: UserRole, error: Error) => void;
}

export function RoleChangeDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
  onOptimisticUpdate,
  onRollback,
}: RoleChangeDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = useIsSuperAdmin();
  const currentUserRole = useRole();

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedRole(user.role);
      setReason('');
    }
  }, [open, user.role]);

  // Get available roles based on current user's permissions
  const getAvailableRoles = (): UserRole[] => {
    if (!currentUserRole) return [];

    const allRoles = Object.values(UserRole);

    // Filter roles that the current user can assign
    return allRoles.filter((role) => canAssignRole(currentUserRole, role));
  };

  const availableRoles = getAvailableRoles();

  const handleSubmit = async () => {
    if (selectedRole === user.role) {
      toast.error('Please select a different role');
      return;
    }

    if (!currentUserRole || !canAssignRole(currentUserRole, selectedRole)) {
      toast.error('You do not have permission to assign this role');
      return;
    }

    const previousRole = user.role;
    setLoading(true);

    // Optimistic update: Update UI immediately before API call
    if (onOptimisticUpdate) {
      onOptimisticUpdate(user.id, selectedRole);
    }

    // Close dialog immediately for better UX
    onOpenChange(false);

    try {
      const response = await fetch(`/api/rbac/roles/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole,
          reason: reason.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to change role');
      }

      // Success - call success handler (no need to update UI again, already done optimistically)
      toast.success('Role changed successfully');
      onSuccess();
    } catch (error) {
      console.error('Error changing role:', error);

      // Rollback: Revert to previous role on error
      if (onRollback) {
        onRollback(user.id, previousRole, error instanceof Error ? error : new Error('Failed to change role'));
      }

      toast.error(error instanceof Error ? error.message : 'Failed to change role. Changes have been reverted.');
    } finally {
      setLoading(false);
    }
  };

  const isRoleDowngrade = currentUserRole && selectedRole !== user.role &&
    (user.role === UserRole.ENTERPRISE_ADMIN || user.role === UserRole.SUPER_ADMIN);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription>
            Update the role for {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Role */}
          <div className="space-y-2">
            <Label>Current Role</Label>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
              <RoleBadge role={user.role} showIcon />
              <span className="text-sm text-muted-foreground">
                {USER_ROLE_DESCRIPTIONS[user.role]}
              </span>
            </div>
          </div>

          {/* New Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">New Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as UserRole)}
              disabled={loading || availableRoles.length === 0}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No roles available to assign
                  </div>
                ) : (
                  availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <span>{USER_ROLE_LABELS[role]}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedRole !== user.role && (
              <p className="text-sm text-muted-foreground">
                {USER_ROLE_DESCRIPTIONS[selectedRole]}
              </p>
            )}
          </div>

          {/* Warning for Role Downgrades */}
          {isRoleDowngrade && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You are downgrading an admin user. This will remove their administrative
                privileges and may affect their access to certain features.
              </AlertDescription>
            </Alert>
          )}

          {/* Permission Limitations */}
          {!isSuperAdmin && (
            <Alert>
              <AlertDescription className="text-sm">
                As an Enterprise Admin, you can only assign User and Viewer roles.
                Super Admin role assignment requires Super Admin privileges.
              </AlertDescription>
            </Alert>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason {isRoleDowngrade && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="reason"
              placeholder="Explain the reason for this role change (recommended for audit trail)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              rows={3}
            />
            {isRoleDowngrade && !reason.trim() && (
              <p className="text-xs text-destructive">
                A reason is required when downgrading admin roles
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              selectedRole === user.role ||
              (isRoleDowngrade && !reason.trim()) ||
              availableRoles.length === 0
            }
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing...
              </>
            ) : (
              'Change Role'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
