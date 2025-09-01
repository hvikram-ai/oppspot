'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Search, 
  Map, 
  FilePlus, 
  Upload,
  Users,
  Settings,
  Download,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function QuickActions() {
  const router = useRouter()
  
  const actions = [
    {
      title: 'New Search',
      description: 'Find businesses',
      icon: Search,
      onClick: () => router.push('/search'),
      variant: 'default' as const
    },
    {
      title: 'View Map',
      description: 'Geographic view',
      icon: Map,
      onClick: () => router.push('/map'),
      variant: 'secondary' as const
    },
    {
      title: 'Create List',
      description: 'Organize leads',
      icon: FilePlus,
      onClick: () => router.push('/lists/new'),
      variant: 'secondary' as const
    },
    {
      title: 'Import Data',
      description: 'Bulk upload',
      icon: Upload,
      onClick: () => router.push('/import'),
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
              <Button
                key={action.title}
                variant={action.variant}
                className="h-auto flex-col py-4 gap-2"
                onClick={action.onClick}
              >
                <Icon className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-semibold">{action.title}</div>
                  <div className="text-xs opacity-80">{action.description}</div>
                </div>
              </Button>
            )
          })}
        </div>
        
        {/* Secondary Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 pt-4 border-t">
          <Link href="/team">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Users className="h-4 w-4 mr-2" />
              Manage Team
            </Button>
          </Link>
          <Link href="/analytics">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href="/export">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}