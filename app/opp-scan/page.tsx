'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo/demo-context'
import { User } from '@supabase/supabase-js'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { 
  Search, 
  Target, 
  TrendingUp, 
  Shield, 
  FileText, 
  BarChart3,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  MoreHorizontal
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface AcquisitionScan {
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
  selected_industries?: Array<{ key: string; industry: string; subcategory?: string }>
  selected_regions?: Array<{ id: string; name: string; country: string }>
  current_step: string
}

function OppScanPageContent() {
  const router = useRouter()
  const supabase = createClient()
  const { isDemoMode, demoData, getDemoScans } = useDemoMode()
  const [scans, setScans] = useState<AcquisitionScan[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)


  useEffect(() => {
    const getUser = async () => {
      console.log('OppScan: useEffect running', { isDemoMode, demoData })
      if (isDemoMode) {
        // Use demo user and demo scans
        console.log('OppScan: Setting demo mode data')
        setUser(demoData.user)
        setScans(getDemoScans())
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      await loadScans(user.id)
    }
    getUser()
  }, [isDemoMode, demoData.user])

  const loadScans = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('acquisition_scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setScans(data || [])
    } catch (error) {
      console.error('Error loading scans:', error)
      toast.error('Failed to load acquisition scans')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      case 'scanning':
      case 'analyzing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
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

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading Opp Scan...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ProtectedLayout>
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Opp Scan</h1>
            <p className="text-xl opacity-90 mb-6 max-w-2xl mx-auto">
              Enterprise Acquisition Intelligence Workflow - Identify, analyze, and prioritize acquisition targets with AI-powered scanning
            </p>
            <div className="flex items-center justify-center gap-6 text-sm opacity-80 flex-wrap">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span>Multi-Source Scanning</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Risk Assessment</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Financial Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Due Diligence</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Similar Companies</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Acquisition Scans</h2>
            <p className="text-muted-foreground">
              Manage your acquisition intelligence workflows
            </p>
          </div>
          <div className="flex items-center gap-3">
            <HelpTooltip content="Analyze and compare similar companies using AI-powered matching algorithms to identify strategic opportunities, competitors, and potential acquisition targets.">
              <Link href="/similar-companies">
                <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Target className="h-4 w-4 mr-2" />
                  Similar Companies
                </Button>
              </Link>
            </HelpTooltip>
            <HelpTooltip content="Create a new comprehensive acquisition intelligence scan to identify, analyze, and evaluate potential M&A targets with financial modeling and strategic fit assessment.">
              <Link href="/opp-scan/new">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Scan
                </Button>
              </Link>
            </HelpTooltip>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <HelpTooltip content="Total number of acquisition intelligence scans created in your workspace, including completed, active, and archived scans across all time periods.">
            <Card className="cursor-help">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Search className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Scans</p>
                    <p className="text-2xl font-bold">{scans.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </HelpTooltip>
          
          <HelpTooltip content="Scans currently in progress, actively identifying and analyzing potential acquisition targets with real-time data collection and analysis.">
            <Card className="cursor-help">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Scans</p>
                    <p className="text-2xl font-bold">
                      {scans.filter(s => ['scanning', 'analyzing'].includes(s.status)).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </HelpTooltip>
          
          <HelpTooltip content="Total number of potential acquisition targets discovered across all your scans, including companies that meet your investment criteria and strategic requirements.">
            <Card className="cursor-help">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Targets Identified</p>
                    <p className="text-2xl font-bold">
                      {scans.reduce((sum, scan) => sum + scan.targets_identified, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </HelpTooltip>
          
          <HelpTooltip content="Fully completed scans with comprehensive target analysis, financial modeling, risk assessment, and strategic recommendations ready for executive review.">
            <Card className="cursor-help">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Completed Scans</p>
                    <p className="text-2xl font-bold">
                      {scans.filter(s => s.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </HelpTooltip>
        </div>

        {/* Scans List */}
        {scans.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No acquisition scans yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start your first Opp Scan to identify acquisition targets using our enterprise-grade AI-powered workflow.
              </p>
              <Link href="/opp-scan/new">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Start Your First Scan
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {scans.map((scan) => (
              <Card key={scan.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(scan.status)}
                      <div>
                        <CardTitle className="text-lg">{scan.name}</CardTitle>
                        <CardDescription>{scan.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(scan.status)}>
                        {scan.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    {scan.status !== 'configuring' && (
                      <div>
                        <div className="flex justify-between text-sm text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{scan.progress_percentage}%</span>
                        </div>
                        <Progress value={scan.progress_percentage} className="h-2" />
                      </div>
                    )}

                    {/* Scan Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Current Step</p>
                        <p className="font-semibold text-sm">
                          {scan.current_step.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Targets Found</p>
                        <p className="font-semibold">{scan.targets_identified}</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Analyzed</p>
                        <p className="font-semibold">{scan.targets_analyzed}</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="font-semibold text-sm">{formatDate(scan.created_at)}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/opp-scan/${scan.id}`}>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                      {scan.status === 'completed' && (
                        <Link href={`/opp-scan/${scan.id}/results`}>
                          <Button size="sm">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Results
                          </Button>
                        </Link>
                      )}
                      {scan.status === 'paused' && (
                        <Button variant="outline" size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          Resume
                        </Button>
                      )}
                      {['scanning', 'analyzing'].includes(scan.status) && (
                        <Button variant="outline" size="sm">
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function OppScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </ProtectedLayout>
    }>
      <OppScanPageContent />
    </Suspense>
  )
}