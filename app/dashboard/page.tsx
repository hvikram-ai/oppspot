import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  Map, 
  Building2, 
  TrendingUp, 
  ArrowRight,
  Activity,
  Users,
  FileText
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const quickActions = [
    {
      title: 'Search Businesses',
      description: 'Find businesses with AI-powered search',
      icon: Search,
      href: '/search',
      color: 'bg-blue-600/10 text-blue-600',
    },
    {
      title: 'Explore Map',
      description: 'Visualize businesses geographically',
      icon: Map,
      href: '/map',
      color: 'bg-green-600/10 text-green-600',
    },
    {
      title: 'View Lists',
      description: 'Manage your saved business lists',
      icon: Building2,
      href: '/lists',
      color: 'bg-purple-600/10 text-purple-600',
    },
    {
      title: 'Analytics',
      description: 'View insights and trends',
      icon: TrendingUp,
      href: '/analytics',
      color: 'bg-orange-600/10 text-orange-600',
    },
  ]

  const stats = [
    { label: 'Searches Today', value: '0', icon: Activity },
    { label: 'Saved Businesses', value: '0', icon: Building2 },
    { label: 'Active Lists', value: '0', icon: FileText },
    { label: 'Team Members', value: '1', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your business intelligence dashboard
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                    <CardHeader>
                      <div className={`h-12 w-12 rounded-lg ${action.color} flex items-center justify-center mb-4`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="ghost" size="sm" className="group">
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest searches and actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm mt-2">Start by searching for businesses or exploring the map</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}