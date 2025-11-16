'use client'

interface InteractionData {
  feature_name: string
  interaction_type: 'click' | 'view' | 'hover' | 'focus' | 'complete' | 'dismiss'
  context?: {
    source?: string
    page?: string
    position?: number
    [key: string]: unknown
  }
}

// Batch interactions to reduce API calls
let interactionQueue: InteractionData[] = []
let flushTimeout: NodeJS.Timeout | null = null

const BATCH_SIZE = 10
const FLUSH_INTERVAL = 5000 // 5 seconds

/**
 * Track user interaction with features
 * Automatically batches requests to reduce server load
 */
export async function trackInteraction(data: InteractionData) {
  // Add to queue
  interactionQueue.push({
    ...data,
    context: {
      ...data.context,
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
    },
  })

  // Flush if batch size reached
  if (interactionQueue.length >= BATCH_SIZE) {
    await flushInteractions()
  } else {
    // Schedule flush
    if (flushTimeout) clearTimeout(flushTimeout)
    flushTimeout = setTimeout(flushInteractions, FLUSH_INTERVAL)
  }
}

/**
 * Flush queued interactions to server
 */
async function flushInteractions() {
  if (interactionQueue.length === 0) return

  const batch = [...interactionQueue]
  interactionQueue = []

  if (flushTimeout) {
    clearTimeout(flushTimeout)
    flushTimeout = null
  }

  try {
    await fetch('/api/dashboard/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interactions: batch }),
    })
  } catch (error) {
    console.error('Failed to track interactions:', error)
    // Silently fail - don't disrupt user experience
  }
}

/**
 * Track feature spotlight impression
 */
export function trackSpotlightView(featureId: string, position: number) {
  trackInteraction({
    feature_name: featureId,
    interaction_type: 'view',
    context: {
      source: 'feature_spotlight',
      position,
    },
  })
}

/**
 * Track command palette usage
 */
export function trackCommandUsage(command: string) {
  trackInteraction({
    feature_name: 'command_palette',
    interaction_type: 'click',
    context: {
      command,
      source: 'keyboard_shortcut',
    },
  })
}

/**
 * Track digest interaction
 */
export function trackDigestInteraction(action: 'expand' | 'collapse' | 'mark_read' | 'view_detail') {
  trackInteraction({
    feature_name: 'ai_digest',
    interaction_type: action === 'expand' || action === 'collapse' ? 'click' : 'complete',
    context: {
      action,
      source: 'dashboard',
    },
  })
}

/**
 * Track queue item action
 */
export function trackQueueAction(
  itemId: string,
  action: 'start' | 'complete' | 'dismiss'
) {
  trackInteraction({
    feature_name: 'priority_queue',
    interaction_type: 'click',
    context: {
      action,
      item_id: itemId,
      source: 'dashboard',
    },
  })
}

/**
 * Flush interactions before page unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (interactionQueue.length > 0) {
      // Use sendBeacon for reliable delivery during page unload
      navigator.sendBeacon(
        '/api/dashboard/interactions',
        JSON.stringify({ interactions: interactionQueue })
      )
    }
  })
}
