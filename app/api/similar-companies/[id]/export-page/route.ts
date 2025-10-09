/**
 * Similar Companies HTML Page Export API Route
 * Export the similarity analysis HTML page as PDF for sharing and printing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateHTMLPageAsPDF } from '@/lib/pdf/services/html-to-pdf-generator'
import { getErrorMessage } from '@/lib/utils/error-handler'

// POST: Generate HTML page as PDF export
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: analysisId } = await params

    // Check authentication (allow demo mode)
    const isDemoMode = analysisId.startsWith('demo-') || analysisId === 'demo'
    
    let user = null
    if (!isDemoMode) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    } else {
      // Demo mode user
      user = { 
        id: 'demo-user', 
        email: 'demo@oppspot.com',
        user_metadata: { full_name: 'Demo User' }
      }
    }

    const body = await request.json()
    const {
      format = 'A4',
      orientation = 'portrait',
      includeBackground = true,
      scale = 0.8,
      pageUrl = null
    } = body

    // Validate format and orientation
    const validFormats = ['A4', 'Letter']
    const validOrientations = ['portrait', 'landscape']
    
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be A4 or Letter' },
        { status: 400 }
      )
    }

    if (!validOrientations.includes(orientation)) {
      return NextResponse.json(
        { error: 'Invalid orientation. Must be portrait or landscape' },
        { status: 400 }
      )
    }

    try {
      // Generate PDF from HTML page
      const { buffer, filename, contentType } = await generateHTMLPageAsPDF(
        analysisId,
        user.id,
        {
          format: format as 'A4' | 'Letter',
          orientation: orientation as 'portrait' | 'landscape',
          includeBackground,
          scale,
          pageUrl
        }
      )

      // Return PDF directly as download
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache',
          'Content-Length': buffer.length.toString()
        }
      })

    } catch (error) {
      console.error('HTML-to-PDF generation error:', error)

      return NextResponse.json({
        error: 'PDF generation failed',
        message: 'Unable to generate PDF from HTML page. Please try again.',
        details: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Export page API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: Check export status (for future polling if needed)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params
    
    return NextResponse.json({
      message: 'HTML page export endpoint is ready',
      analysisId,
      availableFormats: ['A4', 'Letter'],
      availableOrientations: ['portrait', 'landscape'],
      usage: 'POST to this endpoint with format and orientation options'
    })

  } catch (error) {
    console.error('Export page status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}