'use client'

import { Stream, StreamItem, WorkflowStage } from '@/types/streams'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreVertical, Building2, FileText, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface StreamBoardProps {
  stream: Stream
  items: StreamItem[]
  onUpdateItem: (itemId: string, updates: any) => void
  onDeleteItem: (itemId: string) => void
}

export function StreamBoard({ stream, items, onUpdateItem, onDeleteItem }: StreamBoardProps) {
  const stages = stream.stages || []

  const getItemsByStage = (stageId: string) => {
    return items
      .filter(item => item.stage_id === stageId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'company': return Building2
      case 'note': return FileText
      case 'link': return LinkIcon
      default: return FileText
    }
  }

  const handleStageMove = (itemId: string, newStageId: string) => {
    onUpdateItem(itemId, { stage_id: newStageId })
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage: WorkflowStage) => {
        const stageItems = getItemsByStage(stage.id)

        return (
          <div key={stage.id} className="flex-shrink-0 w-80">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {stageItems.length}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {stageItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No items
                  </div>
                ) : (
                  stageItems.map((item) => {
                    const Icon = getItemIcon(item.item_type)

                    return (
                      <Card key={item.id} className="group hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{item.title}</h4>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                    {item.description}
                                  </p>
                                )}
                                {item.tags && item.tags.length > 0 && (
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {item.tags.slice(0, 3).map((tag, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                {stages.map((s: WorkflowStage) =>
                                  s.id !== stage.id ? (
                                    <DropdownMenuItem
                                      key={s.id}
                                      onClick={() => handleStageMove(item.id, s.id)}
                                    >
                                      Move to {s.name}
                                    </DropdownMenuItem>
                                  ) : null
                                )}
                                <DropdownMenuItem
                                  onClick={() => onDeleteItem(item.id)}
                                  className="text-destructive"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {item.status && (
                            <div className="mt-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  item.status === 'completed' && 'bg-green-500/10 text-green-700',
                                  item.status === 'in_progress' && 'bg-blue-500/10 text-blue-700',
                                  item.status === 'blocked' && 'bg-red-500/10 text-red-700'
                                )}
                              >
                                {item.status}
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
