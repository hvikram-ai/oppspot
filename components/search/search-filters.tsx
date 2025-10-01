'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Filter, 
  MapPin, 
  Star, 
  Building2, 
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useState } from 'react'

interface FilterProps {
  filters: {
    categories?: string[]
    location?: string
    radius?: number
    minRating?: number
    verified?: boolean
    sortBy?: string
  }
   
  onChange: (filters: unknown) => void
  resultCount?: number
}

const categories = [
  'Technology',
  'Healthcare',
  'Retail',
  'Food & Beverage',
  'Finance',
  'Real Estate',
  'Manufacturing',
  'Education',
  'Entertainment',
  'Professional Services',
  'Construction',
  'Transportation'
]

export function SearchFilters({ filters, onChange, resultCount = 0 }: FilterProps) {
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    location: true,
    rating: false,
    advanced: false
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleCategoryToggle = (category: string) => {
    const currentCategories = filters.categories || []
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category]
    
    onChange({ ...filters, categories: newCategories })
  }

  const handleReset = () => {
    onChange({
      sortBy: 'relevance'
    })
  }

  const activeFilterCount = [
    filters.categories?.length || 0,
    filters.location ? 1 : 0,
    filters.radius ? 1 : 0,
    filters.minRating ? 1 : 0,
    filters.verified ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount}</Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={activeFilterCount === 0}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sort By */}
        <div className="space-y-2">
          <Label>Sort By</Label>
          <Select
            value={filters.sortBy || 'relevance'}
            onValueChange={(value) => onChange({ ...filters, sortBy: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Most Relevant</SelectItem>
              <SelectItem value="distance">Nearest First</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="name">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('categories')}
            className="flex w-full items-center justify-between text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Categories
              {filters.categories?.length ? (
                <Badge variant="outline" className="text-xs">
                  {filters.categories.length}
                </Badge>
              ) : null}
            </span>
            {expandedSections.categories ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {expandedSections.categories && (
            <div className="space-y-2 pt-2">
              {categories.slice(0, 6).map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={category}
                    checked={filters.categories?.includes(category) || false}
                    onCheckedChange={() => handleCategoryToggle(category)}
                  />
                  <label
                    htmlFor={category}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {category}
                  </label>
                </div>
              ))}
              {categories.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {/* Show more categories */}}
                >
                  Show {categories.length - 6} more
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('location')}
            className="flex w-full items-center justify-between text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </span>
            {expandedSections.location ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {expandedSections.location && (
            <div className="space-y-3 pt-2">
              <Input
                placeholder="City, postcode, or area"
                value={filters.location || ''}
                onChange={(e) => onChange({ ...filters, location: e.target.value })}
              />
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Search Radius</Label>
                  <span className="text-xs text-muted-foreground">
                    {filters.radius || 10} miles
                  </span>
                </div>
                <Slider
                  value={[filters.radius || 10]}
                  onValueChange={([value]) => onChange({ ...filters, radius: value })}
                  min={1}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('rating')}
            className="flex w-full items-center justify-between text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Rating
            </span>
            {expandedSections.rating ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {expandedSections.rating && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Minimum Rating</Label>
                <span className="text-xs text-muted-foreground">
                  {filters.minRating || 0}+ stars
                </span>
              </div>
              <Slider
                value={[filters.minRating || 0]}
                onValueChange={([value]) => onChange({ ...filters, minRating: value })}
                min={0}
                max={5}
                step={0.5}
              />
            </div>
          )}
        </div>

        {/* Advanced */}
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('advanced')}
            className="flex w-full items-center justify-between text-sm font-medium"
          >
            <span>Advanced Options</span>
            {expandedSections.advanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {expandedSections.advanced && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verified"
                  checked={filters.verified || false}
                  onCheckedChange={(checked) => 
                    onChange({ ...filters, verified: checked as boolean })
                  }
                />
                <label
                  htmlFor="verified"
                  className="text-sm font-normal cursor-pointer"
                >
                  Verified businesses only
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        {resultCount > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              {resultCount.toLocaleString()} businesses match your criteria
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}