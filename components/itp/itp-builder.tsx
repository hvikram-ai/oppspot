'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, Save, X, Target, Wand2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { AdvancedFilters } from '@/types/filters'
import type {
  CreateITPRequest,
  UpdateITPRequest,
  IdealTargetProfile,
  ScoringWeights,
} from '@/types/itp'
import {
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_MIN_MATCH_SCORE,
  validateScoringWeights,
  getScoreRange,
} from '@/types/itp'
import { countActiveFilters } from '@/lib/search/filter-utils'

// Import filter sections
import { KeywordsFilterSection } from '../search/filters/keywords-filter'
import { SimilarTargetsFilterSection } from '../search/filters/similar-targets-filter'
import { FirmographicsFilterSection } from '../search/filters/firmographics-filter'
import { SizeFilterSection } from '../search/filters/size-filter'
import { GrowthFilterSection } from '../search/filters/growth-filter'
import { MarketPresenceFilterSection } from '../search/filters/market-presence-filter'
import { FundingFilterSection } from '../search/filters/funding-filter'
import { WorkflowFilterSection } from '../search/filters/workflow-filter'
import { CRMFilterSection } from '../search/filters/crm-filter'
import { OptionsFilterSection } from '../search/filters/options-filter'

// Import scoring weights configurator
import { ScoringWeightsConfigurator } from './scoring-weights-configurator'
import { ListSelector } from '../search/list-selector'

interface ITPBuilderProps {
  itp?: IdealTargetProfile // For editing existing ITP
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateITPRequest | UpdateITPRequest) => Promise<void>
}

export function ITPBuilder({ itp, isOpen, onClose, onSave }: ITPBuilderProps) {
  // Form state
  const [name, setName] = useState(itp?.name || '')
  const [description, setDescription] = useState(itp?.description || '')
  const [criteria, setCriteria] = useState<AdvancedFilters>(itp?.criteria || {})
  const [scoringWeights, setScoringWeights] = useState<ScoringWeights>(
    itp?.scoring_weights || DEFAULT_SCORING_WEIGHTS
  )
  const [minMatchScore, setMinMatchScore] = useState(
    itp?.min_match_score || DEFAULT_MIN_MATCH_SCORE
  )
  const [autoTag, setAutoTag] = useState(itp?.auto_tag || '')
  const [autoAddToListId, setAutoAddToListId] = useState<string[]>(
    itp?.auto_add_to_list_id ? [itp.auto_add_to_list_id] : []
  )

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvancedScoring, setShowAdvancedScoring] = useState(false)

  // Validation
  const activeFilterCount = useMemo(() => countActiveFilters(criteria), [criteria])
  const isValid = useMemo(() => {
    if (!name.trim()) return false
    if (name.length > 100) return false
    if (description && description.length > 2000) return false
    if (activeFilterCount === 0) return false
    if (autoTag && autoTag.length > 50) return false
    if (!validateScoringWeights(scoringWeights)) return false
    if (minMatchScore < 0 || minMatchScore > 100) return false
    return true
  }, [name, description, activeFilterCount, autoTag, scoringWeights, minMatchScore])

  // Reset form
  const handleClose = () => {
    setName(itp?.name || '')
    setDescription(itp?.description || '')
    setCriteria(itp?.criteria || {})
    setScoringWeights(itp?.scoring_weights || DEFAULT_SCORING_WEIGHTS)
    setMinMatchScore(itp?.min_match_score || DEFAULT_MIN_MATCH_SCORE)
    setAutoTag(itp?.auto_tag || '')
    setAutoAddToListId(itp?.auto_add_to_list_id ? [itp.auto_add_to_list_id] : [])
    setError(null)
    onClose()
  }

  // Save ITP
  const handleSave = async () => {
    if (!isValid) return

    setIsSaving(true)
    setError(null)

    try {
      const data: CreateITPRequest | UpdateITPRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        criteria,
        scoring_weights: scoringWeights,
        min_match_score: minMatchScore,
        auto_tag: autoTag.trim() || undefined,
        auto_add_to_list_id: autoAddToListId[0] || undefined,
      }

      await onSave(data)
      handleClose()
    } catch (err) {
      console.error('Error saving ITP:', err)
      setError(err instanceof Error ? err.message : 'Failed to save ITP')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <DialogTitle>
              {itp ? 'Edit Ideal Target Profile' : 'Create Ideal Target Profile'}
            </DialogTitle>
          </div>
          <DialogDescription>
            Define your ideal target criteria and scoring preferences. Companies matching this
            profile will be automatically identified and scored.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
                <CardDescription>
                  Give your ITP a memorable name and description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="itp-name">
                    ITP Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="itp-name"
                    placeholder="e.g., SaaS Growth Targets, Healthcare Bolt-Ons"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    {name.length}/100 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itp-description">Description (Optional)</Label>
                  <Textarea
                    id="itp-description"
                    placeholder="Describe the characteristics of your ideal targets..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {description.length}/2000 characters
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Criteria Filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Target Criteria</CardTitle>
                    <CardDescription>
                      Define the characteristics of your ideal targets
                    </CardDescription>
                  </div>
                  <Badge variant={activeFilterCount > 0 ? 'default' : 'secondary'}>
                    {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {activeFilterCount === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please define at least one filter criterion to create a valid ITP.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Filter sections - using existing components */}
                <KeywordsFilterSection filters={criteria} onChange={setCriteria} />
                <SimilarTargetsFilterSection filters={criteria} onChange={setCriteria} />
                <FirmographicsFilterSection filters={criteria} onChange={setCriteria} />
                <SizeFilterSection filters={criteria} onChange={setCriteria} />
                <GrowthFilterSection filters={criteria} onChange={setCriteria} />
                <MarketPresenceFilterSection filters={criteria} onChange={setCriteria} />
                <FundingFilterSection filters={criteria} onChange={setCriteria} />
                <WorkflowFilterSection filters={criteria} onChange={setCriteria} />
                <CRMFilterSection filters={criteria} onChange={setCriteria} />
                <OptionsFilterSection filters={criteria} onChange={setCriteria} />
              </CardContent>
            </Card>

            {/* Scoring Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Scoring Configuration</CardTitle>
                    <CardDescription>
                      Adjust how matches are scored and filtered
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvancedScoring(!showAdvancedScoring)}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    {showAdvancedScoring ? 'Hide' : 'Show'} Advanced
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Minimum Match Score */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Minimum Match Score</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-primary">{minMatchScore}</span>
                      <Badge variant={getScoreRange(minMatchScore).variant}>
                        {getScoreRange(minMatchScore).label}
                      </Badge>
                    </div>
                  </div>
                  <Slider
                    value={[minMatchScore]}
                    onValueChange={([value]) => setMinMatchScore(value)}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Only companies scoring {minMatchScore} or higher will be matched
                  </p>
                </div>

                {/* Advanced Scoring Weights */}
                {showAdvancedScoring && (
                  <div className="pt-4 border-t">
                    <ScoringWeightsConfigurator
                      weights={scoringWeights}
                      onChange={setScoringWeights}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auto-Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Auto-Actions (Optional)</CardTitle>
                <CardDescription>
                  Automatically tag or add matched companies to lists
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auto-tag">Auto-Tag Name</Label>
                  <Input
                    id="auto-tag"
                    placeholder="e.g., ITP: SaaS Targets"
                    value={autoTag}
                    onChange={(e) => setAutoTag(e.target.value)}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Matched companies will be automatically tagged with this name
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Auto-Add to List</Label>
                  <ListSelector
                    selectedListIds={autoAddToListId}
                    onListsChange={setAutoAddToListId}
                    placeholder="Select a list..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Matched companies will be automatically added to this list
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-muted/50">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {!isValid && activeFilterCount === 0 && 'Define at least one filter to continue'}
              {!isValid && name.trim() === '' && 'ITP name is required'}
              {!isValid &&
                activeFilterCount > 0 &&
                name.trim() !== '' &&
                'Please fix validation errors'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!isValid || isSaving}>
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {itp ? 'Update ITP' : 'Create ITP'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
