'use client'

import { type ExecutiveSummaryProps } from '@/types/updates'
import { CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function ExecutiveSummary({
  highlights,
  estimatedTimeSaved,
  roiMetric
}: ExecutiveSummaryProps) {
  return (
    <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white dark:from-green-950/20 dark:to-background">
      <CardContent className="pt-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          This Week's Edge
        </h2>

        <ul className="space-y-3 mb-6">
          {highlights.map((highlight, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-base text-gray-700 dark:text-gray-300">{highlight}</span>
            </li>
          ))}
        </ul>

        {(estimatedTimeSaved || roiMetric) && (
          <div className="flex flex-wrap gap-4 pt-4 border-t border-green-200 dark:border-green-800">
            {estimatedTimeSaved && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Save {estimatedTimeSaved}
                </span>
              </div>
            )}

            {roiMetric && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {roiMetric}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
