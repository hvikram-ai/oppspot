/**
 * Hypothesis Metrics API Routes
 * GET - List metrics for hypothesis
 * POST - Add metric to hypothesis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { HypothesisRepository } from '@/lib/data-room/repository/hypothesis-repository';

// Validation schema
const CreateMetricSchema = z.object({
  metric_name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  target_value: z.number().optional(),
  actual_value: z.number().optional(),
  unit: z.string().max(50).optional(),
  source_document_id: z.string().uuid().optional(),
});

/**
 * GET /api/data-room/hypotheses/[id]/metrics
 * List all metrics for a hypothesis
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get hypothesis
    const hypothesisRepo = new HypothesisRepository(supabase);
    const hypothesis = await hypothesisRepo.getHypothesis(id);

    // Verify user has access
    const { data: dataRoom } = await supabase
      .from('data_rooms')
      .select('id, user_id')
      .eq('id', hypothesis.data_room_id)
      .single();

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 });
    }

    const isOwner = dataRoom.user_id === user.id;

    if (!isOwner) {
      const { data: access } = await supabase
        .from('data_room_access')
        .select('permission_level')
        .eq('data_room_id', hypothesis.data_room_id)
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get metrics
    const metrics = await hypothesisRepo.getMetrics(id);

    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Get metrics error:', error);
    return NextResponse.json({ error: 'Failed to get metrics' }, { status: 500 });
  }
}

/**
 * POST /api/data-room/hypotheses/[id]/metrics
 * Add a metric to hypothesis
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await req.json();
    const validated = CreateMetricSchema.parse(body);

    // Get hypothesis
    const hypothesisRepo = new HypothesisRepository(supabase);
    const hypothesis = await hypothesisRepo.getHypothesis(id);

    // Verify user has editor or owner access
    const { data: dataRoom } = await supabase
      .from('data_rooms')
      .select('id, user_id')
      .eq('id', hypothesis.data_room_id)
      .single();

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 });
    }

    const isOwner = dataRoom.user_id === user.id;

    if (!isOwner) {
      const { data: access } = await supabase
        .from('data_room_access')
        .select('permission_level')
        .eq('data_room_id', hypothesis.data_room_id)
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!access || !['owner', 'editor'].includes(access.permission_level)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Add metric
    const metric = await hypothesisRepo.addMetric({
      hypothesis_id: id,
      ...validated,
    });

    // Recalculate confidence score
    await hypothesisRepo.updateConfidenceScore(id);

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: hypothesis.data_room_id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || 'Unknown',
      actor_email: user.email || '',
      action: 'add_metric',
      details: {
        hypothesis_id: id,
        metric_name: validated.metric_name,
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, data: metric }, { status: 201 });
  } catch (error) {
    console.error('Add metric error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to add metric' }, { status: 500 });
  }
}
