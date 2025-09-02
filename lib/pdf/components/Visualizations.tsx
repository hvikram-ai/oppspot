import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { pdfStyles } from '../styles/pdf-styles'

interface VisualizationsProps {
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
  totalMatches: number
  analysisConfiguration: {
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
}

export const Visualizations: React.FC<VisualizationsProps> = ({
  scoreDistribution,
  confidenceDistribution,
  totalMatches,
  analysisConfiguration
}) => {
  const createProgressBar = (value: number, total: number, color: string) => {
    const percentage = total > 0 ? (value / total) * 100 : 0
    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6
      }}>
        <View style={{
          width: 100,
          height: 8,
          backgroundColor: '#E5E7EB',
          borderRadius: 4,
          marginRight: 8
        }}>
          <View style={{
            width: percentage,
            height: 8,
            backgroundColor: color,
            borderRadius: 4
          }} />
        </View>
        <Text style={[pdfStyles.footerText, { minWidth: 20, textAlign: 'right' }]}>
          {value}
        </Text>
        <Text style={[pdfStyles.footerText, { marginLeft: 4 }]}>
          ({percentage.toFixed(0)}%)
        </Text>
      </View>
    )
  }

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>Analysis Overview & Configuration</Text>
      
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        {/* Score Distribution */}
        <View style={[pdfStyles.chartContainer, { flex: 1 }]}>
          <Text style={pdfStyles.chartTitle}>Score Distribution</Text>
          <View style={{ width: '100%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={pdfStyles.scoreLabel}>Excellent (85+)</Text>
            </View>
            {createProgressBar(scoreDistribution.excellent, totalMatches, '#059669')}
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={pdfStyles.scoreLabel}>Good (70-84)</Text>
            </View>
            {createProgressBar(scoreDistribution.good, totalMatches, '#2563EB')}
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={pdfStyles.scoreLabel}>Fair (55-69)</Text>
            </View>
            {createProgressBar(scoreDistribution.fair, totalMatches, '#D97706')}
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={pdfStyles.scoreLabel}>Poor (&lt;55)</Text>
            </View>
            {createProgressBar(scoreDistribution.poor, totalMatches, '#DC2626')}
          </View>
        </View>

        {/* Confidence Distribution */}
        <View style={[pdfStyles.chartContainer, { flex: 1 }]}>
          <Text style={pdfStyles.chartTitle}>Confidence Distribution</Text>
          <View style={{ width: '100%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={pdfStyles.scoreLabel}>High (80%+)</Text>
            </View>
            {createProgressBar(confidenceDistribution.high, totalMatches, '#059669')}
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={pdfStyles.scoreLabel}>Medium (60-79%)</Text>
            </View>
            {createProgressBar(confidenceDistribution.medium, totalMatches, '#D97706')}
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={pdfStyles.scoreLabel}>Low (&lt;60%)</Text>
            </View>
            {createProgressBar(confidenceDistribution.low, totalMatches, '#DC2626')}
          </View>
        </View>
      </View>

      {/* Analysis Configuration */}
      <View style={pdfStyles.chartContainer}>
        <Text style={pdfStyles.chartTitle}>Analysis Configuration</Text>
        
        <View style={{ flexDirection: 'row' }}>
          {/* Scoring Weights */}
          <View style={{ flex: 1 }}>
            <Text style={pdfStyles.subsectionTitle}>Scoring Weights</Text>
            {Object.entries(analysisConfiguration.weights).map(([category, weight]) => (
              <View key={category} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4
              }}>
                <Text style={pdfStyles.scoreLabel}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 40,
                    height: 6,
                    backgroundColor: '#E5E7EB',
                    borderRadius: 3
                  }}>
                    <View style={{
                      width: (weight as number) * 0.8,
                      height: 6,
                      backgroundColor: '#3B82F6',
                      borderRadius: 3
                    }} />
                  </View>
                  <Text style={pdfStyles.scoreValue}>{weight}%</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Analysis Scope */}
          <View style={{ flex: 1 }}>
            <Text style={pdfStyles.subsectionTitle}>Analysis Scope</Text>
            
            <Text style={[pdfStyles.scoreLabel, { marginBottom: 4 }]}>Regions:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
              {analysisConfiguration.regions.map((region, idx) => (
                <Text key={idx} style={pdfStyles.badge}>{region}</Text>
              ))}
            </View>
            
            <Text style={[pdfStyles.scoreLabel, { marginBottom: 4 }]}>Industries:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {analysisConfiguration.industries.map((industry, idx) => (
                <Text key={idx} style={pdfStyles.badge}>{industry}</Text>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Analysis Insights */}
      <View style={[pdfStyles.executiveSummaryBox, { backgroundColor: '#F0F9FF', borderColor: '#0EA5E9' }]}>
        <Text style={[pdfStyles.executiveSummaryTitle, { color: '#0284C7' }]}>
          📊 Analysis Insights
        </Text>
        <View style={pdfStyles.listContainer}>
          <View style={pdfStyles.listItem}>
            <View style={[pdfStyles.listBullet, { backgroundColor: '#0EA5E9' }]} />
            <Text style={pdfStyles.listText}>
              <Text style={{ fontWeight: 'bold' }}>Quality Assessment:</Text> {' '}
              {scoreDistribution.excellent + scoreDistribution.good} high-quality matches 
              ({((scoreDistribution.excellent + scoreDistribution.good) / totalMatches * 100).toFixed(0)}% of total)
            </Text>
          </View>
          <View style={pdfStyles.listItem}>
            <View style={[pdfStyles.listBullet, { backgroundColor: '#0EA5E9' }]} />
            <Text style={pdfStyles.listText}>
              <Text style={{ fontWeight: 'bold' }}>Confidence Level:</Text> {' '}
              {confidenceDistribution.high} matches with high confidence (80%+), indicating strong data quality
            </Text>
          </View>
          <View style={pdfStyles.listItem}>
            <View style={[pdfStyles.listBullet, { backgroundColor: '#0EA5E9' }]} />
            <Text style={pdfStyles.listText}>
              <Text style={{ fontWeight: 'bold' }}>Geographic Coverage:</Text> {' '}
              Analysis spans {analysisConfiguration.regions.length} regions with focus on {analysisConfiguration.industries.length} industry sectors
            </Text>
          </View>
          <View style={pdfStyles.listItem}>
            <View style={[pdfStyles.listBullet, { backgroundColor: '#0EA5E9' }]} />
            <Text style={pdfStyles.listText}>
              <Text style={{ fontWeight: 'bold' }}>Weighting Strategy:</Text> {' '}
              Financial factors weighted at {analysisConfiguration.weights.financial}%, 
              Strategic at {analysisConfiguration.weights.strategic}% for M&A focus
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}