import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { competitiveAnalysisRepository } from '@/lib/competitive-analysis/repository';
import { AddCompetitorSchema } from '@/lib/competitive-analysis/types';
import { validateCompetitorInput, validateUUID } from '@/lib/competitive-analysis/validation';
import {
  handleError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from '@/lib/competitive-analysis/errors';

/**
 * POST /api/competitive-analysis/[id]/competitors
 * Add a competitor to the analysis
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate UUID format
    const id = validateUUID(analysisId, 'Analysis ID');

    // Check access permissions
    const hasAccess = await competitiveAnalysisRepository.checkUserAccess(id, user.id);

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this analysis');
    }

    // Check if analysis exists
    const analysis = await competitiveAnalysisRepository.findById(id);

    if (!analysis) {
      throw new NotFoundError('Analysis', id);
    }

    // Parse and sanitize request body
    const body = await request.json();
    const sanitizedInput = validateCompetitorInput(body);

    // Validate with Zod schema
    const validationResult = AddCompetitorSchema.safeParse(sanitizedInput);

    if (!validationResult.success) {
      const { statusCode, body: errorBody } = handleError(validationResult.error);
      return NextResponse.json(errorBody, { status: statusCode });
    }

    // Add competitor
    const competitor = await competitiveAnalysisRepository.addCompetitor(
      id,
      validationResult.data,
      user.id
    );

    return NextResponse.json(competitor, { status: 201 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

/**
 * GET /api/competitive-analysis/[id]/competitors
 * Get all competitors for an analysis
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate UUID format
    const id = validateUUID(analysisId, 'Analysis ID');

    // Check access permissions
    const hasAccess = await competitiveAnalysisRepository.checkUserAccess(id, user.id);

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this analysis');
    }

    // Get competitors
    const competitors = await competitiveAnalysisRepository.getCompetitors(id);

    return NextResponse.json({ competitors }, { status: 200 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
