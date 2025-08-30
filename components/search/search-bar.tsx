'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Sparkles, 
  X, 
  Loader2,
  MapPin,
  Building2,
  Phone,
  Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  loading?: boolean
  className?: string
  showSuggestions?: boolean
}

const searchSuggestions = [
  { icon: Building2, text: 'Restaurants in London', category: 'Food & Dining' },
  { icon: MapPin, text: 'Tech companies near me', category: 'Technology' },
  { icon: Phone, text: 'Plumbers with 24/7 service', category: 'Services' },
  { icon: Globe, text: 'E-commerce businesses', category: 'Retail' },
]

export function SearchBar({ 
  value, 
  onChange, 
  placeholder = 'Search businesses...', 
  loading = false,
  className,
  showSuggestions = true
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [showAiMode, setShowAiMode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      // Trigger search on enter
      setIsFocused(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    setIsFocused(false)
    inputRef.current?.blur()
  }

  const toggleAiMode = () => {
    setShowAiMode(!showAiMode)
    inputRef.current?.focus()
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        {/* AI Mode Badge */}
        {showAiMode && (
          <div className="absolute -top-10 left-0 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="mr-1 h-3 w-3" />
              AI Mode: Describe what you're looking for in natural language
            </Badge>
          </div>
        )}

        {/* Search Input */}
        <div className="relative flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder={showAiMode ? "e.g., 'Find eco-friendly cafes with vegan options'" : placeholder}
              className={cn(
                'pl-10 pr-24',
                showAiMode && 'ring-2 ring-purple-500/20'
              )}
            />
            
            {/* Clear button */}
            {value && (
              <button
                onClick={() => onChange('')}
                className="absolute right-20 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* AI Toggle */}
            <Button
              size="sm"
              variant={showAiMode ? 'default' : 'ghost'}
              onClick={toggleAiMode}
              className="absolute right-10 top-1/2 -translate-y-1/2 h-7 px-2"
            >
              <Sparkles className="h-3 w-3" />
            </Button>

            {/* Search Button/Loading */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              {loading ? (
                <div className="flex h-8 w-8 items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Button size="sm" className="h-8 w-8 p-0">
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && isFocused && !value && (
          <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-lg border bg-card p-2 shadow-lg">
            <p className="mb-2 px-2 text-xs text-muted-foreground">Popular searches</p>
            <div className="space-y-1">
              {searchSuggestions.map((suggestion, index) => {
                const Icon = suggestion.icon
                return (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-left">{suggestion.text}</span>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.category}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}