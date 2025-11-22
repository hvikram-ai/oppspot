// Financial Report PDF Generator
// Feature: 012-oppspot-docs-financial
// Description: Generate board-ready PDF financial reports using @react-pdf/renderer

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer'
import type { KPISnapshot, RevenueConcentration, ARAPAging } from '@/lib/financials/types'

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

export interface PDFReportData {
  company: {
    name: string
    sector: string | null
    currency: string
    logo_url?: string
  }
  period: {
    start_date: string
    end_date: string
  }
  kpi_snapshot: KPISnapshot | null
  previous_snapshot: KPISnapshot | null
  concentration: RevenueConcentration | null
  aging: ARAPAging | null
  anomalies: Array<{
    metric_key: string
    severity: string
    message: string
  }>
}

// ==============================================================================
// PDF STYLES
// ==============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
  },
  coverPage: {
    padding: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 20,
    color: '#1a1a1a',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 15,
    color: '#333',
  },
  text: {
    fontSize: 10,
    marginBottom: 5,
    color: '#333',
  },
  metricRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: '1 solid #e0e0e0',
  },
  metricLabel: {
    fontSize: 10,
    color: '#666',
    width: '50%',
  },
  metricValue: {
    fontSize: 10,
    fontWeight: 'bold',
    width: '30%',
    textAlign: 'right',
  },
  metricTrend: {
    fontSize: 10,
    width: '20%',
    textAlign: 'right',
  },
  trendPositive: {
    color: '#10b981',
  },
  trendNegative: {
    color: '#ef4444',
  },
  trendNeutral: {
    color: '#6b7280',
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: '2 solid #1a1a1a',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
  },
  table: {
    display: 'flex',
    width: '100%',
    marginTop: 10,
    marginBottom: 15,
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottom: '1 solid #e0e0e0',
    paddingVertical: 5,
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableCell: {
    fontSize: 9,
    padding: 5,
  },
  alert: {
    backgroundColor: '#fef2f2',
    border: '1 solid #ef4444',
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  alertText: {
    fontSize: 9,
    color: '#991b1b',
  },
})

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

function formatCurrency(value: number | null, currency: string): string {
  if (value === null) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercentage(value: number | null): string {
  if (value === null) return 'N/A'
  return `${(value * 100).toFixed(1)}%`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function calculateTrend(current: number | null, previous: number | null): {
  change: string
  style: Record<string, unknown>
} {
  if (current === null || previous === null || previous === 0) {
    return { change: '-', style: styles.trendNeutral }
  }

  const changePct = ((current - previous) / previous) * 100
  const sign = changePct > 0 ? '+' : ''
  const style = changePct > 0 ? styles.trendPositive : changePct < 0 ? styles.trendNegative : styles.trendNeutral

  return {
    change: `${sign}${changePct.toFixed(1)}%`,
    style,
  }
}

// ==============================================================================
// PDF COMPONENTS
// ==============================================================================

function CoverPage({ data }: { data: PDFReportData }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <View>
        <Text style={styles.title}>{data.company.name}</Text>
        <Text style={styles.subtitle}>Financial Analytics Report</Text>
        <Text style={[styles.text, { textAlign: 'center', marginBottom: 10 }]}>
          {formatDate(data.period.start_date)} - {formatDate(data.period.end_date)}
        </Text>
        <Text style={[styles.text, { textAlign: 'center', fontSize: 8, color: '#999' }]}>
          Generated on {new Date().toLocaleDateString('en-US')}
        </Text>
      </View>
    </Page>
  )
}

function ExecutiveSummary({ data }: { data: PDFReportData }) {
  const kpi = data.kpi_snapshot
  const prev = data.previous_snapshot

  if (!kpi) {
    return (
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <Text style={styles.text}>No financial data available for this period.</Text>
      </Page>
    )
  }

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Executive Summary</Text>
        <Text style={{ fontSize: 9, color: '#666' }}>{data.company.name}</Text>
      </View>

      <Text style={styles.subsectionTitle}>Key Metrics</Text>
      <View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Annual Recurring Revenue (ARR)</Text>
          <Text style={styles.metricValue}>{formatCurrency(kpi.arr, data.company.currency)}</Text>
          <Text style={[styles.metricTrend, calculateTrend(kpi.arr, prev?.arr).style]}>
            {calculateTrend(kpi.arr, prev?.arr).change}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Monthly Recurring Revenue (MRR)</Text>
          <Text style={styles.metricValue}>{formatCurrency(kpi.mrr, data.company.currency)}</Text>
          <Text style={[styles.metricTrend, calculateTrend(kpi.mrr, prev?.mrr).style]}>
            {calculateTrend(kpi.mrr, prev?.mrr).change}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Net Revenue Retention (NRR)</Text>
          <Text style={styles.metricValue}>{formatPercentage(kpi.nrr)}</Text>
          <Text style={[styles.metricTrend, calculateTrend(kpi.nrr, prev?.nrr).style]}>
            {calculateTrend(kpi.nrr, prev?.nrr).change}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Gross Revenue Retention (GRR)</Text>
          <Text style={styles.metricValue}>{formatPercentage(kpi.grr)}</Text>
          <Text style={[styles.metricTrend, calculateTrend(kpi.grr, prev?.grr).style]}>
            {calculateTrend(kpi.grr, prev?.grr).change}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Customer Acquisition Cost (CAC)</Text>
          <Text style={styles.metricValue}>{formatCurrency(kpi.cac, data.company.currency)}</Text>
          <Text style={[styles.metricTrend, calculateTrend(kpi.cac, prev?.cac).style]}>
            {calculateTrend(kpi.cac, prev?.cac).change}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Lifetime Value (LTV)</Text>
          <Text style={styles.metricValue}>{formatCurrency(kpi.ltv, data.company.currency)}</Text>
          <Text style={[styles.metricTrend, calculateTrend(kpi.ltv, prev?.ltv).style]}>
            {calculateTrend(kpi.ltv, prev?.ltv).change}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Gross Margin</Text>
          <Text style={styles.metricValue}>{formatPercentage(kpi.gross_margin)}</Text>
          <Text style={[styles.metricTrend, calculateTrend(kpi.gross_margin, prev?.gross_margin).style]}>
            {calculateTrend(kpi.gross_margin, prev?.gross_margin).change}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Average Revenue Per User (ARPU)</Text>
          <Text style={styles.metricValue}>{formatCurrency(kpi.arpu, data.company.currency)}</Text>
          <Text style={[styles.metricTrend, calculateTrend(kpi.arpu, prev?.arpu).style]}>
            {calculateTrend(kpi.arpu, prev?.arpu).change}
          </Text>
        </View>
      </View>

      {/* Anomalies */}
      {data.anomalies && data.anomalies.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>Alerts & Anomalies</Text>
          {data.anomalies.slice(0, 3).map((anomaly, index) => (
            <View key={index} style={styles.alert}>
              <Text style={styles.alertText}>
                {anomaly.severity.toUpperCase()}: {anomaly.message}
              </Text>
            </View>
          ))}
        </>
      )}

      <View style={styles.footer}>
        <Text>Page 2 | Generated with OppSpot Financial Analytics</Text>
      </View>
    </Page>
  )
}

function RevenueQualityPage({ data }: { data: PDFReportData }) {
  const { concentration, aging } = data

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Revenue Quality Analysis</Text>
        <Text style={{ fontSize: 9, color: '#666' }}>{data.company.name}</Text>
      </View>

      {/* Revenue Concentration */}
      {concentration && (
        <>
          <Text style={styles.subsectionTitle}>Revenue Concentration</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { width: '50%' }]}>Metric</Text>
              <Text style={[styles.tableCell, { width: '50%', textAlign: 'right' }]}>Value</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '50%' }]}>HHI (Herfindahl-Hirschman Index)</Text>
              <Text style={[styles.tableCell, { width: '50%', textAlign: 'right' }]}>
                {concentration.hhi.toFixed(0)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '50%' }]}>Top 1 Customer</Text>
              <Text style={[styles.tableCell, { width: '50%', textAlign: 'right' }]}>
                {formatPercentage(concentration.top1_pct)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '50%' }]}>Top 3 Customers</Text>
              <Text style={[styles.tableCell, { width: '50%', textAlign: 'right' }]}>
                {formatPercentage(concentration.top3_pct)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '50%' }]}>Top 5 Customers</Text>
              <Text style={[styles.tableCell, { width: '50%', textAlign: 'right' }]}>
                {formatPercentage(concentration.top5_pct)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '50%' }]}>Top 10 Customers</Text>
              <Text style={[styles.tableCell, { width: '50%', textAlign: 'right' }]}>
                {formatPercentage(concentration.top10_pct)}
              </Text>
            </View>
          </View>

          {concentration.top1_pct > 0.25 && (
            <View style={styles.alert}>
              <Text style={styles.alertText}>
                WARNING: Top customer represents {formatPercentage(concentration.top1_pct)} of revenue,
                exceeding 25% concentration risk threshold.
              </Text>
            </View>
          )}
        </>
      )}

      {/* AR/AP Aging */}
      {aging && (
        <>
          <Text style={styles.subsectionTitle}>AR/AP Aging</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { width: '40%' }]}>Aging Bucket</Text>
              <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>AR Amount</Text>
              <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>AP Amount</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '40%' }]}>0-30 days</Text>
              <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>
                {formatCurrency(aging.ar_0_30, data.company.currency)}
              </Text>
              <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>
                {formatCurrency(aging.ap_0_30, data.company.currency)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '40%' }]}>31-60 days</Text>
              <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>
                {formatCurrency(aging.ar_31_60, data.company.currency)}
              </Text>
              <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>
                {formatCurrency(aging.ap_31_60, data.company.currency)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '40%' }]}>61-90 days</Text>
              <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>
                {formatCurrency(aging.ar_61_90, data.company.currency)}
              </Text>
              <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>
                {formatCurrency(aging.ap_61_90, data.company.currency)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '40%' }]}>90+ days</Text>
              <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>
                {formatCurrency(aging.ar_90_plus, data.company.currency)}
              </Text>
              <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>
                {formatCurrency(aging.ap_90_plus, data.company.currency)}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 15 }}>
            <Text style={styles.text}>
              <Text style={{ fontWeight: 'bold' }}>DSO (Days Sales Outstanding):</Text>{' '}
              {aging.dso ? `${aging.dso.toFixed(0)} days` : 'N/A'}
            </Text>
            <Text style={styles.text}>
              <Text style={{ fontWeight: 'bold' }}>DPO (Days Payables Outstanding):</Text>{' '}
              {aging.dpo ? `${aging.dpo.toFixed(0)} days` : 'N/A'}
            </Text>
          </View>
        </>
      )}

      <View style={styles.footer}>
        <Text>Page 3 | Generated with OppSpot Financial Analytics</Text>
      </View>
    </Page>
  )
}

// ==============================================================================
// MAIN PDF DOCUMENT
// ==============================================================================

export function FinancialReportPDF({ data }: { data: PDFReportData }) {
  return (
    <Document
      title={`${data.company.name}_Financial_Report_${new Date().toISOString().split('T')[0]}`}
      author="OppSpot Financial Analytics"
      subject={`Financial Analytics Report for ${data.company.name}`}
      creator="OppSpot"
    >
      <CoverPage data={data} />
      <ExecutiveSummary data={data} />
      <RevenueQualityPage data={data} />
    </Document>
  )
}

// Export filename generator
export function generatePDFFilename(companyName: string): string {
  const sanitizedName = companyName.replace(/[^a-zA-Z0-9]/g, '_')
  const date = new Date().toISOString().split('T')[0]
  return `${sanitizedName}_Financial_Report_${date}.pdf`
}
