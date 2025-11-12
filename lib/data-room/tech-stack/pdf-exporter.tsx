/**
 * Tech Stack Analysis PDF Exporter
 * Generates professional PDF reports using @react-pdf/renderer
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import type {
  TechStackAnalysisWithDetails,
  TechStackFindingWithTechnologies,
} from '@/lib/data-room/types';

// Register fonts (optional - uses system fonts by default)
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2' },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2', fontWeight: 'bold' },
  ],
});

// PDF Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #2563eb',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    fontSize: 9,
    color: '#64748b',
  },
  section: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 5,
  },
  scoreCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  scoreItem: {
    width: '23%',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 4,
    border: '1px solid #e2e8f0',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  riskLow: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  riskMedium: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  riskHigh: {
    backgroundColor: '#fed7aa',
    color: '#9a3412',
  },
  riskCritical: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderBottom: '1px solid #cbd5e1',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #e2e8f0',
    fontSize: 9,
  },
  tableCol1: { width: '25%' },
  tableCol2: { width: '15%' },
  tableCol3: { width: '15%' },
  tableCol4: { width: '15%' },
  tableCol5: { width: '30%' },
  findingCard: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderLeft: '3px solid #2563eb',
    borderRadius: 4,
  },
  findingTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
  },
  findingDescription: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.4,
    marginBottom: 6,
  },
  findingRecommendation: {
    fontSize: 9,
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  findingTechs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 4,
  },
  techBadge: {
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 8,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginRight: 6,
  },
  severityCritical: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  severityHigh: {
    backgroundColor: '#fed7aa',
    color: '#9a3412',
  },
  severityMedium: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  severityLow: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  categoryBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '30%',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
    border: '1px solid #e2e8f0',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 8,
    borderTop: '1px solid #e2e8f0',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    color: '#94a3b8',
    fontSize: 8,
  },
});

// Helper functions
const getRiskLevelStyle = (riskLevel: string | null) => {
  switch (riskLevel) {
    case 'low':
      return styles.riskLow;
    case 'medium':
      return styles.riskMedium;
    case 'high':
      return styles.riskHigh;
    case 'critical':
      return styles.riskCritical;
    default:
      return styles.riskMedium;
  }
};

const getSeverityStyle = (severity: string) => {
  switch (severity) {
    case 'critical':
      return styles.severityCritical;
    case 'high':
      return styles.severityHigh;
    case 'medium':
      return styles.severityMedium;
    case 'low':
      return styles.severityLow;
    default:
      return styles.severityMedium;
  }
};

const formatCategory = (category: string): string => {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface TechStackPDFProps {
  analysis: TechStackAnalysisWithDetails;
  findings: TechStackFindingWithTechnologies[];
}

// Main PDF Document Component
export const TechStackPDF: React.FC<TechStackPDFProps> = ({ analysis, findings }) => {
  const generatedDate = format(new Date(), 'MMMM d, yyyy');
  const analysisDate = format(new Date(analysis.created_at), 'MMMM d, yyyy');

  // Group findings by type
  const redFlags = findings.filter((f) => f.finding_type === 'red_flag');
  const risks = findings.filter((f) => f.finding_type === 'risk');
  const opportunities = findings.filter((f) => f.finding_type === 'opportunity');
  const strengths = findings.filter((f) => f.finding_type === 'strength');
  const recommendations = findings.filter((f) => f.finding_type === 'recommendation');

  // Top 10 technologies by risk score
  const topTechnologies = [...analysis.technologies]
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 10);

  return (
    <Document>
      {/* Page 1: Executive Summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{analysis.title}</Text>
          <Text style={styles.subtitle}>Tech Stack Due Diligence Report</Text>
          {analysis.description && (
            <Text style={styles.subtitle}>{analysis.description}</Text>
          )}
          <View style={styles.metadata}>
            <Text>Analysis Date: {analysisDate}</Text>
            <Text>Generated: {generatedDate}</Text>
            <Text>Created by: {analysis.creator_name}</Text>
          </View>
        </View>

        {/* Executive Summary Scores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>

          {analysis.risk_level && (
            <View style={[styles.riskBadge, getRiskLevelStyle(analysis.risk_level)]}>
              <Text>{analysis.risk_level.toUpperCase()} RISK</Text>
            </View>
          )}

          <View style={styles.scoreCard}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>{analysis.technologies_identified}</Text>
              <Text style={styles.scoreLabel}>Technologies</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>
                {analysis.modernization_score ?? 'N/A'}
              </Text>
              <Text style={styles.scoreLabel}>Modernization</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>
                {analysis.ai_authenticity_score ?? 'N/A'}
              </Text>
              <Text style={styles.scoreLabel}>AI Authenticity</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>
                {analysis.technical_debt_score ?? 'N/A'}
              </Text>
              <Text style={styles.scoreLabel}>Technical Debt</Text>
            </View>
          </View>
        </View>

        {/* Key Findings Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Findings</Text>
          <View style={{ flexDirection: 'row', gap: 15, marginBottom: 15 }}>
            <Text style={{ fontSize: 9 }}>
              🚩 {analysis.critical_findings_count || 0} Critical Findings
            </Text>
            <Text style={{ fontSize: 9 }}>⚠️ {redFlags.length} Red Flags</Text>
            <Text style={{ fontSize: 9 }}>📊 {risks.length} Risks</Text>
            <Text style={{ fontSize: 9 }}>✨ {opportunities.length} Opportunities</Text>
          </View>

          {redFlags.length > 0 && (
            <View>
              <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 8 }}>
                Critical Red Flags:
              </Text>
              {redFlags.slice(0, 3).map((finding) => (
                <View key={finding.id} style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 9, color: '#991b1b' }}>
                    • {finding.title}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Technology Breakdown by Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technology Breakdown</Text>
          <View style={styles.categoryBreakdown}>
            {analysis.technologies_by_category?.map((cat) => (
              <View key={cat.category} style={styles.categoryCard}>
                <Text style={styles.categoryName}>{formatCategory(cat.category)}</Text>
                <Text style={styles.categoryCount}>{cat.count}</Text>
                <Text style={{ fontSize: 8, color: '#64748b' }}>
                  Avg Risk: {Math.round(cat.avg_risk_score)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* AI/ML Breakdown */}
        {analysis.ai_breakdown && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI/ML Technology Analysis</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={styles.categoryCard}>
                <Text style={styles.categoryName}>Proprietary</Text>
                <Text style={styles.categoryCount}>{analysis.ai_breakdown.proprietary}</Text>
              </View>
              <View style={styles.categoryCard}>
                <Text style={styles.categoryName}>GPT Wrapper</Text>
                <Text style={styles.categoryCount}>{analysis.ai_breakdown.wrapper}</Text>
              </View>
              <View style={styles.categoryCard}>
                <Text style={styles.categoryName}>Hybrid</Text>
                <Text style={styles.categoryCount}>{analysis.ai_breakdown.hybrid}</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          Tech Stack Due Diligence Report • Generated by oppSpot • {generatedDate}
        </Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>

      {/* Page 2: Technology Inventory */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Technology Inventory</Text>
          <Text style={styles.subtitle}>Detailed Technology Stack</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Top Technologies by Risk ({topTechnologies.length} shown)
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCol1}>Technology</Text>
              <Text style={styles.tableCol2}>Category</Text>
              <Text style={styles.tableCol3}>Risk Score</Text>
              <Text style={styles.tableCol4}>Confidence</Text>
              <Text style={styles.tableCol5}>Status</Text>
            </View>
            {topTechnologies.map((tech) => (
              <View key={tech.id} style={styles.tableRow}>
                <Text style={styles.tableCol1}>
                  {tech.name} {tech.version ? `v${tech.version}` : ''}
                </Text>
                <Text style={styles.tableCol2}>{formatCategory(tech.category)}</Text>
                <Text style={styles.tableCol3}>{tech.risk_score || 'N/A'}</Text>
                <Text style={styles.tableCol4}>
                  {tech.confidence_score ? `${Math.round(tech.confidence_score * 100)}%` : 'N/A'}
                </Text>
                <Text style={styles.tableCol5}>
                  {tech.is_deprecated && '⚠️ Deprecated '}
                  {tech.is_outdated && '📅 Outdated '}
                  {tech.has_security_issues && '🔒 Security Issues'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ML/AI Technologies */}
        {analysis.technologies.filter((t) => t.category === 'ml_ai').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI/ML Technologies</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCol1}>Technology</Text>
                <Text style={styles.tableCol2}>Authenticity</Text>
                <Text style={styles.tableCol3}>Risk Score</Text>
                <Text style={styles.tableCol5}>Evidence</Text>
              </View>
              {analysis.technologies
                .filter((t) => t.category === 'ml_ai')
                .map((tech) => (
                  <View key={tech.id} style={styles.tableRow}>
                    <Text style={styles.tableCol1}>{tech.name}</Text>
                    <Text style={styles.tableCol2}>
                      {tech.authenticity || 'unknown'}
                    </Text>
                    <Text style={styles.tableCol3}>{tech.risk_score || 'N/A'}</Text>
                    <Text style={styles.tableCol5}>
                      {tech.evidence_count || 0} evidence items
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          Tech Stack Due Diligence Report • Generated by oppSpot • {generatedDate}
        </Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>

      {/* Page 3: Red Flags & Risks */}
      {(redFlags.length > 0 || risks.length > 0) && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Red Flags & Risks</Text>
            <Text style={styles.subtitle}>Critical Issues Requiring Attention</Text>
          </View>

          {redFlags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🚩 Red Flags ({redFlags.length})</Text>
              {redFlags.map((finding) => (
                <View key={finding.id} style={styles.findingCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={[styles.severityBadge, getSeverityStyle(finding.severity)]}>
                      <Text>{finding.severity.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.findingTitle}>{finding.title}</Text>
                  </View>
                  <Text style={styles.findingDescription}>{finding.description}</Text>
                  {finding.technologies && finding.technologies.length > 0 && (
                    <View style={styles.findingTechs}>
                      {finding.technologies.map((tech) => (
                        <View key={tech.id} style={styles.techBadge}>
                          <Text>{tech.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {finding.recommendation && (
                    <View style={styles.findingRecommendation}>
                      <Text>💡 Recommendation: {finding.recommendation}</Text>
                    </View>
                  )}
                  {finding.impact_score && (
                    <Text style={{ fontSize: 8, color: '#64748b', marginTop: 6 }}>
                      Impact Score: {finding.impact_score}/100
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {risks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚠️ Risks ({risks.length})</Text>
              {risks.slice(0, 5).map((finding) => (
                <View key={finding.id} style={styles.findingCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={[styles.severityBadge, getSeverityStyle(finding.severity)]}>
                      <Text>{finding.severity.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.findingTitle}>{finding.title}</Text>
                  </View>
                  <Text style={styles.findingDescription}>{finding.description}</Text>
                  {finding.recommendation && (
                    <View style={styles.findingRecommendation}>
                      <Text>💡 {finding.recommendation}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <Text style={styles.footer}>
            Tech Stack Due Diligence Report • Generated by oppSpot • {generatedDate}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            fixed
          />
        </Page>
      )}

      {/* Page 4: Opportunities & Strengths */}
      {(opportunities.length > 0 || strengths.length > 0) && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Opportunities & Strengths</Text>
            <Text style={styles.subtitle}>Positive Findings & Growth Potential</Text>
          </View>

          {strengths.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💪 Strengths ({strengths.length})</Text>
              {strengths.map((finding) => (
                <View key={finding.id} style={styles.findingCard}>
                  <Text style={styles.findingTitle}>{finding.title}</Text>
                  <Text style={styles.findingDescription}>{finding.description}</Text>
                </View>
              ))}
            </View>
          )}

          {opportunities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ Opportunities ({opportunities.length})</Text>
              {opportunities.map((finding) => (
                <View key={finding.id} style={styles.findingCard}>
                  <Text style={styles.findingTitle}>{finding.title}</Text>
                  <Text style={styles.findingDescription}>{finding.description}</Text>
                  {finding.recommendation && (
                    <View style={styles.findingRecommendation}>
                      <Text>💡 {finding.recommendation}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <Text style={styles.footer}>
            Tech Stack Due Diligence Report • Generated by oppSpot • {generatedDate}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            fixed
          />
        </Page>
      )}

      {/* Page 5: Recommendations */}
      {recommendations.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Action Items & Recommendations</Text>
            <Text style={styles.subtitle}>Prioritized Recommendations</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Recommendations ({recommendations.length})</Text>
            {recommendations.map((finding, index) => (
              <View key={finding.id} style={styles.findingCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      paddingHorizontal: 6,
                      paddingVertical: 3,
                      borderRadius: 3,
                      fontSize: 8,
                      fontWeight: 'bold',
                      marginRight: 8,
                    }}
                  >
                    <Text>#{index + 1}</Text>
                  </View>
                  <Text style={styles.findingTitle}>{finding.title}</Text>
                </View>
                <Text style={styles.findingDescription}>{finding.description}</Text>
                {finding.recommendation && (
                  <View style={styles.findingRecommendation}>
                    <Text>💡 Action: {finding.recommendation}</Text>
                  </View>
                )}
                {finding.impact_score && (
                  <Text style={{ fontSize: 8, color: '#64748b', marginTop: 6 }}>
                    Priority Score: {finding.impact_score}/100
                  </Text>
                )}
              </View>
            ))}
          </View>

          <Text style={styles.footer}>
            Tech Stack Due Diligence Report • Generated by oppSpot • {generatedDate}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            fixed
          />
        </Page>
      )}
    </Document>
  );
};

// Export function to generate PDF blob
export const generateTechStackPDF = async (
  analysis: TechStackAnalysisWithDetails,
  findings: TechStackFindingWithTechnologies[]
): Promise<Blob> => {
  const { pdf } = await import('@react-pdf/renderer');
  const blob = await pdf(<TechStackPDF analysis={analysis} findings={findings} />).toBlob();
  return blob;
};
