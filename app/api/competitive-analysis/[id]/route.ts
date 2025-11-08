import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { competitiveAnalysisRepository } from '@/lib/competitive-analysis/repository';
import { UpdateCompetitiveAnalysisSchema } from '@/lib/competitive-analysis/types';
import { validateUUID } from '@/lib/competitive-analysis/validation';
import {
  handleError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from '@/lib/competitive-analysis/errors';

/**
 * GET /api/competitive-analysis/[id]
 * Fetch single analysis with full dashboard data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate UUID format
    const id = validateUUID(params.id, 'Analysis ID');

    // Check access permissions BEFORE fetching data
    const hasAccess = await competitiveAnalysisRepository.checkUserAccess(id, user.id);

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this analysis');
    }

    // Fetch analysis
    const analysis = await competitiveAnalysisRepository.findById(id);

    if (!analysis) {
      throw new NotFoundError('Analysis', id);
    }

    // Update last viewed timestamp
    await competitiveAnalysisRepository.updateLastViewed(id);

    // Fetch full dashboard data
    const dashboardData = await competitiveAnalysisRepository.getDashboardData(id);

    return NextResponse.json(
      {
        analysis,
        ...dashboardData,
      },
      { status: 200 }
    );
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

/**
 * PATCH /api/competitive-analysis/[id]
 * Update analysis metadata (owner only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate UUID format
    const id = validateUUID(params.id, 'Analysis ID');

    // Check if analysis exists
    const analysis = await competitiveAnalysisRepository.findById(id);

    if (!analysis) {
      throw new NotFoundError('Analysis', id);
    }

    // Verify ownership (only owner can update)
    if (analysis.created_by !== user.id) {
      throw new ForbiddenError('Only the owner can update this analysis');
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdateCompetitiveAnalysisSchema.safeParse(body);

    if (!validationResult.success) {
      const { statusCode, body: errorBody } = handleError(validationResult.error);
      return NextResponse.json(errorBody, { status: statusCode });
    }

    // Update analysis
    const updatedAnalysis = await competitiveAnalysisRepository.update(id, validationResult.data, user.id);

    return NextResponse.json(updatedAnalysis, { status: 200 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

/**
 * DELETE /api/competitive-analysis/[id]
 * Soft delete analysis (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate UUID format
    const id = validateUUID(params.id, 'Analysis ID');

    // Check if analysis exists
    const analysis = await competitiveAnalysisRepository.findById(id);

    if (!analysis) {
      throw new NotFoundError('Analysis', id);
    }

    // Verify ownership (only owner can delete)
    if (analysis.created_by !== user.id) {
      throw new ForbiddenError('Only the owner can delete this analysis');
    }

    // Soft delete
    await competitiveAnalysisRepository.softDelete(id, user.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
