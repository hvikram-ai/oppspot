import { NextRequest, NextResponse } from 'next/server'

// Simplified similar companies endpoint for testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetCompanyName, analysisDepth = 'detailed', maxResults = 20 } = body

    if (!targetCompanyName || typeof targetCompanyName !== 'string') {
      return NextResponse.json(
        { error: 'Target company name is required' },
        { status: 400 }
      )
    }

    // Generate a simple analysis ID
    const analysisId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Return immediately with analysis ID
    return NextResponse.json({
      analysisId,
      status: 'started',
      message: 'Similarity analysis started',
      targetCompany: targetCompanyName.trim(),
      configuration: {
        analysisDepth,
        maxResults
      },
      // Add demo flag to indicate simplified mode
      demo: true
    }, { status: 202 })

  } catch (error) {
    console.error('Simple similar companies error:', error)
    return NextResponse.json(
      { error: 'Failed to start analysis' },
      { status: 500 }
    )
  }
}