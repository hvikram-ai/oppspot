'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo/demo-context'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft,
  Activity, 
  BarChart3, 
  Target,
  CheckCircle,
  Clock,
  Play,
  Pause,
  MoreHorizontal,
  AlertTriangle,
  Settings,
  FileText,
  Download,
  Share2,
  RefreshCw,
  Eye,
  Calendar,
  MapPin,
  Building2,
  Users,
  Zap,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface ScanData {
  id: string
  name: string
  description: string
  status: 'configuring' | 'scanning' | 'analyzing' | 'completed' | 'failed' | 'paused'
  progress_percentage: number
  targets_identified: number
  targets_analyzed: number
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
  selected_industries?: Array<{ industry: string; description?: string }>
  selected_regions?: Array<{ id: string; name: string; country: string }>
  current_step: string
  data_sources?: string[]
  scan_depth: string
}

function ScanDetailPageContent() {
  const router = useRouter()
  const params = useParams()
  const scanId = params.id as string
  const supabase = createClient()
  const { isDemoMode, getDemoScans } = useDemoMode()

  // State management
  const [loading, setLoading] = useState(true)
  const [scanData, setScanData] = useState<ScanData | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  interface User {
    id: string
    email?: string
  }

  const [user, setUser] = useState<User | null>(null)
  const [startingScan, setStartingScan] = useState(false)

  const loadScanDetails = useCallback(async (scanId: string) => {
    try {
      const { data: scanData, error: scanError } = await supabase
        .from('acquisition_scans')
        .select('*')
        .eq('id', scanId)
        .single()

      if (scanError) throw scanError
      setScanData(scanData)
    } catch (error) {
      console.error('Error loading scan details:', error)
      toast.error('Failed to load scan details')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const loadData = async () => {
      if (isDemoMode) {
        // Load demo data
        const demoScans = getDemoScans()
        const currentScan = demoScans.find(scan => scan.id === scanId)
        if (currentScan) {
          setScanData(currentScan as ScanData)
        }
        setLoading(false)
        return
      }

      // Real data loading for authenticated users
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      await loadScanDetails(scanId)
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, scanId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      case 'scanning':
      case 'analyzing':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'scanning':
      case 'analyzing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date()
    const diffMs = end.getTime() - start.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const handleStartScan = async () => {
    setStartingScan(true)
    
    try {
      if (isDemoMode) {
        // For demo mode, simulate scan starting
        toast.success('Demo scan started!')
        
        // Update the scan data to show it's scanning
        setScanData(prev => prev ? {
          ...prev,
          status: 'scanning',
          current_step: 'data_collection',
          progress_percentage: 10,
          started_at: new Date().toISOString(),
          targets_identified: 0,
          targets_analyzed: 0
        } : null)
        
        // Simulate progress updates
        setTimeout(() => {
          setScanData(prev => prev ? {
            ...prev,
            progress_percentage: 25,
            current_step: 'analyzing_companies',
            targets_identified: 5
          } : null)
        }, 3000)
        
        setTimeout(() => {
          setScanData(prev => prev ? {
            ...prev,
            progress_percentage: 50,
            targets_identified: 12
          } : null)
        }, 6000)
        
        setTimeout(() => {
          setScanData(prev => prev ? {
            ...prev,
            progress_percentage: 75,
            current_step: 'finalizing_results',
            targets_identified: 18,
            targets_analyzed: 15
          } : null)
        }, 9000)
        
        setTimeout(() => {
          setScanData(prev => prev ? {
            ...prev,
            status: 'completed',
            progress_percentage: 100,
            current_step: 'completed',
            targets_identified: 24,
            targets_analyzed: 24,
            completed_at: new Date().toISOString()
          } : null)
          toast.success('Demo scan completed! 24 targets identified.')
        }, 12000)
        
      } else {
        // Real scan - call the API
        const response = await fetch(`/api/acquisition-scans/${scanId}/start-scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to start scan')
        }
        
        const data = await response.json()
        toast.success('Scan started successfully!')
        
        // Reload scan data to get updated status
        await loadScanDetails(scanId)
      }
    } catch (error) {
      console.error('Error starting scan:', error)
      toast.error((error instanceof Error ? error.message : 'Failed to start scan'))
    } finally {
      setStartingScan(false)
    }
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  if (!scanData) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Scan Not Found</AlertTitle>
            <AlertDescription>
              The requested scan could not be found.
            </AlertDescription>
          </Alert>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/opp-scan')}
              className="hover:bg-white/50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{scanData.name}</h1>
              <p className="text-muted-foreground">{scanData.description}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge className={getStatusColor(scanData.status)}>
                {getStatusIcon(scanData.status)}
                <span className="ml-1 capitalize">{scanData.status.replace('_', ' ')}</span>
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
              {scanData.status === 'completed' && (
                <Link href={`/opp-scan/${scanData.id}/results`}>
                  <Button size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Results
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress Section */}
          {scanData.status !== 'configuring' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Scan Progress</span>
                <span className="text-sm text-muted-foreground">{scanData.progress_percentage}% complete</span>
              </div>
              <Progress value={scanData.progress_percentage} className="h-3" />
              <div className="mt-2 text-sm text-muted-foreground">
                Current step: {scanData.current_step.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Target className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-800">Targets Found</p>
                      <p className="text-2xl font-bold text-blue-900">{scanData.targets_identified}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-800">Analyzed</p>
                      <p className="text-2xl font-bold text-green-900">{scanData.targets_analyzed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-purple-200 bg-purple-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-purple-800">Duration</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {scanData.started_at ? formatDuration(scanData.started_at, scanData.completed_at) : '--'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-orange-200 bg-orange-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-orange-800">Success Rate</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {scanData.targets_identified > 0 ? Math.round((scanData.targets_analyzed / scanData.targets_identified) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scan Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Scan Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Scan ID</label>
                    <p className="text-sm font-mono bg-muted p-2 rounded">{scanData.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm">{scanData.description || 'No description provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Scan Depth</label>
                    <Badge variant="outline" className="ml-2 capitalize">{scanData.scan_depth}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-sm">{formatDate(scanData.created_at)}</p>
                  </div>
                  {scanData.completed_at && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Completed</label>
                      <p className="text-sm">{formatDate(scanData.completed_at)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {scanData.status === 'configuring' && (
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={handleStartScan}
                      disabled={startingScan}
                    >
                      {startingScan ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Starting Scan...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Start Scan
                        </>
                      )}
                    </Button>
                  )}
                  {scanData.status === 'completed' && (
                    <Link href={`/opp-scan/${scanData.id}/results`}>
                      <Button className="w-full" size="sm">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Detailed Results
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" className="w-full" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Summary Report
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share with Team
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </Button>
                  {(scanData.status === 'paused' || scanData.status === 'failed') && (
                    <Button variant="outline" className="w-full" size="sm">
                      <Play className="h-4 w-4 mr-2" />
                      Resume Scan
                    </Button>
                  )}
                  {(scanData.status === 'scanning' || scanData.status === 'analyzing') && (
                    <Button variant="outline" className="w-full" size="sm">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Scan
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Status Alert */}
            {scanData.status === 'failed' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Scan Failed</AlertTitle>
                <AlertDescription>
                  The scan encountered errors and could not complete. Please check the configuration and try again.
                </AlertDescription>
              </Alert>
            )}

            {scanData.status === 'paused' && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Scan Paused</AlertTitle>
                <AlertDescription>
                  This scan has been temporarily paused. You can resume it at any time.
                </AlertDescription>
              </Alert>
            )}

            {(scanData.status === 'scanning' || scanData.status === 'analyzing') && (
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertTitle>Scan In Progress</AlertTitle>
                <AlertDescription>
                  Your scan is currently running. You can check back later or we&apos;ll notify you when it&apos;s complete.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="configuration" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Industries */}
              {scanData.selected_industries && scanData.selected_industries.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Target Industries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {scanData.selected_industries.map((industry, index) => {
                        const ind = industry as { industry: string; subcategory?: string; description?: string }
                        return (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="text-sm font-medium">{ind.industry}</span>
                            {ind.subcategory && (
                              <Badge variant="outline" className="text-xs">{ind.subcategory}</Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Regions */}
              {scanData.selected_regions && scanData.selected_regions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Target Regions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {scanData.selected_regions.map((region, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="text-sm font-medium">{region.name}</span>
                          <Badge variant="outline" className="text-xs">{region.country}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data Sources */}
              {scanData.data_sources && scanData.data_sources.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Data Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {scanData.data_sources.map((source: string, index: number) => (
                        <Badge key={index} variant="outline" className="justify-center py-2">
                          {source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Scan Progress Details</CardTitle>
                <CardDescription>
                  Detailed progress information for each stage of the scan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Target Identification</p>
                        <p className="text-sm text-muted-foreground">Scanning for potential acquisition targets</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="default">Complete</Badge>
                      <p className="text-sm text-muted-foreground mt-1">{scanData.targets_identified} targets found</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {scanData.status === 'completed' ? 
                        <CheckCircle className="h-5 w-5 text-green-500" /> : 
                        <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
                      }
                      <div>
                        <p className="font-medium">Data Collection & Analysis</p>
                        <p className="text-sm text-muted-foreground">Gathering and analyzing target company data</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={scanData.status === 'completed' ? 'default' : 'secondary'}>
                        {scanData.status === 'completed' ? 'Complete' : 'In Progress'}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">{scanData.targets_analyzed} analyzed</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {scanData.status === 'completed' ? 
                        <CheckCircle className="h-5 w-5 text-green-500" /> : 
                        <Clock className="h-5 w-5 text-gray-400" />
                      }
                      <div>
                        <p className="font-medium">Risk Assessment</p>
                        <p className="text-sm text-muted-foreground">Evaluating potential risks and opportunities</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={scanData.status === 'completed' ? 'default' : 'secondary'}>
                        {scanData.status === 'completed' ? 'Complete' : 'Pending'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {scanData.status === 'completed' ? 
                        <CheckCircle className="h-5 w-5 text-green-500" /> : 
                        <Clock className="h-5 w-5 text-gray-400" />
                      }
                      <div>
                        <p className="font-medium">Report Generation</p>
                        <p className="text-sm text-muted-foreground">Compiling results and generating reports</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={scanData.status === 'completed' ? 'default' : 'secondary'}>
                        {scanData.status === 'completed' ? 'Complete' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Scan Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 border-l-4 border-blue-500 bg-blue-50/50">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">Scan Created</p>
                      <p className="text-sm text-muted-foreground">{formatDate(scanData.created_at)}</p>
                    </div>
                  </div>

                  {scanData.started_at && (
                    <div className="flex items-center gap-4 p-3 border-l-4 border-green-500 bg-green-50/50">
                      <Play className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">Scan Started</p>
                        <p className="text-sm text-muted-foreground">{formatDate(scanData.started_at)}</p>
                      </div>
                    </div>
                  )}

                  {scanData.completed_at && (
                    <div className="flex items-center gap-4 p-3 border-l-4 border-purple-500 bg-purple-50/50">
                      <CheckCircle className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="font-medium">Scan Completed</p>
                        <p className="text-sm text-muted-foreground">{formatDate(scanData.completed_at)}</p>
                      </div>
                    </div>
                  )}

                  {scanData.status !== 'completed' && (
                    <div className="flex items-center gap-4 p-3 border-l-4 border-gray-300 bg-gray-50/50">
                      <Activity className="h-4 w-4 text-gray-600 animate-pulse" />
                      <div>
                        <p className="font-medium">Currently: {scanData.current_step.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                        <p className="text-sm text-muted-foreground">Scan is in progress</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  )
}

export default function ScanDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <ScanDetailPageContent />
    </Suspense>
  )
}