'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  DollarSign,
  Shield,
  Activity,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Download,
  Share2,
  RefreshCw,
  Bell,
  Sparkles,
  Brain,
  Users,
  Building2,
  MapPin,
  Calendar
} from 'lucide-react'
import { motion } from 'framer-motion'
import { ScanResultsData, TargetCompany } from '@/lib/opp-scan/scan-results-data'

interface ExecutiveCommandCenterProps {
  scanData: ScanResultsData
  onRefresh?: () => void
  onExport?: () => void
  onShare?: () => void
}

export function ExecutiveCommandCenter({ 
  scanData, 
  onRefresh, 
  onExport, 
  onShare 
}: ExecutiveCommandCenterProps) {
  const [activeInsightTab, setActiveInsightTab] = useState('summary')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (!onRefresh) return
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: amount > 1000000 ? 'compact' : 'standard',
      compactDisplay: 'short'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'analyzing':
      case 'scanning':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getChangeIndicator = (value: number, threshold: number = 0) => {
    if (value > threshold) return <ArrowUp className="h-4 w-4 text-green-500" />
    if (value < threshold) return <ArrowDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Executive Command Center
          </h2>
          <p className="text-muted-foreground">
            AI-powered insights and strategic recommendations for {scanData.scan.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Bell className="h-3 w-3" />
            {scanData.summary.riskAlerts.length} alerts
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scan Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(scanData.scan.status)}
                  <span className="text-sm font-medium capitalize">{scanData.scan.status}</span>
                </div>
                <Badge variant="secondary">{formatPercentage(scanData.summary.completionPercentage)}</Badge>
              </div>
              <Progress 
                value={scanData.summary.completionPercentage} 
                className="h-2 mb-2" 
              />
              <p className="text-xs text-muted-foreground">
                {scanData.summary.analyzedTargets} of {scanData.summary.totalTargets} targets analyzed
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quality Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10"></div>
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-8 w-8 text-green-500" />
                <Badge className={getScoreColor(scanData.summary.avgOverallScore)}>
                  {Math.round(scanData.summary.avgOverallScore)}
                </Badge>
              </div>
              <p className="text-sm font-medium">Quality Score</p>
              <p className="text-xs text-muted-foreground">
                {scanData.summary.highQualityTargets} high-quality targets
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Value */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10"></div>
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-8 w-8 text-yellow-500" />
                <div className="flex items-center gap-1">
                  {getChangeIndicator(15)} {/* Demo: 15% increase */}
                  <span className="text-xs text-green-600">+15%</span>
                </div>
              </div>
              <p className="text-sm font-medium">Total Value</p>
              <p className="text-lg font-bold">{formatCurrency(scanData.summary.totalEstimatedValue)}</p>
              <p className="text-xs text-muted-foreground">Estimated enterprise value</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Risk Level */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/10"></div>
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <Shield className="h-8 w-8 text-red-500" />
                <Badge variant={scanData.summary.criticalRiskTargets > 0 ? "destructive" : "secondary"}>
                  {scanData.summary.criticalRiskTargets === 0 ? 'Low' : 'High'}
                </Badge>
              </div>
              <p className="text-sm font-medium">Risk Level</p>
              <p className="text-xs text-muted-foreground">
                {scanData.summary.criticalRiskTargets} critical issues
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI-Powered Insights Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI-Powered Strategic Insights
          </CardTitle>
          <CardDescription>
            Advanced analysis and recommendations based on comprehensive data assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeInsightTab} onValueChange={setActiveInsightTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Executive Summary</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="risks">Risk Alerts</TabsTrigger>
              <TabsTrigger value="actions">Next Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4 space-y-4">
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>Key Findings</AlertTitle>
                <AlertDescription>
                  {scanData.summary.keyInsights[0] || 'Analysis in progress...'}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {formatPercentage((scanData.summary.highQualityTargets / scanData.summary.totalTargets) * 100)}
                    </div>
                    <p className="text-sm text-muted-foreground">High-quality targets</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {formatPercentage(scanData.summary.avgStrategicFitScore * 100)}
                    </div>
                    <p className="text-sm text-muted-foreground">Strategic alignment</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {Math.round((scanData.summary.lowRiskTargets / scanData.summary.totalTargets) * 100)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Low-risk opportunities</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Strategic Insights
                </h4>
                {scanData.summary.keyInsights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="opportunities" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Targets</CardTitle>
                    <CardDescription>Highest scoring acquisition candidates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {scanData.summary.topOpportunities.slice(0, 5).map((target, index) => (
                      <div key={target.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                        <div>
                          <p className="font-medium text-sm">{target.company_name}</p>
                          <p className="text-xs text-muted-foreground">{target.employee_count_range} employees</p>
                        </div>
                        <Badge variant="outline" className={getScoreColor(target.overall_score)}>
                          {Math.round(target.overall_score)}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Market Distribution</CardTitle>
                    <CardDescription>Industry and geographic breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(scanData.summary.industryBreakdown).map(([industry, count]) => (
                      <div key={industry} className="flex items-center justify-between">
                        <span className="text-sm">{industry}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full"
                              style={{ width: `${(count / scanData.summary.totalTargets) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-6">{count}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="risks" className="mt-4 space-y-4">
              {scanData.summary.riskAlerts.length > 0 ? (
                <div className="space-y-3">
                  {scanData.summary.riskAlerts.map((alert, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>{alert.target.company_name}</AlertTitle>
                      <AlertDescription>
                        Risk factors: {alert.risks.join(', ')}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>No Critical Risks Detected</AlertTitle>
                  <AlertDescription>
                    All targets show acceptable risk profiles based on current analysis.
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Risk Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{scanData.summary.lowRiskTargets}</div>
                      <div className="text-xs text-muted-foreground">Low Risk</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-lg font-bold text-yellow-600">{scanData.summary.moderateRiskTargets}</div>
                      <div className="text-xs text-muted-foreground">Moderate Risk</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">{scanData.summary.highRiskTargets}</div>
                      <div className="text-xs text-muted-foreground">High Risk</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-lg font-bold text-red-600">{scanData.summary.criticalRiskTargets}</div>
                      <div className="text-xs text-muted-foreground">Critical Risk</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions" className="mt-4 space-y-4">
              <div className="space-y-3">
                {scanData.summary.nextActions.map((action, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-purple-600">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{action}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Priority {index < 2 ? 'High' : 'Medium'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {index % 2 === 0 ? 'M&A Team' : 'Due Diligence'}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeline Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Next 7 Days</p>
                        <p className="text-sm text-muted-foreground">
                          Complete technical due diligence for top 3 targets
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Next 2 Weeks</p>
                        <p className="text-sm text-muted-foreground">
                          Schedule management presentations and site visits
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="font-medium">Next Month</p>
                        <p className="text-sm text-muted-foreground">
                          Prepare initial offer structures and negotiate LOIs
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}