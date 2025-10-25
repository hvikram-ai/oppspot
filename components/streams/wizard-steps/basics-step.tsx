'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StreamWizardData } from '@/types/stream-wizard'
import { StreamType } from '@/types/streams'
import { Sparkles } from 'lucide-react'

const EMOJI_OPTIONS = ['📁', '🎯', '💼', '🚀', '📊', '💡', '🔍', '⭐', '🏆', '📈', '🎨', '🔥', '💰', '🏢', '🎁', '🌟']

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

const STREAM_TYPES: { label: string; value: StreamType; description: string }[] = [
  { label: 'Project', value: 'project', description: 'General project workspace' },
  { label: 'Deal', value: 'deal', description: 'M&A deal pipeline' },
  { label: 'Campaign', value: 'campaign', description: 'Outreach campaign' },
  { label: 'Research', value: 'research', description: 'Market research' },
  { label: 'Territory', value: 'territory', description: 'Territory management' },
]

interface BasicsStepProps {
  data: StreamWizardData
  onUpdate: (updates: Partial<StreamWizardData>) => void
}

export function BasicsStep({ data, onUpdate }: BasicsStepProps) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h3 className="text-lg font-semibold mb-1">Stream Basics</h3>
        <p className="text-sm text-muted-foreground">
          Let&apos;s start by giving your stream a name and choosing its appearance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Essential Information</CardTitle>
          <CardDescription>These details help identify and organize your stream</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Stream Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={data.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="e.g., UK SaaS Targets Q1 2025"
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Give your stream a descriptive name that clearly indicates its purpose
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={data.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="What is this stream about?"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">
              Stream Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={data.stream_type}
              onValueChange={(value: StreamType) => onUpdate({ stream_type: value })}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STREAM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visual Appearance</CardTitle>
          <CardDescription>Customize how your stream looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Emoji Selector */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-8 gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onUpdate({ emoji })}
                    className={`h-10 w-10 rounded-lg border-2 flex items-center justify-center text-xl hover:border-primary transition-colors ${
                      data.emoji === emoji ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selector */}
            <div className="space-y-2">
              <Label>Color Theme</Label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => onUpdate({ color: color.value })}
                    className={`h-10 w-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                      data.color === color.value ? 'border-primary scale-110' : 'border-border'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  >
                    {data.color === color.value && (
                      <Sparkles className="h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 rounded-lg border bg-muted/50">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${data.color}20` }}
              >
                {data.emoji}
              </div>
              <div>
                <p className="font-semibold">{data.name || 'Stream Name'}</p>
                <p className="text-sm text-muted-foreground">
                  {STREAM_TYPES.find(t => t.value === data.stream_type)?.label}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
