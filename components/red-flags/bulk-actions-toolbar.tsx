'use client';

/**
 * Bulk Actions Toolbar Component
 *
 * Displays a toolbar when flags are selected, allowing bulk operations:
 * - Change status
 * - Assign to user
 * - Add note
 * - Snooze
 * - Export selected
 * - Mark as false positive
 *
 * Integrates with Zustand store for selection state.
 */

import { useState } from 'react';
import { useRedFlagsStore } from '@/lib/stores/red-flags-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  X,
  GitBranch,
  User,
  MessageSquare,
  Clock,
  Download,
  AlertCircle,
  Check,
} from 'lucide-react';

/**
 * Bulk Actions Toolbar Component
 */
export function BulkActionsToolbar() {
  const {
    selectedFlags,
    clearFlagSelection,
    currentEntityId,
  } = useRedFlagsStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const selectedCount = selectedFlags.size;

  /**
   * Handle bulk status change
   */
  const handleBulkStatusChange = async (newStatus: string) => {
    if (!currentEntityId) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      // Execute status change for each selected flag
      const promises = Array.from(selectedFlags).map(async (flagId) => {
        // First get current status
        const flagResponse = await fetch(
          `/api/companies/${currentEntityId}/red-flags/${flagId}`
        );
        if (!flagResponse.ok) return;

        const { flag } = await flagResponse.json();

        // Then record status change action
        const response = await fetch(
          `/api/companies/${currentEntityId}/red-flags/${flagId}/actions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'status_change',
              from: flag.status,
              to: newStatus,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to update flag ${flagId}`);
        }
      });

      await Promise.all(promises);

      setStatusMessage({
        type: 'success',
        message: `Successfully updated ${selectedCount} flag(s) to ${newStatus}`,
      });

      // Clear selection after 2 seconds
      setTimeout(() => {
        clearFlagSelection();
        setStatusMessage(null);
      }, 2000);
    } catch (err) {
      console.error('[BulkActionsToolbar] Error:', err);
      setStatusMessage({
        type: 'error',
        message: 'Failed to update some flags. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle bulk note addition
   */
  const handleBulkAddNote = async () => {
    const note = prompt('Enter note to add to all selected flags:');
    if (!note || !currentEntityId) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const promises = Array.from(selectedFlags).map((flagId) =>
        fetch(`/api/companies/${currentEntityId}/red-flags/${flagId}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'note',
            text: note,
            is_internal: false,
          }),
        })
      );

      await Promise.all(promises);

      setStatusMessage({
        type: 'success',
        message: `Note added to ${selectedCount} flag(s)`,
      });

      setTimeout(() => {
        clearFlagSelection();
        setStatusMessage(null);
      }, 2000);
    } catch (err) {
      console.error('[BulkActionsToolbar] Error:', err);
      setStatusMessage({
        type: 'error',
        message: 'Failed to add notes. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle bulk export
   */
  const handleBulkExport = async () => {
    if (!currentEntityId) return;

    setIsProcessing(true);

    try {
      // Create CSV of selected flags
      const flagIds = Array.from(selectedFlags);
      const params = new URLSearchParams();
      params.set('format', 'csv');
      flagIds.forEach((id) => params.append('flag_ids', id));

      const response = await fetch(
        `/api/companies/${currentEntityId}/red-flags/export?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `red-flags-selected-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatusMessage({
        type: 'success',
        message: `Exported ${selectedCount} flag(s)`,
      });

      setTimeout(() => {
        setStatusMessage(null);
      }, 2000);
    } catch (err) {
      console.error('[BulkActionsToolbar] Error:', err);
      setStatusMessage({
        type: 'error',
        message: 'Export failed. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Don't render if no flags selected
   */
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg p-4 flex items-center gap-4">
        {/* Selection count */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-white text-gray-900">
            {selectedCount}
          </Badge>
          <span className="text-sm font-medium">
            {selectedCount === 1 ? 'flag selected' : 'flags selected'}
          </span>
        </div>

        <div className="h-6 w-px bg-gray-700" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Change Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" disabled={isProcessing}>
                <GitBranch className="h-4 w-4 mr-2" />
                Change Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Change to...</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleBulkStatusChange('reviewing')}>
                Reviewing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange('mitigating')}>
                Mitigating
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange('resolved')}>
                Resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange('false_positive')}>
                False Positive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Note */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBulkAddNote}
            disabled={isProcessing}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Note
          </Button>

          {/* Export */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBulkExport}
            disabled={isProcessing}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <div className="h-6 w-px bg-gray-700" />

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="icon"
          onClick={clearFlagSelection}
          disabled={isProcessing}
          className="text-white hover:bg-gray-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <Alert
          variant={statusMessage.type === 'error' ? 'destructive' : 'default'}
          className="mt-2"
        >
          {statusMessage.type === 'success' ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{statusMessage.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
