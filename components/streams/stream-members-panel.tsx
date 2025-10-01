'use client'

import { StreamMember } from '@/types/streams'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface StreamMembersPanelProps {
  streamId: string
  members: StreamMember[]
  setMembers: (members: StreamMember[]) => void
}

export function StreamMembersPanel({ streamId, members, setMembers }: StreamMembersPanelProps) {
  const roleColors = {
    owner: 'bg-purple-500/10 text-purple-700 border-purple-200',
    editor: 'bg-blue-500/10 text-blue-700 border-blue-200',
    viewer: 'bg-gray-500/10 text-gray-700 border-gray-200',
    guest: 'bg-orange-500/10 text-orange-700 border-orange-200',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Team Members</h3>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={member.user?.avatar_url} />
                <AvatarFallback>
                  {member.user?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{member.user?.full_name || 'Unknown User'}</p>
                <p className="text-sm text-muted-foreground">
                  {member.user?.email || 'No email'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className={roleColors[member.role]}>
                {member.role}
              </Badge>
              {member.last_accessed_at && (
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(member.last_accessed_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
