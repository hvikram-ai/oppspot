import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CompaniesHouseBulkImporter, DEFAULT_FILTERS } from '@/lib/companies-house/bulk-importer'

let currentImport: CompaniesHouseBulkImporter | null = null

/**
 * POST /api/admin/companies-house/import
 * Start Companies House import
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if import is already running
    if (currentImport && currentImport.getProgress().status === 'processing') {
      return NextResponse.json(
        { error: 'Import already in progress' },
        { status: 409 }
      )
    }

    const body = await request.json()
    const { dataUrl, testMode } = body

    // Create new importer
    currentImport = new CompaniesHouseBulkImporter(DEFAULT_FILTERS)

    // Start import in background
    const importPromise = currentImport.importFromURL(dataUrl)

    // Don't await - let it run in background
    importPromise.catch((error) => {
      console.error('[CH Import API] Import failed:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Import started',
      progress: currentImport.getProgress()
    })

  } catch (error: unknown) {
    console.error('[CH Import API] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to start import', message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/companies-house/import
 * Get current import progress
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!currentImport) {
      return NextResponse.json({
        progress: {
          status: 'idle',
          totalRows: 0,
          processedRows: 0,
          importedRows: 0,
          skippedRows: 0,
          errorRows: 0,
          currentBatch: 0
        }
      })
    }

    return NextResponse.json({
      progress: currentImport.getProgress()
    })

  } catch (error: unknown) {
    console.error('[CH Import API] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to get progress', message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/companies-house/import
 * Cancel ongoing import
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentImport) {
      currentImport.cancel()
    }

    return NextResponse.json({
      success: true,
      message: 'Import cancelled'
    })

  } catch (error: unknown) {
    console.error('[CH Import API] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to cancel import', message },
      { status: 500 }
    )
  }
}
