import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  )
}

export function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

export function QueueItemSkeleton() {
  return (
    <div className="p-4 rounded-lg border space-y-2">
      <div className="flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Metrics grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Main content grid skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardCardSkeleton />
        </div>
        <div>
          <DashboardCardSkeleton />
        </div>
      </div>

      {/* Priority queue skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <QueueItemSkeleton />
        <QueueItemSkeleton />
        <QueueItemSkeleton />
      </div>
    </div>
  )
}

interface SkeletonLoaderProps {
  variant?: 'dashboard' | 'card' | 'metric' | 'queue'
}

export default function SkeletonLoader({ variant = 'dashboard' }: SkeletonLoaderProps) {
  switch (variant) {
    case 'card':
      return <DashboardCardSkeleton />
    case 'metric':
      return <MetricCardSkeleton />
    case 'queue':
      return <QueueItemSkeleton />
    case 'dashboard':
    default:
      return <DashboardSkeleton />
  }
}
