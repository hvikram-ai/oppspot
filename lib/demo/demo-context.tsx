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

interface AcquisitionScan {
  id: string
  name: string
  description: string
  status: 'configuring' | 'scanning' | 'analyzing' | 'completed' | 'failed' | 'paused'
  progress_percentage: number
  targets_identified: number
  targets_analyzed: number
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
  selected_industries?: any
  selected_regions?: any
  current_step: string
}

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
  getDemoScans: () => AcquisitionScan[]
  addDemoScan: (scan: Omit<AcquisitionScan, 'id' | 'created_at' | 'updated_at'>) => AcquisitionScan
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
  showUpgradePrompt: () => {},
  getDemoScans: () => [],
  addDemoScan: () => ({} as AcquisitionScan)
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
  'collapse',
  'scan',
  'opp_scan',
  'configure',
  'analyze'
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

// Default demo scans
const DEFAULT_DEMO_SCANS: AcquisitionScan[] = [
  {
    id: 'demo-scan-1',
    name: 'UK FinTech Acquisition Scan',
    description: 'Comprehensive scan for financial technology acquisitions in the UK market',
    status: 'completed',
    progress_percentage: 100,
    targets_identified: 47,
    targets_analyzed: 47,
    created_at: '2024-08-25T10:30:00Z',
    updated_at: '2024-08-25T14:45:00Z',
    started_at: '2024-08-25T10:35:00Z',
    completed_at: '2024-08-25T14:45:00Z',
    current_step: 'completed',
    selected_industries: [
      { key: 'technology:fintech', industry: 'Technology', subcategory: 'FinTech' }
    ],
    selected_regions: [
      { id: 'london', name: 'Greater London', country: 'England' }
    ]
  },
  {
    id: 'demo-scan-2',
    name: 'Healthcare Tech Ireland',
    description: 'Health technology companies across Ireland for strategic acquisition',
    status: 'scanning',
    progress_percentage: 65,
    targets_identified: 23,
    targets_analyzed: 15,
    created_at: '2024-08-30T09:15:00Z',
    updated_at: '2024-08-30T16:20:00Z',
    started_at: '2024-08-30T09:20:00Z',
    current_step: 'financial_analysis',
    selected_industries: [
      { key: 'healthcare:health-tech', industry: 'Healthcare', subcategory: 'Health Technology' }
    ],
    selected_regions: [
      { id: 'dublin', name: 'Dublin', country: 'Ireland' }
    ]
  },
  {
    id: 'demo-scan-3',
    name: 'Manufacturing Consolidation',
    description: 'Small-medium manufacturing companies for consolidation opportunities',
    status: 'configuring',
    progress_percentage: 0,
    targets_identified: 0,
    targets_analyzed: 0,
    created_at: '2024-09-01T08:00:00Z',
    updated_at: '2024-09-01T08:00:00Z',
    current_step: 'industry_selection',
    selected_industries: [
      { key: 'manufacturing', industry: 'Manufacturing' }
    ],
    selected_regions: [
      { id: 'birmingham', name: 'Birmingham & West Midlands', country: 'England' }
    ]
  }
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

  const getDemoScans = (): AcquisitionScan[] => {
    if (typeof window === 'undefined') return DEFAULT_DEMO_SCANS
    
    try {
      const stored = localStorage.getItem('demo-acquisition-scans')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Error loading demo scans from localStorage:', error)
    }
    
    // Initialize with default scans if none exist
    localStorage.setItem('demo-acquisition-scans', JSON.stringify(DEFAULT_DEMO_SCANS))
    return DEFAULT_DEMO_SCANS
  }

  const addDemoScan = (scanData: Omit<AcquisitionScan, 'id' | 'created_at' | 'updated_at'>): AcquisitionScan => {
    const now = new Date().toISOString()
    const newScan: AcquisitionScan = {
      ...scanData,
      id: `demo-scan-${Date.now()}`,
      created_at: now,
      updated_at: now
    }

    const currentScans = getDemoScans()
    const updatedScans = [newScan, ...currentScans] // Add new scan at the beginning

    if (typeof window !== 'undefined') {
      localStorage.setItem('demo-acquisition-scans', JSON.stringify(updatedScans))
    }

    return newScan
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
        showUpgradePrompt,
        getDemoScans,
        addDemoScan
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