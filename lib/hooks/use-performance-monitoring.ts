'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface PerformanceMetrics {
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  ttfb?: number // Time to First Byte
  tti?: number // Time to Interactive
}

/**
 * Hook to monitor Web Vitals and send to analytics
 */
export function usePerformanceMonitoring() {
  const pathname = usePathname()

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    const metrics: PerformanceMetrics = {}

    // Observe performance entries
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Largest Contentful Paint
        if (entry.entryType === 'largest-contentful-paint') {
          metrics.lcp = entry.startTime
        }

        // First Input Delay
        if (entry.entryType === 'first-input') {
          metrics.fid = (entry as PerformanceEventTiming).processingStart - entry.startTime
        }

        // Cumulative Layout Shift
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          metrics.cls = (metrics.cls || 0) + (entry as any).value
        }
      }
    })

    // Observe different entry types
    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
    } catch (e) {
      // Some browsers don't support all entry types
      console.warn('Performance observer failed:', e)
    }

    // Get navigation timing metrics
    const getNavigationMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      if (navigation) {
        metrics.ttfb = navigation.responseStart - navigation.requestStart
        metrics.fcp = navigation.domContentLoadedEventEnd - navigation.fetchStart
        metrics.tti = navigation.domInteractive - navigation.fetchStart
      }

      // Send metrics to analytics after page is fully loaded
      sendMetrics(metrics)
    }

    // Wait for load event
    if (document.readyState === 'complete') {
      getNavigationMetrics()
    } else {
      window.addEventListener('load', getNavigationMetrics)
    }

    return () => {
      observer.disconnect()
      window.removeEventListener('load', getNavigationMetrics)
    }
  }, [pathname])

  const sendMetrics = async (metrics: PerformanceMetrics) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Performance Metrics:', {
        page: pathname,
        ...metrics,
        ratings: {
          fcp: metrics.fcp ? (metrics.fcp < 1000 ? 'good' : metrics.fcp < 2500 ? 'needs improvement' : 'poor') : 'N/A',
          lcp: metrics.lcp ? (metrics.lcp < 2000 ? 'good' : metrics.lcp < 4000 ? 'needs improvement' : 'poor') : 'N/A',
          fid: metrics.fid ? (metrics.fid < 100 ? 'good' : metrics.fid < 300 ? 'needs improvement' : 'poor') : 'N/A',
          cls: metrics.cls ? (metrics.cls < 0.1 ? 'good' : metrics.cls < 0.25 ? 'needs improvement' : 'poor') : 'N/A',
        }
      })
    }

    // Send to analytics endpoint
    try {
      await fetch('/api/dashboard/analytics/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: pathname,
          metrics,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (error) {
      // Silently fail - don't disrupt user experience
      console.error('Failed to send performance metrics:', error)
    }
  }
}

/**
 * Report Web Vitals using web-vitals library (if available)
 */
export function reportWebVitals() {
  if (typeof window === 'undefined') return

  // Check if web-vitals is available
  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
    onCLS((metric) => console.log('CLS:', metric))
    onFID((metric) => console.log('FID:', metric))
    onFCP((metric) => console.log('FCP:', metric))
    onLCP((metric) => console.log('LCP:', metric))
    onTTFB((metric) => console.log('TTFB:', metric))
  }).catch(() => {
    // web-vitals not installed, use built-in monitoring
  })
}
