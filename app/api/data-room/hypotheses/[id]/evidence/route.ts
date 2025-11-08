/**
 * Hypothesis Evidence API Routes
 * GET - List evidence for hypothesis
 * POST - Manually link evidence to hypothesis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { HypothesisRepository } from '@/lib/data-room/repository/hypothesis-repository';

// Validation schema
const LinkEvidenceSchema = z.object({
  document_id: z.string().uuid(),
  evidence_type: z.enum(['supporting', 'contradicting', 'neutral']),
  excerpt_text: z.string().max(2000).optional(),
  page_number: z.number().int().positive().optional(),
  manual_note: z.string().max(1000).optional(),
});

/**
 * GET /api/data-room/hypotheses/[id]/evidence
 * List all evidence for a hypothesis
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

    // Get evidence
    const evidence = await hypothesisRepo.getEvidence(id);

    return NextResponse.json({ success: true, data: evidence });
  } catch (error) {
    console.error('Get evidence error:', error);
    return NextResponse.json({ error: 'Failed to get evidence' }, { status: 500 });
  }
}

/**
 * POST /api/data-room/hypotheses/[id]/evidence
 * Manually link evidence to hypothesis
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
    const validated = LinkEvidenceSchema.parse(body);

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

    // Link evidence
    const evidence = await hypothesisRepo.linkEvidence(
      {
        hypothesis_id: id,
        ...validated,
      },
      user.id
    );

    // Recalculate confidence score
    await hypothesisRepo.updateConfidenceScore(id);

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: hypothesis.data_room_id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || 'Unknown',
      actor_email: user.email || '',
      action: 'link_evidence',
      details: {
        hypothesis_id: id,
        document_id: validated.document_id,
        evidence_type: validated.evidence_type,
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, data: evidence }, { status: 201 });
  } catch (error) {
    console.error('Link evidence error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to link evidence' }, { status: 500 });
  }
}
