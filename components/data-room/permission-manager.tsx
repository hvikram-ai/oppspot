'use client'

/**
 * Permission Manager Component
 * Manage data room access and permissions
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  UserPlus,
  Mail,
  Clock,
  Shield,
  Trash2,
  Copy,
  Check,
  Loader2,
  Users,
  Crown,
  Eye,
  Edit,
  MessageSquare
} from 'lucide-react'
import type { DataRoomAccess, PermissionLevel } from '@/lib/data-room/types'
import { useToast } from '@/hooks/use-toast'

interface PermissionManagerProps {
  dataRoomId: string
  accessList: DataRoomAccess[]
  currentUserPermission: PermissionLevel
  onAccessChanged: () => void
}

export function PermissionManager({
  dataRoomId,
  accessList,
  currentUserPermission,
  onAccessChanged
}: PermissionManagerProps) {
  const { toast } = useToast()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePermission, setInvitePermission] = useState<PermissionLevel>('viewer')
  const [expiryDays, setExpiryDays] = useState('30')
  const [loading, setLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const canManagePermissions = ['owner', 'editor'].includes(currentUserPermission)

  const handleInviteUser = useCallback(async () => {
    if (!inviteEmail || !invitePermission) {
      toast({
        title: 'Missing Information',
        description: 'Please provide email and permission level',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/data-room/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_room_id: dataRoomId,
          email: inviteEmail,
          permission_level: invitePermission,
          expires_in_days: parseInt(expiryDays)
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Invitation Sent',
          description: `${inviteEmail} has been invited with ${invitePermission} access`
        })
        setInviteDialogOpen(false)
        setInviteEmail('')
        setInvitePermission('viewer')
        onAccessChanged()
      } else {
        throw new Error(result.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('Failed to invite user:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send invitation',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [dataRoomId, inviteEmail, invitePermission, expiryDays, toast, onAccessChanged])

  const handleRevokeAccess = useCallback(async (accessId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/data-room/access/${accessId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Access Revoked',
          description: 'User access has been revoked'
        })
        onAccessChanged()
      } else {
        throw new Error(result.error || 'Failed to revoke access')
      }
    } catch (error) {
      console.error('Failed to revoke access:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to revoke access',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast, onAccessChanged])

  const handleCopyInviteLink = useCallback(async (token: string) => {
    const inviteUrl = `${window.location.origin}/data-rooms/invite/${token}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedToken(token)
      toast({
        title: 'Link Copied',
        description: 'Invitation link copied to clipboard'
      })
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast({
        title: 'Error',
        description: 'Failed to copy invitation link',
        variant: 'destructive'
      })
    }
  }, [toast])

  const getPermissionIcon = (permission: PermissionLevel) => {
    switch (permission) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-600" />
      case 'editor': return <Edit className="h-4 w-4 text-blue-600" />
      case 'viewer': return <Eye className="h-4 w-4 text-green-600" />
      case 'commenter': return <MessageSquare className="h-4 w-4 text-purple-600" />
    }
  }

  const getPermissionBadge = (permission: PermissionLevel) => {
    const colors = {
      owner: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      viewer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      commenter: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    }
    return (
      <Badge className={colors[permission]}>
        {getPermissionIcon(permission)}
        <span className="ml-1 capitalize">{permission}</span>
      </Badge>
    )
  }

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffMs = expiry.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Expires today'
    if (diffDays === 1) return 'Expires tomorrow'
    return `Expires in ${diffDays} days`
  }

  // Separate active and pending invitations
  const activeAccess = accessList.filter(a => a.accepted_at && !a.revoked_at)
  const pendingInvites = accessList.filter(a => !a.accepted_at && !a.revoked_at)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Access Management
            </CardTitle>
            <CardDescription>
              Manage who can access this data room
            </CardDescription>
          </div>
          {canManagePermissions && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to share this data room
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="permission">Permission Level</Label>
                    <Select value={invitePermission} onValueChange={(value) => setInvitePermission(value as PermissionLevel)}>
                      <SelectTrigger id="permission">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            <div>
                              <div className="font-medium">Viewer</div>
                              <div className="text-xs text-muted-foreground">Can view documents</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="commenter">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            <div>
                              <div className="font-medium">Commenter</div>
                              <div className="text-xs text-muted-foreground">Can view and comment</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="editor">
                          <div className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            <div>
                              <div className="font-medium">Editor</div>
                              <div className="text-xs text-muted-foreground">Can upload and edit</div>
                            </div>
                          </div>
                        </SelectItem>
                        {currentUserPermission === 'owner' && (
                          <SelectItem value="owner">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4" />
                              <div>
                                <div className="font-medium">Owner</div>
                                <div className="text-xs text-muted-foreground">Full control</div>
                              </div>
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Link Expiration</Label>
                    <Select value={expiryDays} onValueChange={setExpiryDays}>
                      <SelectTrigger id="expiry">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInviteUser} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Active Members */}
        {activeAccess.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Active Members ({activeAccess.length})</h3>
            <div className="space-y-2">
              {activeAccess.map((access) => (
                <div key={access.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{access.invite_email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(access.accepted_at!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPermissionBadge(access.permission_level)}
                    {canManagePermissions && access.permission_level !== 'owner' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={loading}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke Access</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to revoke access for {access.invite_email}? They will no longer be able to access this data room.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevokeAccess(access.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Revoke Access
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {pendingInvites.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Pending Invitations ({pendingInvites.length})</h3>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{invite.invite_email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeRemaining(invite.expires_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPermissionBadge(invite.permission_level)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyInviteLink(invite.invite_token)}
                    >
                      {copiedToken === invite.invite_token ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    {canManagePermissions && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={loading}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel this invitation? The invite link will no longer work.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevokeAccess(invite.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Cancel Invitation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeAccess.length === 0 && pendingInvites.length === 0 && (
          <div className="text-center py-8">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">No Team Members Yet</h3>
            <p className="text-muted-foreground mb-4">
              Invite team members to collaborate on this data room
            </p>
            {canManagePermissions && (
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite First Member
              </Button>
            )}
          </div>
        )}

        {/* Permission Legend */}
        <div className="pt-4 border-t">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">PERMISSION LEVELS</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <Eye className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Viewer</p>
                <p className="text-muted-foreground">View documents only</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Commenter</p>
                <p className="text-muted-foreground">View and add comments</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Edit className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Editor</p>
                <p className="text-muted-foreground">Upload and manage files</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Crown className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Owner</p>
                <p className="text-muted-foreground">Full control and deletion</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
