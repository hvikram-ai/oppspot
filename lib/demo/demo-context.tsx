'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { 
  demoBusinesses, 
  demoMetrics, 
  demoOpportunities,
  demoTrends,
  demoCompetitors,
  demoNotifications,
  demoUser 
} from './demo-data'

interface DemoContextType {
  isDemoMode: boolean
  enableDemoMode: () => void
  disableDemoMode: () => void
  demoData: {
    businesses: typeof demoBusinesses
    metrics: typeof demoMetrics
    opportunities: typeof demoOpportunities
    trends: typeof demoTrends
    competitors: typeof demoCompetitors
    notifications: typeof demoNotifications
    user: typeof demoUser
  }
  canPerformAction: (action: string) => boolean
  showUpgradePrompt: () => void
}

const DemoContext = createContext<DemoContextType>({
  isDemoMode: false,
  enableDemoMode: () => {},
  disableDemoMode: () => {},
  demoData: {
    businesses: demoBusinesses,
    metrics: demoMetrics,
    opportunities: demoOpportunities,
    trends: demoTrends,
    competitors: demoCompetitors,
    notifications: demoNotifications,
    user: demoUser
  },
  canPerformAction: () => false,
  showUpgradePrompt: () => {}
})

// Actions allowed in demo mode
const DEMO_ALLOWED_ACTIONS = [
  'view',
  'search',
  'filter',
  'sort',
  'navigate',
  'toggle',
  'expand',
  'collapse'
]

// Actions that require full access
const RESTRICTED_ACTIONS = [
  'create',
  'update',
  'delete',
  'export',
  'save',
  'claim',
  'contact',
  'message',
  'subscribe',
  'integrate'
]

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check if demo mode is enabled via URL or localStorage
    const urlParams = new URLSearchParams(window.location.search)
    const demoParam = urlParams.get('demo')
    const storedDemoMode = localStorage.getItem('demoMode')
    
    if (demoParam === 'true' || storedDemoMode === 'true') {
      setIsDemoMode(true)
    }
  }, [pathname])

  const enableDemoMode = () => {
    setIsDemoMode(true)
    localStorage.setItem('demoMode', 'true')
    
    // Track demo mode activation
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'demo_mode_activated', {
        event_category: 'engagement',
        event_label: 'demo'
      })
    }
  }

  const disableDemoMode = () => {
    setIsDemoMode(false)
    localStorage.removeItem('demoMode')
    router.push('/login')
  }

  const canPerformAction = (action: string): boolean => {
    if (!isDemoMode) return true
    return DEMO_ALLOWED_ACTIONS.includes(action.toLowerCase())
  }

  const showUpgradePrompt = () => {
    // Show a modal or toast prompting to sign up
    const message = 'This feature requires a full account. Sign up now to unlock all features!'
    
    // You can implement a proper modal here
    if (typeof window !== 'undefined') {
      const shouldSignUp = window.confirm(message + '\n\nWould you like to create an account?')
      if (shouldSignUp) {
        disableDemoMode()
      }
    }
  }

  const demoData = {
    businesses: demoBusinesses,
    metrics: demoMetrics,
    opportunities: demoOpportunities,
    trends: demoTrends,
    competitors: demoCompetitors,
    notifications: demoNotifications,
    user: demoUser
  }

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        enableDemoMode,
        disableDemoMode,
        demoData,
        canPerformAction,
        showUpgradePrompt
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}

export const useDemoMode = () => {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error('useDemoMode must be used within DemoModeProvider')
  }
  return context
}

// HOC to wrap components that need demo mode protection
export function withDemoProtection<P extends object>(
  Component: React.ComponentType<P>,
  requiredAction: string = 'view'
) {
  return function DemoProtectedComponent(props: P) {
    const { isDemoMode, canPerformAction, showUpgradePrompt } = useDemoMode()
    
    if (isDemoMode && !canPerformAction(requiredAction)) {
      return (
        <div className="p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Feature Restricted</h3>
          <p className="text-muted-foreground mb-4">
            This feature is not available in demo mode.
          </p>
          <button
            onClick={showUpgradePrompt}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Upgrade to Full Access
          </button>
        </div>
      )
    }
    
    return <Component {...props} />
  }
}