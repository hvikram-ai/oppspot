import React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { cleanPdfStyles } from '../styles/clean-pdf-styles'

interface SimilarityMatch {
  id: string
  company_name: string
  company_data: Record<string, unknown>
  overall_score: number
  confidence: number
  rank: number
  financial_score: number
  strategic_score: number
  operational_score: number
  market_score: number
  risk_score: number
  market_position: string
  risk_factors_identified: string[]
  opportunity_areas: string[]
  similarity_explanations?: Array<{
    summary: string
    key_reasons: string[]
  }>
}

interface AnalysisData {
  analysis: {
    id: string
    targetCompany: string
    targetCompanyData: Record<string, unknown>
    configuration: {
      weights: {
        financial: number
        strategic: number
        operational: number
        market: number
        risk: number
      }
      regions: string[]
      industries: string[]
    }
    summary: {
      totalCompanies: number
      averageScore: number
      topScore: number
      analysisDate: string
    }
    insights: {
      executiveSummary: string
      keyOpportunities: string[]
      riskHighlights: string[]
      strategicRecommendations: string[]
    }
  }
  matches: SimilarityMatch[]
  metadata: {
    generatedAt: string
    generatedBy: string
  }
}

interface CleanSimilarityTemplateProps {
  data: AnalysisData
}

export const CleanSimilarityTemplate: React.FC<CleanSimilarityTemplateProps> = ({ data }) => {
  const { analysis, matches, metadata } = data

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScoreColor = (score: number): string => {
    if (score >= 85) return '#059669' // green
    if (score >= 70) return '#2563EB' // blue
    if (score >= 55) return '#D97706' // amber
    return '#DC2626' // red
  }

  const topMatches = matches.slice(0, 8) // Show top 8 companies
  const qualityMatches = matches.filter(m => m.overall_score >= 70).length

  return (
    <Document
      title={`Similarity Analysis - ${analysis.targetCompany}`}
      author={metadata.generatedBy}
      subject="M&A Similarity Analysis Report"
      creator="oppSpot - AI-Powered Business Intelligence"
    >
      {/* Page 1: Executive Summary */}
      <Page size="A4" style={cleanPdfStyles.page}>
        {/* Header */}
        <View style={cleanPdfStyles.header}>
          <View style={cleanPdfStyles.logo}>
            <Text style={cleanPdfStyles.logoText}>oppSpot</Text>
          </View>
          <View style={cleanPdfStyles.headerInfo}>
            <Text style={cleanPdfStyles.title}>Similarity Analysis Report</Text>
            <Text style={cleanPdfStyles.subtitle}>{analysis.targetCompany}</Text>
            <Text style={cleanPdfStyles.headerMeta}>
              Generated: {formatDate(analysis.summary.analysisDate)}
            </Text>
            <Text style={cleanPdfStyles.headerMeta}>
              By: {metadata.generatedBy}
            </Text>
          </View>
        </View>

        {/* Key Metrics */}
        <Text style={cleanPdfStyles.sectionTitle}>Executive Overview</Text>
        <View style={cleanPdfStyles.metricsGrid}>
          <View style={cleanPdfStyles.metricBox}>
            <Text style={cleanPdfStyles.metricValue}>{analysis.summary.totalCompanies}</Text>
            <Text style={cleanPdfStyles.metricLabel}>Companies Analyzed</Text>
          </View>
          <View style={cleanPdfStyles.metricBox}>
            <Text style={[cleanPdfStyles.metricValue, { color: getScoreColor(analysis.summary.topScore) }]}>
              {analysis.summary.topScore.toFixed(1)}
            </Text>
            <Text style={cleanPdfStyles.metricLabel}>Top Match Score</Text>
          </View>
          <View style={cleanPdfStyles.metricBox}>
            <Text style={cleanPdfStyles.metricValue}>{analysis.summary.averageScore.toFixed(1)}</Text>
            <Text style={cleanPdfStyles.metricLabel}>Average Score</Text>
          </View>
          <View style={cleanPdfStyles.metricBox}>
            <Text style={[cleanPdfStyles.metricValue, { color: '#059669' }]}>
              {qualityMatches}
            </Text>
            <Text style={cleanPdfStyles.metricLabel}>Quality Matches</Text>
          </View>
        </View>

        {/* Executive Summary */}
        <View style={cleanPdfStyles.summaryBox}>
          <Text style={cleanPdfStyles.summaryTitle}>Executive Summary</Text>
          <Text style={cleanPdfStyles.paragraph}>
            {analysis.insights.executiveSummary}
          </Text>
        </View>

        {/* Strategic Recommendations */}
        <Text style={cleanPdfStyles.subsectionTitle}>Strategic Recommendations</Text>
        <View style={cleanPdfStyles.list}>
          {analysis.insights.strategicRecommendations.map((recommendation, index) => (
            <View key={index} style={cleanPdfStyles.listItem}>
              <Text style={cleanPdfStyles.bullet}>•</Text>
              <Text style={cleanPdfStyles.listText}>{recommendation}</Text>
            </View>
          ))}
        </View>

        {/* Key Opportunities */}
        <Text style={cleanPdfStyles.subsectionTitle}>Key Opportunities</Text>
        <View style={cleanPdfStyles.list}>
          {analysis.insights.keyOpportunities.map((opportunity, index) => (
            <View key={index} style={cleanPdfStyles.listItem}>
              <Text style={[cleanPdfStyles.bullet, { color: '#059669' }]}>+</Text>
              <Text style={cleanPdfStyles.listText}>{opportunity}</Text>
            </View>
          ))}
        </View>

        {/* Risk Highlights */}
        <Text style={cleanPdfStyles.subsectionTitle}>Risk Highlights</Text>
        <View style={cleanPdfStyles.list}>
          {analysis.insights.riskHighlights.map((risk, index) => (
            <View key={index} style={cleanPdfStyles.listItem}>
              <Text style={[cleanPdfStyles.bullet, { color: '#DC2626' }]}>!</Text>
              <Text style={cleanPdfStyles.listText}>{risk}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={cleanPdfStyles.footer}>
          <View>
            <Text style={cleanPdfStyles.footerText}>
              Generated by: {metadata.generatedBy}
            </Text>
            <Text style={cleanPdfStyles.footerText}>
              Date: {formatDate(metadata.generatedAt)}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[cleanPdfStyles.footerText, { fontSize: 10, color: '#3B82F6' }]}>
              oppSpot Similarity Analysis
            </Text>
            <Text style={cleanPdfStyles.footerText}>Page 1 of 2</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[cleanPdfStyles.footerText, { color: '#3B82F6' }]}>
              oppspot.com
            </Text>
            <Text style={cleanPdfStyles.footerText}>
              AI-Powered M&A Intelligence
            </Text>
          </View>
        </View>
      </Page>

      {/* Page 2: Company Analysis */}
      <Page size="A4" style={cleanPdfStyles.page}>
        {/* Header */}
        <View style={cleanPdfStyles.header}>
          <View style={cleanPdfStyles.logo}>
            <Text style={cleanPdfStyles.logoText}>oppSpot</Text>
          </View>
          <View style={cleanPdfStyles.headerInfo}>
            <Text style={cleanPdfStyles.title}>Top Similar Companies</Text>
            <Text style={cleanPdfStyles.subtitle}>{analysis.targetCompany}</Text>
          </View>
        </View>

        {/* Target Company Profile */}
        <Text style={cleanPdfStyles.sectionTitle}>Target Company Profile</Text>
        <View style={cleanPdfStyles.companyCard}>
          <Text style={cleanPdfStyles.companyName}>{analysis.targetCompany}</Text>
          <View style={cleanPdfStyles.companyMeta}>
            <Text style={cleanPdfStyles.metaItem}>
              📍 {analysis.targetCompanyData?.country || 'N/A'}
            </Text>
            <Text style={cleanPdfStyles.metaItem}>
              🏢 {analysis.targetCompanyData?.industry || 'N/A'}
            </Text>
            <Text style={cleanPdfStyles.metaItem}>
              👥 {analysis.targetCompanyData?.employees || 'N/A'} employees
            </Text>
            <Text style={cleanPdfStyles.metaItem}>
              💰 {analysis.targetCompanyData?.revenue || 'N/A'} revenue
            </Text>
          </View>
          {analysis.targetCompanyData?.description && (
            <Text style={cleanPdfStyles.description}>
              {analysis.targetCompanyData.description}
            </Text>
          )}
        </View>

        {/* Similar Companies */}
        <Text style={cleanPdfStyles.sectionTitle}>Top Similar Companies</Text>
        <View style={cleanPdfStyles.companySection}>
          {topMatches.map((match, index) => (
            <View key={match.id} style={cleanPdfStyles.companyCard}>
              <View style={cleanPdfStyles.companyHeader}>
                <View style={cleanPdfStyles.companyInfo}>
                  <Text style={cleanPdfStyles.companyName}>
                    #{match.rank} {match.company_name}
                  </Text>
                  <View style={cleanPdfStyles.companyMeta}>
                    <Text style={cleanPdfStyles.metaItem}>
                      📍 {match.company_data?.country || 'N/A'}
                    </Text>
                    <Text style={cleanPdfStyles.metaItem}>
                      🏢 {match.company_data?.industry || 'N/A'}
                    </Text>
                    <Text style={cleanPdfStyles.metaItem}>
                      📊 {match.market_position}
                    </Text>
                    <Text style={cleanPdfStyles.metaItem}>
                      🎯 {(match.confidence * 100).toFixed(0)}% confidence
                    </Text>
                  </View>
                  {match.company_data?.description && (
                    <Text style={cleanPdfStyles.description}>
                      {match.company_data.description}
                    </Text>
                  )}
                </View>
                <View style={cleanPdfStyles.scoreSection}>
                  <Text style={[cleanPdfStyles.overallScore, { color: getScoreColor(match.overall_score) }]}>
                    {match.overall_score.toFixed(1)}
                  </Text>
                  <Text style={cleanPdfStyles.scoreLabel}>Overall Score</Text>
                </View>
              </View>

              {/* Score Breakdown */}
              <View style={cleanPdfStyles.scoresGrid}>
                <View style={cleanPdfStyles.scoreItem}>
                  <Text style={[cleanPdfStyles.scoreValue, { color: getScoreColor(match.financial_score) }]}>
                    {match.financial_score.toFixed(1)}
                  </Text>
                  <Text style={cleanPdfStyles.scoreCategory}>Financial</Text>
                </View>
                <View style={cleanPdfStyles.scoreItem}>
                  <Text style={[cleanPdfStyles.scoreValue, { color: getScoreColor(match.strategic_score) }]}>
                    {match.strategic_score.toFixed(1)}
                  </Text>
                  <Text style={cleanPdfStyles.scoreCategory}>Strategic</Text>
                </View>
                <View style={cleanPdfStyles.scoreItem}>
                  <Text style={[cleanPdfStyles.scoreValue, { color: getScoreColor(match.operational_score) }]}>
                    {match.operational_score.toFixed(1)}
                  </Text>
                  <Text style={cleanPdfStyles.scoreCategory}>Operational</Text>
                </View>
                <View style={cleanPdfStyles.scoreItem}>
                  <Text style={[cleanPdfStyles.scoreValue, { color: getScoreColor(match.market_score) }]}>
                    {match.market_score.toFixed(1)}
                  </Text>
                  <Text style={cleanPdfStyles.scoreCategory}>Market</Text>
                </View>
                <View style={cleanPdfStyles.scoreItem}>
                  <Text style={[cleanPdfStyles.scoreValue, { color: getScoreColor(match.risk_score) }]}>
                    {match.risk_score.toFixed(1)}
                  </Text>
                  <Text style={cleanPdfStyles.scoreCategory}>Risk</Text>
                </View>
              </View>

              {/* AI Summary if available */}
              {match.similarity_explanations?.[0]?.summary && (
                <View style={{ marginTop: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 6 }}>
                  <Text style={[cleanPdfStyles.label, { color: '#3B82F6' }]}>AI Analysis:</Text>
                  <Text style={[cleanPdfStyles.listText, { fontSize: 10 }]}>
                    {match.similarity_explanations[0].summary}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={cleanPdfStyles.footer}>
          <View>
            <Text style={cleanPdfStyles.footerText}>
              Analysis Configuration: Financial {analysis.configuration.weights.financial}%, 
              Strategic {analysis.configuration.weights.strategic}%, 
              Operational {analysis.configuration.weights.operational}%
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[cleanPdfStyles.footerText, { fontSize: 10, color: '#3B82F6' }]}>
              oppSpot Similarity Analysis
            </Text>
            <Text style={cleanPdfStyles.footerText}>Page 2 of 2</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[cleanPdfStyles.footerText, { color: '#3B82F6' }]}>
              oppspot.com
            </Text>
            <Text style={cleanPdfStyles.footerText}>
              AI-Powered M&A Intelligence
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}