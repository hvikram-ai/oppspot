'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface StatItem {
  label: string
  value: string | number | ReactNode
  icon?: LucideIcon
  badge?: {
    label: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
  trend?: {
    value: number
    type: 'up' | 'down' | 'neutral'
  }
  action?: ReactNode
}

export interface StatListProps {
  title: string
  description?: string
  items: StatItem[]
  columns?: 1 | 2 | 3
  variant?: 'default' | 'compact'
  className?: string
}

export function StatList({
  title,
  description,
  items,
  columns = 1,
  variant = 'default',
  className
}: StatListProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  }

  const getTrendIcon = (type: 'up' | 'down' | 'neutral') => {
    switch (type) {
      case 'up':
        return '↑'
      case 'down':
        return '↓'
      default:
        return '→'
    }
  }

  const getTrendColor = (type: 'up' | 'down' | 'neutral') => {
    switch (type) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className={cn('grid gap-4', gridCols[columns])}>
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center justify-between',
                variant === 'compact' ? 'py-2' : 'p-4 border rounded-lg'
              )}
            >
              <div className="flex items-center space-x-3">
                {item.icon && (
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">{item.value}</p>
                    {item.badge && (
                      <Badge variant={item.badge.variant}>
                        {item.badge.label}
                      </Badge>
                    )}
                    {item.trend && (
                      <span className={cn('text-sm font-medium', getTrendColor(item.trend.type))}>
                        {getTrendIcon(item.trend.type)} {Math.abs(item.trend.value)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {item.action && (
                <div>{item.action}</div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}