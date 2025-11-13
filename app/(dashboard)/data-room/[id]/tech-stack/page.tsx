'use client'

/**
 * Tech Stack Analysis Page
 * List and manage tech stack analyses for a data room
 */

import React, { useState } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Loader2 } from 'lucide-react'
import { AnalysisList } from '@/components/data-room/tech-stack/analysis-list'
import {
  useTechStackAnalyses,
  useCreateTechStackAnalysis,
  useTriggerTechStackAnalysis,
  useDeleteTechStackAnalysis,
} from '@/lib/hooks/use-tech-stack'
import { useToast } from '@/hooks/use-toast'

export default function TechStackPage({ params }: { params: { id: string } }) {
  const dataRoomId = params.id
  const router = useRouter()
  const { toast } = useToast()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  })

  // Fetch analyses
  const { analyses, isLoading, error, mutate } = useTechStackAnalyses(dataRoomId)

  // Mutations
  const { createAnalysis, isCreating } = useCreateTechStackAnalysis()
  const { triggerAnalysis, isAnalyzing } = useTriggerTechStackAnalysis()
  const { deleteAnalysis, isDeleting } = useDeleteTechStackAnalysis()

  const handleCreateAnalysis = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a title for the analysis',
        variant: 'destructive',
      })
      return
    }

    try {
      const newAnalysis = await createAnalysis({
        data_room_id: dataRoomId,
        title: formData.title,
        description: formData.description || undefined,
      })

      toast({
        title: 'Success',
        description: 'Tech stack analysis created successfully',
      })

      // Reset form and close dialog
      setFormData({ title: '', description: '' })
      setCreateDialogOpen(false)

      // Refresh list
      mutate()

      // Navigate to the new analysis
      router.push(`/data-room/${dataRoomId}/tech-stack/${newAnalysis.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create analysis',
        variant: 'destructive',
      })
    }
  }

  const handleAnalyze = async (analysisId: string) => {
    if (
      !confirm(
        'This will analyze all documents in the data room and may take several minutes. Continue?'
      )
    ) {
      return
    }

    try {
      await triggerAnalysis(analysisId)

      toast({
        title: 'Analysis Complete',
        description: 'Tech stack analysis completed successfully',
      })

      // Refresh list
      mutate()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to trigger analysis',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (analysisId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this tech stack analysis? This action cannot be undone.'
      )
    ) {
      return
    }

    try {
      await deleteAnalysis(analysisId)

      toast({
        title: 'Success',
        description: 'Tech stack analysis deleted successfully',
      })

      // Refresh list
      mutate()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete analysis',
        variant: 'destructive',
      })
    }
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="text-center text-red-600">
          <p>Error loading analyses: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tech Stack Analysis</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            AI-powered technology due diligence
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Analysis
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Analysis List */}
      {!isLoading && (
        <AnalysisList
          dataRoomId={dataRoomId}
          analyses={analyses}
          onAnalyze={handleAnalyze}
          onDelete={handleDelete}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateAnalysis}>
            <DialogHeader>
              <DialogTitle>Create Tech Stack Analysis</DialogTitle>
              <DialogDescription>
                Create a new tech stack analysis to evaluate technologies used in this data room.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Tech Stack Analysis - Q4 2024"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this analysis..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Analysis
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
