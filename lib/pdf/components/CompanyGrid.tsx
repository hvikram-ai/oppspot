import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { pdfStyles, getScoreColor, getConfidenceColor } from '../styles/pdf-styles'

interface SimilarityMatch {
  id: string
  company_name: string
  company_data: any
  overall_score: number
  confidence: number
  rank: number
  financial_score: number
  strategic_score: number
  operational_score: number
  market_score: number
  risk_score: number
  market_position: string
  similarity_explanations?: Array<{
    summary: string
    key_reasons: string[]
    risk_considerations: string[]
  }>
  opportunity_areas: string[]
  risk_factors_identified: string[]
}

interface CompanyGridProps {
  matches: SimilarityMatch[]
  maxCompanies?: number
}

export const CompanyGrid: React.FC<CompanyGridProps> = ({ 
  matches, 
  maxCompanies = 10 
}) => {
  const topMatches = matches.slice(0, maxCompanies)

  const getScoreStyle = (score: number) => ({
    ...pdfStyles.companyScore,
    color: getScoreColor(score)
  })

  const getConfidenceStyle = (confidence: number) => ({
    ...pdfStyles.confidenceBadge,
    color: getConfidenceColor(confidence)
  })

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>
        Top Similar Companies ({topMatches.length})
      </Text>
      
      {topMatches.map((match, index) => (
        <View key={match.id} style={pdfStyles.companyCard} break={index > 0 && index % 3 === 0}>
          {/* Company Header */}
          <View style={pdfStyles.companyHeader}>
            <View style={{ flex: 1 }}>
              <Text style={pdfStyles.companyName}>{match.company_name}</Text>
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                <Text style={pdfStyles.badge}>#{match.rank}</Text>
                <Text style={getConfidenceStyle(match.confidence)}>
                  {(match.confidence * 100).toFixed(0)}% Confidence
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={getScoreStyle(match.overall_score)}>
                {match.overall_score.toFixed(1)}
              </Text>
              <Text style={pdfStyles.metricLabel}>Overall Score</Text>
            </View>
          </View>

          {/* Company Description */}
          {match.company_data?.description && (
            <Text style={pdfStyles.companyDescription}>
              {match.company_data.description}
            </Text>
          )}

          {/* Company Details */}
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <Text style={pdfStyles.footerText}>
              📍 {match.company_data?.country || 'N/A'}
            </Text>
            <Text style={pdfStyles.footerText}>
              🏢 {match.company_data?.industry || 'N/A'}
            </Text>
            <Text style={pdfStyles.footerText}>
              📊 {match.market_position}
            </Text>
          </View>

          {/* Score Breakdown */}
          <View style={pdfStyles.scoresContainer}>
            <View style={pdfStyles.scoreItem}>
              <Text style={pdfStyles.scoreLabel}>Financial</Text>
              <Text style={[pdfStyles.scoreValue, { color: getScoreColor(match.financial_score) }]}>
                {match.financial_score.toFixed(1)}
              </Text>
            </View>
            <View style={pdfStyles.scoreItem}>
              <Text style={pdfStyles.scoreLabel}>Strategic</Text>
              <Text style={[pdfStyles.scoreValue, { color: getScoreColor(match.strategic_score) }]}>
                {match.strategic_score.toFixed(1)}
              </Text>
            </View>
            <View style={pdfStyles.scoreItem}>
              <Text style={pdfStyles.scoreLabel}>Operational</Text>
              <Text style={[pdfStyles.scoreValue, { color: getScoreColor(match.operational_score) }]}>
                {match.operational_score.toFixed(1)}
              </Text>
            </View>
            <View style={pdfStyles.scoreItem}>
              <Text style={pdfStyles.scoreLabel}>Market</Text>
              <Text style={[pdfStyles.scoreValue, { color: getScoreColor(match.market_score) }]}>
                {match.market_score.toFixed(1)}
              </Text>
            </View>
            <View style={pdfStyles.scoreItem}>
              <Text style={pdfStyles.scoreLabel}>Risk</Text>
              <Text style={[pdfStyles.scoreValue, { color: getScoreColor(match.risk_score) }]}>
                {match.risk_score.toFixed(1)}
              </Text>
            </View>
          </View>

          {/* AI Explanation */}
          {match.similarity_explanations?.[0] && (
            <View style={{ 
              backgroundColor: '#EFF6FF', 
              padding: 10, 
              borderRadius: 6,
              marginTop: 8 
            }}>
              <Text style={[pdfStyles.subsectionTitle, { marginTop: 0, marginBottom: 4, color: '#1E40AF' }]}>
                🤖 AI Analysis
              </Text>
              <Text style={[pdfStyles.listText, { color: '#1E3A8A', marginBottom: 6 }]}>
                {match.similarity_explanations[0].summary}
              </Text>
              
              {match.similarity_explanations[0].key_reasons.length > 0 && (
                <View>
                  <Text style={[pdfStyles.scoreLabel, { color: '#1E40AF', marginBottom: 3 }]}>
                    Key Reasons:
                  </Text>
                  {match.similarity_explanations[0].key_reasons.slice(0, 3).map((reason, idx) => (
                    <View key={idx} style={pdfStyles.listItem}>
                      <View style={[pdfStyles.listBullet, { backgroundColor: '#3B82F6' }]} />
                      <Text style={[pdfStyles.listText, { color: '#1E3A8A' }]}>
                        {reason}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Opportunities and Risks Summary */}
          {(match.opportunity_areas.length > 0 || match.risk_factors_identified.length > 0) && (
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              {match.opportunity_areas.length > 0 && (
                <View style={{ flex: 1 }}>
                  <Text style={[pdfStyles.scoreLabel, { color: '#059669', marginBottom: 3 }]}>
                    Opportunities ({match.opportunity_areas.length}):
                  </Text>
                  {match.opportunity_areas.slice(0, 2).map((opp, idx) => (
                    <Text key={idx} style={[pdfStyles.listText, { color: '#065F46', fontSize: 8 }]}>
                      • {opp}
                    </Text>
                  ))}
                </View>
              )}
              
              {match.risk_factors_identified.length > 0 && (
                <View style={{ flex: 1 }}>
                  <Text style={[pdfStyles.scoreLabel, { color: '#DC2626', marginBottom: 3 }]}>
                    Risks ({match.risk_factors_identified.length}):
                  </Text>
                  {match.risk_factors_identified.slice(0, 2).map((risk, idx) => (
                    <Text key={idx} style={[pdfStyles.listText, { color: '#7F1D1D', fontSize: 8 }]}>
                      • {risk}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      ))}

      {matches.length > maxCompanies && (
        <View style={[pdfStyles.metricCard, { marginTop: 10 }]}>
          <Text style={pdfStyles.paragraph}>
            📄 Complete analysis includes {matches.length} companies. 
            Top {maxCompanies} companies shown above based on overall similarity score.
          </Text>
        </View>
      )}
    </View>
  )
}