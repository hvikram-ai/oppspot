// Runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { itpService } from '@/lib/itp';
import type { CreateITPRequest, ListITPsResponse } from '@/types/itp';

// Validation schema for creating ITP
const createITPSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  criteria: z.object({}).passthrough(), // AdvancedFilters structure
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
  auto_tag: z.string().max(50).optional(),
  auto_add_to_list_id: z.string().uuid().optional(),
});

/**
 * GET /api/itp
 * List user's ITPs
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[ITP API] GET - Listing ITPs');
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const is_active = searchParams.get('is_active');
    const is_favorite = searchParams.get('is_favorite') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get ITPs
    const result = await itpService.getITPs(user.id, {
      is_active: is_active !== null ? is_active === 'true' : undefined,
      is_favorite: is_favorite || undefined,
      limit,
      offset,
    });

    const response: ListITPsResponse = {
      itps: result.itps,
      total: result.total,
    };

    console.log(`[ITP API] Found ${result.total} ITPs for user ${user.id}`);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[ITP API] GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch ITPs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/itp
 * Create a new ITP
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[ITP API] POST - Creating new ITP');
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

    // Parse and validate body
    const body = await request.json();
    console.log('[ITP API] Request body:', {
      hasName: !!body.name,
      hasCriteria: !!body.criteria,
      criteriaKeys: body.criteria ? Object.keys(body.criteria) : [],
    });

    const validation = createITPSchema.safeParse(body);

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

    const data: CreateITPRequest = validation.data;

    // Check criteria is not empty
    if (Object.keys(data.criteria).length === 0) {
      return NextResponse.json(
        { error: 'Criteria cannot be empty. Please define at least one filter.' },
        { status: 400 }
      );
    }

    // Create ITP
    const itp = await itpService.createITP(user.id, data);

    console.log(`[ITP API] Created ITP ${itp.id} for user ${user.id}`);

    return NextResponse.json({ itp }, { status: 201 });
  } catch (error) {
    console.error('[ITP API] POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create ITP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
