'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface FilterSectionProps {
  title: string
  children: React.ReactNode
  activeCount?: number
  defaultExpanded?: boolean
}

export function FilterSection({
  title,
  children,
  activeCount = 0,
  defaultExpanded = false,
}: FilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-primary">{title}</span>
          {activeCount > 0 && (
            <Badge variant="outline" className="h-5 px-1.5 text-xs">
              {activeCount}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && <div className="p-3 pt-0 border-t">{children}</div>}
    </div>
  )
}
