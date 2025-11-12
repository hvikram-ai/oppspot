/**
 * Tech Stack Analyses API Routes
 * POST - Create analysis
 * GET - List analyses
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  TechStackRepository,
  TechStackAnalysisFilter,
} from '@/lib/data-room/repository/tech-stack-repository';

// Validation schemas
const CreateAnalysisSchema = z.object({
  data_room_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const ListAnalysesSchema = z.object({
  data_room_id: z.string().uuid(),
  status: z.enum(['pending', 'analyzing', 'completed', 'failed']).optional(),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  modernization_score_min: z.coerce.number().min(0).max(100).optional(),
  modernization_score_max: z.coerce.number().min(0).max(100).optional(),
  ai_authenticity_score_min: z.coerce.number().min(0).max(100).optional(),
  ai_authenticity_score_max: z.coerce.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

/**
 * POST /api/tech-stack/analyses
 * Create a new tech stack analysis
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await req.json();
    const validated = CreateAnalysisSchema.parse(body);

    // Verify user has access to data room (editor or owner)
    const { data: dataRoom } = await supabase
      .from('data_rooms')
      .select('id, user_id')
      .eq('id', validated.data_room_id)
      .single();

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 });
    }

    const isOwner = dataRoom.user_id === user.id;

    if (!isOwner) {
      const { data: access } = await supabase
        .from('data_room_access')
        .select('permission_level')
        .eq('data_room_id', validated.data_room_id)
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!access || !['owner', 'editor'].includes(access.permission_level)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Create analysis
    const repository = new TechStackRepository(supabase);
    const analysis = await repository.createAnalysis(validated, user.id);

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: validated.data_room_id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || 'Unknown',
      actor_email: user.email || '',
      action: 'create_tech_analysis',
      details: { analysis_id: analysis.id, title: analysis.title },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, data: analysis }, { status: 201 });
  } catch (error) {
    console.error('[Tech Stack API] Create analysis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tech-stack/analyses?data_room_id=xxx&status=completed
 * List tech stack analyses with filters
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams);

    // Validate query parameters
    const validated = ListAnalysesSchema.parse(queryParams);

    // Verify user has access to data room
    const { data: dataRoom } = await supabase
      .from('data_rooms')
      .select('id, user_id')
      .eq('id', validated.data_room_id)
      .single();

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 });
    }

    const isOwner = dataRoom.user_id === user.id;

    if (!isOwner) {
      const { data: access } = await supabase
        .from('data_room_access')
        .select('permission_level')
        .eq('data_room_id', validated.data_room_id)
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // List analyses
    const repository = new TechStackRepository(supabase);
    const result = await repository.listAnalyses(validated as TechStackAnalysisFilter);

    return NextResponse.json({
      success: true,
      data: result.analyses,
      total: result.total,
      limit: validated.limit || 20,
      offset: validated.offset || 0,
    });
  } catch (error) {
    console.error('[Tech Stack API] List analyses error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
