/**
 * Hypothesis Validation API Route
 * POST - Record validation for hypothesis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { HypothesisRepository } from '@/lib/data-room/repository/hypothesis-repository';

// Validation schema
const CreateValidationSchema = z.object({
  validation_status: z.enum(['pass', 'fail', 'inconclusive']),
  notes: z.string().max(2000).optional(),
  confidence_adjustment: z.number().int().min(-100).max(100).optional(),
  evidence_summary: z.string().max(2000).optional(),
  key_findings: z.array(z.string()).max(10).optional(),
});

/**
 * POST /api/data-room/hypotheses/[id]/validate
 * Record a validation for hypothesis
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
    const validated = CreateValidationSchema.parse(body);

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

    // Record validation (this also updates hypothesis status and confidence)
    const validation = await hypothesisRepo.recordValidation(
      {
        hypothesis_id: id,
        ...validated,
      },
      user.id
    );

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: hypothesis.data_room_id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || 'Unknown',
      actor_email: user.email || '',
      action: 'validate_hypothesis',
      details: {
        hypothesis_id: id,
        validation_status: validated.validation_status,
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    // Get updated hypothesis
    const updatedHypothesis = await hypothesisRepo.getHypothesis(id);

    return NextResponse.json({
      success: true,
      data: {
        validation,
        hypothesis: updatedHypothesis,
      },
    });
  } catch (error) {
    console.error('Validate hypothesis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to validate hypothesis' }, { status: 500 });
  }
}
