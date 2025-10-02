'use client'

import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Settings, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <Bell className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Notifications</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Analysis Complete</p>
                    <p className="text-sm text-muted-foreground">Your similarity analysis has finished processing</p>
                    <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                  </div>
                  <Badge variant="secondary">New</Badge>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">System Update</p>
                    <p className="text-sm text-muted-foreground">New features have been added to the platform</p>
                    <p className="text-xs text-muted-foreground mt-1">1 day ago</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">API Limit Warning</p>
                    <p className="text-sm text-muted-foreground">You&apos;ve used 80% of your monthly API quota</p>
                    <p className="text-xs text-muted-foreground mt-1">3 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}