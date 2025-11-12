/**
 * Integration Playbook Export API Route
 * GET - Export playbook as PDF or JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/lib/supabase/server';
import { PlaybookRepository } from '@/lib/data-room/repository/playbook-repository';
import { PlaybookPDFDocument } from '@/lib/data-room/integration-playbook/pdf-exporter';

/**
 * GET /api/integration-playbook/[id]/export?format=pdf|json
 * Export playbook in specified format
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const playbookId = params.id;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Get playbook with all details
    const repository = new PlaybookRepository(supabase);
    const playbook = await repository.getPlaybookWithDetails(playbookId);

    // JSON export
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: playbook,
        exported_at: new Date().toISOString(),
        exported_by: user.email,
      });
    }

    // PDF export
    if (format === 'pdf') {
      try {
        // Generate PDF buffer
        const pdfBuffer = await renderToBuffer(
          <PlaybookPDFDocument playbook={playbook} />
        );

        // Create filename
        const filename = `${playbook.playbook_name.replace(/[^a-zA-Z0-9]/g, '_')}_${playbookId.slice(0, 8)}.pdf`;

        // Return PDF as download
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length.toString(),
          },
        });
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        return NextResponse.json(
          { error: 'Failed to generate PDF', details: pdfError instanceof Error ? pdfError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid format. Supported formats: json, pdf' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error exporting playbook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export playbook' },
      { status: 500 }
    );
  }
}
