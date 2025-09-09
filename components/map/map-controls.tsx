'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { 
  Filter, 
  Layers,
  Building2
} from 'lucide-react'
import { MapFilters } from '@/app/map/page'
import { useState } from 'react'
import { Label } from '@/components/ui/label'

interface MapControlsProps {
  filters: MapFilters
  onFiltersChange: (filters: MapFilters) => void
}

const CATEGORIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Food & Beverage',
  'Professional Services',
  'Real Estate',
  'Education',
  'Transportation',
  'Manufacturing'
]

export function MapControls({ filters, onFiltersChange }: MapControlsProps) {
  const [tempFilters, setTempFilters] = useState<MapFilters>(filters)

  const handleCategoryToggle = (category: string) => {
    const currentCategories = tempFilters.categories || []
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category]
    
    const newFilters = { ...tempFilters, categories: newCategories }
    setTempFilters(newFilters)
    onFiltersChange(newFilters)
  }


  const clearFilters = () => {
    const newFilters: MapFilters = {}
    setTempFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const activeFilterCount = tempFilters.categories?.length || 0

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Filter Businesses</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <div className="p-2">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Categories
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {CATEGORIES.map((category) => (
                    <label
                      key={category}
                      className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-accent p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={tempFilters.categories?.includes(category) || false}
                        onChange={() => handleCategoryToggle(category)}
                        className="rounded"
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>

          <DropdownMenuSeparator />
          
          <div className="p-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full"
              onClick={clearFilters}
            >
              Clear all filters
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Layers className="h-4 w-4 mr-2" />
            Layers
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Map Layers</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>
            Business Locations
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem>
            Heat Map
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem>
            Districts
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}