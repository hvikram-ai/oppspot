'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
  Database, 
  Zap,
  Clock,
  Shield,
  DollarSign,
  TrendingUp,
  FileText,
  Globe,
  Users,
  Building,
  Search,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings
} from 'lucide-react'

interface DataSource {
  id: string
  name: string
  description: string
  category: 'official' | 'financial' | 'digital' | 'intelligence' | 'compliance'
  cost_tier: 'free' | 'low' | 'medium' | 'high' | 'premium'
  reliability: number // 0-100
  coverage: 'uk_only' | 'ireland_only' | 'uk_ireland' | 'global'
  data_types: string[]
  typical_cost_per_search: string
  enterprise_features: string[]
  compliance_level: 'basic' | 'standard' | 'enterprise'
  icon: any
}

interface ScanConfigurationProps {
  config: any
  onChange: (field: string, value: any) => void
}

export function ScanConfigurationStep({ config, onChange }: ScanConfigurationProps) {
  const [selectedTab, setSelectedTab] = useState<'sources' | 'parameters' | 'compliance'>('sources')

  // Comprehensive data sources for enterprise acquisition intelligence
  const dataSources: DataSource[] = [
    {
      id: 'companies_house',
      name: 'Companies House',
      description: 'Official UK company registration, filings, and directors information',
      category: 'official',
      cost_tier: 'free',
      reliability: 95,
      coverage: 'uk_only',
      data_types: ['Company registration', 'Financial filings', 'Directors', 'Ownership structure', 'Legal status'],
      typical_cost_per_search: 'Free',
      enterprise_features: ['Bulk downloads', 'API access', 'Real-time updates'],
      compliance_level: 'enterprise',
      icon: Building
    },
    {
      id: 'irish_cro',
      name: 'Irish Companies Registration Office',
      description: 'Official Irish company registration and compliance information',
      category: 'official',
      cost_tier: 'low',
      reliability: 93,
      coverage: 'ireland_only',
      data_types: ['Company registration', 'Annual returns', 'Directors', 'Charges', 'Dissolution records'],
      typical_cost_per_search: '€2-5',
      enterprise_features: ['Bulk access', 'XML feeds', 'Automated monitoring'],
      compliance_level: 'enterprise',
      icon: Building
    },
    {
      id: 'financial_data',
      name: 'Experian Business Intelligence',
      description: 'Comprehensive financial health, credit scores, and risk assessment',
      category: 'financial',
      cost_tier: 'premium',
      reliability: 88,
      coverage: 'uk_ireland',
      data_types: ['Credit scores', 'Financial ratios', 'Payment behavior', 'Risk indicators', 'Industry benchmarks'],
      typical_cost_per_search: '£15-50',
      enterprise_features: ['Predictive analytics', 'Custom scoring', 'API integration', 'Bulk screening'],
      compliance_level: 'enterprise',
      icon: TrendingUp
    },
    {
      id: 'dun_bradstreet',
      name: 'Dun & Bradstreet Business Data',
      description: 'Global business intelligence and risk management data',
      category: 'financial',
      cost_tier: 'premium',
      reliability: 90,
      coverage: 'global',
      data_types: ['D&B ratings', 'Financial statements', 'Company hierarchies', 'Trade references', 'Industry analysis'],
      typical_cost_per_search: '£25-75',
      enterprise_features: ['Global coverage', 'Supply chain mapping', 'ESG data', 'Predictive models'],
      compliance_level: 'enterprise',
      icon: Globe
    },
    {
      id: 'digital_footprint',
      name: 'SEMrush Business Intelligence',
      description: 'Website traffic, SEO performance, digital marketing analysis',
      category: 'digital',
      cost_tier: 'medium',
      reliability: 75,
      coverage: 'global',
      data_types: ['Website traffic', 'SEO rankings', 'PPC campaigns', 'Competitor analysis', 'Market share'],
      typical_cost_per_search: '£5-15',
      enterprise_features: ['API access', 'Custom reports', 'Historical data', 'Competitor tracking'],
      compliance_level: 'standard',
      icon: Search
    },
    {
      id: 'patents_ip',
      name: 'Intellectual Property Office Data',
      description: 'UK and EU patent, trademark, and design registrations',
      category: 'intelligence',
      cost_tier: 'low',
      reliability: 92,
      coverage: 'uk_ireland',
      data_types: ['Patents', 'Trademarks', 'Designs', 'Copyright', 'IP litigation', 'Filing trends'],
      typical_cost_per_search: '£2-8',
      enterprise_features: ['Patent analytics', 'Citation analysis', 'Competitive intelligence', 'Alert systems'],
      compliance_level: 'standard',
      icon: Shield
    },
    {
      id: 'news_media',
      name: 'Factiva News Intelligence',
      description: 'Global news, business journals, and media sentiment analysis',
      category: 'intelligence',
      cost_tier: 'high',
      reliability: 85,
      coverage: 'global',
      data_types: ['News articles', 'Press releases', 'Industry reports', 'Executive mentions', 'Sentiment analysis'],
      typical_cost_per_search: '£10-30',
      enterprise_features: ['Real-time alerts', 'Sentiment scoring', 'Executive tracking', 'Custom dashboards'],
      compliance_level: 'standard',
      icon: FileText
    },
    {
      id: 'employee_data',
      name: 'LinkedIn Business Insights',
      description: 'Employee data, hiring patterns, and organizational structure',
      category: 'intelligence',
      cost_tier: 'medium',
      reliability: 70,
      coverage: 'global',
      data_types: ['Employee counts', 'Hiring trends', 'Skills analysis', 'Executive profiles', 'Company growth'],
      typical_cost_per_search: '£8-20',
      enterprise_features: ['Talent mapping', 'Skills gap analysis', 'Competitive hiring', 'Growth indicators'],
      compliance_level: 'standard',
      icon: Users
    },
    {
      id: 'customer_reviews',
      name: 'Trustpilot & Review Analytics',
      description: 'Customer satisfaction, service quality, and reputation analysis',
      category: 'digital',
      cost_tier: 'free',
      reliability: 65,
      coverage: 'global',
      data_types: ['Customer reviews', 'Ratings', 'Sentiment trends', 'Response analysis', 'Competitor comparisons'],
      typical_cost_per_search: 'Free-£5',
      enterprise_features: ['API access', 'Sentiment analysis', 'Competitor benchmarking', 'Trend analysis'],
      compliance_level: 'basic',
      icon: Users
    },
    {
      id: 'competitive_intelligence',
      name: 'Owler Competitive Intelligence',
      description: 'Competitive analysis, funding data, and market positioning',
      category: 'intelligence',
      cost_tier: 'medium',
      reliability: 78,
      coverage: 'global',
      data_types: ['Funding rounds', 'Revenue estimates', 'Employee growth', 'News mentions', 'Competitive moves'],
      typical_cost_per_search: '£12-25',
      enterprise_features: ['Custom alerts', 'Competitive tracking', 'Market analysis', 'Funding intelligence'],
      compliance_level: 'standard',
      icon: TrendingUp
    },
    {
      id: 'regulatory_filings',
      name: 'FCA & Regulatory Database',
      description: 'Financial services regulation, compliance, and enforcement data',
      category: 'compliance',
      cost_tier: 'low',
      reliability: 94,
      coverage: 'uk_only',
      data_types: ['FCA permissions', 'Disciplinary actions', 'Regulatory notices', 'Compliance reports', 'Enforcement'],
      typical_cost_per_search: '£3-10',
      enterprise_features: ['Regulatory monitoring', 'Compliance scoring', 'Risk alerts', 'Historical tracking'],
      compliance_level: 'enterprise',
      icon: Shield
    },
    {
      id: 'market_data',
      name: 'IBISWorld Market Research',
      description: 'Industry analysis, market size, and growth projections',
      category: 'intelligence',
      cost_tier: 'high',
      reliability: 87,
      coverage: 'uk_ireland',
      data_types: ['Industry reports', 'Market size', 'Growth forecasts', 'Key players', 'Trend analysis'],
      typical_cost_per_search: '£50-150',
      enterprise_features: ['Custom research', 'Industry benchmarks', 'Forecasting models', 'Competitor profiles'],
      compliance_level: 'standard',
      icon: Database
    }
  ]

  const handleDataSourceToggle = (sourceId: string) => {
    const current = config.dataSources || []
    const newSources = current.includes(sourceId)
      ? current.filter((id: string) => id !== sourceId)
      : [...current, sourceId]
    
    onChange('dataSources', newSources)
  }

  const handleScanDepthChange = (depth: 'basic' | 'detailed' | 'comprehensive') => {
    onChange('scanDepth', depth)
    
    // Auto-select recommended data sources based on depth
    const recommendations = {
      basic: ['companies_house', 'irish_cro', 'customer_reviews'],
      detailed: ['companies_house', 'irish_cro', 'financial_data', 'digital_footprint', 'customer_reviews', 'patents_ip'],
      comprehensive: dataSources.map(ds => ds.id)
    }
    
    onChange('dataSources', recommendations[depth])
  }

  const isSourceSelected = (sourceId: string) => {
    return config.dataSources?.includes(sourceId) || false
  }

  const getCostColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'bg-green-100 text-green-800'
      case 'low':
        return 'bg-blue-100 text-blue-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'premium':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getReliabilityColor = (reliability: number) => {
    if (reliability >= 90) return 'bg-green-100 text-green-800'
    if (reliability >= 80) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const selectedSources = dataSources.filter(ds => isSourceSelected(ds.id))
  const estimatedMonthlyCost = selectedSources.reduce((total, source) => {
    const costMap = { free: 0, low: 50, medium: 200, high: 500, premium: 1500 }
    return total + costMap[source.cost_tier]
  }, 0)

  const averageReliability = selectedSources.length > 0 
    ? Math.round(selectedSources.reduce((sum, s) => sum + s.reliability, 0) / selectedSources.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setSelectedTab('sources')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'sources'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Database className="h-4 w-4 inline mr-2" />
          Data Sources
        </button>
        <button
          onClick={() => setSelectedTab('parameters')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'parameters'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="h-4 w-4 inline mr-2" />
          Scan Parameters
        </button>
        <button
          onClick={() => setSelectedTab('compliance')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'compliance'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="h-4 w-4 inline mr-2" />
          Compliance & Security
        </button>
      </div>

      {selectedTab === 'sources' && (
        <>
          {/* Scan Depth Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Scan Depth & Scope</CardTitle>
              <CardDescription>
                Choose your scanning depth. Higher depth provides more comprehensive analysis but increases cost and time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'basic',
                    name: 'Basic Scan',
                    description: 'Essential data from free and low-cost sources',
                    features: ['Company registration', 'Basic financials', 'Public reviews'],
                    cost: '£0-100/month',
                    timeline: '1-2 days'
                  },
                  {
                    id: 'detailed',
                    name: 'Detailed Analysis',
                    description: 'Comprehensive analysis with premium financial data',
                    features: ['Financial health scoring', 'Digital presence analysis', 'IP portfolio review'],
                    cost: '£500-2,000/month',
                    timeline: '3-7 days'
                  },
                  {
                    id: 'comprehensive',
                    name: 'Enterprise Intelligence',
                    description: 'Full enterprise-grade analysis with all data sources',
                    features: ['Complete due diligence', 'Predictive modeling', 'Competitive intelligence'],
                    cost: '£2,000-10,000/month',
                    timeline: '1-2 weeks'
                  }
                ].map((depth) => (
                  <Card 
                    key={depth.id}
                    className={`cursor-pointer transition-all ${
                      config.scanDepth === depth.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                    }`}
                    onClick={() => handleScanDepthChange(depth.id as any)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          config.scanDepth === depth.id ? 'bg-primary border-primary' : 'border-muted-foreground'
                        }`} />
                        <CardTitle className="text-base">{depth.name}</CardTitle>
                      </div>
                      <CardDescription>{depth.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        {depth.features.map((feature, index) => (
                          <div key={index} className="text-sm flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {feature}
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t space-y-1">
                        <div className="text-sm text-muted-foreground">
                          <strong>Cost:</strong> {depth.cost}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <strong>Timeline:</strong> {depth.timeline}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cost and Reliability Summary */}
          {selectedSources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Sources Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-md">
                    <Database className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-medium">Sources Selected</p>
                    <p className="text-lg font-bold">{selectedSources.length}</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-md">
                    <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-medium">Est. Monthly Cost</p>
                    <p className="text-lg font-bold">£{estimatedMonthlyCost.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-md">
                    <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-medium">Avg. Reliability</p>
                    <p className="text-lg font-bold">{averageReliability}%</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-md">
                    <Globe className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-medium">Coverage</p>
                    <p className="text-xs font-bold">UK/Ireland/Global</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Sources by Category */}
          {['official', 'financial', 'intelligence', 'digital', 'compliance'].map(category => {
            const categorySources = dataSources.filter(ds => ds.category === category)
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1)

            return (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {category === 'official' && <Building className="h-5 w-5" />}
                  {category === 'financial' && <TrendingUp className="h-5 w-5" />}
                  {category === 'intelligence' && <Database className="h-5 w-5" />}
                  {category === 'digital' && <Globe className="h-5 w-5" />}
                  {category === 'compliance' && <Shield className="h-5 w-5" />}
                  {categoryName} Data Sources
                </h3>
                
                <div className="grid gap-4">
                  {categorySources.map((source) => {
                    const Icon = source.icon
                    return (
                      <Card 
                        key={source.id}
                        className={`cursor-pointer transition-all ${
                          isSourceSelected(source.id) ? 'ring-2 ring-primary' : 'hover:shadow-md'
                        }`}
                        onClick={() => handleDataSourceToggle(source.id)}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox checked={isSourceSelected(source.id)} readOnly />
                              <Icon className="h-5 w-5 text-primary" />
                              <div>
                                <CardTitle className="text-base">{source.name}</CardTitle>
                                <CardDescription>{source.description}</CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getCostColor(source.cost_tier)}>
                                {source.cost_tier}
                              </Badge>
                              <Badge className={getReliabilityColor(source.reliability)}>
                                {source.reliability}% reliable
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium mb-1">Typical Cost</p>
                                <p className="text-muted-foreground">{source.typical_cost_per_search}</p>
                              </div>
                              <div>
                                <p className="font-medium mb-1">Coverage</p>
                                <p className="text-muted-foreground">{source.coverage.replace('_', '/')}</p>
                              </div>
                            </div>
                            
                            <div>
                              <p className="font-medium mb-1 text-sm">Data Types:</p>
                              <div className="flex flex-wrap gap-1">
                                {source.data_types.slice(0, 4).map((type, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                                {source.data_types.length > 4 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{source.data_types.length - 4} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {source.enterprise_features.length > 0 && (
                              <div>
                                <p className="font-medium mb-1 text-sm">Enterprise Features:</p>
                                <div className="flex flex-wrap gap-1">
                                  {source.enterprise_features.slice(0, 3).map((feature, index) => (
                                    <Badge key={index} variant="outline" className="text-xs text-blue-700">
                                      {feature}
                                    </Badge>
                                  ))}
                                  {source.enterprise_features.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{source.enterprise_features.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}

      {selectedTab === 'parameters' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Scanning Parameters</CardTitle>
              <CardDescription>
                Configure advanced parameters for your acquisition scan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Size Filters */}
              <div className="space-y-3">
                <Label>Company Size Range</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'micro', label: 'Micro (1-9 employees)', range: '1-9' },
                    { id: 'small', label: 'Small (10-49 employees)', range: '10-49' },
                    { id: 'medium', label: 'Medium (50-249 employees)', range: '50-249' },
                    { id: 'large', label: 'Large (250+ employees)', range: '250+' }
                  ].map((size) => (
                    <div
                      key={size.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        config.companySizeFilter?.includes(size.id)
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => {
                        const current = config.companySizeFilter || []
                        const newFilter = current.includes(size.id)
                          ? current.filter((s: string) => s !== size.id)
                          : [...current, size.id]
                        onChange('companySizeFilter', newFilter)
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={config.companySizeFilter?.includes(size.id) || false}
                          readOnly
                        />
                        <div className="text-sm">
                          <div className="font-medium">{size.label}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Health Filters */}
              <div className="space-y-3">
                <Label>Minimum Financial Health Score</Label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.minFinancialHealth || 50}
                    onChange={(e) => onChange('minFinancialHealth', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12">
                    {config.minFinancialHealth || 50}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only include companies with financial health scores above this threshold
                </p>
              </div>

              {/* Age Filters */}
              <div className="space-y-3">
                <Label>Company Age Range</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min-age" className="text-sm">Minimum Age (years)</Label>
                    <Input
                      id="min-age"
                      type="number"
                      min="0"
                      max="100"
                      value={config.minCompanyAge || 0}
                      onChange={(e) => onChange('minCompanyAge', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-age" className="text-sm">Maximum Age (years)</Label>
                    <Input
                      id="max-age"
                      type="number"
                      min="0"
                      max="100"
                      value={config.maxCompanyAge || 50}
                      onChange={(e) => onChange('maxCompanyAge', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="space-y-4">
                <Label>Advanced Options</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Include Dormant Companies</p>
                      <p className="text-sm text-muted-foreground">Include companies marked as dormant</p>
                    </div>
                    <Switch
                      checked={config.includeDormant || false}
                      onCheckedChange={(checked) => onChange('includeDormant', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Include Recently Dissolved</p>
                      <p className="text-sm text-muted-foreground">Include companies dissolved in last 2 years</p>
                    </div>
                    <Switch
                      checked={config.includeRecentlyDissolved || false}
                      onCheckedChange={(checked) => onChange('includeRecentlyDissolved', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Priority Industry Focus</p>
                      <p className="text-sm text-muted-foreground">Weight results towards selected industries</p>
                    </div>
                    <Switch
                      checked={config.prioritizeSelectedIndustries !== false}
                      onCheckedChange={(checked) => onChange('prioritizeSelectedIndustries', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Real-time Monitoring</p>
                      <p className="text-sm text-muted-foreground">Monitor targets for changes during scan</p>
                    </div>
                    <Switch
                      checked={config.realtimeMonitoring || false}
                      onCheckedChange={(checked) => onChange('realtimeMonitoring', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedTab === 'compliance' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data Protection & Compliance
              </CardTitle>
              <CardDescription>
                Enterprise-grade security and compliance for your acquisition intelligence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      GDPR Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>✓ Data minimization principles</p>
                    <p>✓ Lawful basis for processing</p>
                    <p>✓ Right to erasure support</p>
                    <p>✓ Data retention policies</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      SOC 2 Type II
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>✓ Security controls audited</p>
                    <p>✓ Availability monitoring</p>
                    <p>✓ Processing integrity</p>
                    <p>✓ Confidentiality protection</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <Label>Data Retention Period</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: '30', label: '30 days', description: 'Basic compliance' },
                    { id: '90', label: '90 days', description: 'Standard retention' },
                    { id: '365', label: '1 year', description: 'Extended analysis' }
                  ].map((period) => (
                    <div
                      key={period.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        config.dataRetentionDays === period.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => onChange('dataRetentionDays', period.id)}
                    >
                      <div className="text-center">
                        <div className="font-medium">{period.label}</div>
                        <div className="text-xs text-muted-foreground">{period.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Access Control</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Team Access Only</p>
                      <p className="text-sm text-muted-foreground">Restrict access to organization members</p>
                    </div>
                    <Switch
                      checked={config.teamAccessOnly !== false}
                      onCheckedChange={(checked) => onChange('teamAccessOnly', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Audit Logging</p>
                      <p className="text-sm text-muted-foreground">Log all access and modifications</p>
                    </div>
                    <Switch
                      checked={config.auditLogging !== false}
                      onCheckedChange={(checked) => onChange('auditLogging', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Legal Compliance Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                By using Opp Scan, you acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Data is collected from publicly available sources and licensed commercial databases</li>
                <li>All processing complies with UK GDPR and relevant data protection laws</li>
                <li>This tool is for legitimate business purposes and due diligence only</li>
                <li>You will use the information in compliance with applicable laws and regulations</li>
                <li>Sensitive data is encrypted at rest and in transit using AES-256 encryption</li>
                <li>Access is logged and monitored for security and compliance purposes</li>
              </ul>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Enterprise Support</p>
                    <p className="text-sm text-blue-700">
                      For compliance questions or custom data handling requirements, 
                      contact our enterprise support team.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}