'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface ProgressItem {
  label: string
  value: number
  max?: number
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  description?: string
}

export interface ProgressCardProps {
  title: string
  description?: string
  items: ProgressItem[]
  showPercentage?: boolean
  showBadge?: boolean
  className?: string
}

export function ProgressCard({
  title,
  description,
  items,
  showPercentage = true,
  showBadge = false,
  className
}: ProgressCardProps) {
  const getColorClass = (color?: string) => {
    switch (color) {
      case 'primary':
        return 'text-blue-600'
      case 'success':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'danger':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getBadgeVariant = (percentage: number) => {
    if (percentage >= 80) return 'default'
    if (percentage >= 60) return 'secondary'
    if (percentage >= 40) return 'outline'
    return 'destructive'
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => {
          const percentage = Math.round((item.value / (item.max || 100)) * 100)

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.label}</span>
                <div className="flex items-center gap-2">
                  {showPercentage && (
                    <span className={cn('text-sm font-medium', getColorClass(item.color))}>
                      {percentage}%
                    </span>
                  )}
                  {showBadge && (
                    <Badge variant={getBadgeVariant(percentage)}>
                      {item.value} / {item.max || 100}
                    </Badge>
                  )}
                </div>
              </div>
              <Progress value={percentage} className="h-2" />
              {item.description && (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}