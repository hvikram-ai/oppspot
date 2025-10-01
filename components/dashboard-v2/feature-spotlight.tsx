'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import * as Icons from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import useSWR from 'swr'

interface SpotlightItem {
  feature_id: string
  feature_name: string
  description: string
  cta_text: string
  cta_url: string
  icon_name: string
  badge_text: string | null
  badge_color: string
  priority: number
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

const badgeColorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
}

export function FeatureSpotlight() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const { data: items, error } = useSWR<SpotlightItem[]>('/api/dashboard/spotlight?limit=5', fetcher)

  // Auto-rotate every 10 seconds (5 seconds on mobile for faster discovery)
  useEffect(() => {
    if (!items || items.length <= 1) return

    const isMobile = window.innerWidth < 768
    const rotationTime = isMobile ? 5000 : 10000

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length)
    }, rotationTime)

    return () => clearInterval(interval)
  }, [items])

  const trackInteraction = async (featureId: string) => {
    await fetch('/api/dashboard/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature_name: featureId,
        interaction_type: 'click',
        context: {
          source: 'feature_spotlight',
          spotlight_position: currentIndex
        }
      })
    })
  }

  if (error || !items || items.length === 0) {
    return null
  }

  const currentItem = items[currentIndex]

  // Dynamically get icon component
  const IconComponent = (Icons as any)[currentItem.icon_name.split('-').map(
    (word: string) => word.charAt(0).toUpperCase() + word.slice(1)
  ).join('')] || Icons.Sparkles

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length)
  }

  return (
    <Card
      className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800 w-full"
      data-testid="feature-spotlight"
    >
      <CardHeader className="px-4 md:px-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">Discover Features</CardTitle>
          {items.length > 1 && (
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-7 sm:w-7 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation"
                onClick={goToPrevious}
                aria-label="Previous feature"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {currentIndex + 1} / {items.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-7 sm:w-7 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation"
                onClick={goToNext}
                aria-label="Next feature"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 md:px-6">
        <div
          className="space-y-4"
          data-testid="spotlight-card"
          data-feature-id={currentItem.feature_id}
        >
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div
              className="p-3 rounded-lg bg-white dark:bg-gray-900 flex-shrink-0"
              data-testid="feature-icon"
            >
              <IconComponent className="h-6 w-6 text-purple-600" />
            </div>

            <div className="flex-1 w-full min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="font-semibold text-sm sm:text-base truncate">{currentItem.feature_name}</h3>
                {currentItem.badge_text && (
                  <Badge
                    className={`${badgeColorMap[currentItem.badge_color] || badgeColorMap.blue} flex-shrink-0`}
                    data-testid="feature-badge"
                  >
                    {currentItem.badge_text}
                  </Badge>
                )}
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground mb-4 break-words">
                {currentItem.description}
              </p>

              <Link href={currentItem.cta_url} onClick={() => trackInteraction(currentItem.feature_id)}>
                <Button className="w-full sm:w-auto min-h-[44px] touch-manipulation">
                  {currentItem.cta_text}
                </Button>
              </Link>
            </div>
          </div>

          {/* Dots indicator */}
          {items.length > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  className={`h-2 rounded-full transition-all touch-manipulation ${
                    idx === currentIndex
                      ? 'w-6 bg-purple-600'
                      : 'w-2 bg-purple-300 dark:bg-purple-700'
                  }`}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
