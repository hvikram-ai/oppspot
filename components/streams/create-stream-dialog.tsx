'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { CreateStreamRequest, StreamType } from '@/types/streams'

interface CreateStreamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateStreamRequest) => Promise<void>
  orgId: string
}

const EMOJI_OPTIONS = ['📁', '🎯', '💼', '🚀', '📊', '💡', '🔍', '⭐', '🏆', '📈', '🎨', '🔥']
const COLOR_OPTIONS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Green', value: '#10b981' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Teal', value: '#14b8a6' },
]

const TYPE_OPTIONS: { label: string; value: StreamType; description: string }[] = [
  { label: 'Project', value: 'project', description: 'General project workspace' },
  { label: 'Deal', value: 'deal', description: 'M&A deal pipeline' },
  { label: 'Campaign', value: 'campaign', description: 'Marketing or outreach campaign' },
  { label: 'Research', value: 'research', description: 'Market or company research' },
  { label: 'Territory', value: 'territory', description: 'Geographic territory management' },
]

export function CreateStreamDialog({ open, onOpenChange, onSubmit, orgId }: CreateStreamDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateStreamRequest>({
    name: '',
    description: '',
    emoji: '📁',
    color: '#6366f1',
    stream_type: 'project',
  } as any)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      // Reset form
      setFormData({
        name: '',
        description: '',
        emoji: '📁',
        color: '#6366f1',
        stream_type: 'project',
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create stream:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Stream</DialogTitle>
            <DialogDescription>
              Create a workspace to organize your companies, research, and collaboration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Stream Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., UK SaaS Opportunities Q1 2025"
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
                placeholder="What is this stream about?"
                rows={3}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.stream_type}
                onValueChange={(value: StreamType) => setFormData({ ...formData, stream_type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col items-start">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Emoji & Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-6 gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, emoji })}
                      className={`h-10 w-10 rounded-lg border-2 flex items-center justify-center text-xl hover:border-primary transition-colors ${
                        formData.emoji === emoji ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`h-10 w-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                        formData.color === color.value ? 'border-primary scale-110' : 'border-border'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-lg border bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${formData.color}20` }}
                >
                  {formData.emoji}
                </div>
                <div>
                  <p className="font-semibold">{formData.name || 'Stream Name'}</p>
                  <p className="text-sm text-muted-foreground">
                    {TYPE_OPTIONS.find(t => t.value === formData.stream_type)?.label}
                  </p>
                </div>
              </div>
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
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Stream
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
