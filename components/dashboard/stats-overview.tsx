'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      description: 'This month'
    },
    {
      title: 'Saved Businesses',
      value: '89',
      change: '+4.2%',
      trend: 'up',
      icon: Building2,
      description: 'Active leads'
    },
    {
      title: 'Team Members',
      value: '12',
      change: '0%',
      trend: 'neutral',
      icon: Users,
      description: 'Active users'
    },
    {
      title: 'Conversion Rate',
      value: '24.3%',
      change: '-2.1%',
      trend: 'down',
      icon: TrendingUp,
      description: 'Lead to customer'
    }
  ]

  return (
    <>
      {stats.map((stat) => {
        const Icon = stat.icon
        const TrendIcon = stat.trend === 'up' ? ArrowUp : stat.trend === 'down' ? ArrowDown : null
        const trendColor = stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
        
        return (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow">
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
        )
      })}
    </>
  )
}