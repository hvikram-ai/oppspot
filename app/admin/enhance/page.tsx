'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { 
  Loader2, 
  Sparkles, 
  FileText, 
  Brain, 
  Tag, 
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

interface AIInsights {
  market_position?: string
  growth_potential?: string
  key_strengths?: string[]
  opportunities?: string[]
}

interface BusinessMetadata {
  source?: string
  last_updated?: string
  [key: string]: unknown
}

interface Business {
  id: string
  name: string
  description: string | null
  categories: string[]
  ai_insights: AIInsights | null
  metadata: BusinessMetadata | null
}

interface Enhancement {
  value?: string | string[]
  error?: string
}

interface EnhancementResult {
  id: string
  name: string
  status: 'success' | 'error' | 'skipped'
  enhancements: Record<string, Enhancement>
  error?: string
}

export default function EnhanceBusinessesPage() {
  const [loading, setLoading] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<string>('')
  const [bulkFilter, setBulkFilter] = useState('missing_description')
  const [bulkLimit, setBulkLimit] = useState(10)
  const [results, setResults] = useState<EnhancementResult[]>([])
  const [progress, setProgress] = useState(0)
  interface AIUsageStats {
    tokens_used?: number
    api_calls?: number
    cost?: number
  }
  
  const [aiUsage, setAiUsage] = useState<AIUsageStats | null>(null)
  
  // Enhancement options
  const [enhancements, setEnhancements] = useState({
    description: true,
    insights: false,
    keywords: false,
    tagline: false,
    categories: false
  })
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    fetchBusinesses()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile && 'role' in profile && profile.role !== 'admin' && profile.role !== 'owner') {
      toast.error('Admin access required')
      router.push('/dashboard')
    }
  }

  const fetchBusinesses = async () => {
    // Fetch businesses that might need enhancement
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, description, categories, ai_insights, metadata')
      .or('description.is.null,description.eq.')
      .limit(50)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching businesses:', error)
      return
    }

    setBusinesses(data || [])
  }

  const handleSingleEnhancement = async () => {
    if (!selectedBusiness) {
      toast.error('Please select a business')
      return
    }

    setLoading(true)
    
    try {
      const selectedEnhancements = Object.entries(enhancements)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)

      if (selectedEnhancements.length === 0) {
        toast.error('Please select at least one enhancement')
        return
      }

      const response = await fetch('/api/businesses/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness,
          enhancements: selectedEnhancements
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Business enhanced successfully')
        
        // Show what was generated
        Object.entries(data.enhancements).forEach(([key, value]: [string, Enhancement]) => {
          if (!value.error) {
            toast.info(`Generated ${key}`)
          }
        })
        
        // Refresh businesses list
        fetchBusinesses()
        setSelectedBusiness('')
      } else {
        toast.error(data.error || 'Enhancement failed')
      }
    } catch (error) {
      console.error('Enhancement error:', error)
      toast.error('Failed to enhance business')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkEnhancement = async () => {
    setLoading(true)
    setResults([])
    setProgress(0)
    
    try {
      const selectedEnhancements = Object.entries(enhancements)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)

      if (selectedEnhancements.length === 0) {
        toast.error('Please select at least one enhancement')
        return
      }

      const response = await fetch('/api/businesses/enhance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: bulkFilter,
          limit: bulkLimit,
          enhancements: selectedEnhancements
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResults(data.results)
        setAiUsage(data.ai_usage)
        setProgress(100)
        
        toast.success(`Processed ${data.processed} businesses`)
        if (data.successful > 0) {
          toast.success(`Successfully enhanced ${data.successful} businesses`)
        }
        if (data.errors > 0) {
          toast.warning(`${data.errors} businesses had errors`)
        }
        
        // Refresh businesses list
        fetchBusinesses()
      } else {
        toast.error(data.error || 'Bulk enhancement failed')
      }
    } catch (error) {
      console.error('Bulk enhancement error:', error)
      toast.error('Failed to enhance businesses')
    } finally {
      setLoading(false)
    }
  }

  const getFilterLabel = (filter: string) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    switch (filter) {
      case 'missing_description':
        return 'Missing Description'
      case 'missing_categories':
        return 'Missing Categories'
      case 'not_verified':
        return 'Not Verified'
      case 'no_insights':
        return 'No AI Insights'
      default:
        return 'All'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Business Enhancement</h1>
        <p className="text-muted-foreground">
          Use AI to generate descriptions, insights, and metadata for businesses
        </p>
      </div>

      <Tabs defaultValue="single" className="space-y-4">
        <TabsList>
          <TabsTrigger value="single">Single Business</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Enhancement</TabsTrigger>
        </TabsList>

        {/* Enhancement Options */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Enhancement Options</CardTitle>
            <CardDescription>
              Select what to generate for businesses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="description"
                  checked={enhancements.description}
                  onCheckedChange={(checked) => 
                    setEnhancements(prev => ({ ...prev, description: !!checked }))
                  }
                  disabled={loading}
                />
                <Label htmlFor="description" className="flex items-center cursor-pointer">
                  <FileText className="h-4 w-4 mr-1" />
                  Description
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="insights"
                  checked={enhancements.insights}
                  onCheckedChange={(checked) => 
                    setEnhancements(prev => ({ ...prev, insights: !!checked }))
                  }
                  disabled={loading}
                />
                <Label htmlFor="insights" className="flex items-center cursor-pointer">
                  <Brain className="h-4 w-4 mr-1" />
                  Insights
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="keywords"
                  checked={enhancements.keywords}
                  onCheckedChange={(checked) => 
                    setEnhancements(prev => ({ ...prev, keywords: !!checked }))
                  }
                  disabled={loading}
                />
                <Label htmlFor="keywords" className="flex items-center cursor-pointer">
                  <Hash className="h-4 w-4 mr-1" />
                  SEO Keywords
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tagline"
                  checked={enhancements.tagline}
                  onCheckedChange={(checked) => 
                    setEnhancements(prev => ({ ...prev, tagline: !!checked }))
                  }
                  disabled={loading}
                />
                <Label htmlFor="tagline" className="flex items-center cursor-pointer">
                  <Tag className="h-4 w-4 mr-1" />
                  Tagline
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="categories"
                  checked={enhancements.categories}
                  onCheckedChange={(checked) => 
                    setEnhancements(prev => ({ ...prev, categories: !!checked }))
                  }
                  disabled={loading}
                />
                <Label htmlFor="categories" className="flex items-center cursor-pointer">
                  <Tag className="h-4 w-4 mr-1" />
                  Categories
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Single Business Enhancement */}
        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle>Enhance Single Business</CardTitle>
              <CardDescription>
                Select a business to enhance with AI-generated content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business">Select Business</Label>
                <Select 
                  value={selectedBusiness} 
                  onValueChange={setSelectedBusiness}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a business" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map(business => (
                      <SelectItem key={business.id} value={business.id}>
                        {business.name}
                        {!business.description && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (No description)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBusiness && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Current Status:</p>
                  {businesses.find(b => b.id === selectedBusiness) && (
                    <ul className="text-sm space-y-1">
                      <li>
                        Description: {
                          businesses.find(b => b.id === selectedBusiness)?.description 
                            ? '✓ Present' 
                            : '✗ Missing'
                        }
                      </li>
                      <li>
                        Categories: {
                          (businesses.find(b => b.id === selectedBusiness)?.categories?.length || 0) > 0
                            ? `✓ ${businesses.find(b => b.id === selectedBusiness)?.categories?.length} categories`
                            : '✗ None'
                        }
                      </li>
                      <li>
                        AI Insights: {
                          businesses.find(b => b.id === selectedBusiness)?.ai_insights
                            ? '✓ Generated'
                            : '✗ Not generated'
                        }
                      </li>
                    </ul>
                  )}
                </div>
              )}

              <Button
                onClick={handleSingleEnhancement}
                disabled={loading || !selectedBusiness}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enhance Business
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Enhancement */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Enhancement</CardTitle>
              <CardDescription>
                Enhance multiple businesses at once based on filters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="filter">Filter Businesses</Label>
                  <Select 
                    value={bulkFilter} 
                    onValueChange={setBulkFilter}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="missing_description">Missing Description</SelectItem>
                      <SelectItem value="missing_categories">Missing Categories</SelectItem>
                      <SelectItem value="not_verified">Not Verified</SelectItem>
                      <SelectItem value="no_insights">No AI Insights</SelectItem>
                      <SelectItem value="all">All Businesses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="limit">Number of Businesses</Label>
                  <Select 
                    value={bulkLimit.toString()} 
                    onValueChange={(value) => setBulkLimit(parseInt(value))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 businesses</SelectItem>
                      <SelectItem value="10">10 businesses</SelectItem>
                      <SelectItem value="20">20 businesses</SelectItem>
                      <SelectItem value="50">50 businesses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleBulkEnhancement}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Start Bulk Enhancement
                  </>
                )}
              </Button>

              {loading && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Processing businesses... This may take a few minutes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Enhancement Results</CardTitle>
                <CardDescription>
                  {results.filter(r => r.status === 'success').length} successful,{' '}
                  {results.filter(r => r.status === 'error').length} errors,{' '}
                  {results.filter(r => r.status === 'skipped').length} skipped
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center space-x-3">
                        {result.status === 'success' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {result.status === 'error' && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {result.status === 'skipped' && (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium">{result.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {result.status === 'success' && 
                              `Enhanced: ${Object.keys(result.enhancements).join(', ')}`
                            }
                            {result.status === 'error' && result.error}
                            {result.status === 'skipped' && 'No enhancements needed'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Usage */}
          {aiUsage && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>AI Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {aiUsage.credits_remaining && (
                    <p className="text-sm">
                      Credits Remaining: {aiUsage.credits_remaining}
                    </p>
                  )}
                  {aiUsage.credits_used && (
                    <p className="text-sm">
                      Credits Used: {aiUsage.credits_used}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}