import { renderToBuffer } from '@react-pdf/renderer'
import { CleanSimilarityTemplate } from '../templates/CleanSimilarityTemplate'
import { createClient } from '@/lib/supabase/server'
import { writeFile } from 'fs/promises'
import path from 'path'

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

interface SimilarityAnalysis {
  id: string
  target_company_name: string
  target_company_data: any
  status: string
  total_companies_analyzed: number
  average_similarity_score: number
  top_similarity_score: number
  executive_summary: string
  key_opportunities: string[]
  risk_highlights: string[]
  strategic_recommendations: string[]
  analysis_configuration: any
  created_at: string
  completed_at: string
  similar_company_matches: SimilarityMatch[]
}

export interface PDFExportOptions {
  analysisId: string
  userId: string
  exportType?: 'executive_summary' | 'detailed_comparison' | 'presentation_slides'
  exportFormat: 'pdf'
  includeDetails?: boolean
  maxMatches?: number
  customBranding?: any
  templateVersion?: string
}

export class SimilarityPDFGenerator {
  private supabase: any

  constructor() {
    this.supabase = null // Will be initialized in methods
  }
  
  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  async generatePDF(options: PDFExportOptions): Promise<{
    buffer: Buffer
    filename: string
    exportRecord: any
  }> {
    const {
      analysisId,
      userId,
      exportType = 'executive_summary',
      includeDetails = true,
      maxMatches = 25,
      templateVersion = 'v1.0'
    } = options

    try {
      // 1. Fetch analysis data from database
      const analysisData = await this.fetchAnalysisData(analysisId, userId)
      
      // 2. Create export record in database (skip for demo mode)
      let exportRecord = null
      if (!analysisId.startsWith('demo-') && analysisId !== 'demo') {
        exportRecord = await this.createExportRecord({
          analysisId,
          userId,
          exportType,
          targetCompany: analysisData.target_company_name
        })
      } else {
        // Demo mode fake export record
        exportRecord = {
          id: 'demo-export-' + Date.now(),
          similarity_analysis_id: analysisId,
          user_id: userId,
          export_type: exportType,
          export_format: 'pdf',
          generation_status: 'generating'
        }
      }

      // 3. Transform data for PDF template
      const templateData = this.transformDataForTemplate(analysisData, {
        userId,
        exportType,
        includeDetails,
        maxMatches,
        templateVersion
      })

      // 4. Generate PDF buffer
      const pdfBuffer = await this.renderPDF(templateData)

      // 5. Generate filename
      const filename = this.generateFilename(analysisData.target_company_name, analysisId)

      // 6. Save PDF file (optional - for persistent storage) - skip for demo
      if (!analysisId.startsWith('demo-') && analysisId !== 'demo') {
        await this.savePDFFile(pdfBuffer, filename, exportRecord.id)
        
        // 7. Update export record status
        await this.updateExportRecord(exportRecord.id, 'completed', filename)
      }

      return {
        buffer: pdfBuffer,
        filename,
        exportRecord
      }

    } catch (error) {
      console.error('PDF generation error:', error)
      throw new Error(`Failed to generate PDF: ${error.message}`)
    }
  }

  private async fetchAnalysisData(analysisId: string, userId: string): Promise<SimilarityAnalysis> {
    // Handle demo mode
    if (analysisId.startsWith('demo-') || analysisId === 'demo') {
      return this.generateDemoAnalysisData(analysisId)
    }

    const supabase = await this.getSupabase()
    const { data: analysis, error } = await supabase
      .from('similarity_analyses')
      .select(`
        *,
        similar_company_matches!inner(
          *,
          similarity_explanations(*)
        )
      `)
      .eq('id', analysisId)
      .eq('user_id', userId)
      .single()

    if (error || !analysis) {
      throw new Error(`Analysis not found or access denied: ${error?.message}`)
    }

    if (analysis.status !== 'completed') {
      throw new Error('Analysis must be completed before export')
    }

    return analysis
  }

  private generateDemoAnalysisData(analysisId: string): SimilarityAnalysis {
    // Generate demo similarity analysis data for PDF testing
    const demoMatches: SimilarityMatch[] = [
      {
        id: 'demo-match-1',
        company_name: 'TechFlow Solutions',
        company_data: {
          country: 'United States',
          industry: 'Enterprise Software',
          revenue: '$25M',
          employees: '150',
          description: 'Leading provider of workflow automation and business process management solutions for enterprise clients.'
        },
        overall_score: 92.5,
        confidence: 0.88,
        rank: 1,
        financial_score: 89.2,
        strategic_score: 94.1,
        operational_score: 91.8,
        market_score: 88.5,
        risk_score: 85.3,
        financial_confidence: 0.85,
        strategic_confidence: 0.92,
        operational_confidence: 0.87,
        market_confidence: 0.81,
        risk_confidence: 0.79,
        market_position: 'Market Leader',
        risk_factors_identified: ['Market competition intensifying', 'Talent acquisition challenges'],
        opportunity_areas: ['AI integration potential', 'International expansion', 'Strategic partnerships'],
        data_points_used: 127,
        similarity_explanations: [{
          summary: 'TechFlow Solutions represents an exceptional strategic acquisition opportunity with strong alignment in enterprise software solutions and complementary market positioning.',
          key_reasons: [
            'Direct competitive overlap in enterprise workflow automation',
            'Shared customer base in mid-market and enterprise segments',
            'Similar SaaS-based recurring revenue model with 95%+ retention'
          ],
          financial_rationale: 'Strong revenue trajectory with $25M ARR and sustainable 85% gross margins',
          strategic_rationale: 'Complementary product capabilities enabling cross-selling and market expansion opportunities',
          risk_considerations: ['Integration complexity', 'Key personnel retention'],
          confidence_level: 'Very High',
          data_quality_note: 'Comprehensive competitive intelligence available for enterprise software sector'
        }]
      },
      {
        id: 'demo-match-2',
        company_name: 'CloudSync Technologies',
        company_data: {
          country: 'United Kingdom',
          industry: 'Cloud Infrastructure',
          revenue: '$18M',
          employees: '120',
          description: 'Specialized cloud infrastructure and data synchronization platform serving mid-market businesses.'
        },
        overall_score: 87.3,
        confidence: 0.82,
        rank: 2,
        financial_score: 85.1,
        strategic_score: 88.9,
        operational_score: 89.2,
        market_score: 84.7,
        risk_score: 88.1,
        financial_confidence: 0.79,
        strategic_confidence: 0.86,
        operational_confidence: 0.84,
        market_confidence: 0.78,
        risk_confidence: 0.81,
        market_position: 'Strong Player',
        risk_factors_identified: ['Cloud provider dependencies', 'Economic sensitivity'],
        opportunity_areas: ['Platform integration synergies', 'Cross-market expansion'],
        data_points_used: 98
      },
      {
        id: 'demo-match-3',
        company_name: 'DataBridge Systems',
        company_data: {
          country: 'Germany',
          industry: 'Data Analytics',
          revenue: '$12M',
          employees: '85',
          description: 'Advanced data analytics and business intelligence solutions for enterprise data management.'
        },
        overall_score: 81.7,
        confidence: 0.76,
        rank: 3,
        financial_score: 79.8,
        strategic_score: 83.2,
        operational_score: 82.1,
        market_score: 80.4,
        risk_score: 82.9,
        financial_confidence: 0.74,
        strategic_confidence: 0.79,
        operational_confidence: 0.77,
        market_confidence: 0.72,
        risk_confidence: 0.76,
        market_position: 'Growing Company',
        risk_factors_identified: ['GDPR compliance complexity', 'Limited market presence'],
        opportunity_areas: ['AI enhancement potential', 'Geographic expansion'],
        data_points_used: 89
      }
    ]

    return {
      id: analysisId,
      target_company_name: 'Demo Target Company',
      target_company_data: {
        country: 'United States',
        industry: 'Business Software',
        founded: '2015',
        employees: '200',
        revenue: '$30M',
        businessModel: 'B2B SaaS - Enterprise software subscriptions ($50K-250K annual contracts)',
        targetCustomers: 'Mid-market and enterprise businesses, IT departments',
        description: 'Demo Target Company specializes in business process automation and enterprise workflow solutions, serving mid-market and enterprise clients with comprehensive software platforms.'
      },
      status: 'completed',
      total_companies_analyzed: 156,
      average_similarity_score: 73.8,
      top_similarity_score: 92.5,
      executive_summary: 'Demo Target Company demonstrates strong strategic positioning in the enterprise software sector. The analysis identified 156 potential acquisition targets with varying degrees of strategic fit, operational synergies, and market positioning alignment. Key findings indicate significant opportunities in workflow automation, cloud infrastructure, and data analytics segments.',
      key_opportunities: [
        'Market consolidation opportunities in enterprise automation space',
        'Cross-selling potential with complementary product portfolios',
        'Geographic expansion into European markets through strategic acquisitions',
        'AI and machine learning integration capabilities enhancement'
      ],
      risk_highlights: [
        'Integration complexity with multiple technology stacks',
        'Talent retention challenges in competitive market',
        'Economic sensitivity affecting enterprise software spending',
        'Regulatory compliance requirements across different markets'
      ],
      strategic_recommendations: [
        'Focus on companies with complementary technology stacks for easier integration',
        'Prioritize targets with strong recurring revenue models and high customer retention',
        'Consider geographic expansion through European market leaders'
      ],
      analysis_configuration: {
        weights: { financial: 30, strategic: 25, operational: 20, market: 15, risk: 10 },
        regions: ['United States', 'United Kingdom', 'Germany'],
        industries: ['Enterprise Software', 'Business Automation', 'Cloud Infrastructure']
      },
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      similar_company_matches: demoMatches
    }
  }

  private async createExportRecord(params: {
    analysisId: string
    userId: string
    exportType: string
    targetCompany: string
  }) {
    const supabase = await this.getSupabase()
    const { data: exportRecord, error } = await supabase
      .from('similarity_analysis_exports')
      .insert({
        similarity_analysis_id: params.analysisId,
        user_id: params.userId,
        export_type: params.exportType,
        export_format: 'pdf',
        export_title: `Similar Companies Analysis - ${params.targetCompany}`,
        export_description: 'Professional PDF report with similarity analysis results',
        generation_status: 'generating',
        template_version: 'v1.0'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create export record: ${error.message}`)
    }

    return exportRecord
  }

  private transformDataForTemplate(analysis: SimilarityAnalysis, options: {
    userId: string
    exportType: string
    includeDetails: boolean
    maxMatches: number
    templateVersion: string
  }) {
    const matches = analysis.similar_company_matches || []
    const topMatches = matches
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, options.maxMatches)

    // Calculate distributions
    const scoreDistribution = {
      excellent: matches.filter(m => m.overall_score >= 85).length,
      good: matches.filter(m => m.overall_score >= 70 && m.overall_score < 85).length,
      fair: matches.filter(m => m.overall_score >= 55 && m.overall_score < 70).length,
      poor: matches.filter(m => m.overall_score < 55).length
    }

    const confidenceDistribution = {
      high: matches.filter(m => m.confidence >= 0.8).length,
      medium: matches.filter(m => m.confidence >= 0.6 && m.confidence < 0.8).length,
      low: matches.filter(m => m.confidence < 0.6).length
    }

    return {
      analysis: {
        id: analysis.id,
        targetCompany: analysis.target_company_name,
        targetCompanyData: analysis.target_company_data,
        configuration: analysis.analysis_configuration || {
          weights: { financial: 30, strategic: 25, operational: 20, market: 15, risk: 10 },
          regions: ['United States', 'United Kingdom', 'Germany'],
          industries: ['Technology', 'Business Services']
        },
        summary: {
          totalCompanies: analysis.total_companies_analyzed,
          averageScore: analysis.average_similarity_score,
          topScore: analysis.top_similarity_score,
          analysisDate: analysis.created_at,
          completionTime: analysis.completed_at
        },
        insights: {
          executiveSummary: analysis.executive_summary,
          keyOpportunities: analysis.key_opportunities || [],
          riskHighlights: analysis.risk_highlights || [],
          strategicRecommendations: analysis.strategic_recommendations || []
        }
      },
      matches: topMatches,
      metadata: {
        exportType: options.exportType,
        exportFormat: 'pdf',
        generatedAt: new Date().toISOString(),
        generatedBy: options.userId,
        templateVersion: options.templateVersion,
        includeDetails: options.includeDetails
      },
      scoreDistribution,
      confidenceDistribution
    }
  }

  private async renderPDF(templateData: any): Promise<Buffer> {
    try {
      // Import React for JSX
      const React = await import('react')
      
      // Create React element from template
      const pdfElement = React.createElement(CleanSimilarityTemplate, { data: templateData })
      
      // Render to buffer
      const pdfBuffer = await renderToBuffer(pdfElement)
      
      return pdfBuffer
    } catch (error) {
      console.error('PDF rendering error:', error)
      throw new Error(`Failed to render PDF: ${error.message}`)
    }
  }

  private generateFilename(targetCompanyName: string, analysisId: string): string {
    const sanitizedName = targetCompanyName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-')
    const timestamp = new Date().toISOString().split('T')[0]
    const shortId = analysisId.slice(0, 8)
    
    return `similarity-analysis-${sanitizedName}-${timestamp}-${shortId}.pdf`
  }

  private async savePDFFile(buffer: Buffer, filename: string, exportId: string): Promise<string> {
    try {
      // Create exports directory if it doesn't exist
      const exportsDir = path.join(process.cwd(), 'exports', 'pdfs')
      
      // For production, you might want to save to cloud storage (AWS S3, etc.)
      // For now, saving locally
      const filePath = path.join(exportsDir, filename)
      
      // Ensure directory exists
      const fs = await import('fs/promises')
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      
      // Write file
      await writeFile(filePath, buffer)
      
      return filePath
    } catch (error) {
      console.warn('Failed to save PDF file:', error)
      // Don't throw error - PDF generation succeeded, file save is optional
      return ''
    }
  }

  private async updateExportRecord(exportId: string, status: string, filename?: string) {
    const supabase = await this.getSupabase()
    const updateData: any = {
      generation_status: status,
      completed_at: new Date().toISOString()
    }

    if (filename) {
      updateData.file_path = filename
    }

    const { error } = await supabase
      .from('similarity_analysis_exports')
      .update(updateData)
      .eq('id', exportId)

    if (error) {
      console.error('Failed to update export record:', error)
      // Don't throw error - PDF generation succeeded
    }
  }

  // Static method for quick PDF generation without class instantiation
  static async generateQuickPDF(options: PDFExportOptions): Promise<Buffer> {
    const generator = new SimilarityPDFGenerator()
    const result = await generator.generatePDF(options)
    return result.buffer
  }
}

// Export utility function for use in API routes
export async function generateSimilarityAnalysisPDF(
  analysisId: string,
  userId: string,
  options: Partial<PDFExportOptions> = {}
): Promise<{
  buffer: Buffer
  filename: string
  contentType: string
}> {
  const generator = new SimilarityPDFGenerator()
  
  const result = await generator.generatePDF({
    analysisId,
    userId,
    exportFormat: 'pdf',
    ...options
  })

  return {
    buffer: result.buffer,
    filename: result.filename,
    contentType: 'application/pdf'
  }
}