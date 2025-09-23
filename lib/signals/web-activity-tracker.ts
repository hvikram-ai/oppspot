/**
 * Web Activity Tracker
 * Client-side tracking for web activity signals
 */

export interface WebActivity {
  session_id: string
  company_id?: string
  visitor_id: string
  page_url: string
  page_title: string
  page_type?: string
  referrer?: string
  time_on_page?: number
  scroll_depth?: number
  clicks?: number
  form_interactions?: boolean
  timestamp: Date
}

export interface TrackingConfig {
  apiEndpoint: string
  sessionTimeout: number // minutes
  trackScrollDepth: boolean
  trackClicks: boolean
  trackForms: boolean
  highIntentPages: string[]
}

export class WebActivityTracker {
  private config: TrackingConfig
  private sessionId: string
  private visitorId: string
  private companyId?: string
  private startTime: number
  private maxScrollDepth: number = 0
  private clickCount: number = 0
  private formInteracted: boolean = false
  private trackingInterval?: NodeJS.Timeout

  constructor(config?: Partial<TrackingConfig>) {
    this.config = {
      apiEndpoint: '/api/signals/track',
      sessionTimeout: 30,
      trackScrollDepth: true,
      trackClicks: true,
      trackForms: true,
      highIntentPages: ['/pricing', '/demo', '/trial', '/contact', '/sales'],
      ...config
    }

    this.sessionId = this.getOrCreateSessionId()
    this.visitorId = this.getOrCreateVisitorId()
    this.startTime = Date.now()

    this.initialize()
  }

  /**
   * Initialize tracking
   */
  private initialize() {
    // Track page view immediately
    this.trackPageView()

    // Set up event listeners
    if (this.config.trackScrollDepth) {
      this.trackScroll()
    }

    if (this.config.trackClicks) {
      this.trackClicks()
    }

    if (this.config.trackForms) {
      this.trackFormInteractions()
    }

    // Track time on page before unload
    this.trackTimeOnPage()

    // Send heartbeat every 30 seconds for engagement tracking
    this.startHeartbeat()
  }

  /**
   * Track page view
   */
  private async trackPageView() {
    const activity: WebActivity = {
      session_id: this.sessionId,
      company_id: this.companyId,
      visitor_id: this.visitorId,
      page_url: window.location.href,
      page_title: document.title,
      page_type: this.determinePageType(),
      referrer: document.referrer,
      timestamp: new Date()
    }

    await this.sendActivity(activity, 'page_view')
  }

  /**
   * Track scroll depth
   */
  private trackScroll() {
    let ticking = false

    const updateScrollDepth = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop

      const scrollPercentage = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      )

      this.maxScrollDepth = Math.max(this.maxScrollDepth, scrollPercentage)
      ticking = false
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDepth)
        ticking = true
      }
    })
  }

  /**
   * Track clicks
   */
  private trackClicks() {
    document.addEventListener('click', (e) => {
      this.clickCount++

      const target = e.target as HTMLElement
      const isHighIntentClick = this.isHighIntentElement(target)

      if (isHighIntentClick) {
        this.sendActivity({
          session_id: this.sessionId,
          company_id: this.companyId,
          visitor_id: this.visitorId,
          page_url: window.location.href,
          page_title: document.title,
          timestamp: new Date()
        }, 'high_intent_click', {
          element: target.tagName,
          text: target.textContent?.substring(0, 100)
        })
      }
    })
  }

  /**
   * Track form interactions
   */
  private trackFormInteractions() {
    const forms = document.querySelectorAll('form')

    forms.forEach(form => {
      form.addEventListener('focus', () => {
        if (!this.formInteracted) {
          this.formInteracted = true
          this.sendActivity({
            session_id: this.sessionId,
            company_id: this.companyId,
            visitor_id: this.visitorId,
            page_url: window.location.href,
            page_title: document.title,
            timestamp: new Date()
          }, 'form_interaction')
        }
      }, true)

      form.addEventListener('submit', (e) => {
        const formId = form.id || form.className
        this.sendActivity({
          session_id: this.sessionId,
          company_id: this.companyId,
          visitor_id: this.visitorId,
          page_url: window.location.href,
          page_title: document.title,
          timestamp: new Date()
        }, 'form_submission', {
          form_id: formId
        })
      })
    })
  }

  /**
   * Track time on page
   */
  private trackTimeOnPage() {
    // Send time on page when leaving
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Math.round((Date.now() - this.startTime) / 1000)

      // Use sendBeacon for reliable delivery
      const data = {
        session_id: this.sessionId,
        company_id: this.companyId,
        visitor_id: this.visitorId,
        page_url: window.location.href,
        page_title: document.title,
        time_on_page: timeOnPage,
        scroll_depth: this.maxScrollDepth,
        clicks: this.clickCount,
        form_interactions: this.formInteracted,
        event_type: 'page_exit'
      }

      navigator.sendBeacon(this.config.apiEndpoint, JSON.stringify(data))
    })
  }

  /**
   * Start heartbeat for engagement tracking
   */
  private startHeartbeat() {
    this.trackingInterval = setInterval(() => {
      const timeOnPage = Math.round((Date.now() - this.startTime) / 1000)

      if (timeOnPage > 30) {
        this.sendActivity({
          session_id: this.sessionId,
          company_id: this.companyId,
          visitor_id: this.visitorId,
          page_url: window.location.href,
          page_title: document.title,
          time_on_page: timeOnPage,
          scroll_depth: this.maxScrollDepth,
          timestamp: new Date()
        }, 'engagement_heartbeat')
      }
    }, 30000) // Every 30 seconds
  }

  /**
   * Determine page type
   */
  private determinePageType(): string {
    const path = window.location.pathname.toLowerCase()

    if (path.includes('pricing') || path.includes('plans')) return 'pricing'
    if (path.includes('demo') || path.includes('trial')) return 'demo'
    if (path.includes('contact') || path.includes('sales')) return 'contact'
    if (path.includes('features') || path.includes('product')) return 'features'
    if (path.includes('blog') || path.includes('resources')) return 'content'
    if (path.includes('about')) return 'about'
    if (path === '/' || path === '') return 'homepage'

    return 'other'
  }

  /**
   * Check if element is high intent
   */
  private isHighIntentElement(element: HTMLElement): boolean {
    const text = element.textContent?.toLowerCase() || ''
    const highIntentKeywords = [
      'pricing', 'demo', 'trial', 'contact', 'sales',
      'get started', 'sign up', 'schedule', 'book'
    ]

    return highIntentKeywords.some(keyword => text.includes(keyword))
  }

  /**
   * Send activity to server
   */
  private async sendActivity(
    activity: WebActivity,
    eventType: string,
    metadata?: any
  ): Promise<void> {
    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...activity,
          event_type: eventType,
          metadata
        })
      })

      if (!response.ok) {
        console.error('Failed to track activity:', response.statusText)
      }
    } catch (error) {
      console.error('Error tracking activity:', error)
    }
  }

  /**
   * Session management
   */
  private getOrCreateSessionId(): string {
    const storageKey = 'oppspot_session_id'
    const sessionTimeout = this.config.sessionTimeout * 60 * 1000 // Convert to ms

    // Check existing session
    const stored = sessionStorage.getItem(storageKey)
    if (stored) {
      const { id, timestamp } = JSON.parse(stored)
      if (Date.now() - timestamp < sessionTimeout) {
        return id
      }
    }

    // Create new session
    const sessionId = this.generateId()
    sessionStorage.setItem(storageKey, JSON.stringify({
      id: sessionId,
      timestamp: Date.now()
    }))

    return sessionId
  }

  /**
   * Visitor ID management (persists across sessions)
   */
  private getOrCreateVisitorId(): string {
    const storageKey = 'oppspot_visitor_id'

    let visitorId = localStorage.getItem(storageKey)
    if (!visitorId) {
      visitorId = this.generateId()
      localStorage.setItem(storageKey, visitorId)
    }

    return visitorId
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Set company ID (when identified)
   */
  public setCompanyId(companyId: string) {
    this.companyId = companyId

    // Track identification event
    this.sendActivity({
      session_id: this.sessionId,
      company_id: this.companyId,
      visitor_id: this.visitorId,
      page_url: window.location.href,
      page_title: document.title,
      timestamp: new Date()
    }, 'company_identified')
  }

  /**
   * Clean up tracking
   */
  public destroy() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval)
    }
  }
}

// Initialize tracker if in browser
export const initializeTracking = (config?: Partial<TrackingConfig>) => {
  if (typeof window !== 'undefined') {
    return new WebActivityTracker(config)
  }
  return null
}