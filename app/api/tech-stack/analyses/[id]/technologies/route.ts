/**
 * Tech Stack Technologies API Routes
 * GET - List technologies for an analysis
 * POST - Add technology manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  TechStackRepository,
  TechStackTechnologyFilter,
} from '@/lib/data-room/repository/tech-stack-repository';

// Validation schemas
const ListTechnologiesSchema = z.object({
  category: z
    .enum([
      'frontend',
      'backend',
      'database',
      'infrastructure',
      'devops',
      'ml_ai',
      'security',
      'testing',
      'monitoring',
      'other',
    ])
    .optional(),
  authenticity: z
    .enum(['proprietary', 'wrapper', 'hybrid', 'third_party', 'unknown'])
    .optional(),
  risk_score_min: z.coerce.number().min(0).max(100).optional(),
  risk_score_max: z.coerce.number().min(0).max(100).optional(),
  is_outdated: z.coerce.boolean().optional(),
  is_deprecated: z.coerce.boolean().optional(),
  has_security_issues: z.coerce.boolean().optional(),
  manually_verified: z.coerce.boolean().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const AddTechnologySchema = z.object({
  name: z.string().min(1).max(255),
  category: z.enum([
    'frontend',
    'backend',
    'database',
    'infrastructure',
    'devops',
    'ml_ai',
    'security',
    'testing',
    'monitoring',
    'other',
  ]),
  version: z.string().optional(),
  authenticity: z
    .enum(['proprietary', 'wrapper', 'hybrid', 'third_party', 'unknown'])
    .optional(),
  confidence_score: z.number().min(0).max(1),
  risk_score: z.number().min(0).max(100).optional(),
  license_type: z.string().optional(),
  manual_note: z.string().optional(),
});

/**
 * GET /api/tech-stack/analyses/[id]/technologies?category=ml_ai
 * List technologies for an analysis
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repository = new TechStackRepository(supabase);

    // Get analysis to verify access
    const analysis = await repository.getAnalysis(id);

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

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams);

    // Validate query parameters
    const validated = ListTechnologiesSchema.parse(queryParams);

    // List technologies
    const filter: TechStackTechnologyFilter = {
      analysis_id: id,
      ...validated,
    };

    const result = await repository.listTechnologies(filter);

    return NextResponse.json({
      success: true,
      data: result.technologies,
      total: result.total,
      limit: validated.limit || 50,
      offset: validated.offset || 0,
    });
  } catch (error) {
    console.error('[Tech Stack API] List technologies error:', error);

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
 * POST /api/tech-stack/analyses/[id]/technologies
 * Add a technology manually
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const validated = AddTechnologySchema.parse(body);

    const repository = new TechStackRepository(supabase);

    // Get analysis to verify access
    const analysis = await repository.getAnalysis(id);

    // Verify user has access to data room (editor or owner)
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

      if (!access || !['owner', 'editor'].includes(access.permission_level)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Add technology
    const technology = await repository.addTechnology(
      {
        analysis_id: id,
        ...validated,
      },
      user.id
    );

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: analysis.data_room_id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || 'Unknown',
      actor_email: user.email || '',
      action: 'add_technology',
      details: {
        analysis_id: id,
        technology_id: technology.id,
        technology_name: technology.name,
        category: technology.category,
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, data: technology }, { status: 201 });
  } catch (error) {
    console.error('[Tech Stack API] Add technology error:', error);

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
