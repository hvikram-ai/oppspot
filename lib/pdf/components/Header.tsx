import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { pdfStyles } from '../styles/pdf-styles'

interface HeaderProps {
  targetCompanyName: string
  analysisDate: string
  generatedBy: string
}

export const Header: React.FC<HeaderProps> = ({
  targetCompanyName,
  analysisDate,
  generatedBy
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <View style={pdfStyles.header}>
      <View style={pdfStyles.logo}>
        <View style={pdfStyles.logoIcon} />
        <Text style={pdfStyles.logoText}>oppSpot</Text>
      </View>
      
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={pdfStyles.title}>Similarity Analysis Report</Text>
        <Text style={[pdfStyles.subtitle, { textAlign: 'right', marginBottom: 8 }]}>
          {targetCompanyName}
        </Text>
        <Text style={[pdfStyles.footerText, { textAlign: 'right', marginBottom: 2 }]}>
          Generated: {formatDate(analysisDate)}
        </Text>
        <Text style={[pdfStyles.footerText, { textAlign: 'right' }]}>
          By: {generatedBy}
        </Text>
      </View>
    </View>
  )
}