'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import type { AdvancedFilters } from '@/types/filters'
import { FilterSection } from './filter-section'

interface KeywordsFilterSectionProps {
  filters: AdvancedFilters
  onChange: (filters: AdvancedFilters) => void
}

export function KeywordsFilterSection({ filters, onChange }: KeywordsFilterSectionProps) {
  const [includeInput, setIncludeInput] = useState('')
  const [excludeInput, setExcludeInput] = useState('')

  const includeKeywords = filters.keywords?.includeKeywords || []
  const excludeKeywords = filters.keywords?.excludeKeywords || []

  const handleAddInclude = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && includeInput.trim()) {
      const newKeywords = [...includeKeywords, includeInput.trim()]
      onChange({
        ...filters,
        keywords: { ...filters.keywords, includeKeywords: newKeywords },
      })
      setIncludeInput('')
    }
  }

  const handleRemoveInclude = (keyword: string) => {
    const newKeywords = includeKeywords.filter(k => k !== keyword)
    onChange({
      ...filters,
      keywords: { ...filters.keywords, includeKeywords: newKeywords },
    })
  }

  const handleAddExclude = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && excludeInput.trim()) {
      const newKeywords = [...excludeKeywords, excludeInput.trim()]
      onChange({
        ...filters,
        keywords: { ...filters.keywords, excludeKeywords: newKeywords },
      })
      setExcludeInput('')
    }
  }

  const handleRemoveExclude = (keyword: string) => {
    const newKeywords = excludeKeywords.filter(k => k !== keyword)
    onChange({
      ...filters,
      keywords: { ...filters.keywords, excludeKeywords: newKeywords },
    })
  }

  const activeCount = includeKeywords.length + excludeKeywords.length

  return (
    <FilterSection title="Keywords" activeCount={activeCount} defaultExpanded>
      <div className="space-y-4">
        {/* Include Keywords */}
        <div className="space-y-2">
          <Label htmlFor="include-keywords">Include</Label>
          <Input
            id="include-keywords"
            placeholder="Enter keywords"
            value={includeInput}
            onChange={e => setIncludeInput(e.target.value)}
            onKeyDown={handleAddInclude}
          />
          {includeKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {includeKeywords.map(keyword => (
                <Badge key={keyword} variant="secondary" className="gap-1">
                  {keyword}
                  <button
                    onClick={() => handleRemoveInclude(keyword)}
                    className="hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Exclude Keywords */}
        <div className="space-y-2">
          <Label htmlFor="exclude-keywords">Exclude</Label>
          <Input
            id="exclude-keywords"
            placeholder="Enter keywords"
            value={excludeInput}
            onChange={e => setExcludeInput(e.target.value)}
            onKeyDown={handleAddExclude}
          />
          {excludeKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {excludeKeywords.map(keyword => (
                <Badge key={keyword} variant="destructive" className="gap-1">
                  {keyword}
                  <button
                    onClick={() => handleRemoveExclude(keyword)}
                    className="hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </FilterSection>
  )
}
