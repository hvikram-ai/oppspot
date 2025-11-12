/**
 * Tech Stack Findings API Route
 * GET - List findings for an analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  TechStackRepository,
  TechStackFindingFilter,
} from '@/lib/data-room/repository/tech-stack-repository';

// Validation schema
const ListFindingsSchema = z.object({
  finding_type: z
    .enum(['red_flag', 'risk', 'opportunity', 'strength', 'recommendation'])
    .optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional(),
  is_resolved: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

/**
 * GET /api/tech-stack/analyses/[id]/findings?finding_type=red_flag&severity=critical
 * List findings for an analysis
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repository = new TechStackRepository(supabase);

    // Get analysis to verify access
    const analysis = await repository.getAnalysis(params.id);

    // Verify user has access to data room
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
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams);

    // Validate query parameters
    const validated = ListFindingsSchema.parse(queryParams);

    // List findings
    const filter: TechStackFindingFilter = {
      analysis_id: params.id,
      ...validated,
    };

    const result = await repository.listFindings(filter);

    return NextResponse.json({
      success: true,
      data: result.findings,
      total: result.total,
      limit: validated.limit || 50,
      offset: validated.offset || 0,
    });
  } catch (error) {
    console.error('[Tech Stack API] List findings error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if ((error as Error).message.includes('not found')) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
