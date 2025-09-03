'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { 
  Search, 
  Map, 
  FilePlus, 
  Upload,
  Users,
  Settings,
  Download,
  BarChart3,
  Target
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function QuickActions() {
  const router = useRouter()
  
  const actions = [
    {
      title: 'New Search',
      description: 'Find businesses',
      tooltip: 'Search through thousands of UK & Ireland businesses using AI-powered filters, location-based queries, and industry-specific criteria to find your ideal prospects.',
      icon: Search,
      onClick: () => router.push('/search'),
      variant: 'default' as const
    },
    {
      title: 'Opp Scan',
      description: 'Acquisition intelligence',
      tooltip: 'Premium feature: Generate comprehensive acquisition target reports with financial analysis, market positioning, strategic fit scoring, and competitive intelligence for M&A opportunities.',
      icon: Target,
      onClick: () => router.push('/opp-scan'),
      variant: 'default' as const,
      premium: true
    },
    {
      title: 'View Map',
      description: 'Geographic view',
      tooltip: 'Visualize business locations on an interactive map with clustering, radius search, demographic overlays, and territory planning tools to understand market density.',
      icon: Map,
      onClick: () => router.push('/map'),
      variant: 'secondary' as const
    },
    {
      title: 'Create List',
      description: 'Organize leads',
      tooltip: 'Build and organize custom prospect lists with tags, notes, contact information, and automated follow-up tracking to manage your sales pipeline effectively.',
      icon: FilePlus,
      onClick: () => router.push('/lists/new'),
      variant: 'secondary' as const
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <HelpTooltip 
                key={action.title}
                content={action.tooltip}
                side="top"
                delayDuration={300}
              >
                <Button
                  variant={action.variant}
                  className={`h-auto flex-col py-4 gap-2 ${
                    action.premium 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0' 
                      : ''
                  }`}
                  onClick={action.onClick}
                >
                  <Icon className="h-5 w-5" />
                  <div className="text-center">
                    <div className="font-semibold">{action.title}</div>
                    <div className={`text-xs ${action.premium ? 'opacity-90' : 'opacity-80'}`}>
                      {action.description}
                    </div>
                    {action.premium && (
                      <div className="text-xs opacity-75 mt-1">Premium</div>
                    )}
                  </div>
                </Button>
              </HelpTooltip>
            )
          })}
        </div>
        
        {/* Secondary Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 pt-4 border-t">
          <HelpTooltip content="Invite team members, assign roles, and manage user permissions for collaborative prospecting and lead management.">
            <Link href="/team" className="w-full">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Manage Team
              </Button>
            </Link>
          </HelpTooltip>
          <HelpTooltip content="View detailed performance metrics, search patterns, conversion rates, and ROI analysis to optimize your prospecting strategy.">
            <Link href="/analytics" className="w-full">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </Link>
          </HelpTooltip>
          <HelpTooltip content="Export your prospect data, search results, and reports in various formats (CSV, Excel, PDF) for external analysis and CRM integration.">
            <Link href="/export" className="w-full">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </Link>
          </HelpTooltip>
          <HelpTooltip content="Configure account preferences, notification settings, API integrations, and billing information for your oppSpot workspace.">
            <Link href="/settings" className="w-full">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </HelpTooltip>
        </div>
      </CardContent>
    </Card>
  )
}