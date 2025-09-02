'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo/demo-context'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  TrendingUp, 
  TrendingDown,
  Building2,
  Globe,
  DollarSign,
  Shield,
  Target,
  Brain,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  RefreshCcw,
  Share2,
  Bookmark,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { SimilarityMatrix } from '@/components/similar-companies/similarity-matrix'
import { ScoreConfidenceScatter } from '@/components/similar-companies/score-confidence-scatter'
import { MultiDimensionalRadar } from '@/components/similar-companies/multi-dimensional-radar'
import { SimilarityNetwork } from '@/components/similar-companies/similarity-network'

interface SimilarityAnalysis {
  id: string
  target_company_name: string
  target_company_data: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_companies_analyzed: number
  average_similarity_score: number
  top_similarity_score: number
  executive_summary: string
  key_opportunities: string[]
  risk_highlights: string[]
  strategic_recommendations: string[]
  analysis_configuration: any
  created_at: string
  completed_at: string
  similar_company_matches: SimilarityMatch[]
  summary: {
    totalMatches: number
    averageScore: number
    topScore: number
    scoreDistribution: {
      excellent: number
      good: number
      fair: number
      poor: number
    }
    confidenceDistribution: {
      high: number
      medium: number
      low: number
    }
  }
}

interface SimilarityMatch {
  id: string
  company_name: string
  company_data: any
  overall_score: number
  confidence: number
  rank: number
  financial_score: number
  strategic_score: number
  operational_score: number
  market_score: number
  risk_score: number
  financial_confidence: number
  strategic_confidence: number
  operational_confidence: number
  market_confidence: number
  risk_confidence: number
  financial_factors: any
  strategic_factors: any
  operational_factors: any
  market_factors: any
  risk_factors: any
  market_position: string
  risk_factors_identified: string[]
  opportunity_areas: string[]
  data_points_used: number
  similarity_explanations?: Array<{
    summary: string
    key_reasons: string[]
    financial_rationale: string
    strategic_rationale: string
    risk_considerations: string[]
    confidence_level: string
    data_quality_note: string
  }>
}

function SimilarCompanyDetailContent() {
  const router = useRouter()
  const params = useParams()
  const analysisId = params.id as string
  const supabase = createClient()
  const { isDemoMode, demoData } = useDemoMode()
  
  const [analysis, setAnalysis] = useState<SimilarityAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)
  const [filterCriteria, setFilterCriteria] = useState({
    minScore: 0,
    maxScore: 100,
    confidenceLevel: 'all',
    scoreCategory: 'all'
  })

  useEffect(() => {
    const getUser = async () => {
      if (isDemoMode) {
        setUser(demoData.user)
        // Load demo analysis data
        await loadDemoAnalysis()
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      await loadAnalysis(user.id)
    }
    getUser()
  }, [isDemoMode, analysisId])

  const loadDemoAnalysis = async () => {
    // Create demo analysis data for demonstration with multiple companies for visualizations
    const generateDemoMatches = (count: number) => {
      const companyNames = [
        'BYD Company Limited', 'Volkswagen AG', 'NIO Inc.', 'XPeng Inc.', 'Li Auto Inc.',
        'Rivian Automotive', 'Lucid Motors', 'Mercedes-Benz Group', 'BMW Group', 'General Motors',
        'Ford Motor Company', 'Stellantis N.V.', 'Honda Motor Co.', 'Toyota Motor Corp', 'Hyundai Motor',
        'Kia Corporation', 'Nissan Motor Co.', 'Subaru Corporation', 'Mazda Motor Corp', 'Mitsubishi Motors',
        'SAIC Motor Corp', 'Great Wall Motors', 'Geely Automobile', 'Chery Automobile', 'JAC Motors'
      ]
      
      return companyNames.slice(0, count).map((name, index) => {
        const baseScore = Math.max(50, 95 - index * 3 + Math.random() * 10)
        return {
          id: `demo-${index + 1}`,
          company_name: name,
          company_data: {
            country: ['China', 'Germany', 'United States', 'Japan', 'South Korea'][Math.floor(Math.random() * 5)],
            industry: ['Electric Vehicles', 'Automotive', 'Battery Technology', 'Renewable Energy'][Math.floor(Math.random() * 4)],
            revenue: `$${(Math.random() * 100 + 10).toFixed(1)}B`,
            employees: `${Math.floor(Math.random() * 200 + 50)}K`,
            description: `${name} is a leading company in the automotive and clean energy sector.`
          },
          overall_score: baseScore,
          confidence: Math.max(0.5, Math.random() * 0.5 + 0.4),
          rank: index + 1,
          financial_score: Math.max(40, baseScore + Math.random() * 20 - 10),
          strategic_score: Math.max(40, baseScore + Math.random() * 20 - 10),
          operational_score: Math.max(40, baseScore + Math.random() * 20 - 10),
          market_score: Math.max(40, baseScore + Math.random() * 20 - 10),
          risk_score: Math.max(40, baseScore + Math.random() * 20 - 10),
          financial_confidence: Math.max(0.5, Math.random() * 0.4 + 0.5),
          strategic_confidence: Math.max(0.5, Math.random() * 0.4 + 0.5),
          operational_confidence: Math.max(0.5, Math.random() * 0.4 + 0.5),
          market_confidence: Math.max(0.5, Math.random() * 0.4 + 0.5),
          risk_confidence: Math.max(0.5, Math.random() * 0.4 + 0.5),
          financial_factors: {},
          strategic_factors: {},
          operational_factors: {},
          market_factors: {},
          risk_factors: {},
          market_position: ['Market Leader', 'Strong Player', 'Growing Company', 'Niche Player'][Math.floor(Math.random() * 4)],
          risk_factors_identified: ['Regulatory exposure', 'Market competition', 'Technology disruption'].slice(0, Math.floor(Math.random() * 3) + 1),
          opportunity_areas: ['Technology synergies', 'Market expansion', 'Cost optimization'].slice(0, Math.floor(Math.random() * 3) + 1),
          data_points_used: Math.floor(Math.random() * 100 + 50),
          similarity_explanations: index === 0 ? [{
            summary: `${name} represents strong strategic fit with complementary capabilities.`,
            key_reasons: ['Direct market overlap', 'Technology expertise', 'Scale advantages'],
            financial_rationale: 'Strong revenue growth and profitable operations',
            strategic_rationale: 'Complementary geographic markets and technology',
            risk_considerations: ['Regulatory complexity', 'Integration challenges'],
            confidence_level: 'High',
            data_quality_note: 'Comprehensive data available'
          }] : undefined
        }
      })
    }
    
    const demoMatches = generateDemoMatches(25)
    const demoAnalysis: SimilarityAnalysis = {
      id: analysisId,
      target_company_name: 'Tesla, Inc.',
      target_company_data: {
        country: 'United States',
        industry: 'Electric Vehicles & Energy',
        founded: '2003',
        employees: '140,000+',
        revenue: '$96.8B',
        description: 'Leading electric vehicle and clean energy company'
      },
      status: 'completed',
      total_companies_analyzed: 247,
      average_similarity_score: 72.3,
      top_similarity_score: 94.2,
      executive_summary: 'Tesla demonstrates strong strategic positioning in the sustainable transportation and energy sector. The analysis identified 247 potential acquisition targets with varying degrees of strategic fit, operational synergies, and market positioning alignment.',
      key_opportunities: [
        'Battery technology consolidation opportunities',
        'Autonomous driving capability enhancement',
        'Energy storage market expansion',
        'Manufacturing efficiency improvements'
      ],
      risk_highlights: [
        'High valuation multiples in target companies',
        'Regulatory challenges in key markets',
        'Integration complexity with legacy automotive companies'
      ],
      strategic_recommendations: [
        'Focus on mid-market battery technology companies',
        'Consider vertical integration in raw materials',
        'Explore partnerships before acquisition in autonomous driving'
      ],
      analysis_configuration: {
        weights: { financial: 30, strategic: 25, operational: 20, market: 15, risk: 10 },
        regions: ['North America', 'Europe', 'Asia-Pacific'],
        industries: ['Electric Vehicles', 'Battery Technology', 'Renewable Energy']
      },
      created_at: '2024-09-02T10:30:00Z',
      completed_at: '2024-09-02T10:45:00Z',
      similar_company_matches: demoMatches,
      summary: {
        totalMatches: demoMatches.length,
        averageScore: demoMatches.reduce((sum, match) => sum + match.overall_score, 0) / demoMatches.length,
        topScore: Math.max(...demoMatches.map(m => m.overall_score)),
        scoreDistribution: {
          excellent: demoMatches.filter(m => m.overall_score >= 85).length,
          good: demoMatches.filter(m => m.overall_score >= 70 && m.overall_score < 85).length,
          fair: demoMatches.filter(m => m.overall_score >= 55 && m.overall_score < 70).length,
          poor: demoMatches.filter(m => m.overall_score < 55).length
        },
        confidenceDistribution: {
          high: demoMatches.filter(m => m.confidence >= 0.8).length,
          medium: demoMatches.filter(m => m.confidence >= 0.6 && m.confidence < 0.8).length,
          low: demoMatches.filter(m => m.confidence < 0.6).length
        }
      }
    }
    
    setAnalysis(demoAnalysis)
    setLoading(false)
  }

  const loadAnalysis = async (userId: string) => {
    try {
      const response = await fetch(`/api/similar-companies/${analysisId}?includeExplanations=true`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load analysis: ${response.statusText}`)
      }

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (error) {
      console.error('Error loading analysis:', error)
      toast.error('Failed to load analysis')
      router.push('/similar-companies')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 55) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBackground = (score: number) => {
    if (score >= 85) return 'bg-green-100 border-green-200'
    if (score >= 70) return 'bg-blue-100 border-blue-200'
    if (score >= 55) return 'bg-yellow-100 border-yellow-200'
    return 'bg-red-100 border-red-200'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredMatches = analysis?.similar_company_matches?.filter(match => {
    if (match.overall_score < filterCriteria.minScore || match.overall_score > filterCriteria.maxScore) return false
    if (filterCriteria.confidenceLevel !== 'all') {
      const confidenceThreshold = filterCriteria.confidenceLevel === 'high' ? 0.8 : 0.6
      const isHighConfidence = match.confidence >= 0.8
      const isMediumConfidence = match.confidence >= 0.6 && match.confidence < 0.8
      
      if (filterCriteria.confidenceLevel === 'high' && !isHighConfidence) return false
      if (filterCriteria.confidenceLevel === 'medium' && !isMediumConfidence) return false
      if (filterCriteria.confidenceLevel === 'low' && match.confidence >= 0.6) return false
    }
    return true
  }) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading analysis details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Analysis Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The requested analysis could not be found or you don't have access to it.
            </p>
            <Link href="/similar-companies">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Analyses
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/similar-companies">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">{analysis.target_company_name}</h1>
                <p className="text-blue-100 text-lg">Similarity Analysis Results</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="secondary" size="sm">
                <Bookmark className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="secondary" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-blue-200" />
                <div>
                  <p className="text-blue-100 text-sm">Companies Analyzed</p>
                  <p className="text-2xl font-bold">{analysis.total_companies_analyzed}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-green-200" />
                <div>
                  <p className="text-blue-100 text-sm">Top Match Score</p>
                  <p className="text-2xl font-bold">{analysis.top_similarity_score.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-purple-200" />
                <div>
                  <p className="text-blue-100 text-sm">Average Score</p>
                  <p className="text-2xl font-bold">{analysis.average_similarity_score.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-200" />
                <div>
                  <p className="text-blue-100 text-sm">Quality Matches</p>
                  <p className="text-2xl font-bold">{analysis.summary.scoreDistribution.excellent + analysis.summary.scoreDistribution.good}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="matches" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="matches" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Similar Companies
            </TabsTrigger>
            <TabsTrigger value="visualizations" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visualizations
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Score Analysis
            </TabsTrigger>
            <TabsTrigger value="target" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Target Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">Min Score</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filterCriteria.minScore}
                      onChange={(e) => setFilterCriteria(prev => ({...prev, minScore: parseInt(e.target.value)}))}
                      className="w-full"
                    />
                    <span className="text-xs text-muted-foreground">{filterCriteria.minScore}</span>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Score</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filterCriteria.maxScore}
                      onChange={(e) => setFilterCriteria(prev => ({...prev, maxScore: parseInt(e.target.value)}))}
                      className="w-full"
                    />
                    <span className="text-xs text-muted-foreground">{filterCriteria.maxScore}</span>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confidence Level</label>
                    <select
                      value={filterCriteria.confidenceLevel}
                      onChange={(e) => setFilterCriteria(prev => ({...prev, confidenceLevel: e.target.value}))}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="all">All Levels</option>
                      <option value="high">High (80%+)</option>
                      <option value="medium">Medium (60-80%)</option>
                      <option value="low">Low (&lt;60%)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => setFilterCriteria({minScore: 0, maxScore: 100, confidenceLevel: 'all', scoreCategory: 'all'})}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Similar Companies List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">
                  Similar Companies ({filteredMatches.length})
                </h3>
                <div className="text-sm text-muted-foreground">
                  Showing companies ranked by overall similarity score
                </div>
              </div>
              
              {filteredMatches.map((match) => (
                <Card key={match.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold">{match.company_name}</h4>
                          <Badge className={getScoreBackground(match.overall_score)}>
                            Rank #{match.rank}
                          </Badge>
                          <Badge variant="outline" className={getConfidenceColor(match.confidence)}>
                            {(match.confidence * 100).toFixed(0)}% Confidence
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3">
                          {match.company_data?.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {match.company_data?.country}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {match.company_data?.industry}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {match.data_points_used} data points
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getScoreColor(match.overall_score)}`}>
                          {match.overall_score.toFixed(1)}
                        </div>
                        <div className="text-sm text-muted-foreground">Overall Score</div>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <DollarSign className="h-3 w-3" />
                          <span className="text-xs font-medium">Financial</span>
                        </div>
                        <div className="text-lg font-semibold">{match.financial_score.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">
                          {(match.financial_confidence * 100).toFixed(0)}% conf.
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Target className="h-3 w-3" />
                          <span className="text-xs font-medium">Strategic</span>
                        </div>
                        <div className="text-lg font-semibold">{match.strategic_score.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">
                          {(match.strategic_confidence * 100).toFixed(0)}% conf.
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Activity className="h-3 w-3" />
                          <span className="text-xs font-medium">Operational</span>
                        </div>
                        <div className="text-lg font-semibold">{match.operational_score.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">
                          {(match.operational_confidence * 100).toFixed(0)}% conf.
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs font-medium">Market</span>
                        </div>
                        <div className="text-lg font-semibold">{match.market_score.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">
                          {(match.market_confidence * 100).toFixed(0)}% conf.
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Shield className="h-3 w-3" />
                          <span className="text-xs font-medium">Risk</span>
                        </div>
                        <div className="text-lg font-semibold">{match.risk_score.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">
                          {(match.risk_confidence * 100).toFixed(0)}% conf.
                        </div>
                      </div>
                    </div>

                    {/* AI Explanation */}
                    {match.similarity_explanations?.[0] && (
                      <div className="bg-blue-50 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                          <Brain className="h-4 w-4 text-blue-600 mt-1" />
                          <div className="flex-1">
                            <h5 className="font-medium text-blue-900 mb-2">AI Explanation</h5>
                            <p className="text-sm text-blue-800 mb-3">
                              {match.similarity_explanations[0].summary}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-medium">Key Reasons:</span>
                                <ul className="list-disc list-inside mt-1 text-blue-700">
                                  {match.similarity_explanations[0].key_reasons.map((reason, idx) => (
                                    <li key={idx}>{reason}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <span className="font-medium">Risk Considerations:</span>
                                <ul className="list-disc list-inside mt-1 text-blue-700">
                                  {match.similarity_explanations[0].risk_considerations.map((risk, idx) => (
                                    <li key={idx}>{risk}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Opportunities & Risks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h6 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Opportunity Areas
                        </h6>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {match.opportunity_areas.map((opportunity, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                              {opportunity}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h6 className="font-medium text-red-700 mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Risk Factors
                        </h6>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {match.risk_factors_identified.map((risk, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="visualizations" className="space-y-6">
            {/* Interactive Visualizations for M&A Analysis */}
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Interactive M&A Analysis Visualizations</h2>
                <p className="text-muted-foreground max-w-3xl mx-auto">
                  Explore similarity data through sophisticated interactive visualizations designed for M&A professionals.
                  These tools help identify patterns, relationships, and opportunities in the analysis results.
                </p>
              </div>

              {/* Similarity Matrix */}
              <SimilarityMatrix
                matches={filteredMatches}
                dimensions={['Financial', 'Strategic', 'Operational', 'Market', 'Risk']}
                targetCompany={analysis.target_company_name}
              />

              {/* Score vs Confidence Scatter Plot */}
              <ScoreConfidenceScatter
                matches={filteredMatches}
                targetCompany={analysis.target_company_name}
              />

              {/* Multi-Dimensional Radar Chart */}
              <MultiDimensionalRadar
                matches={filteredMatches}
                targetCompany={analysis.target_company_name}
                maxCompanies={5}
              />

              {/* Similarity Network */}
              <SimilarityNetwork
                matches={filteredMatches}
                targetCompany={analysis.target_company_name}
                maxNodes={20}
              />

              {/* Visualization Insights */}
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Brain className="h-5 w-5" />
                    Visualization Insights & Usage Guide
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2">🔍 Similarity Matrix</h4>
                        <p className="text-blue-700">
                          Heatmap visualization showing dimensional scores across companies. Use to quickly identify
                          companies that excel in specific M&A criteria and spot patterns across dimensions.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2">📊 Score vs Confidence</h4>
                        <p className="text-blue-700">
                          Scatter plot exploring the relationship between similarity scores and analysis confidence.
                          Target the top-right quadrant for high-score, high-confidence acquisition opportunities.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2">🎯 Multi-Dimensional Radar</h4>
                        <p className="text-blue-700">
                          Comparative radar charts showing companies across all five M&A dimensions. Perfect for
                          side-by-side comparison of acquisition candidates and identifying complementary strengths.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2">🕸️ Similarity Network</h4>
                        <p className="text-blue-700">
                          Interactive network showing relationships and clustering between companies. Use to identify
                          potential acquisition themes, market segments, and companies with similar profiles.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {/* Executive Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {analysis.executive_summary}
                </p>
              </CardContent>
            </Card>

            {/* Strategic Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Strategic Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {analysis.strategic_recommendations.map((recommendation, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-semibold mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-muted-foreground">{recommendation}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Key Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Key Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.key_opportunities.map((opportunity, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                      <p className="text-green-800 text-sm">{opportunity}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Risk Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {analysis.risk_highlights.map((risk, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-1" />
                      <p className="text-red-800 text-sm">{risk}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {/* Score Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Score Distribution</CardTitle>
                  <CardDescription>Distribution of similarity scores across all matches</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Excellent (85+)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-green-500 rounded-full" 
                            style={{ width: `${(analysis.summary.scoreDistribution.excellent / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.scoreDistribution.excellent}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Good (70-84)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-blue-500 rounded-full" 
                            style={{ width: `${(analysis.summary.scoreDistribution.good / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.scoreDistribution.good}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fair (55-69)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-yellow-500 rounded-full" 
                            style={{ width: `${(analysis.summary.scoreDistribution.fair / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.scoreDistribution.fair}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Poor (&lt;55)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-red-500 rounded-full" 
                            style={{ width: `${(analysis.summary.scoreDistribution.poor / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.scoreDistribution.poor}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Confidence Distribution</CardTitle>
                  <CardDescription>Confidence levels across all similarity assessments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">High (80%+)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-green-500 rounded-full" 
                            style={{ width: `${(analysis.summary.confidenceDistribution.high / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.confidenceDistribution.high}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Medium (60-79%)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-yellow-500 rounded-full" 
                            style={{ width: `${(analysis.summary.confidenceDistribution.medium / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.confidenceDistribution.medium}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Low (&lt;60%)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-red-500 rounded-full" 
                            style={{ width: `${(analysis.summary.confidenceDistribution.low / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.confidenceDistribution.low}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analysis Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Configuration</CardTitle>
                <CardDescription>Parameters and weights used for this analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Scoring Weights</h4>
                    <div className="space-y-2">
                      {Object.entries(analysis.analysis_configuration?.weights || {}).map(([category, weight]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{category}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div 
                                className="h-2 bg-blue-500 rounded-full" 
                                style={{ width: `${weight as number * 2}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">{weight}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Analysis Scope</h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium">Regions:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(analysis.analysis_configuration?.regions || []).map((region: string, idx: number) => (
                            <Badge key={idx} variant="outline">{region}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Industries:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(analysis.analysis_configuration?.industries || []).map((industry: string, idx: number) => (
                            <Badge key={idx} variant="outline">{industry}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="target" className="space-y-6">
            {/* Target Company Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {analysis.target_company_name}
                </CardTitle>
                <CardDescription>Target company profile used for similarity analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Country</div>
                    <div className="text-lg">{analysis.target_company_data?.country || 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Industry</div>
                    <div className="text-lg">{analysis.target_company_data?.industry || 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Founded</div>
                    <div className="text-lg">{analysis.target_company_data?.founded || 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Employees</div>
                    <div className="text-lg">{analysis.target_company_data?.employees || 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Revenue</div>
                    <div className="text-lg">{analysis.target_company_data?.revenue || 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Analysis Date</div>
                    <div className="text-lg">{formatDate(analysis.created_at)}</div>
                  </div>
                </div>
                
                {analysis.target_company_data?.description && (
                  <div className="mt-6">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Description</div>
                    <p className="text-muted-foreground leading-relaxed">
                      {analysis.target_company_data.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function SimilarCompanyDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <SimilarCompanyDetailContent />
    </Suspense>
  )
}