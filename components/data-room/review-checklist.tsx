'use client'

/**
 * Review Checklist Component
 * Due diligence checklist for document review
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  FileText,
  User,
  Plus,
  Download,
  Loader2,
  X,
  Ban
} from 'lucide-react'
import type { ChecklistWithItems, ChecklistItem, ChecklistItemStatus, DealType } from '@/lib/data-room/types'
import { useToast } from '@/hooks/use-toast'

interface ReviewChecklistProps {
  checklist: ChecklistWithItems
  onUpdate: () => void
  canEdit: boolean
}

export function ReviewChecklist({ checklist, onUpdate, canEdit }: ReviewChecklistProps) {
  const { toast } = useToast()
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Calculate progress
  const totalItems = checklist.total_items
  const completedItems = checklist.completed_items
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  const handleUpdateItem = useCallback(async (
    itemId: string,
    updates: Partial<ChecklistItem>
  ) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/data-room/checklists/${checklist.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Updated',
          description: 'Checklist item updated successfully'
        })
        onUpdate()
        setDialogOpen(false)
      } else {
        throw new Error(result.error || 'Failed to update item')
      }
    } catch (error) {
      console.error('Failed to update checklist item:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update item',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [checklist.id, toast, onUpdate])

  const getStatusIcon = (status: ChecklistItemStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'blocked':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'not_applicable':
        return <Ban className="h-5 w-5 text-gray-400" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: ChecklistItemStatus) => {
    const styles = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      not_applicable: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      not_started: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    }

    return (
      <Badge className={styles[status]}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const handleExportChecklist = async () => {
    try {
      const response = await fetch(`/api/data-room/checklists/${checklist.id}/export`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `checklist-${checklist.name}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Exported',
        description: 'Checklist exported successfully'
      })
    } catch (error) {
      console.error('Failed to export checklist:', error)
      toast({
        title: 'Error',
        description: 'Failed to export checklist',
        variant: 'destructive'
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle>{checklist.name}</CardTitle>
              <Badge variant="outline" className="capitalize">
                {checklist.checklist_type.replace('_', ' ')}
              </Badge>
            </div>
            {checklist.description && (
              <CardDescription>{checklist.description}</CardDescription>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleExportChecklist}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedItems} of {totalItems} completed ({Math.round(progressPercentage)}%)
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>

      <CardContent>
        {checklist.categories.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">No items in checklist</h3>
            <p className="text-muted-foreground">
              Add items to start tracking your due diligence progress
            </p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={checklist.categories.map((_, idx) => `category-${idx}`)} className="w-full">
            {checklist.categories.map((category, idx) => (
              <AccordionItem key={idx} value={`category-${idx}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{category.name}</span>
                      <Badge variant="secondary">
                        {category.completed}/{category.total}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={(category.completed / category.total) * 100} className="w-24 h-2" />
                      <span className="text-sm text-muted-foreground">
                        {Math.round((category.completed / category.total) * 100)}%
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (canEdit) {
                            setSelectedItem(item)
                            setDialogOpen(true)
                          }
                        }}
                      >
                        {/* Status Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getStatusIcon(item.status)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-medium">{item.item_name}</p>
                            {getStatusBadge(item.status)}
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {item.document_id && (
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span>Document linked</span>
                              </div>
                            )}
                            {item.assigned_to && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>Assigned</span>
                              </div>
                            )}
                            {item.completed_at && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>
                                  {new Date(item.completed_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>

      {/* Edit Dialog */}
      {selectedItem && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Update Checklist Item</DialogTitle>
              <DialogDescription>
                Update the status and details for this checklist item
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Item Name */}
              <div>
                <h4 className="font-medium mb-1">{selectedItem.item_name}</h4>
                {selectedItem.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.description}
                  </p>
                )}
              </div>

              {/* Status Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={selectedItem.status}
                  onValueChange={(value) =>
                    setSelectedItem({ ...selectedItem, status: value as ChecklistItemStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Add notes about this item..."
                  value={selectedItem.notes || ''}
                  onChange={(e) =>
                    setSelectedItem({ ...selectedItem, notes: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleUpdateItem(selectedItem.id, selectedItem)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}
