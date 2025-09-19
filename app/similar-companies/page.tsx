'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo/demo-context'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
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
  MoreHorizontal,
  Users,
  Building2,
  Globe,
  Zap,
  ArrowRight,
  AlertCircle,
  Info,
  Sparkles,
  Download,
  Eye,
  Settings,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface SimilarityAnalysis {
  id: string
  target_company_name: string
  status: 'pending' | 'searching' | 'analyzing' | 'completed' | 'failed' | 'expired'
  total_companies_analyzed: number
  average_similarity_score: number
  top_similarity_score: number
  created_at: string
  completed_at?: string
  analysis_configuration: any
}

function SimilarCompaniesPageContent() {
  const router = useRouter()
  const supabase = createClient()
  const { isDemoMode: contextDemoMode, demoData } = useDemoMode()
  
  // Force disable demo mode for similar companies to use real APIs
  const isDemoMode = false // Override demo mode - always use real search
  
  const [analyses, setAnalyses] = useState<SimilarityAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<unknown>(null)
  const [showNewAnalysis, setShowNewAnalysis] = useState(false)
  
  // New analysis form state
  const [targetCompany, setTargetCompany] = useState('')
  const [analysisDepth, setAnalysisDepth] = useState('detailed')
  const [maxResults, setMaxResults] = useState(20)
  const [includeExplanations, setIncludeExplanations] = useState(true)
  const [parameterWeights, setParameterWeights] = useState({
    financial: 30,
    strategic: 25,
    operational: 20,
    market: 15,
    risk: 10
  })
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<unknown>(null)

  useEffect(() => {
    const getUser = async () => {
      // For similar companies, allow testing without full auth
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Create a test user for similar companies functionality
        const testUser = {
          id: 'test-user-' + Date.now(),
          email: 'test@oppspot.com',
          user_metadata: { name: 'Test User' }
        }
        setUser(testUser)
        await loadAnalyses(testUser.id)
      } else {
        setUser(user)
        await loadAnalyses(user.id)
      }
    }
    getUser()
  }, [isDemoMode, demoData.user])

  const loadAnalyses = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('similarity_analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnalyses(data || [])
    } catch (error) {
      console.error('Error loading analyses:', error)
      toast.error('Failed to load similarity analyses')
    } finally {
      setLoading(false)
    }
  }

  const validateCompany = async (companyName: string) => {
    if (!companyName.trim()) return

    setIsValidating(true)
    setValidationResult(null)

    try {
      // Demo mode handling
      if (isDemoMode) {
        console.log('Similar Companies: Demo mode detected, using demo validation')
        // Simulate validation with demo data
        await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay
        
        const demoResult = {
          valid: true,
          confidence: 0.85,
          companyName: companyName.trim(),
          validationSource: 'demo_data',
          suggestions: [],
          competitors: [],
          message: 'Company validated successfully (Demo Mode)',
          estimatedAnalysisTime: '2-5 minutes'
        }
        
        setValidationResult(demoResult)
        return
      }

      console.log('Similar Companies: Not in demo mode, making API call')
      const response = await fetch('/api/similar-companies/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim() })
      })

      if (!response.ok) {
        // If API fails, check if we should fallback to demo mode
        if (response.status === 401) {
          console.log('Similar Companies: API unauthorized, falling back to demo mode')
          const demoResult = {
            valid: true,
            confidence: 0.75,
            companyName: companyName.trim(),
            validationSource: 'fallback_demo',
            suggestions: [],
            competitors: [],
            message: 'Company validation unavailable - proceeding with demo data',
            estimatedAnalysisTime: '2-5 minutes'
          }
          setValidationResult(demoResult)
          return
        }
        throw new Error(`Validation failed: ${response.status}`)
      }

      const result = await response.json()
      setValidationResult(result)
      
      // Improved error handling for undefined suggestions
      if (!result.valid && (!result.suggestions || result.suggestions.length === 0)) {
        toast.warning('Company could not be validated, but analysis can still proceed')
      }
    } catch (error) {
      console.error('Validation error:', error)
      // Fallback to demo mode on any error
      console.log('Similar Companies: Error occurred, falling back to demo validation')
      const fallbackResult = {
        valid: true,
        confidence: 0.7,
        companyName: companyName.trim(),
        validationSource: 'error_fallback',
        suggestions: [],
        competitors: [],
        message: 'Validation service unavailable - using demo mode',
        estimatedAnalysisTime: '2-5 minutes'
      }
      setValidationResult(fallbackResult)
      toast.info('Using demo validation due to service unavailability')
    } finally {
      setIsValidating(false)
    }
  }

  const startNewAnalysis = async () => {
    if (!targetCompany.trim()) {
      toast.error('Please enter a company name')
      return
    }

    try {
      // Demo mode handling
      if (isDemoMode) {
        console.log('Similar Companies: Demo mode detected, creating demo analysis')
        // Simulate analysis creation in demo mode
        toast.success('Analysis started successfully (Demo Mode)')
        setShowNewAnalysis(false)
        setTargetCompany('')
        
        // Create a demo analysis ID and redirect with target company
        const demoAnalysisId = `demo-sim-${Date.now()}`
        const targetCompanyParam = encodeURIComponent(targetCompany.trim())
        router.push(`/similar-companies/${demoAnalysisId}?target=${targetCompanyParam}`)
        return
      }

      console.log('Similar Companies: Not in demo mode, making analysis API call')
      // Use optimized endpoint for better performance
      const response = await fetch('/api/similar-companies/optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetCompanyName: targetCompany.trim(),
          analysisDepth,
          maxResults,
          includeExplanations,
          parameterWeights: {
            financial: parameterWeights.financial / 100,
            strategic: parameterWeights.strategic / 100,
            operational: parameterWeights.operational / 100,
            market: parameterWeights.market / 100,
            risk: parameterWeights.risk / 100
          }
        })
      })

      if (!response.ok) {
        // If API fails with 401, fallback to demo mode
        if (response.status === 401) {
          console.log('Similar Companies: API unauthorized, falling back to demo analysis')
          toast.success('Starting demo analysis due to authentication unavailability')
          setShowNewAnalysis(false)
          setTargetCompany('')
          
          const demoAnalysisId = `demo-sim-fallback-${Date.now()}`
          const targetCompanyParam = encodeURIComponent(targetCompany.trim())
          router.push(`/similar-companies/${demoAnalysisId}?target=${targetCompanyParam}`)
          return
        }
        
        const result = await response.json()
        throw new Error(result.error || `API Error: ${response.status}`)
      }

      const result = await response.json()

      if (result.cached) {
        toast.success('Analysis retrieved from cache')
        router.push(`/similar-companies/${result.analysis.id}`)
      } else {
        toast.success('Analysis started successfully')
        setShowNewAnalysis(false)
        setTargetCompany('')
        if (user && user.id) {
          await loadAnalyses(user.id)
        }
        router.push(`/similar-companies/${result.analysisId}`)
      }
    } catch (error) {
      console.error('Analysis error:', error)
      // Fallback to demo mode on any error
      console.log('Similar Companies: Error occurred, falling back to demo analysis')
      toast.success('Starting demo analysis due to service unavailability')
      setShowNewAnalysis(false)
      setTargetCompany('')
      
      const demoAnalysisId = `demo-sim-error-${Date.now()}`
      const targetCompanyParam = encodeURIComponent(targetCompany.trim())
      router.push(`/similar-companies/${demoAnalysisId}?target=${targetCompanyParam}`)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'expired':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'searching':
      case 'analyzing':
        return <Zap className="h-4 w-4 text-blue-500 animate-pulse" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'searching':
      case 'analyzing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading Similar Companies...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Building2 className="h-10 w-10 mr-3" />
              <h1 className="text-4xl font-bold">Similar Companies</h1>
            </div>
            <p className="text-xl opacity-90 mb-6 max-w-3xl mx-auto">
              AI-powered company similarity analysis for merger & acquisition intelligence. 
              Identify, analyze, and benchmark potential acquisition targets with explainable results.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm opacity-80">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span>M&A-Focused Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>AI-Powered Explanations</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Enterprise Benchmarking</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Presentation-Ready Reports</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Company Similarity Analyses</h2>
            <p className="text-muted-foreground">
              Discover and analyze companies similar to your acquisition targets
            </p>
          </div>
          <Dialog open={showNewAnalysis} onOpenChange={setShowNewAnalysis}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Start Similar Company Analysis</DialogTitle>
                <DialogDescription>
                  Enter a target company name to find and analyze similar companies for M&A evaluation.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Company Input */}
                <div className="space-y-2">
                  <Label htmlFor="company">Target Company Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="company"
                      placeholder="e.g., Acme Corporation"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      onBlur={() => targetCompany.trim() && validateCompany(targetCompany)}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => validateCompany(targetCompany)}
                      disabled={isValidating || !targetCompany.trim()}
                    >
                      {isValidating ? <Zap className="h-4 w-4 animate-spin" /> : 'Validate'}
                    </Button>
                  </div>
                  
                  {validationResult && (
                    <div className={`p-3 rounded-lg ${validationResult.valid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                      <div className="flex items-start gap-2">
                        {validationResult.valid ? 
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /> :
                          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        }
                        <div>
                          <p className="text-sm font-medium">
                            {validationResult.message}
                          </p>
                          {validationResult.suggestions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground mb-1">Did you mean:</p>
                              {validationResult.suggestions.slice(0, 3).map((suggestion: any, index: number) => (
                                <button
                                  key={index}
                                  className="text-xs text-blue-600 hover:underline block"
                                  onClick={() => setTargetCompany(suggestion.name)}
                                >
                                  {suggestion.name} ({suggestion.country})
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Analysis Depth</Label>
                        <Select value={analysisDepth} onValueChange={setAnalysisDepth}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quick">Quick (2-3 min)</SelectItem>
                            <SelectItem value="detailed">Detailed (3-5 min)</SelectItem>
                            <SelectItem value="comprehensive">Comprehensive (5-8 min)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Max Results</Label>
                        <Select value={maxResults.toString()} onValueChange={(value) => setMaxResults(parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 companies</SelectItem>
                            <SelectItem value="20">20 companies</SelectItem>
                            <SelectItem value="50">50 companies</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Include AI Explanations</Label>
                        <p className="text-xs text-muted-foreground">
                          Generate detailed explanations for each similarity match
                        </p>
                      </div>
                      <Switch 
                        checked={includeExplanations} 
                        onCheckedChange={setIncludeExplanations} 
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="advanced" className="space-y-4">
                    <div>
                      <Label className="text-base font-medium mb-4 block">M&A Parameter Weights</Label>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-sm">Financial (Revenue, Growth, Debt)</Label>
                            <span className="text-sm text-muted-foreground">{parameterWeights.financial}%</span>
                          </div>
                          <Slider
                            value={[parameterWeights.financial]}
                            onValueChange={(value) => setParameterWeights({...parameterWeights, financial: value[0]})}
                            max={50}
                            min={10}
                            step={5}
                            className="w-full"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-sm">Strategic (Market Position, Geography)</Label>
                            <span className="text-sm text-muted-foreground">{parameterWeights.strategic}%</span>
                          </div>
                          <Slider
                            value={[parameterWeights.strategic]}
                            onValueChange={(value) => setParameterWeights({...parameterWeights, strategic: value[0]})}
                            max={40}
                            min={5}
                            step={5}
                            className="w-full"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-sm">Operational (Business Model, Scale)</Label>
                            <span className="text-sm text-muted-foreground">{parameterWeights.operational}%</span>
                          </div>
                          <Slider
                            value={[parameterWeights.operational]}
                            onValueChange={(value) => setParameterWeights({...parameterWeights, operational: value[0]})}
                            max={35}
                            min={5}
                            step={5}
                            className="w-full"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-sm">Market (Industry, Competition)</Label>
                            <span className="text-sm text-muted-foreground">{parameterWeights.market}%</span>
                          </div>
                          <Slider
                            value={[parameterWeights.market]}
                            onValueChange={(value) => setParameterWeights({...parameterWeights, market: value[0]})}
                            max={30}
                            min={5}
                            step={5}
                            className="w-full"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-sm">Risk (Regulatory, Integration)</Label>
                            <span className="text-sm text-muted-foreground">{parameterWeights.risk}%</span>
                          </div>
                          <Slider
                            value={[parameterWeights.risk]}
                            onValueChange={(value) => setParameterWeights({...parameterWeights, risk: value[0]})}
                            max={25}
                            min={5}
                            step={5}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex gap-2">
                  <Button onClick={() => setShowNewAnalysis(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={startNewAnalysis} 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={!targetCompany.trim()}
                  >
                    Start Analysis
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Search className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Analyses</p>
                  <p className="text-2xl font-bold">{analyses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active Analyses</p>
                  <p className="text-2xl font-bold">
                    {analyses.filter(a => ['searching', 'analyzing'].includes(a.status)).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Companies Analyzed</p>
                  <p className="text-2xl font-bold">
                    {analyses.reduce((sum, analysis) => sum + (analysis.total_companies_analyzed || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {analyses.filter(a => a.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analyses List */}
        {analyses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No similarity analyses yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start your first Similar Company analysis to identify potential acquisition targets with AI-powered M&A intelligence.
              </p>
              <Button 
                onClick={() => setShowNewAnalysis(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Start Your First Analysis
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis) => (
              <Card key={analysis.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(analysis.status)}
                      <div>
                        <CardTitle className="text-lg">{analysis.target_company_name}</CardTitle>
                        <CardDescription>
                          {analysis.analysis_configuration?.analysisDepth === 'comprehensive' ? 'Comprehensive Analysis' :
                           analysis.analysis_configuration?.analysisDepth === 'detailed' ? 'Detailed Analysis' : 'Quick Analysis'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(analysis.status)}>
                        {analysis.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Analysis Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Companies Found</p>
                        <p className="font-semibold">{analysis.total_companies_analyzed || 0}</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Avg Similarity</p>
                        <p className="font-semibold">{Math.round(analysis.average_similarity_score || 0)}%</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Top Match</p>
                        <p className="font-semibold">{Math.round(analysis.top_similarity_score || 0)}%</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="font-semibold text-sm">{formatDate(analysis.created_at)}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/similar-companies/${analysis.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Results
                        </Button>
                      </Link>
                      {analysis.status === 'completed' && (
                        <Link href={`/similar-companies/${analysis.id}/export`}>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                        </Link>
                      )}
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
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

export default function SimilarCompaniesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <SimilarCompaniesPageContent />
    </Suspense>
  )
}