'use client'

import { type UpdateHeroProps } from '@/types/updates'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Zap, Bug } from 'lucide-react'
import Image from 'next/image'

export function UpdateHero({
  weekNumber,
  year,
  dateRange,
  headline,
  featuredImage,
  featuredVideo,
  stats
}: UpdateHeroProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-6">
            <div className="space-y-3">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                Week {weekNumber}, {year}
              </Badge>
              <p className="text-blue-200 font-medium">{dateRange}</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                {headline}
              </h1>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 pt-4">
              {stats.features > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg border border-white/20">
                  <Sparkles className="h-5 w-5 text-green-300" />
                  <div className="text-sm">
                    <span className="font-bold text-2xl">{stats.features}</span>
                    <span className="text-blue-200 ml-1">New Features</span>
                  </div>
                </div>
              )}

              {stats.improvements > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg border border-white/20">
                  <Zap className="h-5 w-5 text-orange-300" />
                  <div className="text-sm">
                    <span className="font-bold text-2xl">{stats.improvements}</span>
                    <span className="text-blue-200 ml-1">Improvements</span>
                  </div>
                </div>
              )}

              {stats.fixes > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg border border-white/20">
                  <Bug className="h-5 w-5 text-blue-300" />
                  <div className="text-sm">
                    <span className="font-bold text-2xl">{stats.fixes}</span>
                    <span className="text-blue-200 ml-1">Bug Fixes</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Featured Media */}
          {(featuredImage || featuredVideo) && (
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl border-4 border-white/20">
              {featuredVideo ? (
                <video
                  src={featuredVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : featuredImage ? (
                <Image
                  src={featuredImage}
                  alt={headline}
                  fill
                  className="object-cover"
                  priority
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
