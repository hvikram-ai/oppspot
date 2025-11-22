// Runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { itpService } from '@/lib/itp';
import type { UpdateITPRequest, ITPWithStats } from '@/types/itp';

// Validation schema for updating ITP
const updateITPSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  criteria: z.object({}).passthrough().optional(),
  scoring_weights: z
    .object({
      firmographics: z.number().min(0).max(1).optional(),
      size: z.number().min(0).max(1).optional(),
      growth: z.number().min(0).max(1).optional(),
      funding: z.number().min(0).max(1).optional(),
      marketPresence: z.number().min(0).max(1).optional(),
      workflow: z.number().min(0).max(1).optional(),
    })
    .optional(),
  min_match_score: z.number().min(0).max(100).optional(),
  auto_tag: z.string().max(50).optional().nullable(),
  auto_add_to_list_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
});

/**
 * GET /api/itp/[id]
 * Get single ITP with statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[ITP API] GET - Fetching ITP:', id);
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const itpId = id;

    // Get ITP
    const itp = await itpService.getITP(user.id, itpId);

    // Get statistics
    const stats = await itpService.getMatchStats(user.id, itpId);

    const response: ITPWithStats = {
      ...itp,
      stats,
    };

    return NextResponse.json({ itp: response }, { status: 200 });
  } catch (error) {
    console.error('[ITP API] GET error:', error);

    if (error instanceof Error && error.message === 'ITP not found') {
      return NextResponse.json({ error: 'ITP not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch ITP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/itp/[id]
 * Update an ITP
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[ITP API] PATCH - Updating ITP:', id);
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const itpId = id;

    // Parse and validate body
    const body = await request.json();
    const validation = updateITPSchema.safeParse(body);

    if (!validation.success) {
      console.error('[ITP API] Validation failed:', validation.error.issues);
      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const updates: UpdateITPRequest = validation.data;

    // Update ITP
    const itp = await itpService.updateITP(user.id, itpId, updates);

    console.log(`[ITP API] Updated ITP ${itpId}`);

    return NextResponse.json({ itp }, { status: 200 });
  } catch (error) {
    console.error('[ITP API] PATCH error:', error);

    if (error instanceof Error && error.message === 'ITP not found') {
      return NextResponse.json({ error: 'ITP not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: 'Failed to update ITP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/itp/[id]
 * Delete an ITP (cascade deletes matches)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[ITP API] DELETE - Deleting ITP:', id);
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const itpId = id;

    // Delete ITP
    await itpService.deleteITP(user.id, itpId);

    console.log(`[ITP API] Deleted ITP ${itpId}`);

    return NextResponse.json(
      { message: 'ITP deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[ITP API] DELETE error:', error);

    if (error instanceof Error && error.message === 'ITP not found') {
      return NextResponse.json({ error: 'ITP not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: 'Failed to delete ITP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
