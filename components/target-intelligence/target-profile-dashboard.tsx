'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { 
  Building2, 
  Globe, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Shield,
  Brain,
  Target,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  Award,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  RefreshCw,
  ExternalLink,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  Star,
  Gauge
} from 'lucide-react'
import { toast } from 'sonner'

import { EnhancedCompanyProfile } from '@/lib/target-intelligence/target-intelligence-service'

interface TargetProfileDashboardProps {
  companyName: string
  existingData?: any
  onDataUpdate?: (profile: EnhancedCompanyProfile) => void
  className?: string
}

interface AnalysisProgress {
  stage: string
  progress: number
  message: string
  current_task?: string
}

export function TargetProfileDashboard({ 
  companyName, 
  existingData, 
  onDataUpdate,
  className = ""
}: TargetProfileDashboardProps) {
  const [profile, setProfile] = useState<EnhancedCompanyProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  useEffect(() => {
    // If existing data is available, populate the profile
    if (existingData && !profile) {
      setProfile(existingData)
    }
  }, [existingData, profile])

  const handleEnhanceProfile = async () => {
    setLoading(true)
    setError(null)
    setAnalysisProgress({ stage: 'initialization', progress: 0, message: 'Starting analysis...' })

    try {
      const response = await fetch('/api/target-intelligence/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: companyName,
          existing_data: existingData,
          options: {
            include_competitive_analysis: true,
            include_financial_deep_dive: true,
            include_esg_assessment: true,
            use_real_time_data: true
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }

      const enhancedProfile = await response.json()
      setProfile(enhancedProfile)
      
      if (onDataUpdate) {
        onDataUpdate(enhancedProfile)
      }
      
      toast.success('Target intelligence analysis completed successfully')
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      toast.error(`Analysis failed: ${errorMessage}`)
    } finally {
      setLoading(false)
      setAnalysisProgress(null)
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return <Badge variant="default" className="bg-green-100 text-green-800">High Confidence</Badge>
    if (score >= 60) return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>
    return <Badge variant="default" className="bg-red-100 text-red-800">Low Confidence</Badge>
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      notation: 'compact'
    }).format(amount)
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Company Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                {profile?.company_name || companyName}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span>{profile?.industry || 'Unknown Industry'}</span>
                <span>•</span>
                <span>{profile?.headquarters?.city}, {profile?.headquarters?.country}</span>
                {profile?.website && (
                  <>
                    <span>•</span>
                    <a 
                      href={profile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
              </CardDescription>
            </div>
            <div className="text-right">
              {profile?.analysis_metadata && getConfidenceBadge(profile.analysis_metadata.confidence_score)}
              {profile?.analysis_metadata && (
                <div className="text-sm text-muted-foreground mt-1">
                  Updated: {new Date(profile.analysis_metadata.last_updated).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {profile?.ai_insights?.executive_summary && (
            <div className="mb-4">
              <p className="text-sm leading-relaxed">{profile.ai_insights.executive_summary}</p>
            </div>
          )}
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-lg font-semibold">
                {profile?.employee_count?.estimate 
                  ? `${profile.employee_count.estimate.toLocaleString()}` 
                  : profile?.employee_count?.range || 'Unknown'}
              </div>
              <div className="text-xs text-muted-foreground">Employees</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-lg font-semibold">
                {profile?.financial_profile?.revenue_estimate 
                  ? formatCurrency(profile.financial_profile.revenue_estimate.value)
                  : 'Unknown'}
              </div>
              <div className="text-xs text-muted-foreground">Annual Revenue</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-lg font-semibold">
                {profile?.ai_insights?.acquisition_readiness_score || 'TBD'}
                {profile?.ai_insights?.acquisition_readiness_score && '%'}
              </div>
              <div className="text-xs text-muted-foreground">Acquisition Readiness</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-lg font-semibold">
                {profile?.esg_assessment?.overall_esg_score || 'TBD'}
                {profile?.esg_assessment?.overall_esg_score && '/100'}
              </div>
              <div className="text-xs text-muted-foreground">ESG Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights Card */}
      {profile?.ai_insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI-Powered Strategic Insights
            </CardTitle>
            <CardDescription>
              Machine learning analysis of investment opportunity and strategic fit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.ai_insights.investment_thesis && (
              <div>
                <h4 className="font-medium mb-2">Investment Thesis</h4>
                <p className="text-sm text-muted-foreground">{profile.ai_insights.investment_thesis}</p>
              </div>
            )}
            
            {profile.ai_insights.key_value_drivers?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Key Value Drivers</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.ai_insights.key_value_drivers.map((driver, index) => (
                    <Badge key={index} variant="outline" className="text-green-700 border-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {driver}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {profile.ai_insights.potential_risks?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Potential Risks</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.ai_insights.potential_risks.map((risk, index) => (
                    <Badge key={index} variant="outline" className="text-red-700 border-red-300">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {risk}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderFinancialTab = () => (
    <div className="space-y-6">
      {/* Financial Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Revenue & Growth</h4>
              <div className="space-y-3">
                {profile?.financial_profile?.revenue_estimate && (
                  <div className="flex justify-between">
                    <span className="text-sm">Annual Revenue:</span>
                    <span className="font-medium">
                      {formatCurrency(profile.financial_profile.revenue_estimate.value)}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {profile.financial_profile.revenue_estimate.confidence}% confidence
                      </Badge>
                    </span>
                  </div>
                )}
                
                {profile?.financial_profile?.profitability_indicators?.revenue_growth && (
                  <div className="flex justify-between">
                    <span className="text-sm">Revenue Growth:</span>
                    <span className="font-medium text-green-600">
                      +{profile.financial_profile.profitability_indicators.revenue_growth}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Funding & Investment</h4>
              <div className="space-y-3">
                {profile?.financial_profile?.funding_history?.length > 0 ? (
                  profile.financial_profile.funding_history.slice(0, 3).map((round, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-sm capitalize">{round.round_type}:</span>
                      <span className="font-medium">
                        {round.amount ? formatCurrency(round.amount) : 'Undisclosed'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No funding information available
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Financial Health Score */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Financial Health Score</span>
              <span className="text-sm">{profile?.financial_profile?.financial_health_score || 50}/100</span>
            </div>
            <Progress 
              value={profile?.financial_profile?.financial_health_score || 50} 
              className="h-2" 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderCompetitiveTab = () => (
    <div className="space-y-6">
      {/* Market Position */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Market Position & Competition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Competitive Position</h4>
              <Badge 
                variant="outline" 
                className={`mb-4 ${
                  profile?.market_position?.competitive_position === 'leader' ? 'bg-green-100 text-green-800' :
                  profile?.market_position?.competitive_position === 'challenger' ? 'bg-blue-100 text-blue-800' :
                  profile?.market_position?.competitive_position === 'follower' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-purple-100 text-purple-800'
                }`}
              >
                {profile?.market_position?.competitive_position?.toUpperCase() || 'UNKNOWN'}
              </Badge>
              
              {profile?.market_position?.key_competitors?.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-2">Key Competitors</h5>
                  <div className="space-y-2">
                    {profile.market_position.key_competitors.slice(0, 5).map((competitor, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{competitor.name}</span>
                        <Badge 
                          variant="outline" 
                          className={
                            competitor.competitive_threat === 'high' ? 'border-red-300 text-red-700' :
                            competitor.competitive_threat === 'medium' ? 'border-yellow-300 text-yellow-700' :
                            'border-green-300 text-green-700'
                          }
                        >
                          {competitor.competitive_threat} threat
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h4 className="font-medium mb-3">SWOT Analysis</h4>
              {profile?.market_position?.swot_analysis && (
                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-medium text-green-700 mb-1">Strengths</h5>
                    <div className="text-xs text-muted-foreground">
                      {profile.market_position.swot_analysis.strengths?.slice(0, 2).map((item, i) => (
                        <div key={i}>• {item}</div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-blue-700 mb-1">Opportunities</h5>
                    <div className="text-xs text-muted-foreground">
                      {profile.market_position.swot_analysis.opportunities?.slice(0, 2).map((item, i) => (
                        <div key={i}>• {item}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTechnologyTab = () => (
    <div className="space-y-6">
      {/* Technology Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Technology & Digital Footprint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Digital Maturity</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Overall Score:</span>
                  <span className="font-medium">
                    {profile?.technology_profile?.digital_maturity_score || 50}/100
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>SEO Score:</span>
                    <span>{profile?.technology_profile?.website_analysis?.seo_score || 50}/100</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Mobile Friendly:</span>
                    <span className={profile?.technology_profile?.website_analysis?.mobile_friendly ? 'text-green-600' : 'text-red-600'}>
                      {profile?.technology_profile?.website_analysis?.mobile_friendly ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Security Score:</span>
                    <span>{profile?.technology_profile?.website_analysis?.security_score || 50}/100</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Technology Stack</h4>
              {profile?.technology_profile?.tech_stack?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.technology_profile.tech_stack.slice(0, 8).map((tech, index) => (
                    <Badge key={index} variant="outline">
                      {tech}
                    </Badge>
                  ))}
                  {profile.technology_profile.tech_stack.length > 8 && (
                    <Badge variant="outline">
                      +{profile.technology_profile.tech_stack.length - 8} more
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Technology stack information not available
                </div>
              )}
            </div>
          </div>
          
          {/* Social Media Presence */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">Social Media Presence</h4>
            {profile?.technology_profile?.social_media_presence?.platforms && 
             Object.keys(profile.technology_profile.social_media_presence.platforms).length > 0 ? (
              <div className="flex gap-4">
                {Object.entries(profile.technology_profile.social_media_presence.platforms).map(([platform, data]: [string, any]) => (
                  <div key={platform} className="flex items-center gap-2">
                    <Badge variant="outline">
                      {platform}
                      {data.followers && (
                        <span className="ml-1 text-xs">
                          {data.followers.toLocaleString()} followers
                        </span>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Social media information not available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderESGTab = () => (
    <div className="space-y-6">
      {/* ESG Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            ESG Assessment
          </CardTitle>
          <CardDescription>
            Environmental, Social, and Governance evaluation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {profile?.esg_assessment?.environmental_score || 50}/100
              </div>
              <div className="text-sm font-medium mb-1">Environmental</div>
              <Progress 
                value={profile?.esg_assessment?.environmental_score || 50} 
                className="h-2 mb-2" 
              />
              <div className="text-xs text-muted-foreground">
                Sustainability practices
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {profile?.esg_assessment?.social_score || 50}/100
              </div>
              <div className="text-sm font-medium mb-1">Social</div>
              <Progress 
                value={profile?.esg_assessment?.social_score || 50} 
                className="h-2 mb-2" 
              />
              <div className="text-xs text-muted-foreground">
                Employee & community impact
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {profile?.esg_assessment?.governance_score || 50}/100
              </div>
              <div className="text-sm font-medium mb-1">Governance</div>
              <Progress 
                value={profile?.esg_assessment?.governance_score || 50} 
                className="h-2 mb-2" 
              />
              <div className="text-xs text-muted-foreground">
                Leadership & ethics
              </div>
            </div>
          </div>
          
          {/* ESG Initiatives */}
          {profile?.esg_assessment?.sustainability_initiatives?.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Sustainability Initiatives</h4>
              <div className="flex flex-wrap gap-2">
                {profile.esg_assessment.sustainability_initiatives.map((initiative, index) => (
                  <Badge key={index} variant="outline" className="text-green-700 border-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {initiative}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Target Intelligence Profile</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis powered by local LLM intelligence
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnhanceProfile}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            {loading ? 'Analyzing...' : 'Enhance with AI'}
          </Button>
          
          {profile && (
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Profile
            </Button>
          )}
        </div>
      </div>

      {/* Loading Progress */}
      {loading && analysisProgress && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Analysis Progress</span>
                <span>{analysisProgress.progress}%</span>
              </div>
              <Progress value={analysisProgress.progress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {analysisProgress.message}
                {analysisProgress.current_task && ` - ${analysisProgress.current_task}`}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Analysis Failed</span>
            </div>
            <p className="text-sm text-red-700 mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {profile ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="competitive" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Competitive
            </TabsTrigger>
            <TabsTrigger value="technology" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Technology
            </TabsTrigger>
            <TabsTrigger value="esg" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              ESG
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">{renderOverviewTab()}</TabsContent>
          <TabsContent value="financial">{renderFinancialTab()}</TabsContent>
          <TabsContent value="competitive">{renderCompetitiveTab()}</TabsContent>
          <TabsContent value="technology">{renderTechnologyTab()}</TabsContent>
          <TabsContent value="esg">{renderESGTab()}</TabsContent>
        </Tabs>
      ) : !loading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-blue-50 p-3">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium mb-2">Enhanced Target Intelligence</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate comprehensive company analysis using AI-powered intelligence gathering
                </p>
                <Button onClick={handleEnhanceProfile}>
                  <Brain className="h-4 w-4 mr-2" />
                  Start AI Analysis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}