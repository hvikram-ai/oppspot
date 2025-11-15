'use client'

import { type FeatureCardProps } from '@/types/updates'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, TrendingUp } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const categoryStyles = {
  feature: {
    badge: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400',
    icon: '✨',
    label: 'New'
  },
  improvement: {
    badge: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400',
    icon: '⚡',
    label: 'Improved'
  },
  fix: {
    badge: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400',
    icon: '🔧',
    label: 'Fixed'
  },
  'coming-soon': {
    badge: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400',
    icon: '🚀',
    label: 'Coming Soon'
  }
}

export function FeatureCard({
  title,
  description,
  category,
  impact,
  media,
  cta,
  badge
}: FeatureCardProps) {
  const categoryStyle = categoryStyles[category]

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {/* Media */}
      {media && (
        <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
          {media.type === 'video' ? (
            <video
              src={media.url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : media.type === 'gif' ? (
            <Image
              src={media.url}
              alt={media.alt}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <Image
              src={media.url}
              alt={media.alt}
              fill
              className="object-cover"
            />
          )}
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge variant="outline" className={categoryStyle.badge}>
            <span className="mr-1">{categoryStyle.icon}</span>
            {badge || categoryStyle.label}
          </Badge>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">{description}</p>

        {/* Impact Metrics */}
        {impact && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Impact</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Before</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{impact.before}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">After</p>
                <p className="font-medium text-green-600 dark:text-green-400">{impact.after}</p>
              </div>
            </div>
            {impact.improvement_pct && (
              <p className="mt-2 text-sm font-bold text-green-600 dark:text-green-400">
                {impact.improvement_pct}% {impact.improvement_pct > 0 ? 'faster' : 'improvement'}
              </p>
            )}
          </div>
        )}
      </CardContent>

      {cta && (
        <CardFooter>
          <Button asChild className="w-full group">
            <Link href={cta.href}>
              {cta.label}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
