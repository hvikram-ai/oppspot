/**
 * Admin Dashboard Loading Skeletons
 * Provides skeleton components for admin dashboard loading states
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for statistics cards
 */
export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for admin tool cards
 */
export function AdminToolCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <Skeleton className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for quick action buttons
 */
export function QuickActionSkeleton() {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  );
}

/**
 * Complete dashboard skeleton (when initially loading)
 */
export function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
        </div>
      </div>

      {/* Statistics Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Admin Tools Section Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AdminToolCardSkeleton />
          <AdminToolCardSkeleton />
          <AdminToolCardSkeleton />
          <AdminToolCardSkeleton />
          <AdminToolCardSkeleton />
          <AdminToolCardSkeleton />
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <QuickActionSkeleton />
          <QuickActionSkeleton />
          <QuickActionSkeleton />
        </CardContent>
      </Card>

      {/* System Status Skeleton */}
      <div className="mt-8 flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
