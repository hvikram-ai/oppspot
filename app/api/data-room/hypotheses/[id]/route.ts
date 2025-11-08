/**
 * Hypothesis Detail API Routes
 * GET - Get hypothesis with details
 * PATCH - Update hypothesis
 * DELETE - Delete hypothesis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { HypothesisRepository } from '@/lib/data-room/repository/hypothesis-repository';

// Validation schema for updates
const UpdateHypothesisSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  hypothesis_type: z
    .enum([
      'revenue_growth',
      'cost_synergy',
      'market_expansion',
      'tech_advantage',
      'team_quality',
      'competitive_position',
      'operational_efficiency',
      'customer_acquisition',
      'custom',
    ])
    .optional(),
  status: z.enum(['draft', 'active', 'validated', 'invalidated', 'needs_revision']).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * GET /api/data-room/hypotheses/[id]
 * Get hypothesis with all details (evidence, metrics, validations)
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

    // Verify user has access to the data room
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

    // Get full details
    const hypothesisWithDetails = await hypothesisRepo.getHypothesisWithDetails(id);

    return NextResponse.json({ success: true, data: hypothesisWithDetails });
  } catch (error) {
    console.error('Get hypothesis error:', error);
    return NextResponse.json({ error: 'Failed to get hypothesis' }, { status: 500 });
  }
}

/**
 * PATCH /api/data-room/hypotheses/[id]
 * Update hypothesis
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const validated = UpdateHypothesisSchema.parse(body);

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

    // Update hypothesis
    const updatedHypothesis = await hypothesisRepo.updateHypothesis(id, validated);

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: hypothesis.data_room_id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || 'Unknown',
      actor_email: user.email || '',
      action: 'update_hypothesis',
      details: { hypothesis_id: id, updates: validated },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, data: updatedHypothesis });
  } catch (error) {
    console.error('Update hypothesis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update hypothesis' }, { status: 500 });
  }
}

/**
 * DELETE /api/data-room/hypotheses/[id]
 * Soft delete hypothesis
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Verify user is creator or data room owner
    const { data: dataRoom } = await supabase
      .from('data_rooms')
      .select('id, user_id')
      .eq('id', hypothesis.data_room_id)
      .single();

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 });
    }

    const isOwner = dataRoom.user_id === user.id;
    const isCreator = hypothesis.created_by === user.id;

    if (!isOwner && !isCreator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete hypothesis
    await hypothesisRepo.deleteHypothesis(id);

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: hypothesis.data_room_id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || 'Unknown',
      actor_email: user.email || '',
      action: 'delete_hypothesis',
      details: { hypothesis_id: id, title: hypothesis.title },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, message: 'Hypothesis deleted' });
  } catch (error) {
    console.error('Delete hypothesis error:', error);
    return NextResponse.json({ error: 'Failed to delete hypothesis' }, { status: 500 });
  }
}
