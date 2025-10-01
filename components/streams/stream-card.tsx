'use client'

import { Stream } from '@/types/streams'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreVertical, Users, FolderOpen, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface StreamCardProps {
  stream: Stream & {
    member_count?: number
    item_count?: number
    user_role?: string
    is_favorite?: boolean
  }
  onEdit?: (stream: Stream) => void
  onDelete?: (stream: Stream) => void
  onToggleFavorite?: (streamId: string) => void
}

export function StreamCard({ stream, onEdit, onDelete, onToggleFavorite }: StreamCardProps) {
  const statusColors = {
    active: 'bg-green-500/10 text-green-700 border-green-200',
    archived: 'bg-gray-500/10 text-gray-700 border-gray-200',
    completed: 'bg-blue-500/10 text-blue-700 border-blue-200'
  }

  const typeLabels = {
    project: 'Project',
    deal: 'Deal',
    campaign: 'Campaign',
    research: 'Research',
    territory: 'Territory'
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Link
            href={`/streams/${stream.id}`}
            className="flex items-start gap-3 flex-1 min-w-0"
          >
            {/* Emoji Icon */}
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: `${stream.color}20` }}
            >
              {stream.emoji}
            </div>

            {/* Stream Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                  {stream.name}
                </h3>
                {stream.is_favorite && (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                )}
              </div>
              {stream.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {stream.description}
                </p>
              )}
            </div>
          </Link>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onToggleFavorite?.(stream.id)}>
                <Star className="h-4 w-4 mr-2" />
                {stream.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(stream)}>
                Edit stream
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(stream)}
                className="text-destructive"
              >
                Delete stream
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn(statusColors[stream.status])}>
            {stream.status}
          </Badge>
          <Badge variant="secondary">
            {typeLabels[stream.stream_type]}
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{stream.member_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4" />
            <span>{stream.item_count || 0} items</span>
          </div>
        </div>
        <div className="text-xs">
          {formatDistanceToNow(new Date(stream.created_at), { addSuffix: true })}
        </div>
      </CardFooter>
    </Card>
  )
}
