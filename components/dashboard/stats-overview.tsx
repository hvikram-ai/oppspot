'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { 
  Search, 
  Building2, 
  Users, 
  TrendingUp,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

export function StatsOverview() {
  const stats = [
    {
      title: 'Total Searches',
      value: '1,234',
      change: '+12.5%',
      trend: 'up',
      icon: Search,
      description: 'This month',
      tooltip: 'Total number of business searches performed this month using various search criteria, filters, and AI-powered matching algorithms across all team members.'
    },
    {
      title: 'Saved Businesses',
      value: '89',
      change: '+4.2%',
      trend: 'up',
      icon: Building2,
      description: 'Active leads',
      tooltip: 'Number of businesses saved to your prospect lists and actively being tracked for potential opportunities, partnerships, or acquisitions.'
    },
    {
      title: 'Team Members',
      value: '12',
      change: '0%',
      trend: 'neutral',
      icon: Users,
      description: 'Active users',
      tooltip: 'Current number of active team members with access to your oppSpot workspace, including administrators, analysts, and collaborators.'
    },
    {
      title: 'Conversion Rate',
      value: '24.3%',
      change: '-2.1%',
      trend: 'down',
      icon: TrendingUp,
      description: 'Lead to customer',
      tooltip: 'Percentage of identified prospects that successfully convert to actual business opportunities, partnerships, or closed deals within your sales funnel.'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        const TrendIcon = stat.trend === 'up' ? ArrowUp : stat.trend === 'down' ? ArrowDown : null
        const trendColor = stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'

        return (
          <HelpTooltip
            key={stat.title}
            content={stat.tooltip}
            side="top"
            delayDuration={300}
          >
            <Card className="hover:shadow-lg transition-shadow cursor-help">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                  {TrendIcon && (
                    <div className={`flex items-center text-xs ${trendColor}`}>
                      <TrendIcon className="h-3 w-3 mr-1" />
                      {stat.change}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </HelpTooltip>
        )
      })}
    </div>
  )
}