'use client'

/**
 * Approval Requests Component
 * Manage document and workflow approval requests
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  User,
  MessageSquare,
  Loader2
} from 'lucide-react'
import type { ApprovalRequest, ApprovalDecision } from '@/lib/data-room/types'
import { useToast } from '@/hooks/use-toast'

interface ApprovalRequestsProps {
  requests: ApprovalRequest[]
  currentUserId: string
  onUpdate: () => void
}

export function ApprovalRequests({ requests, currentUserId, onUpdate }: ApprovalRequestsProps) {
  const { toast } = useToast()
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [decision, setDecision] = useState<ApprovalDecision | null>(null)
  const [decisionNotes, setDecisionNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Separate pending and decided requests
  const pendingRequests = requests.filter(r => !r.decision && r.requested_from === currentUserId)
  const decidedRequests = requests.filter(r => r.decision)
  const otherRequests = requests.filter(r => !r.decision && r.requested_from !== currentUserId)

  const handleMakeDecision = useCallback(async () => {
    if (!selectedRequest || !decision) return

    setLoading(true)
    try {
      const response = await fetch(`/api/data-room/approvals/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          decision_notes: decisionNotes
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Decision Recorded',
          description: `Approval request ${decision}`
        })
        onUpdate()
        setDialogOpen(false)
        setDecision(null)
        setDecisionNotes('')
      } else {
        throw new Error(result.error || 'Failed to record decision')
      }
    } catch (error) {
      console.error('Failed to record decision:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record decision',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [selectedRequest, decision, decisionNotes, toast, onUpdate])

  const getDecisionIcon = (dec: ApprovalDecision) => {
    switch (dec) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'needs_changes':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    }
  }

  const getDecisionBadge = (dec: ApprovalDecision) => {
    const styles = {
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      needs_changes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    }

    return (
      <Badge className={styles[dec]}>
        {getDecisionIcon(dec)}
        <span className="ml-1 capitalize">{dec.replace('_', ' ')}</span>
      </Badge>
    )
  }

  const formatTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null

    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffMs = expiry.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffMs < 0) return 'Expired'
    if (diffHours < 24) return `${diffHours}h remaining`
    return `${diffDays}d remaining`
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests (Requires Action) */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Pending Your Approval ({pendingRequests.length})
            </CardTitle>
            <CardDescription>
              Approval requests awaiting your decision
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className={`flex items-start gap-4 p-4 border rounded-lg ${
                  isExpired(request.expires_at)
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                    : 'hover:bg-muted/50'
                } transition-colors`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-medium">{request.title}</h4>
                      {request.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {request.description}
                        </p>
                      )}
                    </div>
                    {isExpired(request.expires_at) && (
                      <Badge variant="destructive">Expired</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>Requested by: {request.requested_by}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {request.expires_at && !isExpired(request.expires_at) && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        <span>{formatTimeRemaining(request.expires_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isExpired(request.expires_at) && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request)
                        setDecision('approved')
                        setDialogOpen(true)
                      }}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request)
                        setDecision('needs_changes')
                        setDialogOpen(true)
                      }}
                      className="text-yellow-600 hover:text-yellow-700"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request)
                        setDecision('rejected')
                        setDialogOpen(true)
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Other Pending Requests (Assigned to Others) */}
      {otherRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-600" />
              Other Pending Approvals ({otherRequests.length})
            </CardTitle>
            <CardDescription>
              Approval requests assigned to other team members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {otherRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30"
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-gray-600" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium mb-1">{request.title}</h4>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>Assigned to: {request.requested_from}</span>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Decided Requests */}
      {decidedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Completed Approvals ({decidedRequests.length})
            </CardTitle>
            <CardDescription>
              Approval requests that have been decided
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {decidedRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-start gap-4 p-4 border rounded-lg"
              >
                <div className="flex-shrink-0 mt-1">
                  {getDecisionIcon(request.decision!)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium">{request.title}</h4>
                    {getDecisionBadge(request.decision!)}
                  </div>
                  {request.decision_notes && (
                    <div className="flex items-start gap-2 p-2 bg-muted rounded-md mb-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        {request.decision_notes}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>Decided by: {request.requested_from}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(request.decided_at!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {requests.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">No Approval Requests</h3>
            <p className="text-muted-foreground text-center">
              Approval requests will appear here when documents or workflow steps require approval
            </p>
          </CardContent>
        </Card>
      )}

      {/* Decision Dialog */}
      {selectedRequest && decision && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getDecisionIcon(decision)}
                {decision === 'approved' && 'Approve Request'}
                {decision === 'rejected' && 'Reject Request'}
                {decision === 'needs_changes' && 'Request Changes'}
              </DialogTitle>
              <DialogDescription>
                Provide feedback for your decision
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-medium mb-1">{selectedRequest.title}</h4>
                {selectedRequest.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {decision === 'approved' && 'Approval Notes (optional)'}
                  {decision === 'rejected' && 'Rejection Reason (optional)'}
                  {decision === 'needs_changes' && 'Changes Required'}
                </label>
                <Textarea
                  placeholder={
                    decision === 'approved'
                      ? 'Add any notes...'
                      : decision === 'rejected'
                      ? 'Explain why this is rejected...'
                      : 'Describe what changes are needed...'
                  }
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleMakeDecision}
                disabled={loading}
                variant={
                  decision === 'approved'
                    ? 'default'
                    : decision === 'rejected'
                    ? 'destructive'
                    : 'default'
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    {decision === 'approved' && 'Approve'}
                    {decision === 'rejected' && 'Reject'}
                    {decision === 'needs_changes' && 'Request Changes'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
