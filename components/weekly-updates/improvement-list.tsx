'use client'

import { type ImprovementItemProps } from '@/types/updates'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

export function ImprovementItem({
  icon,
  category,
  title,
  description,
  metrics
}: ImprovementItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 py-4 last:border-0">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              {category}
            </Badge>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>

          {metrics && metrics.length > 0 && (
            <>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 flex items-center gap-1"
              >
                {isExpanded ? (
                  <>
                    Hide details <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Show metrics <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>

              {isExpanded && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  {metrics.map((metric, index) => (
                    <div key={index} className="text-sm">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{metric.label}</p>
                      <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {metric.value}
                      </p>
                      {metric.change && (
                        <p className={`text-xs font-medium ${
                          metric.change.startsWith('-') || metric.change.startsWith('+') && parseFloat(metric.change) > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {metric.change}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface ImprovementListProps {
  items: ImprovementItemProps[]
}

export function ImprovementList({ items }: ImprovementListProps) {
  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <ImprovementItem key={index} {...item} />
      ))}
    </div>
  )
}
