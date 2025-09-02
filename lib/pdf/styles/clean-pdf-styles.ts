import { StyleSheet } from '@react-pdf/renderer'

export const cleanPdfStyles = StyleSheet.create({
  // Page layout
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 50,
    lineHeight: 1.6,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  
  headerInfo: {
    alignItems: 'flex-end',
  },
  
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  
  headerMeta: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'right',
    marginBottom: 4,
  },
  
  // Section headers
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 30,
    marginBottom: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  
  subsectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 20,
    marginBottom: 12,
  },
  
  // Text styles
  paragraph: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 1.6,
    marginBottom: 12,
    textAlign: 'justify',
  },
  
  label: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  
  // Metrics section
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  
  metricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 6,
  },
  
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  
  // Company cards
  companySection: {
    marginBottom: 25,
  },
  
  companyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  
  companyInfo: {
    flex: 1,
  },
  
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  
  companyMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  
  metaItem: {
    fontSize: 10,
    color: '#6B7280',
    marginRight: 20,
  },
  
  scoreSection: {
    alignItems: 'flex-end',
  },
  
  overallScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  
  scoreLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  
  // Score breakdown
  scoresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  scoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  
  scoreCategory: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  
  // Description
  description: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 1.5,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  
  // Lists
  list: {
    marginTop: 12,
  },
  
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  
  bullet: {
    fontSize: 11,
    color: '#3B82F6',
    marginRight: 8,
    fontWeight: 'bold',
  },
  
  listText: {
    fontSize: 11,
    color: '#4B5563',
    flex: 1,
    lineHeight: 1.5,
  },
  
  // Summary boxes
  summaryBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    padding: 20,
    marginBottom: 25,
  },
  
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 12,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  
  footerText: {
    fontSize: 9,
    color: '#6B7280',
  },
  
  // Page break helpers
  pageBreak: {
    breakBefore: 'page',
  },
  
  // Spacing utilities
  spacingSmall: {
    marginBottom: 8,
  },
  
  spacingMedium: {
    marginBottom: 16,
  },
  
  spacingLarge: {
    marginBottom: 24,
  },
  
  // Color utilities
  textPrimary: {
    color: '#1F2937',
  },
  
  textSecondary: {
    color: '#6B7280',
  },
  
  textMuted: {
    color: '#9CA3AF',
  },
  
  textSuccess: {
    color: '#059669',
  },
  
  textWarning: {
    color: '#D97706',
  },
  
  textError: {
    color: '#DC2626',
  },
})