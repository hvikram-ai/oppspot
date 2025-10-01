'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { Stream, CreateStreamItemRequest, StreamItemType } from '@/types/streams'

interface AddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateStreamItemRequest) => Promise<void>
  stream: Stream
}

const ITEM_TYPES: { label: string; value: StreamItemType }[] = [
  { label: 'Company', value: 'company' },
  { label: 'Note', value: 'note' },
  { label: 'Task', value: 'task' },
  { label: 'Link', value: 'link' },
  { label: 'File', value: 'file' },
  { label: 'Opportunity', value: 'opportunity' },
  { label: 'Stakeholder', value: 'stakeholder' },
]

export function AddItemDialog({ open, onOpenChange, onSubmit, stream }: AddItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateStreamItemRequest>({
    item_type: 'company',
    title: '',
    description: '',
    stage_id: stream.stages?.[0]?.id || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      // Reset form
      setFormData({
        item_type: 'company',
        title: '',
        description: '',
        stage_id: stream.stages?.[0]?.id || '',
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to add item:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Item to Stream</DialogTitle>
            <DialogDescription>
              Add a company, note, task, or other item to track in this stream.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Item Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Item Type *</Label>
              <Select
                value={formData.item_type}
                onValueChange={(value: StreamItemType) =>
                  setFormData({ ...formData, item_type: value })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Acme Corp - SaaS acquisition target"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional notes or context..."
                rows={3}
              />
            </div>

            {/* Stage */}
            {stream.stages && stream.stages.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="stage">Stage *</Label>
                <Select
                  value={formData.stage_id}
                  onValueChange={(value) => setFormData({ ...formData, stage_id: value })}
                >
                  <SelectTrigger id="stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stream.stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., high-priority, uk, saas"
                onChange={(e) => {
                  const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  setFormData({ ...formData, tags: tags.length > 0 ? tags : undefined })
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.title.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
