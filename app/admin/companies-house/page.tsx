'use client'

/**
 * Companies House Import Admin Page
 * Manage bulk import of UK company data
 */

import { useState, useEffect } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Filter,
  Info,
  AlertTriangle
} from 'lucide-react'

export default function CompaniesHouseImportPage() {
  const [progress, setProgress] = useState<any>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    fetchProgress()
    fetchStats()

    // Poll for progress every 2 seconds if importing
    const interval = setInterval(() => {
      if (progress?.status === 'processing' || progress?.status === 'downloading') {
        fetchProgress()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [progress?.status])

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/admin/companies-house/import')
      if (response.ok) {
        const data = await response.json()
        setProgress(data.progress)
      }
    } catch (error) {
      console.error('Error fetching progress:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const supabase = await (await import('@/lib/supabase/client')).createClient()
      const { count } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('data_source', 'companies_house')

      setStats({ totalImported: count || 0 })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleStartImport = async (testMode: boolean = false) => {
    setIsStarting(true)
    try {
      // For now, use a sample CSV URL for testing
      // You'll need to download and host a sample CH file or use the actual URL
      const dataUrl = testMode
        ? 'https://raw.githubusercontent.com/datasets/sample-csv/master/sample.csv' // Replace with actual sample
        : 'http://download.companieshouse.gov.uk/BasicCompanyDataAsOneFile-2024-10-01.zip'

      const response = await fetch('/api/admin/companies-house/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, testMode })
      })

      if (response.ok) {
        const data = await response.json()
        setProgress(data.progress)
        alert('✅ Import started! Progress will update automatically.')
      } else {
        const error = await response.json()
        alert(`❌ Failed to start import:\n\n${error.error}`)
      }
    } catch (error) {
      console.error('Error starting import:', error)
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsStarting(false)
    }
  }

  const handleCancelImport = async () => {
    try {
      const response = await fetch('/api/admin/companies-house/import', {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Import cancelled')
        fetchProgress()
      }
    } catch (error) {
      console.error('Error cancelling import:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      idle: <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Idle</Badge>,
      downloading: <Badge variant="default"><Download className="h-3 w-3 mr-1 animate-bounce" />Downloading</Badge>,
      processing: <Badge variant="default"><Database className="h-3 w-3 mr-1 animate-pulse" />Processing</Badge>,
      completed: <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>,
      failed: <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>,
    }
    return variants[status] || <Badge>{status}</Badge>
  }

  const progressPercent = progress?.totalRows > 0
    ? Math.round((progress.processedRows / progress.totalRows) * 100)
    : 0

  const estimatedDBSize = stats?.totalImported
    ? `~${Math.round((stats.totalImported * 0.4) / 1024)} MB` // Rough estimate: 400 bytes per company
    : '0 MB'

  return (
    <ProtectedLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Companies House Import</h1>
          <p className="text-muted-foreground mt-2">
            Import UK company data with smart filtering to stay within free tier limits
          </p>
        </div>

        {/* Warning Card */}
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
              <AlertTriangle className="h-5 w-5" />
              Important: Smart Filtering Enabled
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="mb-2">To stay within Supabase's 500MB free tier limit, this importer applies smart filters:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Only <strong>active</strong> companies</li>
              <li>Tech & Professional Services industries only (62 SIC code prefixes)</li>
              <li>Incorporated in last <strong>10 years</strong></li>
              <li>UK only (England, Wales, Scotland, Northern Ireland)</li>
            </ul>
            <p className="mt-2"><strong>Expected result:</strong> ~500K-1M companies (~200-400MB)</p>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Imported</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalImported?.toLocaleString() || '0'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Database Size</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{estimatedDBSize}</div>
              <p className="text-xs text-muted-foreground mt-1">of 500MB free tier</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Status</CardDescription>
            </CardHeader>
            <CardContent>
              {progress && getStatusBadge(progress.status)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last Import</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm">{progress?.completedAt ? new Date(progress.completedAt).toLocaleString() : 'Never'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Import Control Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Import Control
            </CardTitle>
            <CardDescription>Download and import Companies House bulk data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {progress?.status === 'processing' || progress?.status === 'downloading' ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progress.processedRows?.toLocaleString()} / {progress.totalRows?.toLocaleString()} rows</span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progressPercent}%</span>
                    <span>Batch {progress.currentBatch}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Imported</div>
                    <div className="text-2xl font-bold text-green-600">{progress.importedRows?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Skipped</div>
                    <div className="text-2xl font-bold text-gray-600">{progress.skippedRows?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Errors</div>
                    <div className="text-2xl font-bold text-red-600">{progress.errorRows?.toLocaleString()}</div>
                  </div>
                </div>

                <Button variant="destructive" onClick={handleCancelImport} className="w-full">
                  <Pause className="h-4 w-4 mr-2" />
                  Cancel Import
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleStartImport(false)}
                    disabled={isStarting}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isStarting ? 'Starting...' : 'Start Full Import'}
                  </Button>
                  <Button
                    onClick={() => handleStartImport(true)}
                    disabled={isStarting}
                    variant="outline"
                    className="flex-1"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Test Import (Sample)
                  </Button>
                </div>

                {progress?.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800 text-sm text-red-900 dark:text-red-100">
                    <strong>Error:</strong> {progress.error}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Active Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium mb-2">Company Status</div>
                <div className="space-y-1">
                  <Badge variant="outline">Active</Badge>
                  <Badge variant="outline">Active - Proposal to Strike off</Badge>
                </div>
              </div>

              <div>
                <div className="font-medium mb-2">Industries (SIC Codes)</div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">Technology</Badge>
                  <Badge variant="outline">Professional Services</Badge>
                  <Badge variant="outline">Financial Services</Badge>
                  <Badge variant="outline">+15 more</Badge>
                </div>
              </div>

              <div>
                <div className="font-medium mb-2">Incorporation Date</div>
                <div>Last 10 years</div>
              </div>

              <div>
                <div className="font-medium mb-2">Geography</div>
                <div>UK only (England, Wales, Scotland, NI)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Info className="h-4 w-4" />
              How it Works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>1. Downloads Companies House bulk CSV file (~5GB compressed)</p>
            <p>2. Streams and parses CSV line-by-line (no memory overflow)</p>
            <p>3. Applies smart filters to select relevant companies</p>
            <p>4. Imports in batches of 1,000 companies at a time</p>
            <p>5. Updates existing companies and adds new ones</p>
            <p className="pt-2 font-medium">⏱️ Estimated time: 30-60 minutes for filtered import</p>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
