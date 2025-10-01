'use client'

import useSWR from 'swr'

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Types for dashboard data
export interface AIDigest {
  id: string
  user_id: string
  digest_date: string
  digest_data: {
    overnight_discoveries?: Array<{ title: string; description: string }>
    urgent_alerts?: Array<{ title: string; description: string; priority: string }>
    completed_work?: Array<{ title: string; description: string }>
    recommendations?: Array<{ title: string; description: string }>
  }
  read_at: string | null
  generated_at: string
  generation_time_ms: number
}

export interface PriorityQueueItem {
  id: string
  user_id: string
  item_type: 'search' | 'research' | 'lead' | 'task'
  priority_level: 'critical' | 'high' | 'medium' | 'low'
  priority_score: number
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed'
  title: string
  description: string | null
  action_url: string | null
  metadata: Record<string, unknown> | null
  due_date: string | null
  completed_at: string | null
  created_at: string
}

export interface DashboardMetrics {
  time_saved: {
    value: number
    trend: number
    unit: string
  }
  pipeline_value: {
    value: number
    trend: number
    unit: string
  }
  active_leads: {
    value: number
    trend: number
    unit: string
  }
  searches: {
    value: number
    trend: number
  }
}

export interface FeatureSpotlight {
  id: string
  feature_name: string
  title: string
  description: string
  cta_text: string
  cta_url: string
  priority: number
  is_active: boolean
  targeting_rules: Record<string, unknown> | null
}

export interface DashboardData {
  digest: AIDigest | null
  queue: PriorityQueueItem[]
  metrics: DashboardMetrics
  spotlight: FeatureSpotlight[]
}

interface UseDashboardDataOptions {
  refreshInterval?: number
  revalidateOnFocus?: boolean
}

/**
 * SWR hook for fetching all dashboard data
 *
 * Features:
 * - 30s cache by default
 * - Automatic revalidation
 * - Error handling
 * - Loading states
 *
 * @param options - SWR configuration options
 * @returns Dashboard data, loading state, and error state
 */
export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const {
    refreshInterval = 30000, // 30s cache
    revalidateOnFocus = true,
  } = options

  // Fetch AI digest
  const { data: digest, error: digestError, mutate: mutateDigest } = useSWR<AIDigest>(
    '/api/dashboard/digest',
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus,
      dedupingInterval: 5000, // Prevent duplicate requests within 5s
    }
  )

  // Fetch priority queue
  const { data: queueData, error: queueError, mutate: mutateQueue } = useSWR<{
    items: PriorityQueueItem[]
    total: number
  }>(
    '/api/dashboard/priority-queue?limit=10&status=pending',
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus,
      dedupingInterval: 5000,
    }
  )

  // Fetch dashboard metrics
  const { data: metrics, error: metricsError, mutate: mutateMetrics } = useSWR<DashboardMetrics>(
    '/api/dashboard/metrics?period=7d',
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus,
      dedupingInterval: 5000,
    }
  )

  // Fetch feature spotlight
  const { data: spotlightData, error: spotlightError, mutate: mutateSpotlight } = useSWR<{
    items: FeatureSpotlight[]
  }>(
    '/api/dashboard/spotlight',
    fetcher,
    {
      refreshInterval: refreshInterval * 2, // Less frequent updates for spotlight
      revalidateOnFocus,
      dedupingInterval: 10000,
    }
  )

  // Combine all data
  const isLoading = !digest && !digestError ||
                    !queueData && !queueError ||
                    !metrics && !metricsError ||
                    !spotlightData && !spotlightError

  const hasError = digestError || queueError || metricsError || spotlightError

  const data: DashboardData | undefined = isLoading ? undefined : {
    digest: digest || null,
    queue: queueData?.items || [],
    metrics: metrics || {
      time_saved: { value: 0, trend: 0, unit: 'hours' },
      pipeline_value: { value: 0, trend: 0, unit: 'GBP' },
      active_leads: { value: 0, trend: 0, unit: 'leads' },
      searches: { value: 0, trend: 0 },
    },
    spotlight: spotlightData?.items || [],
  }

  // Mutation functions for optimistic updates
  const mutate = {
    digest: mutateDigest,
    queue: mutateQueue,
    metrics: mutateMetrics,
    spotlight: mutateSpotlight,
  }

  return {
    data,
    isLoading,
    error: hasError ? {
      digest: digestError,
      queue: queueError,
      metrics: metricsError,
      spotlight: spotlightError,
    } : null,
    mutate,
  }
}

/**
 * Hook for fetching AI digest only
 */
export function useAIDigest() {
  const { data, error, mutate } = useSWR<AIDigest>(
    '/api/dashboard/digest',
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  )

  return {
    digest: data,
    isLoading: !data && !error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching priority queue only
 */
export function usePriorityQueue(options: {
  limit?: number
  status?: string
} = {}) {
  const { limit = 10, status = 'pending' } = options

  const { data, error, mutate } = useSWR<{
    items: PriorityQueueItem[]
    total: number
  }>(
    `/api/dashboard/priority-queue?limit=${limit}&status=${status}`,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  )

  return {
    queue: data?.items || [],
    total: data?.total || 0,
    isLoading: !data && !error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching dashboard metrics only
 */
export function useDashboardMetrics(period: '7d' | '30d' | '90d' = '7d') {
  const { data, error, mutate } = useSWR<DashboardMetrics>(
    `/api/dashboard/metrics?period=${period}`,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  )

  return {
    metrics: data,
    isLoading: !data && !error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching feature spotlight only
 */
export function useFeatureSpotlight() {
  const { data, error, mutate } = useSWR<{
    items: FeatureSpotlight[]
  }>(
    '/api/dashboard/spotlight',
    fetcher,
    {
      refreshInterval: 60000, // 1 minute
      revalidateOnFocus: true,
    }
  )

  return {
    spotlight: data?.items || [],
    isLoading: !data && !error,
    error,
    mutate,
  }
}
