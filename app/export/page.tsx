'use client'

import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileSpreadsheet, FileText, FileJson, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function ExportPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <Download className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Export Data</h1>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
                <CardDescription>Choose your preferred export format</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Excel Export</p>
                        <p className="text-sm text-muted-foreground">Download data in .xlsx format</p>
                      </div>
                    </div>
                    <Button variant="outline">Export</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">CSV Export</p>
                        <p className="text-sm text-muted-foreground">Download data in .csv format</p>
                      </div>
                    </div>
                    <Button variant="outline">Export</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileJson className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium">JSON Export</p>
                        <p className="text-sm text-muted-foreground">Download data in .json format</p>
                      </div>
                    </div>
                    <Button variant="outline">Export</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Exports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">similarity_analysis_2024.xlsx</span>
                    </div>
                    <Badge variant="secondary">2 days ago</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">market_data_export.csv</span>
                    </div>
                    <Badge variant="secondary">1 week ago</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}