'use client'

import { onCLS, onFID, onFCP, onLCP, onTTFB, Metric } from 'web-vitals'

interface PageViewData {
  page: string
  referrer: string
  user_agent: string
  viewport: {
    width: number
    height: number
  }
  metrics?: {
    cls?: number
    fid?: number
    fcp?: number
    lcp?: number
    ttfb?: number
  }
}

/**
 * Track page view with Web Vitals metrics
 */
export function trackPageView() {
  const pageData: PageViewData = {
    page: window.location.pathname,
    referrer: document.referrer,
    user_agent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    metrics: {},
  }

  // Collect Web Vitals
  onCLS((metric: Metric) => {
    pageData.metrics!.cls = metric.value
    sendPageView(pageData)
  })

  onFID((metric: Metric) => {
    pageData.metrics!.fid = metric.value
    sendPageView(pageData)
  })

  onFCP((metric: Metric) => {
    pageData.metrics!.fcp = metric.value
    sendPageView(pageData)
  })

  onLCP((metric: Metric) => {
    pageData.metrics!.lcp = metric.value
    sendPageView(pageData)
  })

  onTTFB((metric: Metric) => {
    pageData.metrics!.ttfb = metric.value
    sendPageView(pageData)
  })

  // Send initial page view (without metrics)
  sendPageView(pageData)
}

/**
 * Send page view data to analytics endpoint
 */
async function sendPageView(data: PageViewData) {
  try {
    await fetch('/api/dashboard/analytics/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
      }),
      // Don't wait for response
      keepalive: true,
    })
  } catch (error) {
    // Silently fail - don't disrupt user experience
    console.error('Failed to track page view:', error)
  }
}

/**
 * Track custom event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  try {
    fetch('/api/dashboard/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        properties: {
          ...properties,
          page: window.location.pathname,
          timestamp: new Date().toISOString(),
        },
      }),
      keepalive: true,
    })
  } catch (error) {
    console.error('Failed to track event:', error)
  }
}
