import React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { pdfStyles } from '../styles/pdf-styles'
import { Header } from '../components/Header'
import { ExecutiveSummary } from '../components/ExecutiveSummary'
import { CompanyGrid } from '../components/CompanyGrid'
import { Visualizations } from '../components/Visualizations'
import { Footer } from '../components/Footer'

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
  financial_confidence: number
  strategic_confidence: number
  operational_confidence: number
  market_confidence: number
  risk_confidence: number
  market_position: string
  risk_factors_identified: string[]
  opportunity_areas: string[]
  data_points_used: number
  similarity_explanations?: Array<{
    summary: string
    key_reasons: string[]
    financial_rationale: string
    strategic_rationale: string
    risk_considerations: string[]
    confidence_level: string
    data_quality_note: string
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
      completionTime: string
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
    exportType: string
    exportFormat: string
    generatedAt: string
    generatedBy: string
    templateVersion: string
    includeDetails: boolean
  }
  scoreDistribution: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
  confidenceDistribution: {
    high: number
    medium: number
    low: number
  }
}

interface SimilarityAnalysisTemplateProps {
  data: AnalysisData
}

export const SimilarityAnalysisTemplate: React.FC<SimilarityAnalysisTemplateProps> = ({ data }) => {
  const {
    analysis,
    matches,
    metadata,
    scoreDistribution,
    confidenceDistribution
  } = data

  const qualityMatches = scoreDistribution.excellent + scoreDistribution.good
  const totalMatches = matches.length

  // Split companies into chunks for pagination
  const companiesPerPage = 4
  const companyPages: SimilarityMatch[][] = []
  
  for (let i = 0; i < matches.length; i += companiesPerPage) {
    companyPages.push(matches.slice(i, i + companiesPerPage))
  }

  return (
    <Document
      title={`Similarity Analysis - ${analysis.targetCompany}`}
      author={metadata.generatedBy}
      subject="M&A Similarity Analysis Report"
      creator="oppSpot - AI-Powered Business Intelligence"
      producer="oppSpot"
      keywords="M&A, similarity analysis, business intelligence, acquisition targets"
    >
      {/* Page 1: Executive Summary */}
      <Page size="A4" style={pdfStyles.page}>
        <Header
          targetCompanyName={analysis.targetCompany}
          analysisDate={analysis.summary.analysisDate}
          generatedBy={metadata.generatedBy}
        />

        <ExecutiveSummary
          summary={analysis.insights.executiveSummary}
          totalCompanies={analysis.summary.totalCompanies}
          averageScore={analysis.summary.averageScore}
          topScore={analysis.summary.topScore}
          qualityMatches={qualityMatches}
          keyOpportunities={analysis.insights.keyOpportunities}
          riskHighlights={analysis.insights.riskHighlights}
          strategicRecommendations={analysis.insights.strategicRecommendations}
        />

        <Footer
          generatedBy={metadata.generatedBy}
          generatedAt={metadata.generatedAt}
          searchParameters={{
            regions: analysis.configuration.regions,
            industries: analysis.configuration.industries,
            weights: analysis.configuration.weights
          }}
          pageNumber={1}
          totalPages={companyPages.length + 2}
        />
      </Page>

      {/* Page 2: Analysis Overview & Configuration */}
      <Page size="A4" style={pdfStyles.page}>
        <Header
          targetCompanyName={analysis.targetCompany}
          analysisDate={analysis.summary.analysisDate}
          generatedBy={metadata.generatedBy}
        />

        <Visualizations
          scoreDistribution={scoreDistribution}
          confidenceDistribution={confidenceDistribution}
          totalMatches={totalMatches}
          analysisConfiguration={analysis.configuration}
        />

        {/* Target Company Profile */}
        <Text style={pdfStyles.sectionTitle}>Target Company Profile</Text>
        <View style={pdfStyles.companyCard}>
          <Text style={pdfStyles.companyName}>{analysis.targetCompany}</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={pdfStyles.scoreLabel}>Country</Text>
              <Text style={pdfStyles.paragraph}>
                // @ts-expect-error - Supabase type inference issue
                {analysis.targetCompanyData?.country || 'N/A'}
              </Text>
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={pdfStyles.scoreLabel}>Industry</Text>
              // @ts-expect-error - Supabase type inference issue
              <Text style={pdfStyles.paragraph}>
                {analysis.targetCompanyData?.industry || 'N/A'}
              </Text>
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              // @ts-expect-error - Supabase type inference issue
              <Text style={pdfStyles.scoreLabel}>Employees</Text>
              <Text style={pdfStyles.paragraph}>
                {analysis.targetCompanyData?.employees || 'N/A'}
              </Text>
            </View>
            // @ts-expect-error - Supabase type inference issue
            <View style={{ flex: 1 }}>
              <Text style={pdfStyles.scoreLabel}>Revenue</Text>
              <Text style={pdfStyles.paragraph}>
                // @ts-expect-error - Supabase type inference issue
                {analysis.targetCompanyData?.revenue || 'N/A'}
              </Text>
            </View>
          // @ts-expect-error - Supabase type inference issue
          </View>
          {analysis.targetCompanyData?.description && (
            <View style={{ marginTop: 10 }}>
              <Text style={pdfStyles.scoreLabel}>Description</Text>
              <Text style={pdfStyles.paragraph}>
                {analysis.targetCompanyData.description}
              </Text>
            </View>
          )}
        </View>

        <Footer
          generatedBy={metadata.generatedBy}
          generatedAt={metadata.generatedAt}
          searchParameters={{
            regions: analysis.configuration.regions,
            industries: analysis.configuration.industries,
            weights: analysis.configuration.weights
          }}
          pageNumber={2}
          totalPages={companyPages.length + 2}
        />
      </Page>

      {/* Company Pages */}
      {companyPages.map((pageCompanies, pageIndex) => (
        <Page key={`companies-${pageIndex}`} size="A4" style={pdfStyles.page}>
          <Header
            targetCompanyName={analysis.targetCompany}
            analysisDate={analysis.summary.analysisDate}
            generatedBy={metadata.generatedBy}
          />

          <View style={{ marginTop: 20 }}>
            <CompanyGrid 
              matches={pageCompanies} 
              maxCompanies={companiesPerPage}
            />
          </View>

          {/* Add continuation note if there are more pages */}
          {pageIndex === companyPages.length - 1 && matches.length > (pageIndex + 1) * companiesPerPage && (
            <View style={[pdfStyles.metricCard, { marginTop: 20, backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
              <Text style={[pdfStyles.paragraph, { color: '#92400E', textAlign: 'center' }]}>
                📄 Analysis continues with additional companies in the complete dataset.
                Contact your account manager for the full detailed report.
              </Text>
            </View>
          )}

          <Footer
            generatedBy={metadata.generatedBy}
            generatedAt={metadata.generatedAt}
            searchParameters={{
              regions: analysis.configuration.regions,
              industries: analysis.configuration.industries,
              weights: analysis.configuration.weights
            }}
            pageNumber={pageIndex + 3}
            totalPages={companyPages.length + 2}
          />
        </Page>
      ))}
    </Document>
  )
}