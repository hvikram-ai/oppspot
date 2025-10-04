import dynamic from 'next/dynamic'
import { ComponentType } from 'react'
import SkeletonLoader from '@/components/ui/skeleton-loader'

/**
 * Lazy load dashboard components with loading fallbacks
 */

// Dashboard v2 components with skeleton loaders
export const LazyAIDigestCard = dynamic(
  () => import('@/components/dashboard-v2/ai-digest-card').then(mod => ({ default: mod.AIDigestCard })),
  {
    loading: () => <SkeletonLoader variant="card" />,
    ssr: false
  }
)

export const LazyPriorityQueue = dynamic(
  () => import('@/components/dashboard-v2/priority-queue').then(mod => ({ default: mod.PriorityQueue })),
  {
    loading: () => <SkeletonLoader variant="queue" />,
    ssr: false
  }
)

export const LazyImpactMetrics = dynamic(
  () => import('@/components/dashboard-v2/impact-metrics').then(mod => ({ default: mod.ImpactMetrics })),
  {
    loading: () => <SkeletonLoader variant="metric" />,
    ssr: false
  }
)

export const LazyFeatureSpotlight = dynamic(
  () => import('@/components/dashboard-v2/feature-spotlight').then(mod => ({ default: mod.FeatureSpotlight })),
  {
    loading: () => <SkeletonLoader variant="card" />,
    ssr: false
  }
)

// Command palette (only load when needed)
export const LazyCommandPalette = dynamic(
  () => import('@/components/navigation/command-palette').then(mod => ({ default: mod.CommandPalette })),
  {
    ssr: false
  }
)

// Heavy components for below-the-fold content
export const LazyBusinessInsights = dynamic(
  () => import('@/components/dashboard/business-insights').then(mod => ({ default: mod.BusinessInsights })),
  {
    loading: () => <SkeletonLoader variant="card" />,
    ssr: false
  }
)

export const LazyRecentActivity = dynamic(
  () => import('@/components/dashboard/recent-activity').then(mod => ({ default: mod.RecentActivity })),
  {
    loading: () => <SkeletonLoader variant="card" />,
    ssr: false
  }
)

// Map components (heavy - only load when visible)
export const LazyMapView = dynamic(
  () => import('@/components/map/map-view').then(mod => ({ default: mod.MapView })),
  {
    loading: () => (
      <div className="w-full h-[600px] bg-muted animate-pulse flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    ),
    ssr: false
  }
)
