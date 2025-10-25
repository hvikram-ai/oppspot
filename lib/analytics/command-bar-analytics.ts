'use client'

// Command Bar Analytics Tracking
// Tracks usage patterns to optimize the feature

export type CommandBarEvent =
  | 'command_bar_opened'
  | 'command_bar_closed'
  | 'search_query'
  | 'ai_suggestion_clicked'
  | 'search_result_clicked'
  | 'quick_action_clicked'
  | 'navigation_clicked'
  | 'recent_item_clicked'
  | 'keyboard_shortcut_used'

interface CommandBarEventData {
  event: CommandBarEvent
  query?: string
  resultType?: 'company' | 'stream' | 'scan' | 'list' | 'ai_suggestion' | 'quick_action' | 'navigation' | 'recent'
  resultId?: string
  resultTitle?: string
  timestamp?: number
  userId?: string
}

class CommandBarAnalytics {
  private endpoint = '/api/analytics/command-bar'
  private queue: CommandBarEventData[] = []
  private flushTimeout: NodeJS.Timeout | null = null
  private readonly FLUSH_INTERVAL = 5000 // 5 seconds

  track(data: Omit<CommandBarEventData, 'timestamp'>) {
    const event: CommandBarEventData = {
      ...data,
      timestamp: Date.now(),
    }

    this.queue.push(event)

    // Also log to localStorage for offline tracking
    this.logToLocalStorage(event)

    // Flush queue after interval
    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), this.FLUSH_INTERVAL)
    }
  }

  private logToLocalStorage(event: CommandBarEventData) {
    try {
      const key = 'oppspot:command-bar-analytics'
      const stored = localStorage.getItem(key)
      const events: CommandBarEventData[] = stored ? JSON.parse(stored) : []

      events.push(event)

      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100)
      }

      localStorage.setItem(key, JSON.stringify(events))
    } catch (error) {
      console.error('Failed to log analytics to localStorage:', error)
    }
  }

  private async flush() {
    if (this.queue.length === 0) return

    const events = [...this.queue]
    this.queue = []
    this.flushTimeout = null

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      })
    } catch (error) {
      // Silently fail - don't break UX for analytics
      console.warn('Analytics tracking failed:', error)
    }
  }

  // Get analytics summary from localStorage
  getSummary() {
    try {
      const key = 'oppspot:command-bar-analytics'
      const stored = localStorage.getItem(key)
      const events: CommandBarEventData[] = stored ? JSON.parse(stored) : []

      const summary = {
        totalSearches: events.filter(e => e.event === 'search_query').length,
        totalOpens: events.filter(e => e.event === 'command_bar_opened').length,
        aiSuggestionClicks: events.filter(e => e.event === 'ai_suggestion_clicked').length,
        topQueries: this.getTopQueries(events),
        popularResultTypes: this.getPopularResultTypes(events),
      }

      return summary
    } catch {
      return null
    }
  }

  private getTopQueries(events: CommandBarEventData[]): Array<{ query: string; count: number }> {
    const queries = events
      .filter(e => e.event === 'search_query' && e.query)
      .map(e => e.query!)

    const counts: Record<string, number> = {}
    queries.forEach(q => {
      counts[q] = (counts[q] || 0) + 1
    })

    return Object.entries(counts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  private getPopularResultTypes(events: CommandBarEventData[]): Array<{ type: string; count: number }> {
    const types = events
      .filter(e => e.resultType)
      .map(e => e.resultType!)

    const counts: Record<string, number> = {}
    types.forEach(t => {
      counts[t] = (counts[t] || 0) + 1
    })

    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
  }
}

export const commandBarAnalytics = new CommandBarAnalytics()
