'use client'

import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Clock, FileSearch, Download, Eye, Share2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function ActivityPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Activity Log</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 pb-4 border-b">
                  <div className="p-2 rounded-full bg-blue-100">
                    <FileSearch className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Started similarity analysis</p>
                    <p className="text-sm text-muted-foreground">Analyzing itonics GmbH</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">2 hours ago</span>
                    </div>
                  </div>
                  <Badge>Completed</Badge>
                </div>

                <div className="flex items-start gap-3 pb-4 border-b">
                  <div className="p-2 rounded-full bg-green-100">
                    <Download className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Exported analysis report</p>
                    <p className="text-sm text-muted-foreground">PDF format - 25 pages</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">5 hours ago</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 pb-4 border-b">
                  <div className="p-2 rounded-full bg-purple-100">
                    <Eye className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Viewed company profile</p>
                    <p className="text-sm text-muted-foreground">Tech Solutions Ltd</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">1 day ago</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-orange-100">
                    <Share2 className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Shared analysis results</p>
                    <p className="text-sm text-muted-foreground">Shared with 3 team members</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">2 days ago</span>
                    </div>
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