import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { pdfStyles } from '../styles/pdf-styles'

interface ExecutiveSummaryProps {
  summary: string
  totalCompanies: number
  averageScore: number
  topScore: number
  qualityMatches: number
  keyOpportunities: string[]
  riskHighlights: string[]
  strategicRecommendations: string[]
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  summary,
  totalCompanies,
  averageScore,
  topScore,
  qualityMatches,
  keyOpportunities,
  riskHighlights,
  strategicRecommendations
}) => {
  return (
    <View>
      {/* Key Metrics */}
      <View style={pdfStyles.metricsContainer}>
        <View style={pdfStyles.metricCard}>
          <Text style={pdfStyles.metricValue}>{totalCompanies}</Text>
          <Text style={pdfStyles.metricLabel}>Companies Analyzed</Text>
        </View>
        <View style={pdfStyles.metricCard}>
          <Text style={[pdfStyles.metricValue, { color: '#059669' }]}>
            {topScore.toFixed(1)}
          </Text>
          <Text style={pdfStyles.metricLabel}>Top Match Score</Text>
        </View>
        <View style={pdfStyles.metricCard}>
          <Text style={pdfStyles.metricValue}>{averageScore.toFixed(1)}</Text>
          <Text style={pdfStyles.metricLabel}>Average Score</Text>
        </View>
        <View style={pdfStyles.metricCard}>
          <Text style={[pdfStyles.metricValue, { color: '#2563EB' }]}>
            {qualityMatches}
          </Text>
          <Text style={pdfStyles.metricLabel}>Quality Matches</Text>
        </View>
      </View>

      {/* Executive Summary */}
      <View style={pdfStyles.executiveSummaryBox}>
        <Text style={pdfStyles.executiveSummaryTitle}>Executive Summary</Text>
        <Text style={pdfStyles.paragraph}>{summary}</Text>
      </View>

      {/* Strategic Recommendations */}
      <Text style={pdfStyles.sectionTitle}>Strategic Recommendations</Text>
      <View style={pdfStyles.listContainer}>
        {strategicRecommendations.map((recommendation, index) => (
          <View key={index} style={pdfStyles.listItem}>
            <View style={[pdfStyles.listBullet, { backgroundColor: '#3B82F6' }]} />
            <Text style={pdfStyles.listText}>{recommendation}</Text>
          </View>
        ))}
      </View>

      {/* Key Opportunities */}
      <Text style={pdfStyles.subsectionTitle}>Key Opportunities</Text>
      <View style={pdfStyles.listContainer}>
        {keyOpportunities.map((opportunity, index) => (
          <View key={index} style={pdfStyles.opportunityItem}>
            <View style={pdfStyles.opportunityBullet} />
            <Text style={[pdfStyles.listText, { color: '#065F46' }]}>
              {opportunity}
            </Text>
          </View>
        ))}
      </View>

      {/* Risk Highlights */}
      <Text style={pdfStyles.subsectionTitle}>Risk Highlights</Text>
      <View style={pdfStyles.listContainer}>
        {riskHighlights.map((risk, index) => (
          <View key={index} style={pdfStyles.riskItem}>
            <View style={pdfStyles.riskBullet} />
            <Text style={[pdfStyles.listText, { color: '#7F1D1D' }]}>
              {risk}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}