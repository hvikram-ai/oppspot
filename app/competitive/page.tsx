'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BusinessComparison } from '@/components/competitive/business-comparison'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Search,
  Plus,
  X,
  Award,
  AlertTriangle,
  Target,
  Zap,
  Eye,
  ChevronRight,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'

interface Business {
  id: string
  name: string
  rating: number
  review_count: number
  categories?: string[]
  price_level?: number
  verified?: boolean
}

interface CompetitorSet {
  id: string
  name: string
  description?: string
  primary_business_id: string
  competitor_ids: string[]
  metadata?: any
  created_at: string
}

interface MarketAnalysis {
  category: string
  total_businesses: number
  average_rating: number
  average_reviews: number
  market_growth_rate?: number
  top_businesses?: any[]
  emerging_businesses?: any[]
  trends?: any
  opportunities?: string[]
  threats?: string[]
}

export default function CompetitiveAnalysisPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('compare')
  
  // Comparison state
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Business[]>([])
  const [comparisonData, setComparisonData] = useState<any>(null)
  
  // Competitor tracking state
  const [competitorSets, setCompetitorSets] = useState<CompetitorSet[]>([])
  const [selectedSet, setSelectedSet] = useState<CompetitorSet | null>(null)
  
  // Market analysis state
  const [selectedCategory, setSelectedCategory] = useState('')
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null)

  useEffect(() => {
    fetchCompetitorSets()
  }, [])

  const fetchCompetitorSets = async () => {
    try {
      const response = await fetch('/api/competitive/competitors')
      if (response.ok) {
        const data = await response.json()
        setCompetitorSets(data.competitor_sets || [])
      }
    } catch (error) {
      console.error('Error fetching competitor sets:', error)
    }
  }

  const searchBusinesses = async () => {
    if (!searchQuery) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=10`)
      const data = await response.json()
      
      if (response.ok) {
        setSearchResults(data.results || [])
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search businesses')
    } finally {
      setLoading(false)
    }
  }

  const addToComparison = (business: Business) => {
    if (selectedBusinesses.length >= 5) {
      toast.error('Maximum 5 businesses can be compared')
      return
    }
    
    if (selectedBusinesses.includes(business.id)) {
      toast.error('Business already added to comparison')
      return
    }
    
    setSelectedBusinesses([...selectedBusinesses, business.id])
    toast.success(`Added ${business.name} to comparison`)
  }

  const removeFromComparison = (businessId: string) => {
    setSelectedBusinesses(selectedBusinesses.filter(id => id !== businessId))
  }

  const runComparison = async () => {
    if (selectedBusinesses.length < 2) {
      toast.error('Select at least 2 businesses to compare')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/competitive/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessIds: selectedBusinesses,
          comparisonType: 'detailed'
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setComparisonData(data.comparison)
        toast.success('Comparison generated successfully')
      } else {
        toast.error(data.error || 'Failed to generate comparison')
      }
    } catch (error) {
      console.error('Comparison error:', error)
      toast.error('Failed to generate comparison')
    } finally {
      setLoading(false)
    }
  }

  const fetchMarketAnalysis = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch(`/api/competitive/market?category=${encodeURIComponent(selectedCategory)}`)
      const data = await response.json()
      
      if (response.ok) {
        setMarketAnalysis(data.analysis)
      } else {
        toast.error('Failed to fetch market analysis')
      }
    } catch (error) {
      console.error('Market analysis error:', error)
      toast.error('Failed to fetch market analysis')
    } finally {
      setLoading(false)
    }
  }

  const loadCompetitorSet = async (setId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/competitive/competitors?id=${setId}`)
      const data = await response.json()
      
      if (response.ok) {
        setSelectedSet(data.competitor_set)
        // Load businesses for comparison
        const businessIds = [
          data.primary_business?.id,
          ...(data.competitors?.map((c: any) => c.id) || [])
        ].filter(Boolean)
        
        setSelectedBusinesses(businessIds)
        if (businessIds.length >= 2) {
          runComparison()
        }
      }
    } catch (error) {
      console.error('Load competitor set error:', error)
      toast.error('Failed to load competitor set')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Competitive Analysis</h1>
        <p className="text-muted-foreground">
          Compare businesses, track competitors, and analyze market trends
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="track">Track Competitors</TabsTrigger>
          <TabsTrigger value="market">Market Analysis</TabsTrigger>
        </TabsList>

        {/* Compare Tab */}
        <TabsContent value="compare" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Comparison</CardTitle>
              <CardDescription>
                Select businesses to compare side-by-side
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="flex gap-2">
                <Input
                  placeholder="Search for businesses to compare..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchBusinesses()}
                />
                <Button onClick={searchBusinesses} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm mb-2">Search Results</h4>
                  {searchResults.map(business => (
                    <div key={business.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{business.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ⭐ {business.rating} ({business.review_count} reviews)
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addToComparison(business)}
                        disabled={selectedBusinesses.includes(business.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Businesses */}
              {selectedBusinesses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Selected for Comparison</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedBusinesses.map(id => (
                      <Badge key={id} variant="secondary" className="pr-1">
                        Business {selectedBusinesses.indexOf(id) + 1}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 ml-2"
                          onClick={() => removeFromComparison(id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Load from Sets */}
              {competitorSets.length > 0 && (
                <div className="space-y-2">
                  <Label>Or load from competitor set</Label>
                  <Select onValueChange={loadCompetitorSet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a competitor set" />
                    </SelectTrigger>
                    <SelectContent>
                      {competitorSets.map(set => (
                        <SelectItem key={set.id} value={set.id}>
                          {set.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                onClick={runComparison}
                disabled={selectedBusinesses.length < 2 || loading}
                className="w-full"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Comparison
              </Button>
            </CardContent>
          </Card>

          {/* Comparison Results */}
          {comparisonData && (
            <BusinessComparison
              businesses={comparisonData.businesses}
              metrics={comparisonData.metrics}
              insights={comparisonData.insights}
            />
          )}
        </TabsContent>

        {/* Track Competitors Tab */}
        <TabsContent value="track" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Competitor Tracking</CardTitle>
              <CardDescription>
                Monitor your competition and track changes over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {competitorSets.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No competitor sets created yet
                  </p>
                  <Button onClick={() => router.push('/competitive/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Competitor Set
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {competitorSets.map(set => (
                    <div 
                      key={set.id}
                      className="border rounded-lg p-4 hover:bg-accent cursor-pointer"
                      onClick={() => loadCompetitorSet(set.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{set.name}</h4>
                          {set.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {set.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {set.competitor_ids.length + 1} businesses
                            </span>
                            <span className="text-muted-foreground">
                              Created {new Date(set.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market Analysis Tab */}
        <TabsContent value="market" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Market Analysis</CardTitle>
              <CardDescription>
                Analyze market trends and identify opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    placeholder="e.g., Restaurant, Retail, Healthcare"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button onClick={fetchMarketAnalysis} disabled={loading}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Analyze Market
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Analysis Results */}
          {marketAnalysis && (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Businesses</p>
                        <p className="text-2xl font-bold">
                          {marketAnalysis.total_businesses}
                        </p>
                      </div>
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Rating</p>
                        <p className="text-2xl font-bold">
                          {marketAnalysis.average_rating.toFixed(1)}
                        </p>
                      </div>
                      <Award className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Reviews</p>
                        <p className="text-2xl font-bold">
                          {marketAnalysis.average_reviews}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Growth Rate</p>
                        <p className="text-2xl font-bold flex items-center">
                          {marketAnalysis.market_growth_rate || 0}%
                          {(marketAnalysis.market_growth_rate || 0) > 0 ? (
                            <ArrowUpRight className="h-5 w-5 text-green-600 ml-1" />
                          ) : (marketAnalysis.market_growth_rate || 0) < 0 ? (
                            <ArrowDownRight className="h-5 w-5 text-red-600 ml-1" />
                          ) : (
                            <Minus className="h-5 w-5 text-gray-600 ml-1" />
                          )}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opportunities */}
                {marketAnalysis.opportunities && marketAnalysis.opportunities.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-green-600" />
                        Opportunities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {marketAnalysis.opportunities.map((opp, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 text-green-600 mt-0.5" />
                            <span className="text-sm">{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Threats */}
                {marketAnalysis.threats && marketAnalysis.threats.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        Threats
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {marketAnalysis.threats.map((threat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 text-yellow-600 mt-0.5" />
                            <span className="text-sm">{threat}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Top Performers */}
              {marketAnalysis.top_businesses && marketAnalysis.top_businesses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {marketAnalysis.top_businesses.map((business, idx) => (
                        <div key={business.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{idx + 1}</Badge>
                            <div>
                              <p className="font-medium">{business.name}</p>
                              <p className="text-sm text-muted-foreground">
                                ⭐ {business.rating} • {business.review_count} reviews
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/business/${business.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}