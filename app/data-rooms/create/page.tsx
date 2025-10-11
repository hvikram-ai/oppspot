'use client'

/**
 * Create Data Room Page
 * Form to create a new data room
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, FolderPlus } from 'lucide-react'
import type { DealType, CreateDataRoomRequest } from '@/lib/data-room/types'
import { ProtectedLayout } from '@/components/layout/protected-layout'

export default function CreateDataRoomPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateDataRoomRequest>({
    name: '',
    description: '',
    deal_type: 'due_diligence'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Please enter a name for the data room')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/data-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create data room')
      }

      if (result.success) {
        // Redirect to the new data room
        router.push(`/data-rooms/${result.data.id}`)
      }
    } catch (error) {
      console.error('Create data room error:', error)
      alert(error instanceof Error ? error.message : 'Failed to create data room')
    } finally {
      setLoading(false)
    }
  }

  const dealTypes: { value: DealType; label: string; description: string; icon: string }[] = [
    {
      value: 'acquisition',
      label: 'Acquisition',
      description: 'Buying a company',
      icon: '🏢'
    },
    {
      value: 'investment',
      label: 'Investment',
      description: 'PE/VC investment round',
      icon: '💰'
    },
    {
      value: 'partnership',
      label: 'Partnership',
      description: 'Strategic partnership',
      icon: '🤝'
    },
    {
      value: 'merger',
      label: 'Merger',
      description: 'Merger of equals',
      icon: '🔀'
    },
    {
      value: 'sale',
      label: 'Sale',
      description: 'Selling company',
      icon: '💼'
    },
    {
      value: 'due_diligence',
      label: 'Due Diligence',
      description: 'General DD review',
      icon: '📁'
    },
    {
      value: 'other',
      label: 'Other',
      description: 'Custom deal type',
      icon: '📋'
    }
  ]

  return (


    <ProtectedLayout>
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Back Button */}
      <Link href="/data-rooms">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Data Rooms
        </Button>
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FolderPlus className="h-8 w-8 text-blue-600" />
          Create Data Room
        </h1>
        <p className="text-muted-foreground mt-2">
          Create a secure workspace for organizing and analyzing deal documents with AI
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Data Room Details</CardTitle>
            <CardDescription>
              Basic information about your data room
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Acme Corp Acquisition, Series B Due Diligence"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Give your data room a descriptive name
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of the deal, target company, or purpose..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Add context about this deal or project (optional)
              </p>
            </div>

            {/* Deal Type */}
            <div className="space-y-2">
              <Label htmlFor="deal-type">Deal Type</Label>
              <Select
                value={formData.deal_type}
                onValueChange={(value) => setFormData({ ...formData, deal_type: value as DealType })}
                disabled={loading}
              >
                <SelectTrigger id="deal-type">
                  <SelectValue placeholder="Select deal type" />
                </SelectTrigger>
                <SelectContent>
                  {dealTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select the type of deal or transaction
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">What you&rsquo;ll get:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✅ Secure document storage with encryption</li>
                <li>✅ AI-powered document classification</li>
                <li>✅ Financial analysis and contract intelligence</li>
                <li>✅ Team collaboration with permission controls</li>
                <li>✅ Complete audit trail for compliance</li>
                <li>✅ Export-ready due diligence reports</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-6">
          <Link href="/data-rooms">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !formData.name.trim()}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Data Room
          </Button>
        </div>
      </form>

      {/* Info Card */}
      <Card className="mt-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="text-2xl">💡</div>
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Pro Tip</h4>
              <p className="text-sm text-muted-foreground">
                After creating your data room, you can upload documents, invite team members,
                and get AI-powered insights on your due diligence materials. All documents
                are encrypted and access is logged for compliance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </ProtectedLayout>

  )
}
