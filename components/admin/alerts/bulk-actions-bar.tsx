/**
 * Bulk Actions Bar Component
 *
 * Floating action bar that appears when alerts are selected.
 * Allows bulk acknowledge, resolve, or delete operations.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, Trash2, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export interface BulkActionsBarProps {
  selectedCount: number
  selectedIds: string[]
  onClear: () => void
  onComplete: () => void
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClear,
  onComplete,
}: BulkActionsBarProps) {
  const { toast } = useToast()
  const [isAcknowledging, setIsAcknowledging] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [notes, setNotes] = useState('')

  if (selectedCount === 0) return null

  const handleBulkAcknowledge = async () => {
    try {
      setIsAcknowledging(true)

      const response = await fetch('/api/alerts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge',
          alertIds: selectedIds,
          notes: 'Bulk acknowledged from dashboard',
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Bulk acknowledge failed')
      }

      toast({
        title: 'Alerts Acknowledged',
        description: `Successfully acknowledged ${data.results.success} of ${data.results.total} alerts`,
      })

      onComplete()
      onClear()
    } catch (error) {
      console.error('[BulkActionsBar] Acknowledge error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to acknowledge alerts',
        variant: 'destructive',
      })
    } finally {
      setIsAcknowledging(false)
    }
  }

  const handleBulkResolve = async () => {
    if (!notes.trim()) {
      toast({
        title: 'Error',
        description: 'Resolution notes are required',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsResolving(true)

      const response = await fetch('/api/alerts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          alertIds: selectedIds,
          notes: notes.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Bulk resolve failed')
      }

      toast({
        title: 'Alerts Resolved',
        description: `Successfully resolved ${data.results.success} of ${data.results.total} alerts`,
      })

      setShowResolveDialog(false)
      setNotes('')
      onComplete()
      onClear()
    } catch (error) {
      console.error('[BulkActionsBar] Resolve error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resolve alerts',
        variant: 'destructive',
      })
    } finally {
      setIsResolving(false)
    }
  }

  const handleBulkDelete = async () => {
    try {
      setIsDeleting(true)

      const response = await fetch('/api/alerts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          alertIds: selectedIds,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Bulk delete failed')
      }

      toast({
        title: 'Alerts Deleted',
        description: `Successfully marked ${data.results.success} of ${data.results.total} alerts as false positives`,
      })

      setShowDeleteDialog(false)
      onComplete()
      onClear()
    } catch (error) {
      console.error('[BulkActionsBar] Delete error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete alerts',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Floating action bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-primary text-primary-foreground shadow-lg rounded-lg px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selectedCount} selected</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 w-8 p-0 hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-8 w-px bg-primary-foreground/20" />

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkAcknowledge}
              disabled={isAcknowledging || isResolving || isDeleting}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isAcknowledging ? 'Acknowledging...' : 'Acknowledge All'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowResolveDialog(true)}
              disabled={isAcknowledging || isResolving || isDeleting}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Resolve All
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isAcknowledging || isResolving || isDeleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Resolve Dialog */}
      <AlertDialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve {selectedCount} Alerts</AlertDialogTitle>
            <AlertDialogDescription>
              Add resolution notes for these alerts. This will mark them as resolved and notify
              relevant channels.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="resolution-notes">Resolution Notes *</Label>
            <Textarea
              id="resolution-notes"
              placeholder="Describe how the issues were resolved..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Required. Explain what was done to resolve these alerts.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResolving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkResolve} disabled={isResolving || !notes.trim()}>
              {isResolving ? 'Resolving...' : 'Resolve All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as False Positives?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {selectedCount} alert{selectedCount > 1 ? 's' : ''} as false
              positives. This action can be undone by changing the alert status.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Marking...' : 'Mark as False Positive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
