import puppeteer from 'puppeteer'
import { createClient } from '@/lib/supabase/server'

export interface HTMLToPDFOptions {
  analysisId: string
  userId: string
  pageUrl?: string
  format?: 'A4' | 'Letter'
  orientation?: 'portrait' | 'landscape'
  margins?: {
    top: string
    right: string
    bottom: string
    left: string
  }
  includeBackground?: boolean
  scale?: number
}

export class HTMLToPDFGenerator {
  private supabase: any

  constructor() {
    this.supabase = null
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  async generatePDFFromHTML(options: HTMLToPDFOptions): Promise<{
    buffer: Buffer
    filename: string
    exportRecord: any
  }> {
    const {
      analysisId,
      userId,
      pageUrl,
      format = 'A4',
      orientation = 'portrait',
      margins = {
        top: '1in',
        right: '0.5in',
        bottom: '1in',
        left: '0.5in'
      },
      includeBackground = true,
      scale = 0.8
    } = options

    let browser = null

    try {
      // 1. Create export record
      const exportRecord = await this.createExportRecord({
        analysisId,
        userId,
        exportType: 'html_page',
        exportFormat: 'pdf'
      })

      // 2. Launch browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        timeout: 15000
      })

      const page = await browser.newPage()

      // 3. Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 1
      })

      // 4. Navigate to the page
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
      const targetUrl = pageUrl || `${baseUrl}/similar-companies/${analysisId}`
      
      // Add authentication if needed
      if (!analysisId.startsWith('demo-') && analysisId !== 'demo') {
        // For authenticated pages, we might need to set cookies or headers
        // This is a simplified approach - in production you'd handle auth properly
        await page.goto(targetUrl, {
          waitUntil: ['domcontentloaded', 'networkidle2'],
          timeout: 15000
        })
      } else {
        // For demo pages
        await page.goto(targetUrl, {
          waitUntil: ['domcontentloaded', 'networkidle2'],
          timeout: 15000
        })
      }

      // 5. Wait for the page content to load completely
      await page.waitForSelector('[data-testid="analysis-results"], .analysis-container, main', {
        timeout: 5000
      }).catch(() => {
        console.log('Main content selector not found, proceeding with page as-is')
      })

      // 5.1. Additional wait to ensure dynamic content is loaded
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 6. Add print-specific styles
      await page.addStyleTag({
        content: `
          @media print {
            .no-print, 
            nav, 
            .sidebar,
            .header-actions,
            .export-button,
            button:not(.score-button),
            .toast-container {
              display: none !important;
            }
            
            body {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            .analysis-container,
            .company-grid,
            .metrics-section {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .company-card {
              page-break-inside: avoid;
              break-inside: avoid;
              margin-bottom: 20px;
            }
            
            h1, h2, h3 {
              page-break-after: avoid;
            }
            
            /* Ensure backgrounds are printed */
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
        `
      })

      // 7. Generate PDF
      const pdfBuffer = await page.pdf({
        format: format,
        landscape: orientation === 'landscape',
        printBackground: includeBackground,
        margin: margins,
        scale: scale,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; color: #666; width: 100%; text-align: center; padding: 10px;">
            <span style="margin-right: 50px;">oppSpot Similarity Analysis</span>
            <span>Generated: ${new Date().toLocaleDateString('en-GB')}</span>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; color: #666; width: 100%; display: flex; justify-content: space-between; padding: 10px 20px;">
            <span>oppspot.com</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
            <span>Confidential & Proprietary</span>
          </div>
        `,
        preferCSSPageSize: false,
      })

      // 8. Generate filename
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `similarity-analysis-page-${analysisId.slice(0, 8)}-${timestamp}.pdf`

      // 9. Update export record
      await this.updateExportRecord(exportRecord.id, 'completed', filename)

      return {
        buffer: Buffer.from(pdfBuffer),
        filename,
        exportRecord
      }

    } catch (error) {
      console.error('HTML-to-PDF generation error:', error)
      throw new Error(`Failed to generate PDF from HTML: ${error.message}`)
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  private async createExportRecord(params: {
    analysisId: string
    userId: string
    exportType: string
    exportFormat: string
  }) {
    // Skip database operations for demo mode
    if (params.analysisId.startsWith('demo-') || params.analysisId === 'demo') {
      return {
        id: 'demo-html-export-' + Date.now(),
        similarity_analysis_id: params.analysisId,
        user_id: params.userId,
        export_type: params.exportType,
        export_format: params.exportFormat,
        generation_status: 'generating'
      }
    }

    const supabase = await this.getSupabase()
    const { data: exportRecord, error } = await supabase
      .from('similarity_analysis_exports')
      .insert({
        similarity_analysis_id: params.analysisId,
        user_id: params.userId,
        export_type: params.exportType,
        export_format: params.exportFormat,
        export_title: `HTML Page Export - Analysis ${params.analysisId}`,
        export_description: 'Complete HTML page exported as PDF for sharing and printing',
        generation_status: 'generating',
        template_version: 'html-v1.0'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create export record: ${error.message}`)
    }

    return exportRecord
  }

  private async updateExportRecord(exportId: string, status: string, filename?: string) {
    // Skip database operations for demo mode
    if (exportId.toString().startsWith('demo-')) {
      return
    }

    const supabase = await this.getSupabase()
    const updateData: Record<string, unknown> = {
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
    }
  }
}

// Export utility function
export async function generateHTMLPageAsPDF(
  analysisId: string,
  userId: string,
  options: Partial<HTMLToPDFOptions> = {}
): Promise<{
  buffer: Buffer
  filename: string
  contentType: string
}> {
  const generator = new HTMLToPDFGenerator()
  
  const result = await generator.generatePDFFromHTML({
    analysisId,
    userId,
    ...options
  })

  return {
    buffer: result.buffer,
    filename: result.filename,
    contentType: 'application/pdf'
  }
}