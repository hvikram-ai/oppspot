/**
 * Hypotheses API Routes
 * POST - Create hypothesis
 * GET - List hypotheses
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { HypothesisRepository, HypothesisFilter } from '@/lib/data-room/repository/hypothesis-repository';

// Validation schemas
const CreateHypothesisSchema = z.object({
  data_room_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  hypothesis_type: z.enum([
    'revenue_growth',
    'cost_synergy',
    'market_expansion',
    'tech_advantage',
    'team_quality',
    'competitive_position',
    'operational_efficiency',
    'customer_acquisition',
    'custom',
  ]),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * POST /api/data-room/hypotheses
 * Create a new hypothesis
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
    const validated = CreateHypothesisSchema.parse(body);

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

    // Create hypothesis
    const hypothesisRepo = new HypothesisRepository(supabase);
    const hypothesis = await hypothesisRepo.createHypothesis(validated, user.id);

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: validated.data_room_id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || 'Unknown',
      actor_email: user.email || '',
      action: 'create_hypothesis',
      details: { hypothesis_id: hypothesis.id, title: hypothesis.title },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, data: hypothesis }, { status: 201 });
  } catch (error) {
    console.error('Create hypothesis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create hypothesis' }, { status: 500 });
  }
}

/**
 * GET /api/data-room/hypotheses?data_room_id=xxx&status=active&type=revenue_growth
 * List hypotheses with filters
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
    const searchParams = req.nextUrl.searchParams;
    const dataRoomId = searchParams.get('data_room_id');

    if (!dataRoomId) {
      return NextResponse.json({ error: 'data_room_id is required' }, { status: 400 });
    }

    // Verify user has access to data room
    const { data: dataRoom } = await supabase
      .from('data_rooms')
      .select('id, user_id')
      .eq('id', dataRoomId)
      .single();

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 });
    }

    const isOwner = dataRoom.user_id === user.id;

    if (!isOwner) {
      const { data: access } = await supabase
        .from('data_room_access')
        .select('permission_level')
        .eq('data_room_id', dataRoomId)
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Build filters
    const filters: HypothesisFilter = {
      status: searchParams.get('status') as any,
      hypothesis_type: searchParams.get('type') as any,
      confidence_min: searchParams.get('confidence_min') ? parseInt(searchParams.get('confidence_min')!) : undefined,
      confidence_max: searchParams.get('confidence_max') ? parseInt(searchParams.get('confidence_max')!) : undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    // Get tags if provided
    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      filters.tags = tagsParam.split(',');
    }

    // List hypotheses
    const hypothesisRepo = new HypothesisRepository(supabase);
    const hypotheses = await hypothesisRepo.listHypotheses(dataRoomId, filters);

    return NextResponse.json({ success: true, data: hypotheses });
  } catch (error) {
    console.error('List hypotheses error:', error);
    return NextResponse.json({ error: 'Failed to list hypotheses' }, { status: 500 });
  }
}
