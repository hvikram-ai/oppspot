'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Search, BookmarkPlus, Trash2, Star } from 'lucide-react'
import type { AdvancedFilters } from '@/types/filters'
import { advancedFilterService } from '@/lib/search/advanced-filter-service'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// Import filter sections
import { KeywordsFilterSection } from './filters/keywords-filter'
import { SimilarTargetsFilterSection } from './filters/similar-targets-filter'
import { FirmographicsFilterSection } from './filters/firmographics-filter'
import { SizeFilterSection } from './filters/size-filter'
import { GrowthFilterSection } from './filters/growth-filter'
import { MarketPresenceFilterSection } from './filters/market-presence-filter'
import { FundingFilterSection } from './filters/funding-filter'
import { WorkflowFilterSection } from './filters/workflow-filter'
import { CRMFilterSection } from './filters/crm-filter'
import { OptionsFilterSection } from './filters/options-filter'

interface SavedSearch {
  id: string
  name: string
  description: string | null
  filters: AdvancedFilters
  is_favorite: boolean
  execution_count: number
  last_executed_at: string | null
  result_count: number | null
  created_at: string
  updated_at: string
}

interface AdvancedSearchFiltersProps {
  filters: AdvancedFilters
  onChange: (filters: AdvancedFilters) => void
  onApply?: () => void
  resultCount?: number
  isLoading?: boolean
  savedSearches?: SavedSearch[]
  onSaveSearch?: (name: string, filters: AdvancedFilters, description?: string) => void
  onDeleteSearch?: (searchId: string) => void
}

export function AdvancedSearchFilters({
  filters,
  onChange,
  onApply,
  resultCount = 0,
  isLoading = false,
  savedSearches = [],
  onSaveSearch,
  onDeleteSearch,
}: AdvancedSearchFiltersProps) {
  const [filterSearchQuery, setFilterSearchQuery] = useState('')
  const [selectedSavedSearch, setSelectedSavedSearch] = useState<string>('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')

  // Count active filters
  const activeFilterCount = useMemo(
    () => advancedFilterService.countActiveFilters(filters),
    [filters]
  )

  // Clear all filters
  const handleClearAll = () => {
    onChange({})
    setSelectedSavedSearch('')
  }

  // Load saved search
  const handleLoadSavedSearch = (searchId: string) => {
    const search = savedSearches.find(s => s.id === searchId)
    if (search) {
      onChange(search.filters)
      setSelectedSavedSearch(searchId)
    }
  }

  const handleSaveClick = () => {
    setShowSaveDialog(true)
    setSaveName('')
    setSaveDescription('')
  }

  const handleSaveConfirm = () => {
    if (saveName.trim() && onSaveSearch) {
      onSaveSearch(saveName.trim(), filters, saveDescription.trim() || undefined)
      setShowSaveDialog(false)
    }
  }

  const handleDeleteClick = (searchId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (onDeleteSearch && confirm('Are you sure you want to delete this saved search?')) {
      onDeleteSearch(searchId)
      if (selectedSavedSearch === searchId) {
        setSelectedSavedSearch('')
      }
    }
  }

  // Filter sections based on search query
  const sections = useMemo(() => {
    const allSections = [
      { key: 'keywords', title: 'Keywords', component: KeywordsFilterSection },
      { key: 'similarTargets', title: 'Similar Targets', component: SimilarTargetsFilterSection },
      { key: 'firmographics', title: 'Firmographics', component: FirmographicsFilterSection },
      { key: 'size', title: 'Size', component: SizeFilterSection },
      { key: 'growth', title: 'Growth', component: GrowthFilterSection },
      { key: 'marketPresence', title: 'Market Presence', component: MarketPresenceFilterSection },
      { key: 'funding', title: 'Funding', component: FundingFilterSection },
      { key: 'workflow', title: 'My Workflow', component: WorkflowFilterSection },
      { key: 'crm', title: 'CRM', component: CRMFilterSection },
      { key: 'options', title: 'Options', component: OptionsFilterSection },
    ]

    if (!filterSearchQuery) return allSections

    return allSections.filter(section =>
      section.title.toLowerCase().includes(filterSearchQuery.toLowerCase())
    )
  }, [filterSearchQuery])

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="space-y-4 border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Search and filter</h2>
            {activeFilterCount > 0 && (
              <Badge variant="default" className="rounded-full">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={activeFilterCount === 0}
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        </div>

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <div className="space-y-2">
            <Select value={selectedSavedSearch} onValueChange={handleLoadSavedSearch}>
              <SelectTrigger>
                <SelectValue placeholder="Saved searches" />
              </SelectTrigger>
              <SelectContent>
                {savedSearches.map(search => (
                  <SelectItem key={search.id} value={search.id}>
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-2">
                        {search.is_favorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                        <span>{search.name}</span>
                      </div>
                      {onDeleteSearch && (
                        <button
                          onClick={(e) => handleDeleteClick(search.id, e)}
                          className="hover:text-destructive ml-2"
                          title="Delete search"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSavedSearch && savedSearches.find(s => s.id === selectedSavedSearch) && (
              <p className="text-xs text-muted-foreground">
                {savedSearches.find(s => s.id === selectedSavedSearch)?.description ||
                  `Executed ${savedSearches.find(s => s.id === selectedSavedSearch)?.execution_count || 0} times`}
              </p>
            )}
          </div>
        )}

        {/* Filter Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for filters"
            value={filterSearchQuery}
            onChange={e => setFilterSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      {/* Filter Sections */}
      <ScrollArea className="flex-1">
        <CardContent className="space-y-4 pt-4">
          {sections.map(section => {
            const FilterComponent = section.component
            return (
              <FilterComponent
                key={section.key}
                filters={filters}
                onChange={onChange}
              />
            )
          })}
        </CardContent>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4 space-y-3">
        {/* Result Count */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              'Searching...'
            ) : (
              <>
                <span className="font-semibold text-foreground">
                  {resultCount.toLocaleString()}
                </span>{' '}
                businesses match your criteria
              </>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onSaveSearch && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveClick}
              disabled={activeFilterCount === 0}
            >
              <BookmarkPlus className="h-4 w-4 mr-1" />
              Save
            </Button>
          )}
          {onApply && (
            <Button
              size="sm"
              className="flex-1"
              onClick={onApply}
              disabled={isLoading}
            >
              Apply Filters
            </Button>
          )}
        </div>
      </div>

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save your current filter configuration for quick access later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Name *</Label>
              <Input
                id="search-name"
                placeholder="e.g., Tech companies in London"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-description">Description (optional)</Label>
              <Textarea
                id="search-description"
                placeholder="Add notes about this search..."
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} will be saved
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfirm} disabled={!saveName.trim()}>
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
