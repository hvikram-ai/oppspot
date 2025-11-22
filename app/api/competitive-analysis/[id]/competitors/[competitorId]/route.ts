import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { competitiveAnalysisRepository } from '@/lib/competitive-analysis/repository';
import { validateUUID } from '@/lib/competitive-analysis/validation';
import {
  handleError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from '@/lib/competitive-analysis/errors';

/**
 * DELETE /api/competitive-analysis/[id]/competitors/[competitorId]
 * Remove a competitor from the analysis (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; competitorId: string }> }
) {
  try {
    const { id: analysisId, competitorId: compId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate UUID formats
    const id = validateUUID(analysisId, 'Analysis ID');
    const competitorId = validateUUID(compId, 'Competitor ID');

    // Check if analysis exists
    const analysis = await competitiveAnalysisRepository.findById(id);

    if (!analysis) {
      throw new NotFoundError('Analysis', id);
    }

    // Verify ownership (only owner can remove competitors)
    if (analysis.created_by !== user.id) {
      throw new ForbiddenError('Only the owner can remove competitors');
    }

    // Remove competitor
    await competitiveAnalysisRepository.removeCompetitor(id, competitorId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
