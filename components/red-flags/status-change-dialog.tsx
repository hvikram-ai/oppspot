'use client';

/**
 * Status Change Dialog Component
 *
 * Modal dialog for changing red flag status with validation.
 * Enforces valid status transitions and requires reason for certain transitions.
 * Integrates with actions API to record status change.
 */

import { useState } from 'react';
import { FlagStatus } from '@/lib/red-flags/types';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2, GitBranch } from 'lucide-react';

/**
 * Valid status transitions
 */
const VALID_TRANSITIONS: Record<FlagStatus, FlagStatus[]> = {
  open: ['reviewing', 'mitigating', 'false_positive'],
  reviewing: ['open', 'mitigating', 'false_positive'],
  mitigating: ['reviewing', 'resolved', 'false_positive'],
  resolved: ['open'],
  false_positive: ['open'],
};

/**
 * Status display configuration
 */
const STATUS_CONFIG: Record<FlagStatus, { label: string; description: string }> = {
  open: {
    label: 'Open',
    description: 'Flag requires attention',
  },
  reviewing: {
    label: 'Reviewing',
    description: 'Under investigation',
  },
  mitigating: {
    label: 'Mitigating',
    description: 'Remediation in progress',
  },
  resolved: {
    label: 'Resolved',
    description: 'Issue has been addressed',
  },
  false_positive: {
    label: 'False Positive',
    description: 'Flag is not a real issue',
  },
};

/**
 * Props
 */
interface StatusChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  flagId: string;
  companyId: string;
  currentStatus: FlagStatus;
  onStatusChanged?: () => void;
}

/**
 * Status Change Dialog Component
 */
export function StatusChangeDialog({
  isOpen,
  onClose,
  flagId,
  companyId,
  currentStatus,
  onStatusChanged,
}: StatusChangeDialogProps) {
  const [newStatus, setNewStatus] = useState<FlagStatus | ''>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get valid next statuses
  const validNextStatuses = VALID_TRANSITIONS[currentStatus] || [];

  // Check if reason is required
  const isReasonRequired = newStatus === 'false_positive';

  /**
   * Reset form state
   */
  const resetForm = () => {
    setNewStatus('');
    setReason('');
    setError(null);
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    resetForm();
    onClose();
  };

  /**
   * Handle status change submission
   */
  const handleSubmit = async () => {
    if (!newStatus) {
      setError('Please select a new status');
      return;
    }

    if (isReasonRequired && !reason.trim()) {
      setError('Reason is required when marking a flag as false positive');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/companies/${companyId}/red-flags/${flagId}/actions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'status_change',
            from: currentStatus,
            to: newStatus,
            reason: reason.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to change status');
      }

      // Success - close dialog and notify parent
      handleClose();
      onStatusChanged?.();
    } catch (err) {
      console.error('[StatusChangeDialog] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to change status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Change Status
          </DialogTitle>
          <DialogDescription>
            Update the status of this red flag. Current status:{' '}
            <span className="font-medium">{STATUS_CONFIG[currentStatus].label}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="newStatus">New Status</Label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as FlagStatus)}
            >
              <SelectTrigger id="newStatus">
                <SelectValue placeholder="Select new status..." />
              </SelectTrigger>
              <SelectContent>
                {validNextStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    <div>
                      <div className="font-medium">{STATUS_CONFIG[status].label}</div>
                      <div className="text-xs text-gray-500">
                        {STATUS_CONFIG[status].description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason {isReasonRequired && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="reason"
              placeholder={
                isReasonRequired
                  ? 'Explain why this is a false positive...'
                  : 'Optional: Add context for this status change...'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-gray-500">
              {reason.length}/2000 characters
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info Alert for False Positive */}
          {newStatus === 'false_positive' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Marking a flag as false positive will help improve our detection algorithms.
                Please provide a detailed explanation of why this is not a real issue.
              </AlertDescription>
            </Alert>
          )}

          {/* Info Alert for Resolved */}
          {newStatus === 'resolved' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Resolved flags can be reopened if the issue resurfaces.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !newStatus}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <GitBranch className="h-4 w-4 mr-2" />
                Change Status
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
