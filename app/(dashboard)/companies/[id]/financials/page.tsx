import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Upload, FileDown, TrendingUp, Info } from 'lucide-react'
import {
  KPIOverview,
  NRRWaterfall,
  AnomalyBanners,
  ConcentrationChart,
  ARAPAgingTable,
  BenchmarkComparison,
  transformKPISnapshots,
  transformBenchmarks,
} from '@/components/financials'
import type { KPISnapshot, ARAPAging, RevenueConcentration } from '@/lib/financials/types'
import type { NRRWaterfallData } from '@/components/financials/nrr-waterfall'
import type { ConcentrationData, TopCustomer } from '@/components/financials/concentration-chart'
import type { ARAPAgingData } from '@/components/financials/ar-ap-aging-table'
import type { BenchmarkInput } from '@/components/financials/benchmark-comparison'

interface FinancialsDashboardProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params: paramsPromise }: FinancialsDashboardProps) {
  const params = await paramsPromise
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', params.id)
    .single()

  return {
    title: company ? `${company.name} - Financial Analytics - OppSpot` : 'Financial Analytics - OppSpot',
    description: 'Comprehensive SaaS financial metrics including ARR, MRR, NRR, cohort retention, and revenue quality analysis',
  }
}

export default async function FinancialsDashboardPage({ params: paramsPromise }: FinancialsDashboardProps) {
  const params = await paramsPromise
  const supabase = await createClient()

  // Fetch company data
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, sector, reporting_currency')
    .eq('id', params.id)
    .single()

  if (companyError || !company) {
    notFound()
  }

  // Check user has access to this company's org (via RLS)
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('org_id')
    .single()

  if (!userProfile) {
    notFound()
  }

  // Fetch latest KPI snapshot
  const { data: currentSnapshot } = await supabase
    .from('kpi_snapshots')
    .select('*')
    .eq('company_id', params.id)
    .order('period_date', { ascending: false })
    .limit(1)
    .single() as { data: KPISnapshot | null }

  // Fetch previous snapshot for trends
  const { data: snapshots } = await supabase
    .from('kpi_snapshots')
    .select('*')
    .eq('company_id', params.id)
    .order('period_date', { ascending: false })
    .limit(2) as { data: KPISnapshot[] | null }

  const previousSnapshot = snapshots && snapshots.length > 1 ? snapshots[1] : null

  // Fetch latest revenue concentration
  const { data: concentration } = await supabase
    .from('revenue_concentration')
    .select('*')
    .eq('company_id', params.id)
    .order('period_date', { ascending: false })
    .limit(1)
    .single() as { data: RevenueConcentration | null }

  // Fetch latest AR/AP aging
  const { data: aging } = await supabase
    .from('ar_ap_aging')
    .select('*')
    .eq('company_id', params.id)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single() as { data: ARAPAging | null }

  // Fetch anomalies from last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: anomalies } = await supabase
    .from('anomalies')
    .select('*')
    .eq('company_id', params.id)
    .gte('period_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('created_at', { ascending: false })

  // Fetch sector benchmarks if sector is available
  let benchmarkData = null
  if (company.sector && currentSnapshot?.arr) {
    const sizeBand = getSizeBand(currentSnapshot.arr)
    const { data: benchmarks } = await supabase
      .from('benchmarks_sector_medians')
      .select('*')
      .eq('sector', company.sector)
      .eq('size_band', sizeBand)

    if (benchmarks && benchmarks.length > 0) {
      benchmarkData = transformBenchmarks({
        sector: company.sector,
        size_band: sizeBand,
        period: currentSnapshot.period_date,
        benchmarks,
        company_metrics: {
          nrr: currentSnapshot.nrr || 0,
          grr: currentSnapshot.grr || 0,
          gross_margin: currentSnapshot.gross_margin || 0,
          cac: currentSnapshot.cac || 0,
        },
      } as BenchmarkInput)
    }
  }

  const hasData = !!currentSnapshot

  return (
    <ProtectedLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Companies', href: '/companies' },
            { label: company.name, href: `/business/${params.id}` },
            { label: 'Financials', href: `/companies/${params.id}/financials` },
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
            <p className="text-muted-foreground">Financial Analytics Dashboard</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/companies/${params.id}/financials/cohorts`}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Cohort Analysis
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/api/companies/${params.id}/financials/export-pdf`} target="_blank">
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/companies/${params.id}/financials/upload`}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Data
              </Link>
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {!hasData && (
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Financial Data Available</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upload CSV files containing subscriptions, invoices, payments, and costs to generate
              comprehensive financial analytics and insights.
            </p>
            <Button asChild>
              <Link href={`/companies/${params.id}/financials/upload`}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Financial Data
              </Link>
            </Button>
          </div>
        )}

        {/* Dashboard Content */}
        {hasData && currentSnapshot && (
          <>
            {/* Anomaly Banners */}
            {anomalies && anomalies.length > 0 && (
              <AnomalyBanners
                anomalies={anomalies.map((a) => ({
                  type: a.metric_key as any,
                  severity: a.severity,
                  message: a.message,
                  details: a.meta || undefined,
                }))}
              />
            )}

            {/* KPI Overview */}
            <KPIOverview
              data={transformKPISnapshots(currentSnapshot, previousSnapshot)}
              currency={company.reporting_currency || 'USD'}
            />

            {/* NRR Waterfall */}
            {currentSnapshot.mrr !== null && (
              <NRRWaterfall
                data={{
                  start_mrr: previousSnapshot?.mrr || currentSnapshot.mrr,
                  expansion_mrr: (currentSnapshot.expansion_rate || 0) * (previousSnapshot?.mrr || currentSnapshot.mrr),
                  contraction_mrr: (currentSnapshot.contraction_rate || 0) * (previousSnapshot?.mrr || currentSnapshot.mrr),
                  churn_mrr: (currentSnapshot.churn_rate || 0) * (previousSnapshot?.mrr || currentSnapshot.mrr),
                  end_mrr: currentSnapshot.mrr,
                  period: new Date(currentSnapshot.period_date).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  }),
                }}
                currency={company.reporting_currency || 'USD'}
              />
            )}

            {/* Two Column Layout */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Revenue Concentration */}
              {concentration && (
                <ConcentrationChart
                  data={{
                    period: new Date(concentration.period_date).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    }),
                    hhi: concentration.hhi,
                    top1_pct: concentration.top1_pct,
                    top3_pct: concentration.top3_pct,
                    top5_pct: concentration.top5_pct,
                    top10_pct: concentration.top10_pct,
                    top_customers: [], // Would be fetched from separate endpoint
                  }}
                  currency={company.reporting_currency || 'USD'}
                />
              )}

              {/* AR/AP Aging */}
              {aging && (
                <ARAPAgingTable
                  data={{
                    ...aging,
                    period: new Date(aging.snapshot_date).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    }),
                  }}
                  currency={company.reporting_currency || 'USD'}
                />
              )}
            </div>

            {/* Benchmark Comparison */}
            {benchmarkData && <BenchmarkComparison data={benchmarkData} currency={company.reporting_currency || 'USD'} />}
          </>
        )}
      </div>
    </ProtectedLayout>
  )
}

// Helper function to determine size band from ARR
function getSizeBand(arr: number): string {
  if (arr < 1_000_000) return '<$1M'
  if (arr < 10_000_000) return '$1M-$10M'
  if (arr < 50_000_000) return '$10M-$50M'
  return '$50M+'
}
