'use client'

import { useState, useEffect } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { CompanyCard } from '@/components/companies/company-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Building2,
  Download,
  TrendingUp,
  Database,
  TestTube
} from 'lucide-react'
import { toast } from 'sonner'

interface Address {
  formatted?: string
  street?: string
  city?: string
  postal_code?: string
  country?: string
}

interface RegisteredOfficeAddress {
  address_line_1?: string
  address_line_2?: string
  locality?: string
  postal_code?: string
  country?: string
}

interface Company {
  id: string
  name: string
  company_number?: string
  company_status?: string
  company_type?: string
  incorporation_date?: string
  date_of_creation?: string
  sic_codes?: string[]
  registered_office_address?: RegisteredOfficeAddress
  address?: Address
  companies_house_last_updated?: string | null
  companies_house_data?: Record<string, unknown>
  cache_expires_at?: string | null
  source?: string
  cache_age?: number
  enrichment_status?: string
  snippet?: string
}

interface SearchStats {
  cache: number
  api: number
  created?: number
  mock?: number
}

export default function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchStats, setSearchStats] = useState<SearchStats | null>(null)
  const [enrichmentStatus, setEnrichmentStatus] = useState<Record<string, string>>({})
  const [useRealData, setUseRealData] = useState(true)

  // Function to fetch enriched company data
  const fetchEnrichedData = async (companyNumber: string) => {
    try {
      const response = await fetch(`/api/companies/${companyNumber}/enrich`, {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.exists) {
          // Fetch the full enriched data
          const enrichResponse = await fetch(`/api/companies/${companyNumber}/enrich`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          })

          if (enrichResponse.ok) {
            const enrichedCompany = await enrichResponse.json()
            if (enrichedCompany.company) {
              setEnrichmentStatus(prev => ({
                ...prev,
                [companyNumber]: 'completed'
              }))

              // Update the search results with enriched data
              setSearchResults(prev => prev.map(company =>
                company.company_number === companyNumber
                  ? { ...company, ...enrichedCompany.company }
                  : company
              ))

              // Update selected company if it's the one being enriched
              if (selectedCompany?.company_number === companyNumber) {
                setSelectedCompany({ ...selectedCompany, ...enrichedCompany.company })
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`Failed to fetch enriched data for ${companyNumber}:`, err)
      setEnrichmentStatus(prev => ({
        ...prev,
        [companyNumber]: 'failed'
      }))
    }
  }

  // Poll for enrichment status after search
  useEffect(() => {
    const pendingCompanies = searchResults.filter(
      company => company.company_number && enrichmentStatus[company.company_number] === 'pending'
    )

    if (pendingCompanies.length === 0) return

    const interval = setInterval(() => {
      pendingCompanies.forEach(company => {
        if (company.company_number) {
          fetchEnrichedData(company.company_number)
        }
      })
    }, 3000) // Poll every 3 seconds

    // Stop polling after 30 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval)
    }, 30000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [searchResults]) // Remove enrichmentStatus to avoid infinite loop

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/companies/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: searchQuery, limit: 10, demo: !useRealData })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Search failed')
      }
      
      const data = await response.json()
      setSearchResults(data.results || [])
      setSearchStats(data.sources || null)

      // Track enrichment status for each company
      const statusMap: Record<string, string> = {}
      data.results?.forEach((company: Company) => {
        if (company.company_number) {
          statusMap[company.company_number] = company.enrichment_status || 'pending'
        }
      })
      setEnrichmentStatus(statusMap)
      
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to search companies'
      setError(errorMessage)
      console.error('Search error:', err)

      // Check configuration if search fails
      try {
        const configResponse = await fetch('/api/companies/check-config')
        const configData = await configResponse.json()
        console.log('Configuration status:', configData)

        if (configData.config?.companies_house?.api_key_configured === false) {
          setError('Companies House API is not configured. Using demo data.')
          // Try demo search
          const demoResponse = await fetch('/api/companies/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ query: searchQuery, limit: 10, demo: !useRealData })
          })
          if (demoResponse.ok) {
            const demoData = await demoResponse.json()
            setSearchResults(demoData.results || [])
            toast.info('Showing demo results - API not configured')
          }
        }
      } catch (configError) {
        console.error('Config check failed:', configError)
      }
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

  return (
    <ProtectedLayout>
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
        
        {/* Data Source Indicator */}
        {searchResults.length > 0 && (
          <Alert className="mb-6">
            {useRealData ? (
              <Database className="h-4 w-4 text-green-600" />
            ) : (
              <TestTube className="h-4 w-4 text-orange-600" />
            )}
            <AlertDescription>
              {useRealData ? (
                <>
                  <strong className="text-green-600">Live Data:</strong> Showing real Companies House results
                  {searchStats && (
                    <span className="ml-2 text-muted-foreground">
                      ({searchStats.cache || 0} cached, {searchStats.api || 0} from API, {searchStats.created || 0} new)
                    </span>
                  )}
                </>
              ) : (
                <>
                  <strong className="text-orange-600">Demo Mode:</strong> Showing sample companies for testing
                  {searchStats?.mock && (
                    <span className="ml-2 text-muted-foreground">
                      ({searchStats.mock} demo results)
                    </span>
                  )}
                </>
              )}
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
          <div className="flex gap-4 mb-4">
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

          {/* Data Source Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {useRealData ? (
                <Database className="w-5 h-5 text-green-600" />
              ) : (
                <TestTube className="w-5 h-5 text-orange-600" />
              )}
              <div>
                <Label htmlFor="data-source-toggle" className="text-sm font-medium cursor-pointer">
                  Use Real Companies House Data
                </Label>
                <p className="text-xs text-muted-foreground">
                  {useRealData
                    ? 'Live data from Companies House API'
                    : 'Demo mode with sample companies'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={useRealData ? "default" : "secondary"}>
                {useRealData ? 'Live' : 'Demo'}
              </Badge>
              <Switch
                id="data-source-toggle"
                checked={useRealData}
                onCheckedChange={setUseRealData}
              />
            </div>
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
                  onClick={(c) => setSelectedCompany(c)}
                  showScore={true}
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
                  {enrichmentStatus[selectedCompany.company_number!] === 'pending' && (
                    <Alert>
                      <AlertDescription>
                        🔄 Fetching full company profile from Companies House...
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Status</p>
                      <p className="capitalize">{selectedCompany.company_status || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Type</p>
                      <p className="uppercase">{selectedCompany.company_type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Incorporated</p>
                      <p>{selectedCompany.incorporation_date || selectedCompany.date_of_creation || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium">SIC Codes</p>
                      <p>{selectedCompany.sic_codes?.join(', ') || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Show additional data if enriched */}
                  {selectedCompany.companies_house_data && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-2">Additional Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {typeof selectedCompany.companies_house_data === 'object' &&
                         selectedCompany.companies_house_data !== null &&
                         'accounts' in selectedCompany.companies_house_data &&
                         typeof selectedCompany.companies_house_data.accounts === 'object' &&
                         selectedCompany.companies_house_data.accounts !== null && (
                          <>
                            <div>
                              <p className="font-medium">Next Accounts Due</p>
                              <p>{('next_due' in selectedCompany.companies_house_data.accounts) ? String(selectedCompany.companies_house_data.accounts.next_due) : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-medium">Last Accounts</p>
                              <p>{('last_accounts' in selectedCompany.companies_house_data.accounts &&
                                   typeof selectedCompany.companies_house_data.accounts.last_accounts === 'object' &&
                                   selectedCompany.companies_house_data.accounts.last_accounts !== null &&
                                   'made_up_to' in selectedCompany.companies_house_data.accounts.last_accounts)
                                   ? String(selectedCompany.companies_house_data.accounts.last_accounts.made_up_to) : 'N/A'}</p>
                            </div>
                          </>
                        )}
                        {typeof selectedCompany.companies_house_data === 'object' &&
                         selectedCompany.companies_house_data !== null &&
                         'confirmation_statement' in selectedCompany.companies_house_data &&
                         typeof selectedCompany.companies_house_data.confirmation_statement === 'object' &&
                         selectedCompany.companies_house_data.confirmation_statement !== null && (
                          <div>
                            <p className="font-medium">Next Statement Due</p>
                            <p>{('next_due' in selectedCompany.companies_house_data.confirmation_statement) ? String(selectedCompany.companies_house_data.confirmation_statement.next_due) : 'N/A'}</p>
                          </div>
                        )}
                        {typeof selectedCompany.companies_house_data === 'object' &&
                         selectedCompany.companies_house_data !== null &&
                         'jurisdiction' in selectedCompany.companies_house_data && (
                          <div>
                            <p className="font-medium">Jurisdiction</p>
                            <p>{String(selectedCompany.companies_house_data.jurisdiction)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cache status */}
                  {selectedCompany.cache_expires_at && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Data cached until: {new Date(selectedCompany.cache_expires_at).toLocaleString()}
                    </div>
                  )}
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
    </ProtectedLayout>
  )
}