import { StyleSheet } from '@react-pdf/renderer'

export const pdfStyles = StyleSheet.create({
  // Page layout
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 35,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginLeft: 8,
  },
  
  logoIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  
  // Title and headings
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  
  subsectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 15,
    marginBottom: 8,
  },
  
  // Content styles
  paragraph: {
    fontSize: 10,
    color: '#4B5563',
    lineHeight: 1.5,
    marginBottom: 10,
  },
  
  // Metrics and stats
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  
  metricCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  
  metricLabel: {
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'center',
  },
  
  // Company cards
  companyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  
  companyScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'right',
  },
  
  companyDescription: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 1.4,
  },
  
  // Score breakdown
  scoresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  scoreLabel: {
    fontSize: 7,
    color: '#6B7280',
    marginBottom: 2,
  },
  
  scoreValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  
  // Badges and tags
  badge: {
    backgroundColor: '#EEF2FF',
    color: '#3730A3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 8,
    fontWeight: 'bold',
  },
  
  confidenceBadge: {
    backgroundColor: '#F0FDF4',
    color: '#15803D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 7,
  },
  
  // Lists
  listContainer: {
    marginBottom: 10,
  },
  
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  
  listBullet: {
    width: 6,
    height: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 3,
    marginRight: 8,
    marginTop: 4,
  },
  
  listText: {
    fontSize: 9,
    color: '#4B5563',
    flex: 1,
    lineHeight: 1.4,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 35,
    right: 35,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  
  footerText: {
    fontSize: 8,
    color: '#6B7280',
  },
  
  // Watermark
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: 60,
    color: '#F9FAFB',
    opacity: 0.1,
    zIndex: -1,
  },
  
  // Charts and visualizations
  chartContainer: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  chartTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  
  // Executive summary specific
  executiveSummaryBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  
  executiveSummaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 10,
  },
  
  // Opportunities and risks
  opportunityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 4,
  },
  
  opportunityBullet: {
    width: 4,
    height: 4,
    backgroundColor: '#10B981',
    borderRadius: 2,
    marginRight: 8,
    marginTop: 4,
  },
  
  riskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 4,
  },
  
  riskBullet: {
    width: 4,
    height: 4,
    backgroundColor: '#EF4444',
    borderRadius: 2,
    marginRight: 8,
    marginTop: 4,
  },
  
  // Color classes for scores
  scoreExcellent: {
    color: '#059669',
  },
  
  scoreGood: {
    color: '#2563EB',
  },
  
  scoreFair: {
    color: '#D97706',
  },
  
  scorePoor: {
    color: '#DC2626',
  },
})

// Helper function to get score color
export const getScoreColor = (score: number): string => {
  if (score >= 85) return '#059669' // green
  if (score >= 70) return '#2563EB' // blue  
  if (score >= 55) return '#D97706' // amber
  return '#DC2626' // red
}

// Helper function to get confidence color
export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return '#059669' // green
  if (confidence >= 0.6) return '#D97706' // amber
  return '#DC2626' // red
}