/**
 * Red Flags PDF Exporter
 * Generates professional PDF reports for red flag analysis
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { renderToBuffer } from '@react-pdf/renderer'

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #dc2626',
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
    color: '#991b1b',
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
  flagCard: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#fef2f2',
    borderLeft: '3 solid #dc2626',
  },
  flagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  flagTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  flagDescription: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 5,
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
  badge: {
    padding: '3 8',
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
    marginRight: 5,
  },
  criticalBadge: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
  },
  highBadge: {
    backgroundColor: '#ea580c',
    color: '#ffffff',
  },
  mediumBadge: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
  },
  lowBadge: {
    backgroundColor: '#84cc16',
    color: '#ffffff',
  },
  statusBadge: {
    padding: '3 8',
    borderRadius: 4,
    fontSize: 8,
    marginLeft: 5,
  },
  openStatus: {
    backgroundColor: '#fef3c7',
    color: '#78350f',
  },
  reviewingStatus: {
    backgroundColor: '#dbeafe',
    color: '#1e3a8a',
  },
  mitigatingStatus: {
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
  },
  resolvedStatus: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  falsePositiveStatus: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  evidenceSection: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  evidenceTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#374151',
  },
  evidenceItem: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
    marginLeft: 10,
  },
  explainerSection: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
  },
  explainerLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 3,
  },
  explainerText: {
    fontSize: 8,
    color: '#374151',
  },
})

interface RedFlag {
  id: string
  category: string
  severity: string
  confidence: number | null
  title: string
  description: string | null
  status: string
  first_detected_at: string
  last_updated_at: string
  meta: {
    explainer?: {
      why: string
      suggested_remediation: string
    }
    evidence?: Array<{
      source: string
      description: string
    }>
  }
}

interface ExportData {
  flags: RedFlag[]
  companyName?: string
  companyId: string
  includeExplainer: boolean
  includeEvidence: boolean
}

// PDF Document Component
const RedFlagsPDF: React.FC<{ data: ExportData }> = ({ data }) => {
  const { flags, companyName, companyId, includeExplainer, includeEvidence } = data

  // Helper to get severity badge style
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return styles.criticalBadge
      case 'high': return styles.highBadge
      case 'medium': return styles.mediumBadge
      case 'low': return styles.lowBadge
      default: return styles.lowBadge
    }
  }

  // Helper to get status badge style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open': return styles.openStatus
      case 'reviewing': return styles.reviewingStatus
      case 'mitigating': return styles.mitigatingStatus
      case 'resolved': return styles.resolvedStatus
      case 'false_positive': return styles.falsePositiveStatus
      default: return styles.openStatus
    }
  }

  // Group flags by severity
  const flagsBySeverity = {
    critical: flags.filter(f => f.severity === 'critical'),
    high: flags.filter(f => f.severity === 'high'),
    medium: flags.filter(f => f.severity === 'medium'),
    low: flags.filter(f => f.severity === 'low'),
  }

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Red Flag Analysis Report</Text>
          {companyName && (
            <Text style={styles.subtitle}>Company: {companyName}</Text>
          )}
          <Text style={styles.subtitle}>Company ID: {companyId}</Text>
          <Text style={styles.subtitle}>
            Generated: {new Date().toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Total Red Flags:</Text>
            <Text style={styles.value}>{flags.length}</Text>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>By Severity:</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Critical:</Text>
              <Text style={styles.value}>{flagsBySeverity.critical.length}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>High:</Text>
              <Text style={styles.value}>{flagsBySeverity.high.length}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Medium:</Text>
              <Text style={styles.value}>{flagsBySeverity.medium.length}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Low:</Text>
              <Text style={styles.value}>{flagsBySeverity.low.length}</Text>
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>By Status:</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Open:</Text>
              <Text style={styles.value}>{flags.filter(f => f.status === 'open').length}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Reviewing:</Text>
              <Text style={styles.value}>{flags.filter(f => f.status === 'reviewing').length}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Mitigating:</Text>
              <Text style={styles.value}>{flags.filter(f => f.status === 'mitigating').length}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Resolved:</Text>
              <Text style={styles.value}>{flags.filter(f => f.status === 'resolved').length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            oppSpot Red Flag Radar • AI-Powered Risk Detection • Confidential
          </Text>
        </View>
      </Page>

      {/* Critical Flags */}
      {flagsBySeverity.critical.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Critical Red Flags</Text>

          {flagsBySeverity.critical.map((flag) => (
            <View key={flag.id} style={styles.flagCard}>
              <View style={styles.flagHeader}>
                <Text style={styles.flagTitle}>{flag.title}</Text>
                <View style={{ flexDirection: 'row' }}>
                  <View style={[styles.badge, getSeverityStyle(flag.severity)]}>
                    <Text>{flag.severity.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, getStatusStyle(flag.status)]}>
                    <Text>{flag.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              {flag.description && (
                <Text style={styles.flagDescription}>{flag.description}</Text>
              )}

              <View style={styles.row}>
                <Text style={{ fontSize: 8, color: '#64748b' }}>
                  Detected: {new Date(flag.first_detected_at).toLocaleDateString('en-GB')}
                </Text>
                {flag.confidence !== null && (
                  <Text style={{ fontSize: 8, color: '#64748b', marginLeft: 10 }}>
                    Confidence: {(flag.confidence * 100).toFixed(0)}%
                  </Text>
                )}
              </View>

              {includeExplainer && flag.meta?.explainer && (
                <View style={styles.explainerSection}>
                  <Text style={styles.explainerLabel}>Why This Matters:</Text>
                  <Text style={styles.explainerText}>{flag.meta.explainer.why}</Text>
                  <Text style={[styles.explainerLabel, { marginTop: 5 }]}>Suggested Remediation:</Text>
                  <Text style={styles.explainerText}>{flag.meta.explainer.suggested_remediation}</Text>
                </View>
              )}

              {includeEvidence && flag.meta?.evidence && flag.meta.evidence.length > 0 && (
                <View style={styles.evidenceSection}>
                  <Text style={styles.evidenceTitle}>Evidence:</Text>
                  {flag.meta.evidence.slice(0, 3).map((evidence, idx) => (
                    <Text key={idx} style={styles.evidenceItem}>
                      • {evidence.source}: {evidence.description}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}

          <View style={styles.footer}>
            <Text>Page 2 • oppSpot Red Flag Radar</Text>
          </View>
        </Page>
      )}

      {/* High Priority Flags */}
      {flagsBySeverity.high.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>High Priority Red Flags</Text>

          {flagsBySeverity.high.slice(0, 10).map((flag) => (
            <View key={flag.id} style={styles.flagCard}>
              <View style={styles.flagHeader}>
                <Text style={styles.flagTitle}>{flag.title}</Text>
                <View style={{ flexDirection: 'row' }}>
                  <View style={[styles.badge, getSeverityStyle(flag.severity)]}>
                    <Text>{flag.severity.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, getStatusStyle(flag.status)]}>
                    <Text>{flag.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              {flag.description && (
                <Text style={styles.flagDescription}>{flag.description}</Text>
              )}

              {includeExplainer && flag.meta?.explainer && (
                <View style={styles.explainerSection}>
                  <Text style={styles.explainerLabel}>Remediation:</Text>
                  <Text style={styles.explainerText}>{flag.meta.explainer.suggested_remediation}</Text>
                </View>
              )}
            </View>
          ))}

          {flagsBySeverity.high.length > 10 && (
            <Text style={{ marginTop: 10, fontSize: 9, color: '#64748b' }}>
              ... and {flagsBySeverity.high.length - 10} more high priority flags
            </Text>
          )}

          <View style={styles.footer}>
            <Text>Page 3 • oppSpot Red Flag Radar</Text>
          </View>
        </Page>
      )}
    </Document>
  )
}

/**
 * Generate PDF buffer from red flags data
 */
export async function generateRedFlagsPDF(
  data: ExportData
): Promise<Buffer> {
  try {
    const buffer = await renderToBuffer(<RedFlagsPDF data={data} />)
    return buffer
  } catch (error) {
    console.error('[RedFlagsPDF] Export failed:', error)
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export type { ExportData, RedFlag }
