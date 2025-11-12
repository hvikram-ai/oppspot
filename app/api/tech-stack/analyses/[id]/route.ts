/**
 * Tech Stack Analysis Detail API Routes
 * GET - Get analysis with details
 * PATCH - Update analysis
 * DELETE - Delete analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { TechStackRepository } from '@/lib/data-room/repository/tech-stack-repository';

// Validation schemas
const UpdateAnalysisSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * GET /api/tech-stack/analyses/[id]
 * Get analysis with full details
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

    // Get analysis
    const analysis = await repository.getAnalysisWithDetails(params.id);

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

    return NextResponse.json({ success: true, data: analysis });
  } catch (error) {
    console.error('[Tech Stack API] Get analysis error:', error);

    if ((error as Error).message.includes('not found')) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/tech-stack/analyses/[id]
 * Update analysis metadata
 */
export async function PATCH(
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

    // Parse and validate request
    const body = await req.json();
    const validated = UpdateAnalysisSchema.parse(body);

    const repository = new TechStackRepository(supabase);

    // Get existing analysis to check permissions
    const existing = await repository.getAnalysis(params.id);

    // Verify user has access to data room (editor or owner)
    const { data: dataRoom } = await supabase
      .from('data_rooms')
      .select('id, user_id')
      .eq('id', existing.data_room_id)
      .single();

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 });
    }

    const isOwner = dataRoom.user_id === user.id;

    if (!isOwner) {
      const { data: access } = await supabase
        .from('data_room_access')
        .select('permission_level')
        .eq('data_room_id', existing.data_room_id)
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!access || !['owner', 'editor'].includes(access.permission_level)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Update analysis
    const updated = await repository.updateAnalysis(params.id, validated);

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: existing.data_room_id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || 'Unknown',
      actor_email: user.email || '',
      action: 'update_tech_analysis',
      details: { analysis_id: updated.id, title: updated.title },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Tech Stack API] Update analysis error:', error);

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

/**
 * DELETE /api/tech-stack/analyses/[id]
 * Soft delete analysis
 */
export async function DELETE(
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

    // Get existing analysis to check permissions
    const existing = await repository.getAnalysis(params.id);

    // Verify user has access to data room (owner or editor)
    const { data: dataRoom } = await supabase
      .from('data_rooms')
      .select('id, user_id')
      .eq('id', existing.data_room_id)
      .single();

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 });
    }

    const isOwner = dataRoom.user_id === user.id;

    if (!isOwner) {
      const { data: access } = await supabase
        .from('data_room_access')
        .select('permission_level')
        .eq('data_room_id', existing.data_room_id)
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!access || !['owner', 'editor'].includes(access.permission_level)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Delete analysis
    await repository.deleteAnalysis(params.id);

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: existing.data_room_id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || 'Unknown',
      actor_email: user.email || '',
      action: 'delete_tech_analysis',
      details: { analysis_id: params.id, title: existing.title },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Tech Stack API] Delete analysis error:', error);

    if ((error as Error).message.includes('not found')) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
