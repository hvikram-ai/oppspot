'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Target, Plus, Search, Filter, Star, Power, AlertCircle, Loader2 } from 'lucide-react'
import { ITPCard } from '@/components/itp/itp-card'
import { ITPBuilder } from '@/components/itp/itp-builder'
import type {
  IdealTargetProfile,
  ITPWithStats,
  CreateITPRequest,
  UpdateITPRequest,
  RunMatchingResponse,
} from '@/types/itp'
import { useToast } from '@/hooks/use-toast'

export default function ITPManagementPage() {
  const { toast } = useToast()

  // Data state
  const [itps, setItps] = useState<ITPWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingITP, setEditingITP] = useState<IdealTargetProfile | undefined>(undefined)
  const [deleteITPId, setDeleteITPId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'favorites'>('all')
  const [sortBy, setSortBy] = useState<'updated' | 'matches' | 'score'>('updated')

  // Load ITPs
  useEffect(() => {
    loadITPs()
  }, [filterTab])

  const loadITPs = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filterTab === 'active') params.set('is_active', 'true')
      if (filterTab === 'favorites') params.set('is_favorite', 'true')

      const response = await fetch(`/api/itp?${params}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load ITPs')
      }

      const data = await response.json()
      setItps(data.itps || [])
    } catch (err) {
      console.error('Error loading ITPs:', err)
      setError(err instanceof Error ? err.message : 'Failed to load ITPs')
    } finally {
      setIsLoading(false)
    }
  }

  // Create ITP
  const handleCreateITP = async (data: CreateITPRequest) => {
    const response = await fetch('/api/itp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create ITP')
    }

    toast({
      title: 'ITP Created',
      description: `${data.name} has been created successfully.`,
    })

    await loadITPs()
  }

  // Update ITP
  const handleUpdateITP = async (data: UpdateITPRequest) => {
    if (!editingITP) return

    const response = await fetch(`/api/itp/${editingITP.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update ITP')
    }

    toast({
      title: 'ITP Updated',
      description: `${data.name || editingITP.name} has been updated successfully.`,
    })

    await loadITPs()
  }

  // Delete ITP
  const handleDeleteITP = async () => {
    if (!deleteITPId) return

    try {
      const response = await fetch(`/api/itp/${deleteITPId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete ITP')
      }

      toast({
        title: 'ITP Deleted',
        description: 'The ITP has been deleted successfully.',
      })

      await loadITPs()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete ITP',
        variant: 'destructive',
      })
    } finally {
      setDeleteITPId(null)
    }
  }

  // Run matching
  const handleRunMatching = async (itpId: string) => {
    try {
      const response = await fetch(`/api/itp/${itpId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to run matching')
      }

      const result: RunMatchingResponse = await response.json()

      toast({
        title: 'Matching Complete',
        description: `Found ${result.new_matches} new matches in ${(result.execution_time_ms / 1000).toFixed(1)}s`,
      })

      await loadITPs()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to run matching',
        variant: 'destructive',
      })
    }
  }

  // Toggle favorite
  const handleToggleFavorite = async (itpId: string, isFavorite: boolean) => {
    try {
      const response = await fetch(`/api/itp/${itpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: isFavorite }),
      })

      if (!response.ok) throw new Error('Failed to update favorite status')

      await loadITPs()
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update favorite status',
        variant: 'destructive',
      })
    }
  }

  // Toggle active
  const handleToggleActive = async (itpId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/itp/${itpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })

      if (!response.ok) throw new Error('Failed to update active status')

      toast({
        title: isActive ? 'ITP Activated' : 'ITP Deactivated',
        description: `The ITP has been ${isActive ? 'activated' : 'deactivated'}.`,
      })

      await loadITPs()
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update active status',
        variant: 'destructive',
      })
    }
  }

  // Duplicate ITP
  const handleDuplicateITP = async (itp: IdealTargetProfile) => {
    const duplicateData: CreateITPRequest = {
      name: `${itp.name} (Copy)`,
      description: itp.description,
      criteria: itp.criteria,
      scoring_weights: itp.scoring_weights,
      min_match_score: itp.min_match_score,
      auto_tag: itp.auto_tag,
      auto_add_to_list_id: itp.auto_add_to_list_id,
    }

    try {
      await handleCreateITP(duplicateData)
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate ITP',
        variant: 'destructive',
      })
    }
  }

  // Filter and sort ITPs
  const filteredAndSortedITPs = useMemo(() => {
    let filtered = itps

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (itp) =>
          itp.name.toLowerCase().includes(query) ||
          itp.description?.toLowerCase().includes(query) ||
          itp.auto_tag?.toLowerCase().includes(query)
      )
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'matches':
          return (b.stats?.total_matches || 0) - (a.stats?.total_matches || 0)
        case 'score':
          return (b.stats?.avg_match_score || 0) - (a.stats?.avg_match_score || 0)
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
    })

    return sorted
  }, [itps, searchQuery, sortBy])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Ideal Target Profiles
          </h1>
          <p className="text-muted-foreground mt-1">
            Define and manage your ideal target criteria with AI-powered matching
          </p>
        </div>
        <Button onClick={() => setShowBuilder(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Create ITP
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ITPs by name, description, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={sortBy} onValueChange={(value: string) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Recently Updated</SelectItem>
                <SelectItem value="matches">Most Matches</SelectItem>
                <SelectItem value="score">Highest Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={filterTab} onValueChange={(value: string) => setFilterTab(value)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="all">All ITPs</TabsTrigger>
          <TabsTrigger value="active">
            <Power className="h-4 w-4 mr-2" />
            Active
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="h-4 w-4 mr-2" />
            Favorites
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAndSortedITPs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery
                    ? 'No ITPs found'
                    : filterTab === 'all'
                    ? 'No ITPs yet'
                    : filterTab === 'active'
                    ? 'No active ITPs'
                    : 'No favorite ITPs'}
                </h3>
                <p className="text-muted-foreground text-center max-w-sm mb-4">
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : 'Create your first Ideal Target Profile to start identifying and scoring potential targets'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowBuilder(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First ITP
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedITPs.map((itp) => (
                <ITPCard
                  key={itp.id}
                  itp={itp}
                  onRun={handleRunMatching}
                  onEdit={(itp) => {
                    setEditingITP(itp)
                    setShowBuilder(true)
                  }}
                  onDelete={setDeleteITPId}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleActive={handleToggleActive}
                  onDuplicate={handleDuplicateITP}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ITP Builder Dialog */}
      <ITPBuilder
        itp={editingITP}
        isOpen={showBuilder}
        onClose={() => {
          setShowBuilder(false)
          setEditingITP(undefined)
        }}
        onSave={editingITP ? handleUpdateITP : handleCreateITP}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteITPId} onOpenChange={() => setDeleteITPId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ITP?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this Ideal Target Profile and all associated matches.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteITP}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
