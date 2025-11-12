import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Download, Info } from 'lucide-react'
import { CohortHeatmap } from '@/components/financials'
import type { CohortData } from '@/components/financials/cohort-heatmap'
import type { CohortMetric } from '@/lib/financials/types'

interface CohortsPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    window?: '12' | '18' | '24'
  }>
}

export async function generateMetadata({ params: paramsPromise }: CohortsPageProps) {
  const params = await paramsPromise
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', params.id)
    .single()

  return {
    title: company ? `${company.name} - Cohort Analysis - OppSpot` : 'Cohort Analysis - OppSpot',
    description: 'Customer cohort retention analysis with logo and revenue retention heatmaps',
  }
}

export default async function CohortsAnalysisPage({ params: paramsPromise, searchParams: searchParamsPromise }: CohortsPageProps) {
  const params = await paramsPromise
  const searchParams = await searchParamsPromise
  const window = parseInt(searchParams.window || '24') as 12 | 18 | 24
  const supabase = await createClient()

  // Fetch company data
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, reporting_currency')
    .eq('id', params.id)
    .single()

  if (companyError || !company) {
    notFound()
  }

  // Calculate date range for cohort window
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - window)

  // Fetch cohort metrics
  const { data: cohortMetrics, error: cohortsError } = await supabase
    .from('cohort_metrics')
    .select('*')
    .eq('company_id', params.id)
    .gte('cohort_month', startDate.toISOString().slice(0, 7))
    .order('cohort_month', { ascending: true })
    .order('period_month', { ascending: true }) as { data: CohortMetric[] | null; error: any }

  if (cohortsError) {
    console.error('Error fetching cohort metrics:', cohortsError)
  }

  // Transform cohort metrics to CohortData format
  const cohortData: CohortData[] = cohortMetrics
    ? cohortMetrics.map((cm) => ({
        cohort_month: cm.cohort_month,
        period_month: cm.period_month,
        logo_retention: cm.retention_rate,
        revenue_retention: cm.revenue_retained > 0 ? cm.retention_rate * 1.1 : cm.retention_rate, // Simplified calculation
      }))
    : []

  const hasData = cohortData.length > 0

  // Export to CSV handler (would be implemented as API route)
  const exportURL = `/api/companies/${params.id}/financials/cohorts/export?window=${window}`

  return (
    <ProtectedLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Companies', href: '/companies' },
            { label: company.name, href: `/business/${params.id}` },
            { label: 'Financials', href: `/companies/${params.id}/financials` },
            { label: 'Cohort Analysis', href: `/companies/${params.id}/financials/cohorts` },
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
            <p className="text-muted-foreground">Cohort Retention Analysis</p>
          </div>
          <div className="flex gap-2">
            {hasData && (
              <Button variant="outline" asChild>
                <a href={exportURL} download>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </a>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/companies/${params.id}/financials`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>

        {/* Window Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Time Window:</span>
          <div className="flex gap-1">
            <Button
              variant={window === 12 ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={`/companies/${params.id}/financials/cohorts?window=12`}>
                12 Months
              </Link>
            </Button>
            <Button
              variant={window === 18 ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={`/companies/${params.id}/financials/cohorts?window=18`}>
                18 Months
              </Link>
            </Button>
            <Button
              variant={window === 24 ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={`/companies/${params.id}/financials/cohorts?window=24`}>
                24 Months
              </Link>
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {!hasData && (
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Cohort Data Available</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upload subscription data to generate cohort retention analysis. Cohorts are created
              based on the month when customers first subscribed.
            </p>
            <Button asChild>
              <Link href={`/companies/${params.id}/financials/upload`}>
                Upload Data
              </Link>
            </Button>
          </div>
        )}

        {/* Cohort Heatmap */}
        {hasData && (
          <>
            <CohortHeatmap cohorts={cohortData} window={window} />

            {/* Insights Card */}
            <Card>
              <CardHeader>
                <CardTitle>Understanding Cohort Analysis</CardTitle>
                <CardDescription>How to interpret the cohort retention heatmap</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="font-semibold mb-1">What is Cohort Analysis?</h3>
                    <p className="text-muted-foreground">
                      {`Cohort analysis groups customers by the month they first subscribed (their
                      "cohort month") and tracks how many remain active over time. This helps
                      identify retention trends and the lifetime value of different customer
                      groups.`}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">Logo vs Revenue Retention</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                      <li>
                        <strong>Logo Retention:</strong> Percentage of customers who remain active
                        (regardless of how much they spend)
                      </li>
                      <li>
                        <strong>Revenue Retention:</strong> Percentage of MRR retained from the
                        cohort (accounts for expansion and contraction)
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">Reading the Heatmap</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                      <li>
                        Each row represents a cohort (customers who joined in the same month)
                      </li>
                      <li>
                        Each column (M0, M1, M2...) shows retention at that many months after
                        joining
                      </li>
                      <li>Green cells indicate strong retention (90%+), red indicates poor (&lt;30%)</li>
                      <li>
                        Diagonal patterns show whether retention is improving or declining over
                        time
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">Typical SaaS Benchmarks</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                      <li>Month 12 logo retention: 70-85% (good), 85%+ (excellent)</li>
                      <li>Month 12 revenue retention: 90-110% (good), 110%+ (excellent)</li>
                      <li>Revenue retention &gt; 100% indicates successful upsells/expansion</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ProtectedLayout>
  )
}
