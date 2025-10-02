'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { BenchmarkDashboard } from '@/components/benchmarking/benchmark-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  Search,
  Users,
  Sparkles,
  Info,
  TrendingUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Company {
  id: string
  name: string
  company_number?: string
  sic_codes?: string[]
}

function BenchmarkingContent() {
  const searchParams = useSearchParams()
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Company[]>([])
  const [recentComparisons, setRecentComparisons] = useState<Array<{
    id: string
    company_id: string
    comparison_date: string
    overall_score: number
    percentile_rank: number
    businesses: { name: string; company_number?: string }
  }>>([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)

  const supabase = createClient()

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }, [supabase])

  const loadCompany = useCallback(async (companyId: string) => {
    const { data: company } = await supabase
      .from('businesses')
      .select('id, name, company_number, sic_codes')
      .eq('id', companyId)
      .single()

    if (company) {
      setSelectedCompany(company)
    }
  }, [supabase])

  const loadRecentComparisons = useCallback(async () => {
    const { data } = await supabase
      .from('benchmark_comparisons')
      .select(`
        id,
        company_id,
        comparison_date,
        overall_score,
        percentile_rank,
        businesses!inner(name, company_number)
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) {
      setRecentComparisons(data)
    }
  }, [supabase])

  useEffect(() => {
    checkUser()
    loadRecentComparisons()

    // Check if company_id is in URL params
    const companyId = searchParams.get('company_id')
    if (companyId) {
      loadCompany(companyId)
    }
  }, [searchParams, checkUser, loadCompany, loadRecentComparisons])

  const searchCompanies = async () => {
    if (!searchQuery) return

    setLoading(true)
    try {
      const { data } = await supabase
        .from('businesses')
        .select('id, name, company_number, sic_codes')
        .ilike('name', `%${searchQuery}%`)
        .limit(10)

      setSearchResults(data || [])
    } catch {
      toast.error('Failed to search companies')
    } finally {
      setLoading(false)
    }
  }

  const selectCompany = (company: Company) => {
    setSelectedCompany(company)
    setSearchResults([])
    setSearchQuery('')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please sign in to access benchmarking features.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Benchmarking & Analytics</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Compare your company&apos;s performance against industry standards and peer companies
          </p>
        </div>

        {!selectedCompany ? (
          <>
            {/* Company Search */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Select a Company to Benchmark</CardTitle>
                <CardDescription>
                  Search for a company to analyze its performance against industry benchmarks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by company name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchCompanies()}
                    className="flex-1"
                  />
                  <Button onClick={searchCompanies} disabled={loading}>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {searchResults.map((company) => (
                      <div
                        key={company.id}
                        className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => selectCompany(company)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{company.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {company.company_number || 'No company number'}
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            Select
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feature Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Industry Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Compare against industry averages and percentiles
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Peer Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Benchmark against similar companies
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Growth Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track growth rates and trajectories
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Get AI-powered recommendations
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Comparisons */}
            {recentComparisons.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Benchmark Analyses</CardTitle>
                  <CardDescription>
                    Your recently analyzed companies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentComparisons.map((comparison) => (
                      <div
                        key={comparison.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => loadCompany(comparison.company_id)}
                      >
                        <div>
                          <p className="font-medium">
                            {comparison.businesses?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Analyzed on {new Date(comparison.comparison_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            Score: {comparison.overall_score}/100
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {comparison.percentile_rank}th percentile
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* Selected Company Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedCompany.name}</h2>
                {selectedCompany.company_number && (
                  <p className="text-muted-foreground">
                    Company No: {selectedCompany.company_number}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedCompany(null)}
              >
                Change Company
              </Button>
            </div>

            {/* Benchmark Dashboard */}
            <BenchmarkDashboard
              companyId={selectedCompany.id}
              companyName={selectedCompany.name}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default function BenchmarkingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    }>
      <BenchmarkingContent />
    </Suspense>
  )
}