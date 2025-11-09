/**
 * Competitive Analysis PDF Exporter
 * Generates professional PDF reports for competitive analysis
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { renderToBuffer } from '@react-pdf/renderer'
import type {
  CompetitiveAnalysis,
  CompetitorCompany,
  FeatureMatrixEntry,
  PricingComparison,
  CompetitiveMoatScore,
} from '../types'

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #3b82f6',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 5,
  },
  section: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1e3a8a',
    borderBottom: '1 solid #e2e8f0',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
    color: '#475569',
  },
  value: {
    width: '70%',
    color: '#1e293b',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    fontWeight: 'bold',
    borderBottom: '1 solid #cbd5e1',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #e2e8f0',
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  bullet: {
    marginLeft: 10,
    marginBottom: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    borderTop: '1 solid #e2e8f0',
    paddingTop: 10,
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  badge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '4 8',
    borderRadius: 4,
    fontSize: 8,
    marginRight: 5,
  },
})

interface ExportData {
  analysis: CompetitiveAnalysis
  competitors: CompetitorCompany[]
  featureMatrix: FeatureMatrixEntry[]
  pricingComparisons: PricingComparison[]
  moatScores: CompetitiveMoatScore[]
}

// PDF Document Component
const CompetitiveAnalysisPDF: React.FC<{ data: ExportData }> = ({ data }) => {
  const { analysis, competitors, featureMatrix, pricingComparisons, moatScores } = data

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{analysis.title}</Text>
          <Text style={styles.subtitle}>
            Target Company: {analysis.target_company_name}
          </Text>
          <Text style={styles.subtitle}>
            Generated: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          {analysis.description && <Text style={{ marginBottom: 10 }}>{analysis.description}</Text>}

          <View style={styles.row}>
            <Text style={styles.label}>Market Segment:</Text>
            <Text style={styles.value}>{analysis.market_segment || 'Not specified'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Geography:</Text>
            <Text style={styles.value}>{analysis.geography || 'Global'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{analysis.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Deal Status:</Text>
            <Text style={styles.value}>{analysis.deal_status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Competitors Analyzed:</Text>
            <Text style={styles.value}>{competitors.length}</Text>
          </View>
        </View>

        {/* Competitive Moat Score */}
        {analysis.overall_moat_score !== null && analysis.overall_moat_score !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Competitive Moat Analysis</Text>
            <View style={{ alignItems: 'center', marginVertical: 15 }}>
              <Text style={styles.score}>{analysis.overall_moat_score.toFixed(1)}/10</Text>
              <Text style={{ fontSize: 10, color: '#64748b', marginTop: 5 }}>
                Overall Moat Score
              </Text>
            </View>
            {moatScores.length > 0 && (
              <View>
                <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Moat Factors:</Text>
                {moatScores.slice(0, 5).map((moat, index) => (
                  <View key={index} style={styles.bullet}>
                    <Text>• {moat.moat_factor}: {moat.score}/10</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <Text>
            oppSpot Competitive Analysis Report • Generated with AI-powered insights • Confidential
          </Text>
        </View>
      </Page>

      {/* Competitors Overview */}
      {competitors.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Competitor Companies</Text>

          {competitors.map((competitor, index) => (
            <View key={competitor.id} style={{ marginBottom: 15 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
                {index + 1}. {competitor.name}
              </Text>
              {competitor.website && (
                <Text style={{ fontSize: 8, color: '#3b82f6', marginBottom: 3 }}>
                  {competitor.website}
                </Text>
              )}
              <View style={styles.row}>
                <Text style={styles.label}>Industry:</Text>
                <Text style={styles.value}>{competitor.industry || 'N/A'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Headquarters:</Text>
                <Text style={styles.value}>{competitor.headquarters_location || 'N/A'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Company Size:</Text>
                <Text style={styles.value}>{competitor.company_size_band || 'N/A'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Employees:</Text>
                <Text style={styles.value}>
                  {competitor.employee_count_estimate?.toLocaleString() || 'N/A'}
                </Text>
              </View>
              {competitor.product_description && (
                <View style={{ marginTop: 5 }}>
                  <Text style={{ fontSize: 8, color: '#64748b' }}>
                    {competitor.product_description}
                  </Text>
                </View>
              )}
            </View>
          ))}

          <View style={styles.footer}>
            <Text>Page 2 • oppSpot Competitive Analysis Report</Text>
          </View>
        </Page>
      )}

      {/* Feature Comparison Matrix */}
      {featureMatrix.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Feature Comparison Matrix</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Feature</Text>
              <Text style={styles.tableCell}>Category</Text>
              <Text style={styles.tableCell}>Target Has</Text>
              <Text style={styles.tableCell}>Importance</Text>
            </View>

            {featureMatrix.slice(0, 25).map((feature, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{feature.feature_name}</Text>
                <Text style={styles.tableCell}>{feature.feature_category}</Text>
                <Text style={styles.tableCell}>{feature.target_has ? '✓' : '✗'}</Text>
                <Text style={styles.tableCell}>{feature.importance_weight}/5</Text>
              </View>
            ))}
          </View>

          {featureMatrix.length > 25 && (
            <Text style={{ marginTop: 10, fontSize: 8, color: '#64748b' }}>
              ... and {featureMatrix.length - 25} more features
            </Text>
          )}

          <View style={styles.footer}>
            <Text>Page 3 • oppSpot Competitive Analysis Report</Text>
          </View>
        </Page>
      )}

      {/* Pricing Comparison */}
      {pricingComparisons.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Pricing Comparison</Text>

          {pricingComparisons.map((pricing, index) => (
            <View key={index} style={{ marginBottom: 15 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
                Tier: {pricing.tier_name}
              </Text>
              <View style={styles.row}>
                <Text style={styles.label}>Price:</Text>
                <Text style={styles.value}>
                  ${pricing.price_amount?.toFixed(2) || 'N/A'} / {pricing.billing_period}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Positioning:</Text>
                <Text style={styles.value}>{pricing.pricing_positioning}</Text>
              </View>
              {pricing.features_summary && (
                <View style={{ marginTop: 5 }}>
                  <Text style={{ fontSize: 8, color: '#64748b' }}>
                    Features: {pricing.features_summary}
                  </Text>
                </View>
              )}
            </View>
          ))}

          <View style={styles.footer}>
            <Text>Page 4 • oppSpot Competitive Analysis Report</Text>
          </View>
        </Page>
      )}
    </Document>
  )
}

/**
 * Generate PDF buffer from competitive analysis data
 */
export async function generateCompetitiveAnalysisPDF(
  data: ExportData
): Promise<Buffer> {
  try {
    const buffer = await renderToBuffer(<CompetitiveAnalysisPDF data={data} />)
    return buffer
  } catch (error) {
    console.error('[CompetitiveAnalysisPDF] Export failed:', error)
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export type { ExportData }
