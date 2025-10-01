'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { Badge } from '@/components/ui/badge'
import {
  History,
  FolderOpen,
  TrendingUp,
  Download,
  Clock,
  Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export function QuickActions() {
  const router = useRouter()

  // Cross-workflow shortcuts that span multiple categories
  const actions = [
    {
      title: 'Continue Last Search',
      description: 'Resume where you left off',
      tooltip: 'Quickly jump back to your most recent search with all filters and results preserved. Seamlessly continue your discovery workflow.',
      icon: History,
      onClick: () => router.push('/search?recent=true'),
      variant: 'default' as const,
      badge: 'Discover'
    },
    {
      title: 'Recent Stream',
      description: 'Q1 2025 Targets',
      tooltip: 'Access your most recently active project workspace with all associated searches, lists, and analytics in one place.',
      icon: FolderOpen,
      onClick: () => router.push('/streams/recent'),
      variant: 'default' as const,
      badge: '12 items',
      comingSoon: true
    },
    {
      title: 'Top Scored Lead',
      description: 'AI-ranked opportunity',
      tooltip: 'View your highest-scoring prospect based on AI analysis. Strategic fit: 94%, Deal probability: High, Recommended timing: Now.',
      icon: TrendingUp,
      onClick: () => router.push('/ai-scoring?top=true'),
      variant: 'default' as const,
      badge: '94%',
      highlight: true
    },
    {
      title: 'Quick Export',
      description: 'Last search results',
      tooltip: 'Instantly export your most recent search results to CSV, Excel, or PDF for CRM integration and external analysis.',
      icon: Download,
      onClick: () => router.push('/export?quick=true'),
      variant: 'default' as const,
      badge: 'Outreach'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Cross-workflow shortcuts to boost productivity</CardDescription>
          </div>
          <HelpTooltip
            content="Smart shortcuts that work across Discover, Research, and Outreach workflows to save you time."
            side="left"
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
          </HelpTooltip>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                  className={`h-auto flex-col py-4 gap-2 relative ${
                    action.highlight
                      ? 'border-2 border-primary bg-primary/5 hover:bg-primary/10'
                      : ''
                  } ${
                    action.comingSoon
                      ? 'opacity-60'
                      : ''
                  }`}
                  onClick={action.onClick}
                  disabled={action.comingSoon}
                >
                  {action.badge && (
                    <Badge
                      variant={action.highlight ? 'default' : 'secondary'}
                      className="absolute top-2 right-2 text-xs px-2 h-5"
                    >
                      {action.badge}
                    </Badge>
                  )}
                  <Icon className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold text-sm">{action.title}</div>
                    <div className="text-xs opacity-80 mt-1">
                      {action.description}
                    </div>
                    {action.comingSoon && (
                      <Badge variant="outline" className="text-xs mt-2">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                </Button>
              </HelpTooltip>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}