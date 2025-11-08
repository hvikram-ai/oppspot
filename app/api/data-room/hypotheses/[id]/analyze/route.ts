/**
 * Hypothesis Analysis API Route
 * POST - Trigger AI analysis to extract evidence from documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { HypothesisRepository } from '@/lib/data-room/repository/hypothesis-repository';
import { EvidenceExtractor } from '@/lib/data-room/hypothesis/evidence-extractor';

// Validation schema
const AnalyzeRequestSchema = z.object({
  document_ids: z.array(z.string().uuid()).optional(), // If empty, analyze all documents
});

/**
 * POST /api/data-room/hypotheses/[id]/analyze
 * Trigger AI analysis to find evidence in documents
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
    const validated = AnalyzeRequestSchema.parse(body);

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

    // Trigger bulk analysis
    const extractor = new EvidenceExtractor(supabase);

    // Run analysis in the background (don't await for faster response)
    const analysisPromise = extractor.bulkAnalyzeDocuments(
      hypothesis,
      user.id,
      validated.document_ids
    );

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: hypothesis.data_room_id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || 'Unknown',
      actor_email: user.email || '',
      action: 'analyze_hypothesis',
      details: {
        hypothesis_id: id,
        document_count: validated.document_ids?.length || 'all',
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    // Wait for analysis to complete (with timeout)
    const timeoutMs = 60000; // 60 seconds
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Analysis timeout')), timeoutMs)
    );

    try {
      const results = await Promise.race([analysisPromise, timeoutPromise]);

      return NextResponse.json({
        success: true,
        message: 'Analysis completed',
        data: {
          hypothesis_id: id,
          evidence_found: Array.isArray(results) ? results.length : 0,
          results: results,
        },
      });
    } catch (timeoutError) {
      // Analysis is still running in background
      return NextResponse.json({
        success: true,
        message: 'Analysis started in background. Check back in a few minutes.',
        data: {
          hypothesis_id: id,
          status: 'running',
        },
      });
    }
  } catch (error) {
    console.error('Analyze hypothesis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to analyze hypothesis' }, { status: 500 });
  }
}
