'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { CompanyCard } from '@/components/companies/company-card'
import { CompanyStatusBadge } from '@/components/companies/company-status-badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Search, 
  Building2, 
  RefreshCw, 
  Download, 
  Filter, 
  TrendingUp,
  AlertCircle,
  Info,
  CheckCircle,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

export default function CompaniesPage() {
  const [user, setUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchStats, setSearchStats] = useState<any>(null)
  
  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          // If not authenticated and no demo param, redirect to demo mode
          const urlParams = new URLSearchParams(window.location.search)
          if (!urlParams.get('demo')) {
            window.location.href = '/companies?demo=true'
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err)
      }
    }
    checkAuth()
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setError('')
    
    try {
      // Check if we're in demo mode by looking at URL params
      const urlParams = new URLSearchParams(window.location.search)
      const isDemo = urlParams.get('demo') === 'true' || !user
      
      const response = await fetch('/api/companies/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: searchQuery, limit: 10, demo: isDemo })
      })
      
      if (!response.ok) {
        throw new Error('Search failed')
      }
      
      const data = await response.json()
      setSearchResults(data.results || [])
      setSearchStats(data.sources || null)
      
      // Show warning if API error
      if (data.warning) {
        toast.warning(data.warning)
      }
      
      // Show search statistics
      if (data.sources) {
        let message = `Found ${data.results?.length || 0} companies`
        const details = []
        if (data.sources.cache > 0) details.push(`${data.sources.cache} cached`)
        if (data.sources.api > 0) details.push(`${data.sources.api} from API`)
        if (data.sources.mock > 0) details.push(`${data.sources.mock} demo results`)
        if (details.length > 0) {
          message += ` (${details.join(', ')})`
        }
        toast.success(message)
      }
    } catch (err) {
      setError('Failed to search companies. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async (companyId: string) => {
    try {
      toast.loading('Refreshing company data...')
      
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enrichments: ['profile', 'officers', 'filings'] })
      })
      
      if (response.ok) {
        const data = await response.json()
        toast.success('Company data refreshed successfully!')
        // Refresh the search results
        if (searchQuery) {
          handleSearch()
        }
      } else {
        toast.error('Failed to refresh company data')
      }
    } catch (err) {
      console.error('Refresh failed:', err)
      toast.error('An error occurred while refreshing')
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: any = {
      'active': 'bg-green-100 text-green-800',
      'dissolved': 'bg-red-100 text-red-800',
      'liquidation': 'bg-orange-100 text-orange-800',
      'dormant': 'bg-gray-100 text-gray-800'
    }
    
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    )
  }

  const getCacheStatus = (company: any) => {
    if (!company.cache_age) return null
    
    if (company.source === 'cache') {
      return (
        <span className="flex items-center text-sm text-green-600">
          <CheckCircle className="w-4 h-4 mr-1" />
          Cached ({company.cache_age}h ago)
        </span>
      )
    } else if (company.source === 'cache_expired') {
      return (
        <span className="flex items-center text-sm text-orange-600">
          <AlertCircle className="w-4 h-4 mr-1" />
          Cache expired
        </span>
      )
    } else {
      return (
        <span className="flex items-center text-sm text-blue-600">
          <Clock className="w-4 h-4 mr-1" />
          Fresh data
        </span>
      )
    }
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Companies House Search</h1>
          </div>
          <p className="text-muted-foreground">
            Search UK companies with intelligent caching and real-time Companies House data
          </p>
        </div>
        
        {/* Stats Alert */}
        {searchStats && (
          <Alert className="mb-6">
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <strong>Search Performance:</strong> {searchStats.cache || 0} results from cache, 
              {searchStats.api || 0} from Companies House API, 
              {searchStats.created || 0} newly added to database
            </AlertDescription>
          </Alert>
        )}

      {/* Search Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search Companies</CardTitle>
          <CardDescription>
            Enter company name or registration number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="e.g., Google UK or 03977902"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

        {/* Results Section */}
        {searchResults.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {searchResults.length} Results
              </h2>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onRefresh={handleRefresh}
                  onClick={setSelectedCompany}
                />
              ))}
            </div>
          </>
        )}

      {/* Company Details Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-3xl w-full max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{selectedCompany.name}</CardTitle>
                  <CardDescription>
                    Company #{selectedCompany.company_number}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedCompany(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="address">Address</TabsTrigger>
                  <TabsTrigger value="data">Raw Data</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Status</p>
                      <p>{selectedCompany.company_status || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Type</p>
                      <p>{selectedCompany.company_type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Incorporated</p>
                      <p>{selectedCompany.incorporation_date || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium">SIC Codes</p>
                      <p>{selectedCompany.sic_codes?.join(', ') || 'N/A'}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="address">
                  {selectedCompany.registered_office_address ? (
                    <div className="space-y-2">
                      <p>{selectedCompany.registered_office_address.address_line_1}</p>
                      <p>{selectedCompany.registered_office_address.address_line_2}</p>
                      <p>{selectedCompany.registered_office_address.locality}</p>
                      <p>{selectedCompany.registered_office_address.postal_code}</p>
                      <p>{selectedCompany.registered_office_address.country}</p>
                    </div>
                  ) : (
                    <p>No address information available</p>
                  )}
                </TabsContent>
                
                <TabsContent value="data">
                  <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
                    {JSON.stringify(selectedCompany, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </>
  )
}