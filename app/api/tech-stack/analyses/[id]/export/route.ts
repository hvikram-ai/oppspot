import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TechStackRepository } from '@/lib/data-room/repository/tech-stack-repository';
import { generateTechStackPDF } from '@/lib/data-room/tech-stack/pdf-exporter';
import { generateTechStackExcel } from '@/lib/data-room/tech-stack/excel-exporter';

/**
 * Export tech stack analysis as PDF or Excel
 * GET /api/tech-stack/analyses/:id/export?format=pdf|xlsx
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const analysisId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'pdf';
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get analysis with details
    const repository = new TechStackRepository(supabase);
    const analysis = await repository.getAnalysisWithDetails(analysisId);

    // Verify access (must be data room member)
    const { data: dataRoom } = await supabase
      .from('data_rooms')
      .select('id, user_id')
      .eq('id', analysis.data_room_id)
      .single();

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 });
    }

    const isOwner = dataRoom.user_id === user.id;

    if (!isOwner) {
      const { data: access } = await supabase
        .from('data_room_access')
        .select('permission_level')
        .eq('data_room_id', analysis.data_room_id)
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .single();

      if (!access) {
        return NextResponse.json(
          { error: 'You do not have access to this data room' },
          { status: 403 }
        );
      }
    }

    // Get findings
    const findings = await repository.getFindings(analysisId);

    // Validate format
    if (format !== 'pdf' && format !== 'xlsx') {
      return NextResponse.json(
        { error: 'Invalid format. Must be "pdf" or "xlsx"' },
        { status: 400 }
      );
    }

    // Generate export based on format
    let buffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    if (format === 'pdf') {
      const pdfBlob = await generateTechStackPDF(analysis, findings);
      buffer = Buffer.from(await pdfBlob.arrayBuffer());
      contentType = 'application/pdf';
      fileExtension = 'pdf';
    } else {
      // xlsx
      buffer = await generateTechStackExcel(analysis, findings);
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileExtension = 'xlsx';
    }

    // Set filename
    const filename = `${analysis.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.${fileExtension}`;

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: analysis.data_room_id,
      actor_id: user.id,
      action: 'export_tech_analysis',
      details: {
        analysis_id: analysisId,
        format,
      },
    });

    // Return file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error exporting tech stack analysis:', error);
    return NextResponse.json(
      {
        error: 'Failed to export analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
