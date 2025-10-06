'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Tag, Search, X, Loader2, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BusinessTag {
  id: string
  name: string
  count: number
}

interface TagSelectorProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  className?: string
  placeholder?: string
}

const TAG_COLORS = [
  'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
]

export function TagSelector({
  selectedTags,
  onTagsChange,
  className,
  placeholder = 'Search tags...',
}: TagSelectorProps) {
  const [tags, setTags] = useState<BusinessTag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Load tags on mount
  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/tags')

      if (!response.ok) {
        throw new Error('Failed to load tags')
      }

      const data = await response.json()

      if (data.success && data.tags) {
        setTags(data.tags)
      } else {
        setError('No tags found')
      }
    } catch (err) {
      console.error('Error loading tags:', err)
      setError('Failed to load tags')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleTag = (tagName: string) => {
    const normalizedTag = tagName.toLowerCase()
    const newSelection = selectedTags.includes(normalizedTag)
      ? selectedTags.filter(t => t !== normalizedTag)
      : [...selectedTags, normalizedTag]

    onTagsChange(newSelection)
  }

  const handleClearAll = () => {
    onTagsChange([])
  }

  // Filter tags based on search
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get tag color based on index
  const getTagColor = (index: number) => {
    return TAG_COLORS[index % TAG_COLORS.length]
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Selected Tags Badges */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag, index) => {
            const tagData = tags.find(t => t.id === tag)
            return (
              <Badge
                key={tag}
                variant="outline"
                className={cn('gap-1 pr-1', getTagColor(index))}
              >
                <Hash className="h-3 w-3" />
                <span className="max-w-[150px] truncate">
                  {tagData?.name || tag}
                </span>
                {tagData?.count !== undefined && (
                  <span className="text-xs opacity-70">({tagData.count})</span>
                )}
                <button
                  onClick={() => handleToggleTag(tag)}
                  className="hover:bg-muted rounded-full p-0.5 ml-1"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          {selectedTags.length > 1 && (
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

      {/* Tags */}
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
            onClick={loadTags}
            className="ml-2"
          >
            Retry
          </Button>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          {searchQuery ? 'No tags match your search' : 'No tags found'}
          <p className="text-xs mt-1">
            Tags are created when you save businesses
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[200px] border rounded-md">
          <div className="p-2">
            <div className="flex flex-wrap gap-2">
              {filteredTags.map((tag, index) => {
                const isSelected = selectedTags.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all',
                      'border hover:scale-105',
                      isSelected
                        ? getTagColor(index)
                        : 'bg-muted text-muted-foreground border-transparent hover:border-border'
                    )}
                  >
                    <Hash className="h-3 w-3" />
                    {tag.name}
                    <Badge
                      variant="secondary"
                      className="h-4 px-1 text-[10px] ml-1"
                    >
                      {tag.count}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>
        </ScrollArea>
      )}

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground">
        {selectedTags.length === 0
          ? 'Select tags to filter businesses'
          : `${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} selected`}
      </p>
    </div>
  )
}
