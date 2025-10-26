/**
 * Loading State Components for Data Room
 * Skeleton loaders and loading indicators
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

/**
 * DataRoomCardSkeleton - Loading skeleton for data room cards
 */
export function DataRoomCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-12" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-12" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>

        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

/**
 * DataRoomListSkeleton - Grid of data room card skeletons
 */
export function DataRoomListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <DataRoomCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * DocumentCardSkeleton - Loading skeleton for document cards
 */
export function DocumentCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-12 flex-shrink-0 rounded" />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * DocumentGridSkeleton - Grid of document card skeletons
 */
export function DocumentGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <DocumentCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * DocumentTableSkeleton - Table view skeleton
 */
export function DocumentTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border pb-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * DocumentViewerSkeleton - PDF viewer loading skeleton
 */
export function DocumentViewerSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <div className="space-y-4 text-center">
        <Skeleton className="mx-auto h-[600px] w-[450px]" />
        <div className="flex items-center justify-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

/**
 * AIInsightsSkeleton - AI insights sidebar skeleton
 */
export function AIInsightsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

/**
 * ActivityTimelineSkeleton - Activity log skeleton
 */
export function ActivityTimelineSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * UploadProgressSkeleton - Upload progress indicator
 */
export function UploadProgressSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

/**
 * FullPageLoader - Full page loading indicator
 */
export function FullPageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * InlineLoader - Small inline loading spinner
 */
export function InlineLoader({ size = 16 }: { size?: number }) {
  return (
    <Loader2
      className="animate-spin text-muted-foreground"
      style={{ width: size, height: size }}
    />
  );
}

/**
 * ProcessingIndicator - Shows AI processing status
 */
export function ProcessingIndicator({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{status}</span>
    </div>
  );
}

/**
 * EmptyState - Shown when there's no data
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
