'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer } from 'recharts'
import { ReactNode } from 'react'

export interface ChartCardProps {
  title: string
  description?: string
  children: ReactNode
  height?: number
  className?: string
  action?: ReactNode
}

export function ChartCard({
  title,
  description,
  children,
  height = 300,
  className,
  action
}: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}