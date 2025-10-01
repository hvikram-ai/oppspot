'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { Badge } from '@/components/ui/badge'
import {
  History,
  FolderOpen,
  TrendingUp,
  Download,
  Zap,
  ArrowRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

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
      badge: 'Discover',
      badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      gradient: 'from-blue-500/10 to-blue-500/5',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Recent Stream',
      description: 'Q1 2025 Targets',
      tooltip: 'Access your most recently active project workspace with all associated searches, lists, and analytics in one place.',
      icon: FolderOpen,
      onClick: () => router.push('/streams/recent'),
      badge: '12 items',
      badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      gradient: 'from-purple-500/10 to-purple-500/5',
      iconColor: 'text-purple-600 dark:text-purple-400',
      comingSoon: true
    },
    {
      title: 'Top Scored Lead',
      description: 'AI-ranked opportunity',
      tooltip: 'View your highest-scoring prospect based on AI analysis. Strategic fit: 94%, Deal probability: High, Recommended timing: Now.',
      icon: TrendingUp,
      onClick: () => router.push('/ai-scoring?top=true'),
      badge: '94%',
      badgeColor: 'bg-green-500/10 text-green-700 dark:text-green-400',
      gradient: 'from-green-500/10 to-green-500/5',
      iconColor: 'text-green-600 dark:text-green-400',
      highlight: true
    },
    {
      title: 'Quick Export',
      description: 'Last search results',
      tooltip: 'Instantly export your most recent search results to CSV, Excel, or PDF for CRM integration and external analysis.',
      icon: Download,
      onClick: () => router.push('/export?quick=true'),
      badge: 'Outreach',
      badgeColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
      gradient: 'from-orange-500/10 to-orange-500/5',
      iconColor: 'text-orange-600 dark:text-orange-400'
    }
  ]

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-amber-500" fill="currentColor" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-xs mt-1">Cross-workflow shortcuts to boost productivity</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <HelpTooltip
                key={action.title}
                content={action.tooltip}
                side="top"
                delayDuration={300}
              >
                <button
                  onClick={action.onClick}
                  disabled={action.comingSoon}
                  className={cn(
                    'group relative overflow-hidden rounded-lg p-4 text-left transition-all duration-200',
                    'bg-gradient-to-br border hover:shadow-md',
                    `${action.gradient} hover:scale-[1.02]`,
                    action.highlight && 'ring-2 ring-green-500/20',
                    action.comingSoon && 'opacity-50 cursor-not-allowed hover:scale-100'
                  )}
                >
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
                    <Icon className="w-full h-full" />
                  </div>

                  {/* Content */}
                  <div className="relative space-y-3">
                    {/* Icon and Badge */}
                    <div className="flex items-start justify-between">
                      <div className={cn('p-2 rounded-lg bg-background/50', action.iconColor)}>
                        <Icon className="h-5 w-5" strokeWidth={2.5} />
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px] font-medium px-2 h-5', action.badgeColor)}
                      >
                        {action.badge}
                      </Badge>
                    </div>

                    {/* Title and Description */}
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm leading-none group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {action.description}
                      </p>
                    </div>

                    {/* Coming Soon or Arrow */}
                    <div className="flex items-center justify-between">
                      {action.comingSoon ? (
                        <Badge variant="outline" className="text-[10px] px-2 h-5">
                          Coming Soon
                        </Badge>
                      ) : (
                        <div className="flex items-center text-xs text-muted-foreground group-hover:text-primary transition-colors">
                          <span className="mr-1">Open</span>
                          <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Highlight pulse effect */}
                  {action.highlight && (
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
                  )}
                </button>
              </HelpTooltip>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}