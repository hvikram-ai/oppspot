'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo/demo-context'
import { scanResultsDataService, ScanResultsData } from '@/lib/opp-scan/scan-results-data'
import { demoResultsDataGenerator } from '@/lib/opp-scan/demo-results-data'
import { ExecutiveCommandCenter } from '@/components/opp-scan/executive-command-center'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  ArrowLeft,
  Activity, 
  BarChart3, 
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Share2,
  RefreshCw,
  Filter,
  Search,
  Eye,
  DollarSign,
  Shield,
  Globe,
  FileText,
  Users,
  Building2,
  MapPin,
  Calendar,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

function ScanResultsPageContent() {
  const router = useRouter()
  const params = useParams()
  const scanId = params.id as string
  const supabase = createClient()
  const { isDemoMode, getDemoScans } = useDemoMode()

  // State management
  const [loading, setLoading] = useState(true)
  const [scanResults, setScanResults] = useState<ScanResultsData | null>(null)
  const [activeTab, setActiveTab] = useState('targets')
  const [user, setUser] = useState<unknown>(null)

  useEffect(() => {
    const loadData = async () => {
      if (isDemoMode) {
        // Load comprehensive demo data
        const demoScans = getDemoScans()
        const currentScan = demoScans.find(scan => scan.id === scanId)
        if (currentScan) {
          const demoResults = demoResultsDataGenerator.generateDemoScanResults(
            scanId, 
            currentScan.name
          )
          setScanResults(demoResults)
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
      
      // Load comprehensive scan results
      const results = await scanResultsDataService.loadScanResults(scanId)
      if (results) {
        setScanResults(results)
      } else {
        toast.error('Failed to load scan results')
      }
      setLoading(false)
    }

    loadData()
  }, [isDemoMode, scanId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const handleRefresh = async () => {
    setLoading(true)
    // Reload the data
    if (isDemoMode) {
      const demoScans = getDemoScans()
      const currentScan = demoScans.find(scan => scan.id === scanId)
      if (currentScan) {
        const demoResults = demoResultsDataGenerator.generateDemoScanResults(
          scanId, 
          currentScan.name
        )
        setScanResults(demoResults)
      }
    } else {
      const results = await scanResultsDataService.loadScanResults(scanId)
      if (results) {
        setScanResults(results)
      }
    }
    setLoading(false)
    toast.success('Data refreshed successfully')
  }

  const handleExport = () => {
    toast.success('Report export functionality coming soon')
  }

  const handleShare = () => {
    toast.success('Share functionality coming soon')
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  if (!scanResults) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Scan Not Found</AlertTitle>
            <AlertDescription>
              The requested scan results could not be found.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <ProtectedLayout>
      
      {/* Header Section */}
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
              <h1 className="text-3xl font-bold">{scanResults.scan.name}</h1>
              <p className="text-muted-foreground">{scanResults.scan.description}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge 
                variant={scanResults.scan.status === 'completed' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {scanResults.scan.status}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share Results
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Executive Command Center */}
        <ExecutiveCommandCenter 
          scanData={scanResults}
          onRefresh={handleRefresh}
          onExport={handleExport}
          onShare={handleShare}
        />

        {/* Detailed Analysis Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="targets" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target Matrix
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial Analytics
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Risk Intelligence
            </TabsTrigger>
            <TabsTrigger value="market" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Market Intelligence
            </TabsTrigger>
          </TabsList>

          {/* Targets Tab */}
          <TabsContent value="targets">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Target Intelligence Matrix
                </CardTitle>
                <CardDescription>
                  Interactive analysis of {scanResults.targets.length} identified acquisition targets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{scanResults.summary.highQualityTargets}</div>
                      <div className="text-sm text-muted-foreground">High Quality (80+)</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{scanResults.summary.mediumQualityTargets}</div>
                      <div className="text-sm text-muted-foreground">Medium Quality (60-80)</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{scanResults.summary.lowQualityTargets}</div>
                      <div className="text-sm text-muted-foreground">Low Quality (&lt;60)</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{formatCurrency(scanResults.summary.totalEstimatedValue)}</div>
                      <div className="text-sm text-muted-foreground">Total Enterprise Value</div>
                    </div>
                  </div>
                  
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg font-medium">Interactive Target Grid</p>
                    <p className="text-muted-foreground">Advanced filtering and comparison tools coming next</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Financial Analytics Suite
                </CardTitle>
                <CardDescription>
                  Comprehensive financial analysis of {scanResults.financialData.length} targets with financial data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Financial Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {formatPercentage(scanResults.financialData.reduce((sum, f) => sum + (f.revenue_growth_3y || 0), 0) / scanResults.financialData.length)}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Revenue Growth (3Y)</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {formatPercentage(scanResults.financialData.reduce((sum, f) => sum + (f.ebitda_margin || 0), 0) / scanResults.financialData.length)}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg EBITDA Margin</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {(scanResults.financialData.reduce((sum, f) => sum + (f.estimated_revenue_multiple || 0), 0) / scanResults.financialData.length).toFixed(1)}x
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Revenue Multiple</div>
                    </div>
                  </div>
                  
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg font-medium">Advanced Financial Visualizations</p>
                    <p className="text-muted-foreground">Revenue trends, valuation models, and benchmarking coming next</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risk Tab */}
          <TabsContent value="risk">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-500" />
                  Risk Intelligence Dashboard
                </CardTitle>
                <CardDescription>
                  Multi-dimensional risk assessment across {scanResults.riskData.length} analyzed targets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Risk Distribution */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{scanResults.summary.lowRiskTargets}</div>
                      <div className="text-sm text-muted-foreground">Low Risk</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-lg font-bold text-yellow-600">{scanResults.summary.moderateRiskTargets}</div>
                      <div className="text-sm text-muted-foreground">Moderate Risk</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">{scanResults.summary.highRiskTargets}</div>
                      <div className="text-sm text-muted-foreground">High Risk</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-lg font-bold text-red-600">{scanResults.summary.criticalRiskTargets}</div>
                      <div className="text-sm text-muted-foreground">Critical Risk</div>
                    </div>
                  </div>
                  
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg font-medium">Risk Heat Maps & Analysis</p>
                    <p className="text-muted-foreground">Multi-dimensional risk visualization coming next</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Market Tab */}
          <TabsContent value="market">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-indigo-500" />
                  Market Intelligence Center
                </CardTitle>
                <CardDescription>
                  Competitive landscape and industry analysis for {Object.keys(scanResults.summary.industryBreakdown).length} sectors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Market Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-3">Industry Distribution</h4>
                      <div className="space-y-2">
                        {Object.entries(scanResults.summary.industryBreakdown).map(([industry, count]) => (
                          <div key={industry} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="text-sm">{industry}</span>
                            <Badge variant="outline">{count} targets</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Geographic Distribution</h4>
                      <div className="space-y-2">
                        {Object.entries(scanResults.summary.regionBreakdown).map(([region, count]) => (
                          <div key={region} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="text-sm">{region}</span>
                            <Badge variant="outline">{count} targets</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center py-12">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg font-medium">Competitive Mapping & Trends</p>
                    <p className="text-muted-foreground">Market dynamics and opportunity analysis coming next</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function ScanResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </ProtectedLayout>
    }>
      <ScanResultsPageContent />
    </Suspense>
  )
}