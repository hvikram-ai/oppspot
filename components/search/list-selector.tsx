'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { FolderOpen, Search, X, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BusinessList {
  id: string
  name: string
  description: string | null
  color: string
  icon: string
  business_count?: number
}

interface ListSelectorProps {
  selectedListIds: string[]
  onListsChange: (listIds: string[]) => void
  className?: string
  placeholder?: string
}

export function ListSelector({
  selectedListIds,
  onListsChange,
  className,
  placeholder = 'Search lists...',
}: ListSelectorProps) {
  const [lists, setLists] = useState<BusinessList[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Load lists on mount
  useEffect(() => {
    loadLists()
  }, [])

  const loadLists = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/lists')

      if (!response.ok) {
        throw new Error('Failed to load lists')
      }

      const data = await response.json()

      if (data.success && data.lists) {
        setLists(data.lists)
      } else {
        setError('No lists found')
      }
    } catch (err) {
      console.error('Error loading lists:', err)
      setError('Failed to load lists')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleList = (listId: string) => {
    const newSelection = selectedListIds.includes(listId)
      ? selectedListIds.filter(id => id !== listId)
      : [...selectedListIds, listId]

    onListsChange(newSelection)
  }

  const handleClearAll = () => {
    onListsChange([])
  }

  // Filter lists based on search
  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get selected list names for badge display
  const selectedLists = lists.filter(list => selectedListIds.includes(list.id))

  return (
    <div className={cn('space-y-2', className)}>
      {/* Selected Lists Badges */}
      {selectedLists.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLists.map(list => (
            <Badge
              key={list.id}
              variant="secondary"
              className="gap-1 pr-1"
              style={{ borderLeftColor: list.color, borderLeftWidth: '3px' }}
            >
              <FolderOpen className="h-3 w-3" />
              <span className="max-w-[150px] truncate">{list.name}</span>
              {list.business_count !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ({list.business_count})
                </span>
              )}
              <button
                onClick={() => handleToggleList(list.id)}
                className="hover:bg-muted rounded-full p-0.5 ml-1"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedLists.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-6 px-2 text-xs"
            >
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lists */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          {error}
          <Button
            variant="link"
            size="sm"
            onClick={loadLists}
            className="ml-2"
          >
            Retry
          </Button>
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          {searchQuery ? 'No lists match your search' : 'No lists found'}
        </div>
      ) : (
        <ScrollArea className="h-[200px] border rounded-md">
          <div className="p-2 space-y-1">
            {filteredLists.map(list => (
              <div
                key={list.id}
                className="flex items-center space-x-2 p-2 hover:bg-muted rounded-sm transition-colors cursor-pointer"
                onClick={() => handleToggleList(list.id)}
              >
                <Checkbox
                  id={`list-${list.id}`}
                  checked={selectedListIds.includes(list.id)}
                  onCheckedChange={() => handleToggleList(list.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: list.color }}
                    />
                    <label
                      htmlFor={`list-${list.id}`}
                      className="text-sm font-medium cursor-pointer truncate"
                    >
                      {list.name}
                    </label>
                    {list.business_count !== undefined && (
                      <Badge variant="outline" className="h-5 px-1.5 text-xs">
                        {list.business_count}
                      </Badge>
                    )}
                  </div>
                  {list.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {list.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground">
        {selectedListIds.length === 0
          ? 'Select lists to filter businesses'
          : `${selectedListIds.length} list${selectedListIds.length !== 1 ? 's' : ''} selected`}
      </p>
    </div>
  )
}
