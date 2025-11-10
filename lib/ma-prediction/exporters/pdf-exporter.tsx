/**
 * M&A Predictions PDF Exporter
 * Generates professional PDF reports for M&A acquisition predictions
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { renderToBuffer } from '@react-pdf/renderer'
import type { MAPredictionDetail } from '@/lib/types/ma-prediction'

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
    width: '35%',
    fontWeight: 'bold',
    color: '#475569',
  },
  value: {
    width: '65%',
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
    marginBottom: 5,
    flexDirection: 'row',
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
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  badge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '4 8',
    borderRadius: 4,
    fontSize: 9,
    marginRight: 5,
    marginTop: 3,
  },
  scoreBadge: {
    padding: '6 12',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 10,
  },
  highScore: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  mediumScore: {
    backgroundColor: '#fef3c7',
    color: '#854d0e',
  },
  lowScore: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
})

interface ExportData {
  predictions: MAPredictionDetail[]
  includeFields?: {
    factors?: boolean
    valuation?: boolean
    acquirer_profiles?: boolean
  }
}

// PDF Document Component
const MAPredictionsPDF: React.FC<{ data: ExportData }> = ({ data }) => {
  const { predictions, includeFields } = data
  const showFactors = includeFields?.factors !== false
  const showValuation = includeFields?.valuation !== false
  const showAcquirerProfiles = includeFields?.acquirer_profiles !== false

  // Helper to get score color
  const getScoreStyle = (score: number) => {
    if (score >= 70) return styles.highScore
    if (score >= 40) return styles.mediumScore
    return styles.lowScore
  }

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>M&A Target Predictions Report</Text>
          <Text style={styles.subtitle}>
            Generated: {new Date().toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
          <Text style={styles.subtitle}>
            Total Companies Analyzed: {predictions.length}
          </Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Very High Likelihood:</Text>
            <Text style={styles.value}>
              {predictions.filter(p => p.likelihood_category === 'Very High').length} companies
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>High Likelihood:</Text>
            <Text style={styles.value}>
              {predictions.filter(p => p.likelihood_category === 'High').length} companies
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Medium Likelihood:</Text>
            <Text style={styles.value}>
              {predictions.filter(p => p.likelihood_category === 'Medium').length} companies
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Low Likelihood:</Text>
            <Text style={styles.value}>
              {predictions.filter(p => p.likelihood_category === 'Low').length} companies
            </Text>
          </View>

          <View style={{ marginTop: 15 }}>
            <View style={styles.row}>
              <Text style={styles.label}>Average Prediction Score:</Text>
              <Text style={styles.value}>
                {(predictions.reduce((sum, p) => sum + p.prediction_score, 0) / predictions.length).toFixed(1)}/100
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>High Confidence Predictions:</Text>
              <Text style={styles.value}>
                {predictions.filter(p => p.confidence_level === 'High').length} ({((predictions.filter(p => p.confidence_level === 'High').length / predictions.length) * 100).toFixed(0)}%)
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            oppSpot M&A Predictions • AI-Powered Acquisition Intelligence • Confidential
          </Text>
        </View>
      </Page>

      {/* Individual Company Predictions */}
      {predictions.map((prediction, index) => (
        <Page key={prediction.id} size="A4" style={styles.page}>
          {/* Company Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{prediction.company.name}</Text>
            <Text style={styles.subtitle}>
              Company Number: {prediction.company.company_number}
            </Text>
          </View>

          {/* Prediction Score */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acquisition Likelihood</Text>
            <View style={{ alignItems: 'center', marginVertical: 15 }}>
              <Text style={styles.score}>{prediction.prediction_score.toFixed(0)}</Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 5 }}>
                Prediction Score (out of 100)
              </Text>
              <View style={[styles.scoreBadge, getScoreStyle(prediction.prediction_score)]}>
                <Text>{prediction.likelihood_category} Likelihood</Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Confidence Level:</Text>
              <Text style={styles.value}>{prediction.confidence_level}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Analysis Date:</Text>
              <Text style={styles.value}>
                {new Date(prediction.data_last_refreshed).toLocaleDateString('en-GB')}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Algorithm:</Text>
              <Text style={styles.value}>{prediction.algorithm_type}</Text>
            </View>
          </View>

          {/* Key Factors */}
          {showFactors && prediction.factors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Acquisition Factors</Text>
              {prediction.factors.slice(0, 5).map((factor, idx) => (
                <View key={factor.id} style={styles.bullet}>
                  <Text style={{ marginRight: 5 }}>•</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>
                      {idx + 1}. {factor.factor_name} ({factor.impact_weight.toFixed(0)}% impact)
                    </Text>
                    <Text style={{ fontSize: 9, color: '#64748b' }}>
                      {factor.factor_description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Valuation Estimate */}
          {showValuation && prediction.valuation && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Valuation Estimate</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Estimated Range:</Text>
                <Text style={styles.value}>
                  £{(prediction.valuation.min_valuation_gbp / 1000000).toFixed(1)}M - £{(prediction.valuation.max_valuation_gbp / 1000000).toFixed(1)}M
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Valuation Method:</Text>
                <Text style={styles.value}>{prediction.valuation.valuation_method}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Confidence:</Text>
                <Text style={styles.value}>{prediction.valuation.confidence_level}</Text>
              </View>
            </View>
          )}

          {/* Potential Acquirer Profiles */}
          {showAcquirerProfiles && prediction.acquirer_profiles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Potential Acquirer Profiles</Text>
              {prediction.acquirer_profiles.slice(0, 3).map((acquirer, idx) => (
                <View key={acquirer.id} style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>
                    Profile {idx + 1}: {acquirer.industry_match}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>
                    Match Score: {acquirer.match_score}/100
                  </Text>
                  <Text style={{ fontSize: 9 }}>
                    Rationale: {acquirer.strategic_rationale_description}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.footer}>
            <Text>Page {index + 2} of {predictions.length + 1} • oppSpot M&A Predictions</Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}

/**
 * Generate PDF buffer from M&A predictions data
 */
export async function generateMAPredictionsPDF(
  data: ExportData
): Promise<Buffer> {
  try {
    const buffer = await renderToBuffer(<MAPredictionsPDF data={data} />)
    return buffer
  } catch (error) {
    console.error('[MAPredictionsPDF] Export failed:', error)
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export type { ExportData }
